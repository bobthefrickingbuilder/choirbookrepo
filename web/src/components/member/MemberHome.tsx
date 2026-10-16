import { format, type Lang, type Messages } from '@choirbook/shared/i18n';
import { Badge, Button, Card, EmptyState, EventCard, Icon, NextRehearsalCard, TextLink, VoicePartBadge } from '@choirbook/ui';
import Link from 'next/link';
import {
  getFeeBalances,
  getMemberProfile,
  getMyAbsenceReports,
  getMyAssignments,
  getMyAvailability,
  getOutstandingForms,
  getUnreadAnnouncements,
  getUpcomingEvents,
  type EventRow,
} from '@/lib/data/member';
import { daysBetween, formatDate, formatMoney, formatTime, localParts, todayLocal } from '@/lib/format';
import { hrefFor } from '@/lib/nav';
import type { ChoirContext } from '@/lib/session';
import { AbsenceButtons } from './AbsenceButtons';
import { PracticeDone } from './PracticeDone';

function whenLabel(e: EventRow, t: Messages, lang: Lang): string | undefined {
  const { date, time } = localParts(e.starts_at);
  const diff = daysBetween(todayLocal(), date);
  if (diff === 0) return time >= '17:00' ? t.member.tonight : t.member.today;
  if (diff === 1) return t.member.tomorrow;
  if (diff > 1 && diff < 7) return formatDate(e.starts_at, lang, { weekday: 'long' });
  return undefined;
}

