import { format } from '@choirbook/shared/i18n';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BoardReport } from '@/components/staff/BoardReport';
import { Forbidden } from '@/components/staff/Forbidden';
import { filterQuery, readFilters } from '@/lib/data/filters';
import { getReport } from '@/lib/data/reports';
import { formatDate, formatMoney, isoDaysFromNow } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';

export const metadata: Metadata = { title: 'Board report' };

export default async function BoardReportPage({ params, searchParams }: PageProps<'/c/[choir]/reports/board'>) {
  const { choir } = await params;
  const search = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('reports')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const f = await readFilters(ctx, search, lang);
  const period = f.period;
  const r = await getReport(ctx, period, f.section?.id ?? null);
  const st = t.staff;
  const money = (c: number) => formatMoney(c, lang);
  const name = (x: { name_en: string; name_fr: string }) => (lang === 'fr' ? x.name_fr : x.name_en);

  const kpis = [
    { label: st.activeChoristers, value: String(r.membership.active), context: `${st.newInPeriod}: ${r.membership.newInPeriod}` },
    ...(ctx.can('attendance') ? [{ label: st.attendanceRate, value: r.attendance.rate === null ? '—' : `${r.attendance.rate}%`, context: period.label }] : []),
    ...(ctx.can('fees') ? [{ label: st.collected, value: money(r.finance.collected), context: r.finance.billed ? `${Math.round((r.finance.collected / r.finance.billed) * 100)}% · ${money(r.finance.billed)}` : undefined }] : []),
    ...(ctx.can('forms') ? [{ label: st.formsComplete, value: r.forms.pct === null ? '—' : `${r.forms.pct}%`, context: format(st.stillToCome, { n: r.forms.missing }) }] : []),
  ];

  return (
    <div className="page page--wide">
      <Link href={`/c/${choir}/reports?${filterQuery(f)}` as never} className="back-link no-print">
        ← {st.reportsTitle}
      </Link>
      <BoardReport
        storageKey={`cb-board-${ctx.org.id}`}
        data={{
          choir: ctx.org.name,
          periodLabel: f.section ? `${period.label} · ${lang === 'fr' ? f.section.name_fr : f.section.name_en}` : period.label,
          asOf: format(st.figuresAsOf, { date: formatDate(isoDaysFromNow(0), lang, { dateStyle: 'long' }) }),
          preparedBy: `${ctx.displayName}${ctx.roles[0] ? `, ${lang === 'fr' ? ctx.roles[0].nameFr : ctx.roles[0].nameEn}` : ''}`,
          kpis,
          membership: r.membership.bySection.map((x) => ({ label: name(x), count: x.count })),
          membershipFacts: [
            { k: st.newInPeriod, v: String(r.membership.newInPeriod) },
            { k: st.departedInPeriod, v: String(r.membership.departedInPeriod) },
            { k: st.auditioningN, v: String(r.membership.auditioning) },
            ...(ctx.org.kind === 'youth' ? [{ k: st.under18, v: String(r.membership.minors) }] : []),
          ],
          attendance: ctx.can('attendance') ? r.attendance.byEvent.map((e) => ({ label: formatDate(e.date, lang, { month: 'short', day: 'numeric' }), pct: e.rate ?? 0 })) : null,
          attendanceFacts: [
            { k: st.eventsMarked, v: String(r.attendance.byEvent.length) },
            { k: st.atLimitN, v: String(r.attendance.atLimit) },
            ...r.attendance.bySection.map((x) => ({ k: name(x), v: `${x.rate}%` })),
          ],
          finance: ctx.can('fees')
            ? [
                { k: st.billed, v: money(r.finance.billed) },
                { k: st.collected, v: money(r.finance.collected) },
                { k: st.adjustments, v: money(r.finance.adjusted) },
                { k: st.outstanding, v: money(r.finance.outstanding) },
                { k: st.paidUp, v: `${r.finance.paidUpCount} / ${r.finance.payers}` },
                { k: st.overdueN, v: String(r.finance.overdueCount) },
              ]
            : null,
          forms: ctx.can('forms') ? r.forms.rows.filter((f) => f.status === 'open').map((f) => ({ label: f.title, pct: f.pct, detail: `${f.done} / ${f.total}` })) : null,
          comms:
            ctx.can('announcements') || ctx.can('inbox')
              ? [
                  { k: st.announcementsSent, v: String(r.comms.announcements) },
                  { k: st.readRate, v: r.comms.readRate === null ? '—' : `${r.comms.readRate}%` },
                  { k: st.conversationsN, v: String(r.comms.conversations) },
                  { k: st.replyHours, v: r.comms.medianReplyHours === null ? '—' : format(st.hoursN, { n: r.comms.medianReplyHours }) },
                ]
              : null,
          upcoming: r.upcoming.map((u) => ({ when: formatDate(u.starts_at, lang, { weekday: 'short', month: 'short', day: 'numeric' }), title: u.title, concert: u.type === 'concert' })),
        }}
        s={{
          boardTitle: st.boardTitle,
          boardIntro: st.boardIntro,
          meeting: st.meeting,
          preparedBy: st.preparedBy,
          include: st.include,
          highlights: st.highlights,
          highlightsHint: st.highlightsHint,
          decisions: st.decisions,
          decisionsHint: st.decisionsHint,
          upcomingSection: st.upcomingSection,
          savePdf: st.savePdf,
          draftKept: st.draftKept,
          emailLater: st.emailLater,
          chartAlt: st.chartAlt,
          clearAll: st.clearAll,
          membership: st.repMembership,
          attendance: st.repAttendance,
          finance: st.repFees,
          forms: st.repForms,
          comms: st.repComms,
          upcoming: st.upcomingSection,
        }}
      />
    </div>
  );
}
