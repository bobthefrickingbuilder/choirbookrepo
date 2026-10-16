import { format } from '@choirbook/shared/i18n';
import { AlertCard, AttendanceBadge, Card, StatCard } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AbsenceButtons } from '@/components/member/AbsenceButtons';
import { getMemberProfile, getMyAbsenceReports, getUpcomingEvents } from '@/lib/data/member';
import { formatDate, formatRange, todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Attendance' };

export default async function AbsencesPage({ params }: PageProps<'/c/[choir]/absences'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const profile = await getMemberProfile(ctx);
  const supabase = await createClient();
  const today = todayLocal();
  const [{ data: term }, { data: history }, reports, upcoming] = await Promise.all([
    supabase.from('terms').select('id, name, starts_on, ends_on, absence_limit').eq('organization_id', ctx.org.id).lte('starts_on', today).gte('ends_on', today).maybeSingle(),
    supabase.from('attendance').select('status, events!inner(id, title, starts_at)').eq('person_id', ctx.personId).order('marked_at', { ascending: false }),
    getMyAbsenceReports(ctx),
    getUpcomingEvents(ctx, profile.sectionId, 12),
  ]);

  const rows = history ?? [];
  const inTerm = term ? rows.filter((r) => r.events.starts_at.slice(0, 10) >= term.starts_on && r.events.starts_at.slice(0, 10) <= term.ends_on) : rows;
  const attended = inTerm.filter((r) => r.status === 'present' || r.status === 'late').length;
  const rate = inTerm.length ? Math.round((attended / inTerm.length) * 100) : null;
  const absences = inTerm.filter((r) => r.status === 'absent').length;
  const left = term?.absence_limit != null ? Math.max(0, term.absence_limit - absences) : null;
  const reportByEvent = new Map(reports.map((r) => [r.event_id, r]));
  const nextEvents = upcoming.filter((e) => e.type !== 'deadline' && !e.cancelled_at).slice(0, 6);

  const absenceStrings = {
    imAbsent: t.member.imAbsent,
    imLate: t.member.imLate,
    reportedAbsent: t.member.reportedAbsent,
    reportedLate: t.member.reportedLate,
    undoReport: t.member.undoReport,
    absenceTitle: t.member.absenceTitle,
    lateTitle: t.member.lateTitle,
    reason: t.member.reason,
    reasonHint: t.member.reasonHint,
    sendReport: t.member.sendReport,
    cancel: t.common.cancel,
    pastEvent: t.member.pastEvent,
    genericFail: t.member.genericFail,
    required: t.validation.required,
  };

  return (
    <div className="page">
      <h1 className="page__title">{t.member.absencesTitle}</h1>
      <div className="stat-row">
        <StatCard
          label={`${t.member.attendanceRate}${term ? ` · ${term.name}` : ''}`}
          value={rate ?? '–'}
          unit={rate != null ? '%' : undefined}
          icon="clipboard-check"
          progress={rate != null ? rate / 100 : null}
        />
        <StatCard
          label={t.member.absencesTitle}
          value={left ?? '–'}
          icon="calendar-x"
          context={left == null ? t.member.absencesUnlimited : format(t.member.absencesLeft, { n: left })}
        />
      </div>
      {left === 0 ? <AlertCard tone="warning">{t.member.absencesNoneLeft}</AlertCard> : null}

      <Card title={t.member.reportAbsence}>
        <ul className="plain-list" style={{ gap: 16 }}>
          {nextEvents.map((e) => {
            const r = reportByEvent.get(e.id);
            return (
              <li key={e.id} className="row-between" style={{ alignItems: 'flex-start' }}>
                <Link href={`/c/${choir}/calendar/${e.id}` as never} className="cb-link" style={{ minWidth: 0 }}>
                  <strong>{e.title}</strong>
                  <br />
                  <span className="muted">{formatRange(e.starts_at, e.ends_at, lang, e.all_day)}</span>
                </Link>
                <AbsenceButtons slug={choir} eventId={e.id} reported={r ? { kind: r.kind, reason: r.reason } : null} s={absenceStrings} />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={t.member.history}>
        {rows.length === 0 ? (
          <p className="muted">{t.member.noHistory}</p>
        ) : (
          <ul className="plain-list">
            {rows.map((r) => (
              <li key={r.events.id} className="history-row">
                <span>
                  <strong>{r.events.title}</strong>
                  <br />
                  <span className="muted">{formatDate(r.events.starts_at, lang, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </span>
                <AttendanceBadge status={r.status} lang={lang} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
