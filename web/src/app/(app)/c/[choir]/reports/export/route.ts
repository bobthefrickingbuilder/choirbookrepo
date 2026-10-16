import { toCsv } from '@choirbook/shared/import';
import type { PermArea } from '@choirbook/shared/permissions';
import { NextResponse, type NextRequest } from 'next/server';
import { getReport, resolvePeriod } from '@/lib/data/reports';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

const AREA: Record<string, PermArea> = {
  membership: 'roster',
  attendance: 'attendance',
  fees: 'fees',
  forms: 'forms',
  tickets: 'tickets',
  practice: 'music',
  volunteers: 'volunteers',
};

// One report table as CSV. Every export is recorded in the audit log.
export async function GET(request: NextRequest, { params }: RouteContext<'/c/[choir]/reports/export'>) {
  const { choir } = await params;
  const kind = request.nextUrl.searchParams.get('kind') ?? '';
  const ctx = await getChoirContext(choir);
  const area = AREA[kind];
  if (!ctx || !area || !ctx.can('reports') || !ctx.can(area)) return new NextResponse('Not found', { status: 404 });
  const period = await resolvePeriod(ctx, request.nextUrl.searchParams.get('period') ?? undefined, 'en');
  const r = await getReport(ctx, period);
  const money = (c: number) => (c / 100).toFixed(2);

  let header: string[] = [];
  let rows: unknown[][] = [];
  switch (kind) {
    case 'membership':
      header = ['Section', 'Active choristers'];
      rows = r.membership.bySection.map((x) => [x.name_en, x.count]);
      break;
    case 'attendance':
      header = ['Chorister', 'Voice part', 'Marked', 'Present or late', 'Late', 'Excused', 'Absent', 'Rate %'];
      rows = r.attendance.perPerson.map((x) => [x.name, x.section, x.marked, x.here, x.late, x.excused, x.absent, x.rate ?? '']);
      break;
    case 'fees':
      header = ['Fee', 'Due', 'Billed (CAD)', 'Collected (CAD)', 'Outstanding (CAD)'];
      rows = r.finance.fees.map((f) => [f.name, f.due, money(f.billed), money(f.collected), money(f.outstanding)]);
      break;
    case 'forms':
      header = ['Form', 'Status', 'Due', 'Expected', 'Submitted', 'Complete %'];
      rows = r.forms.rows.map((f) => [f.title, f.status, f.due, f.total, f.done, f.pct]);
      break;
    case 'tickets':
      header = ['Concert', 'Date', 'Orders', 'Tickets', 'Revenue (CAD)'];
      rows = r.tickets.map((x) => [x.title, x.date.slice(0, 10), x.orders, x.tickets, money(x.revenue)]);
      break;
    case 'practice':
      header = ['Piece', 'Assignment', 'Due', 'Assigned', 'Done', 'Complete %'];
      rows = r.practice.map((a) => [a.piece, a.title, a.due, a.total, a.done, a.pct]);
      break;
    case 'volunteers':
      header = ['Volunteer', 'Shifts', 'Hours'];
      rows = r.volunteers.rows.map((x) => [x.name, x.shifts, x.hours]);
      break;
  }

  const supabase = await createClient();
  await supabase.rpc('log_event', { org: ctx.org.id, action: 'export', entity: `report_${kind}`, details: { period: period.key, rows: rows.length } });
  return new NextResponse(toCsv(header, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ctx.org.slug}-${kind}-${period.from}-to-${period.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