function countdown(e: EventRow, t: Messages, lang: Lang): string | undefined {
  const mins = Math.round((Date.parse(e.starts_at) - Date.now()) / 60_000);
  if (mins <= 0 || mins > 12 * 60) return undefined;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const time = lang === 'fr' ? (h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`) : h ? `${h} h ${m} min` : `${m} min`;
  return format(t.member.startsIn, { time });
}

export async function MemberHome({ ctx, t, lang }: { ctx: ChoirContext; t: Messages; lang: Lang }) {
  const slug = ctx.org.slug;
  const profile = await getMemberProfile(ctx);
  const [events, reports, replies, forms, fees, assignments, unread] = await Promise.all([
    getUpcomingEvents(ctx, profile.sectionId),
    getMyAbsenceReports(ctx),
    getMyAvailability(ctx),
    getOutstandingForms(ctx),
    getFeeBalances(ctx),
    getMyAssignments(ctx, profile.sectionId),
    getUnreadAnnouncements(ctx),
  ]);

  const attendable = events.filter((e) => e.type !== 'deadline' && !e.cancelled_at);
  const next = attendable[0];
  const nextReport = next ? reports.find((r) => r.event_id === next.id) : undefined;
  const answered = new Set(replies.map((r) => r.event_id));
  const asks = attendable.filter((e) => e.availability_requested && !answered.has(e.id));
  const today = todayLocal();
  const owing = fees.filter((f) => f.balance > 0);
  const practice = assignments.filter((a) => !a.due_on || a.due_on >= today).slice(0, 4);
  const concerts = attendable.filter((e) => e.type === 'concert' || e.type === 'tour').slice(0, 3);
  const years = profile.joinedOn ? Math.max(1, daysBetween(profile.joinedOn, today) / 365 + 1) : 1;
  const yearLine = Math.floor(years) <= 1 ? t.member.firstYear : format(t.member.yearN, { n: Math.floor(years) });

  const todo = [
    ...asks.map((e) => ({
      key: `a-${e.id}`,
      icon: 'calendar-check' as const,
      text: format(t.member.availabilityAsk, { event: e.title }),
      href: `${hrefFor(slug, 'calendar')}/${e.id}`,
    })),
    ...forms.map((f) => ({
      key: `f-${f.id}`,
      icon: 'signature' as const,
      text: `${f.title} · ${f.due_on ? format(t.member.formDue, { date: formatDate(`${f.due_on}T12:00:00Z`, lang, { month: 'long', day: 'numeric' }) }) : t.member.formNoDue}`,
      href: `${hrefFor(slug, 'forms')}/${f.id}`,
    })),
    ...owing.map((f) => {
      const due = f.due_on ?? today;
      const dueText = formatDate(`${due}T12:00:00Z`, lang, { month: 'long', day: 'numeric' });
      return {
        key: `p-${f.assignment_id}`,
        icon: 'receipt' as const,
        text: `${f.name} · ${format(due < today ? t.member.feeOverdue : t.member.feeDue, { amount: formatMoney(f.balance, lang), date: dueText })}`,
        href: hrefFor(slug, 'forms'),
      };
    }),
  ];

  return (
    <div className="page">
      <header className="member-head">
        <span className="overline overline--accent">{ctx.org.name}</span>
        <h1 className="page__title">{format(t.member.hello, { name: ctx.firstName })}</h1>
        <div className="member-head__meta">
          {profile.partKey ? <VoicePartBadge part={profile.partKey} variant="pill" lang={lang} /> : null}
          <span>{yearLine}</span>
        </div>
      </header>

      <div className="member-grid">
        <div className="member-col">
          {next ? (
            <NextRehearsalCard
              overline={t.member.nextEvent}
              when={whenLabel(next, t, lang)}
              date={localParts(next.starts_at).date}
              start={localParts(next.starts_at).time}
              end={next.ends_at ? localParts(next.ends_at).time : undefined}
              callTime={next.call_at ? localParts(next.call_at).time : undefined}
              location={
                <Link href={`${hrefFor(slug, 'calendar')}/${next.id}` as never} className="cb-link">
                  {next.title}
                  {next.location ? ` · ${next.location}` : ''}
                </Link>
              }
              address={next.address ?? undefined}
              mapHref={next.map_url ?? undefined}
              bring={[next.bring, next.dress_code ? `${t.member.dress}: ${next.dress_code}` : null].filter(Boolean).join(' · ') || undefined}
              countdown={countdown(next, t, lang)}
              locale={lang === 'fr' ? 'fr-CA' : 'en-CA'}
              actions={
                <AbsenceButtons
                  slug={slug}
                  eventId={next.id}
                  reported={nextReport ? { kind: nextReport.kind, reason: nextReport.reason } : null}
                  s={{
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
                  }}
                />
              }
            />
          ) : (
            <Card padded={false}>
              <EmptyState icon="calendar" size="sm">
                {t.member.nothingNext}
              </EmptyState>
            </Card>
          )}

          <Card title={t.member.todo}>
            {todo.length === 0 ? (
              <p className="muted">{t.member.todoEmpty}</p>
            ) : (
              <ul className="todo-list">
                {todo.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href as never} className="todo-list__item">
                      <Icon name={item.icon} size={18} />
                      <span>{item.text}</span>
                      <Icon name="chevron-right" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t.member.practice} action={<TextLink href={hrefFor(slug, 'music')}>{t.nav.music}</TextLink>}>
            {practice.length === 0 ? (
              <p className="muted">{t.member.practiceEmpty}</p>
            ) : (
              <ul className="practice-list">
                {practice.map((a) => (
                  <li key={a.id} className="practice-list__item">
                    <div className="practice-list__main">
                      <h3 className="practice-list__piece">{a.pieces?.title}</h3>
                      <p className="practice-list__what">
                        {a.title}
                        {a.bars ? ` · ${a.bars}` : ''}
                      </p>
                      {a.instructions ? <p className="muted">{a.instructions}</p> : null}
                      {a.due_on ? (
                        <Badge tone="accent" icon="calendar-check">
                          {format(t.member.dueOn, { date: formatDate(`${a.due_on}T12:00:00Z`, lang, { weekday: 'short', month: 'short', day: 'numeric' }) })}
                        </Badge>
                      ) : null}
                    </div>
                    <PracticeDone slug={slug} assignmentId={a.id} done={a.done} label={t.member.done} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="member-col">
          <Card
            title={t.member.announcements}
            action={<TextLink href={`/c/${slug}/announcements`}>{t.member.seeAll}</TextLink>}
          >
            {unread.length === 0 ? (
              <p className="muted">{t.member.todoEmpty}</p>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                <Badge tone="accent" solid>
                  {format(t.member.unreadCount, { n: unread.length })}
                </Badge>
                {unread.slice(0, 3).map((a) => (
                  <Link key={a.id} href={`/c/${slug}/announcements#a-${a.id}` as never} className="ann-peek">
                    <strong>{a.title}</strong>
                    <span className="muted">{a.published_at ? formatDate(a.published_at, lang, { month: 'short', day: 'numeric' }) : ''}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {concerts.length ? (
            <section className="stack" style={{ gap: 12 }}>
              <h2 className="section-title">{t.member.concerts}</h2>
              {concerts.map((c) => (
                <EventCard
                  key={c.id}
                  type={c.type}
                  title={c.title}
                  date={localParts(c.starts_at).date}
                  start={c.all_day ? undefined : localParts(c.starts_at).time}
                  end={c.ends_at && !c.all_day ? localParts(c.ends_at).time : undefined}
                  location={c.location ?? undefined}
                  note={c.call_at ? format(t.member.callTime, { time: formatTime(c.call_at, lang) }) : undefined}
                  href={`${hrefFor(slug, 'calendar')}/${c.id}`}
                  locale={lang === 'fr' ? 'fr-CA' : 'en-CA'}
                />
              ))}
              <Button variant="secondary" iconEnd="arrow-right" href={hrefFor(slug, 'calendar')}>
                {t.member.calendarTitle}
              </Button>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
