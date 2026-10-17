import { format } from '@choirbook/shared/i18n';
import { Button, Card } from '@choirbook/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/PrintButton';
import { Forbidden } from '@/components/staff/Forbidden';
import { BarList, CsvLink, Kpi } from '@/components/staff/ReportBits';
import { formatDate, formatMoney } from '@/lib/format';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { filterQuery, readFilters } from '@/lib/data/filters';
import { getReport } from '@/lib/data/reports';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage({ params, searchParams }: PageProps<'/c/[choir]/reports'>) {
  const { choir } = await params;
  const search = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('reports')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const f = await readFilters(ctx, search, lang);
  const period = f.period;
  const r = await getReport(ctx, period, f.section?.id ?? null);
  const q = filterQuery(f);
  const name = (x: { name_en: string; name_fr: string }) => (lang === 'fr' ? x.name_fr : x.name_en);
  const csv = (kind: string) => `/c/${choir}/reports/export?kind=${kind}&${q}`;
  const money = (c: number) => formatMoney(c, lang);

  return (
    <div className="page page--wide" data-print-report="">
      <div className="page__head">
        <div>
          <h1 className="page__title">{t.staff.reportsTitle}</h1>
          <p className="page__lede">{format(t.staff.reportsSub, { period: f.section ? `${period.label} · ${lang === 'fr' ? f.section.name_fr : f.section.name_en}` : period.label })}</p>
        </div>
        <div className="page__actions">
          <Button iconStart="file-text" href={`/c/${choir}/reports/board?${q}`}>
            {t.staff.boardReport}
          </Button>
          <PrintButton label={t.staff.savePdf} />
        </div>
      </div>
      <FilterBar ctx={ctx} f={f} t={t} lang={lang} />

      <Card title={t.staff.repMembership} action={ctx.can('roster') ? <CsvLink href={csv('membership')} label={t.staff.downloadCsv} /> : undefined}>
        <div className="kpi-row">
          <Kpi label={t.staff.activeChoristers} value={String(r.membership.active)} />
          <Kpi label={t.staff.newInPeriod} value={String(r.membership.newInPeriod)} />
          <Kpi label={t.staff.departedInPeriod} value={String(r.membership.departedInPeriod)} />
          <Kpi label={t.staff.auditioningN} value={String(r.membership.auditioning)} />
          {ctx.org.kind === 'youth' ? <Kpi label={t.staff.under18} value={String(r.membership.minors)} /> : null}
        </div>
        <BarList caption={t.staff.bySection} unit="" rows={r.membership.bySection.map((x) => ({ label: name(x), value: x.count, display: String(x.count) }))} />
      </Card>

      {ctx.can('attendance') ? (
        <Card title={t.staff.repAttendance} action={<CsvLink href={csv('attendance')} label={t.staff.downloadCsv} />}>
          <div className="kpi-row">
            <Kpi label={t.staff.attendanceRate} value={r.attendance.rate === null ? '—' : `${r.attendance.rate}%`} />
            <Kpi label={t.staff.eventsMarked} value={String(r.attendance.byEvent.length)} />
            <Kpi label={t.staff.atLimitN} value={String(r.attendance.atLimit)} context={r.attendance.limit !== null ? format(t.staff.limitN, { n: r.attendance.limit }) : undefined} />
            <Kpi label={`${t.staff.present} · ${t.staff.late} · ${t.staff.excused} · ${t.staff.absent}`} value={`${r.attendance.split.present} · ${r.attendance.split.late} · ${r.attendance.split.excused} · ${r.attendance.split.absent}`} />
          </div>
          <div className="profile-grid">
            <div>
              <h3 className="section-title">{t.staff.byEvent}</h3>
              <BarList caption={t.staff.byEvent} rows={r.attendance.byEvent.map((e) => ({ label: `${formatDate(e.date, lang, { month: 'short', day: 'numeric' })} · ${e.title}`, value: e.rate ?? 0 }))} />
            </div>
            <div>
              <h3 className="section-title">{t.staff.bySection}</h3>
              <BarList caption={t.staff.bySection} rows={r.attendance.bySection.map((x) => ({ label: name(x), value: x.rate ?? 0 }))} />
            </div>
          </div>
        </Card>
      ) : null}

      {ctx.can('fees') ? (
        <Card title={t.staff.repFees} action={<CsvLink href={csv('fees')} label={t.staff.downloadCsv} />}>
          <div className="kpi-row">
            <Kpi label={t.staff.billed} value={money(r.finance.billed)} />
            <Kpi label={t.staff.collected} value={money(r.finance.collected)} context={r.finance.billed ? `${Math.round((r.finance.collected / r.finance.billed) * 100)}%` : undefined} />
            <Kpi label={t.staff.adjustments} value={money(r.finance.adjusted)} />
            <Kpi label={t.staff.outstanding} value={money(r.finance.outstanding)} />
            <Kpi label={t.staff.overdueN} value={String(r.finance.overdueCount)} />
            <Kpi label={t.staff.collectedInPeriod} value={money(r.finance.collectedInPeriod)} />
          </div>
          <div className="profile-grid">
            <div className="table-scroll">
              <table className="simple-table">
                <thead>
                  <tr>
                    <th scope="col">{t.staff.feeName}</th>
                    <th scope="col" className="num">{t.staff.billed}</th>
                    <th scope="col" className="num">{t.staff.collected}</th>
                    <th scope="col" className="num">{t.staff.outstanding}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.finance.fees.map((f) => (
                    <tr key={f.id}>
                      <th scope="row">{f.name}</th>
                      <td className="num">{money(f.billed)}</td>
                      <td className="num">{money(f.collected)}</td>
                      <td className="num">{money(f.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="section-title">{t.staff.byMethod}</h3>
              <BarList
                caption={t.staff.byMethod}
                unit=""
                rows={(['card', 'etransfer', 'cheque', 'cash'] as const).map((m) => ({ label: t.staff[`method_${m}`], value: r.finance.methods[m] ?? 0, display: money(r.finance.methods[m] ?? 0) }))}
              />
            </div>
          </div>
        </Card>
      ) : null}

      {ctx.can('forms') ? (
        <Card title={t.staff.repForms} action={<CsvLink href={csv('forms')} label={t.staff.downloadCsv} />}>
          <div className="kpi-row">
            <Kpi label={t.staff.formsComplete} value={r.forms.pct === null ? '—' : `${r.forms.pct}%`} context={format(t.staff.stillToCome, { n: r.forms.missing })} />
          </div>
          <BarList caption={t.staff.repForms} rows={r.forms.rows.map((f) => ({ label: f.title, value: f.pct, display: `${f.done} / ${f.total}` }))} />
        </Card>
      ) : null}

      {ctx.can('tickets') ? (
        <Card title={t.staff.repTickets} action={<CsvLink href={csv('tickets')} label={t.staff.downloadCsv} />}>
          <div className="table-scroll">
            <table className="simple-table">
              <thead>
                <tr>
                  <th scope="col">{t.staff.forEvent}</th>
                  <th scope="col" className="num">{t.staff.ordersN}</th>
                  <th scope="col" className="num">{t.staff.ticketsN}</th>
                  <th scope="col" className="num">{t.staff.revenue}</th>
                </tr>
              </thead>
              <tbody>
                {r.tickets.map((x) => (
                  <tr key={x.id}>
                    <th scope="row">
                      {x.title} <span className="muted small">· {formatDate(x.date, lang, { month: 'short', day: 'numeric' })}</span>
                    </th>
                    <td className="num">{x.orders}</td>
                    <td className="num">{x.tickets}</td>
                    <td className="num">{money(x.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {ctx.can('music') ? (
        <Card title={t.staff.repPractice} action={<CsvLink href={csv('practice')} label={t.staff.downloadCsv} />}>
          <BarList caption={t.staff.repPractice} rows={r.practice.map((a) => ({ label: `${a.piece}: ${a.title}`, value: a.pct, display: `${a.done} / ${a.total}` }))} />
        </Card>
      ) : null}

      {ctx.can('volunteers') ? (
        <Card title={t.staff.repVolunteers} action={<CsvLink href={csv('volunteers')} label={t.staff.downloadCsv} />}>
          <div className="kpi-row">
            <Kpi label={t.staff.shifts} value={String(r.volunteers.shifts)} />
            <Kpi label={t.staff.hours} value={String(r.volunteers.hours)} />
          </div>
          {r.volunteers.rows.length ? (
            <BarList caption={t.staff.repVolunteers} unit="" rows={r.volunteers.rows.slice(0, 15).map((x) => ({ label: x.name, value: x.hours, display: format(t.staff.hoursN, { n: x.hours }) }))} />
          ) : null}
        </Card>
      ) : null}

      {ctx.can('announcements') || ctx.can('inbox') ? (
        <Card title={t.staff.repComms}>
          <div className="kpi-row">
            <Kpi label={t.staff.announcementsSent} value={String(r.comms.announcements)} />
            <Kpi label={t.staff.readRate} value={r.comms.readRate === null ? '—' : `${r.comms.readRate}%`} />
            <Kpi label={t.staff.conversationsN} value={String(r.comms.conversations)} />
            <Kpi label={t.staff.replyHours} value={r.comms.medianReplyHours === null ? '—' : format(t.staff.hoursN, { n: r.comms.medianReplyHours })} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
