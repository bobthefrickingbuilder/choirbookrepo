import { toCsv } from '@choirbook/shared/import';
import { NextResponse, type NextRequest } from 'next/server';
import { allowedWidgets, getDashboard, type WidgetId } from '@/lib/data/dashboard';
import { readFilters } from '@/lib/data/filters';
import { getReport } from '@/lib/data/reports';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// One dashboard widget's figures as CSV, for the filters in the URL.
// Every export is recorded in the audit log.
export async function GET(request: NextRequest, { params }: RouteContext<'/c/[choir]/dashboard/export'>) {
  const { choir } = await params;
  const widget = request.nextUrl.searchParams.get('widget') as WidgetId | null;
  const ctx = await getChoirContext(choir);
  if (!ctx || !ctx.can('dashboard') || !widget || !allowedWidgets(ctx).includes(widget)) return new NextResponse('Not found', { status: 404 });
  const { t } = await getT();
  const f = await readFilters(ctx, Object.fromEntries(request.nextUrl.searchParams), 'en');
  const r = await getReport(ctx, f.period, f.section?.id ?? null);
  const money = (c: number) => (c / 100).toFixed(2);

  let header: string[] = [];
  let rows: unknown[][] = [];
  switch (widget) {
    case 'attendance':
      header = ['Event', 'Date', 'Marked', 'Present or late', 'Absent', 'Rate %'];
      rows = r.attendance.byEvent.map((e) => [e.title, e.date.slice(0, 10), e.marked, e.here, e.absent, e.rate ?? '']);
      rows.push([], ['Section', '', '', '', '', 'Rate %'], ...r.attendance.bySection.map((s) => [s.name_en, '', '', '', '', s.rate ?? '']));
      rows.push([], ['Present', r.attendance.split.present], ['Late', r.attendance.split.late], ['Excused', r.attendance.split.excused], ['Absent', r.attendance.split.absent]);
      if (r.period.prev) rows.push([], [`Rate for ${r.period.prev.label} %`, r.attendance.prevRate ?? '']);
      break;
    case 'upcoming': {
      const dash = await getDashboard(ctx, f, r, t.dash, 'en');
      header = ['Event', 'Starts', 'Section', 'Called', 'Yes', 'Maybe', 'No', 'Low'];
      rows = dash.upcoming.flatMap((e) => (e.bySection.length ? e.bySection.map((x) => [e.title, e.starts_at, x.name, x.total, x.yes, x.maybe, x.no, x.low ? 'yes' : '']) : [[e.title, e.starts_at, '', '', '', '', '', '']]));
      break;
    }
    case 'membership':
      header = ['Group', 'Name', 'Count'];
      rows = [
        ...r.membership.bySection.map((x) => ['Section', x.name_en, x.count]),
        ...r.membership.byPart.map((x) => ['Voice part', x.name_en, x.count]),
        ['Status', 'Active', r.membership.active],
        ['Status', 'Auditioning', r.membership.auditioning],
        ['Status', 'On leave', r.membership.onLeave],
        ['Period', 'Joined', r.membership.newInPeriod],
        ['Period', 'Left', r.membership.departedInPeriod],
      ];
      break;
    case 'fees':
      header = ['Measure', 'CAD'];
      rows = [
        ['Expected', money(r.finance.billed)],
        ['Collected', money(r.finance.collected)],
        ['Waivers and aid', money(r.finance.adjusted)],
        ['Outstanding', money(r.finance.outstanding)],
        ['Outstanding, not yet due', money(r.finance.aging.notDue)],
        ['Outstanding, 1-30 days late', money(r.finance.aging.d30)],
        ['Outstanding, 31-60 days late', money(r.finance.aging.d60)],
        ['Outstanding, over 60 days late', money(r.finance.aging.d60plus)],
        ['Instalments due this month', money(r.finance.instalmentsThisMonth.cents)],
      ];
      break;
    case 'forms':
      header = ['Form', 'Status', 'Due', 'Expected', 'Submitted', 'Complete %'];
      rows = r.forms.rows.map((x) => [x.title, x.status, x.due, x.total, x.done, x.pct]);
      break;
    case 'music':
      header = ['Piece', 'Assignment', 'Due', 'Section', 'Assigned', 'Done', 'Complete %'];
      rows = r.practice.flatMap((a) => [[a.piece, a.title, a.due, 'All', a.total, a.done, a.pct], ...a.bySection.map((s) => [a.piece, a.title, a.due, s.name_en, s.total, s.done, s.pct ?? ''])]);
      break;
    case 'comms':
      header = ['Measure', 'Value'];
      rows = [
        ['Announcements', r.comms.announcements],
        ['Read rate %', r.comms.readRate ?? ''],
        ['Conversations', r.comms.conversations],
        ['Open', r.comms.open],
        ['Waiting for a first reply', r.comms.unanswered],
        ['Median first reply (hours)', r.comms.medianReplyHours ?? ''],
      ];
      break;
    case 'tickets':
      header = ['Concert', 'Date', 'Orders', 'Tickets', 'Capacity', 'Revenue (CAD)'];
      rows = r.tickets.map((x) => [x.title, x.date.slice(0, 10), x.orders, x.tickets, x.capacity ?? '', money(x.revenue)]);
      rows.push([], ['Day', 'Tickets sold'], ...r.ticketSales.byDay.map((x) => [x.date, x.tickets]));
      rows.push([], ['Top sellers', 'Tickets'], ...r.ticketSales.topSellers.map((x) => [x.name, x.tickets]));
      break;
    case 'volunteers':
      header = ['Event', 'Date', 'Needed', 'Filled'];
      rows = r.volunteers.byEvent.map((x) => [x.title, x.date.slice(0, 10), x.needed, x.filled]);
      break;
  }

  const supabase = await createClient();
  await supabase.rpc('log_event', { org: ctx.org.id, action: 'export', entity: `dashboard_${widget}`, details: { period: f.period.key, section: f.section?.key ?? null, rows: rows.length } });
  return new NextResponse(toCsv(header, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ctx.org.slug}-dashboard-${widget}${f.section ? `-${f.section.key}` : ''}-${f.period.from}-to-${f.period.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
