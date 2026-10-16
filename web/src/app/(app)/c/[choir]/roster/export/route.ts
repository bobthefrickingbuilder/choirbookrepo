import { toCsv } from '@choirbook/shared/import';
import { NextResponse, type NextRequest } from 'next/server';
import { getRoster } from '@/lib/data/roster';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// Roster as CSV (all choristers, or the ones selected). Every export is recorded in the audit log.
export async function GET(request: NextRequest, { params }: RouteContext<'/c/[choir]/roster/export'>) {
  const { choir } = await params;
  const ctx = await getChoirContext(choir);
  if (!ctx || !ctx.can('roster')) return new NextResponse('Not found', { status: 404 });

  const only = request.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean);
  const { rows } = await getRoster(ctx, { includeDeparted: true });
  const picked = only?.length ? rows.filter((r) => only.includes(r.id)) : rows.filter((r) => r.status !== 'departed');

  const supabase = await createClient();
  await supabase.rpc('log_event', {
    org: ctx.org.id,
    action: 'export',
    entity: 'roster',
    details: { rows: picked.length, selected: Boolean(only?.length) },
  });

  const header = ['First name', 'Last name', 'Email', 'Phone', 'Pronouns', 'Section', 'Voice part', 'Status', 'School', 'Joined', 'Guardian', 'Guardian emails'];
  if (ctx.can('attendance')) header.push('Absences this term');
  if (ctx.can('forms')) header.push('Forms');
  if (ctx.can('fees')) header.push('Fees', 'Owing (CAD)');
  const csv = toCsv(
    header,
    picked.map((r) => [
      r.first,
      r.last,
      r.email,
      r.phone,
      r.pronouns,
      r.sectionKey,
      r.partKey,
      r.status,
      r.school,
      r.joinedOn,
      r.guardian,
      r.guardianEmails.join('; '),
      ...(ctx.can('attendance') ? [r.absences] : []),
      ...(ctx.can('forms') ? [r.forms] : []),
      ...(ctx.can('fees') ? [r.fees, (r.owingCents / 100).toFixed(2)] : []),
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ctx.org.slug}-roster.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
