import { toCsv } from '@choirbook/shared/import';
import { NextResponse, type NextRequest } from 'next/server';
import { DRILL_AREA, DRILLS, getDrill, type DrillKind } from '@/lib/data/drill';
import { readFilters } from '@/lib/data/filters';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// A dashboard list as CSV, with the same filters as the page. Recorded in the audit log.
export async function GET(request: NextRequest, { params }: RouteContext<'/c/[choir]/dashboard/[kind]/csv'>) {
  const { choir, kind } = await params;
  const ctx = await getChoirContext(choir);
  if (!ctx || !(DRILLS as readonly string[]).includes(kind)) return new NextResponse('Not found', { status: 404 });
  const k = kind as DrillKind;
  if (!ctx.can('dashboard') || !ctx.can(DRILL_AREA[k])) return new NextResponse('Not found', { status: 404 });
  const { t, lang } = await getT();
  const search = Object.fromEntries(request.nextUrl.searchParams);
  const f = await readFilters(ctx, search, lang);
  const drill = await getDrill(ctx, k, f, search, t, lang);
  const rows = drill.rows.map((r) => drill.columns.map((c) => {
    const v = r.cells[c.key];
    return c.type === 'money' && typeof v === 'number' ? (v / 100).toFixed(2) : (v ?? '');
  }));

  const supabase = await createClient();
  await supabase.rpc('log_event', { org: ctx.org.id, action: 'export', entity: `dashboard_list_${k}`, details: { period: f.period.key, section: f.section?.key ?? null, rows: rows.length } });
  return new NextResponse(toCsv(drill.columns.map((c) => c.label), rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ctx.org.slug}-${k}-${f.period.from}-to-${f.period.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
