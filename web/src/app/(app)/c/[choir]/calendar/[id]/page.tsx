import { format } from '@choirbook/shared/i18n';
import { AlertCard, Badge, Button, Card, DateLeaf, EVENT_TYPES, Icon, VoicePartBadge } from '@choirbook/ui';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AbsenceButtons } from '@/components/member/AbsenceButtons';
import { AvailabilityForm } from '@/components/member/AvailabilityForm';
import { AvailabilitySummary } from '@/components/staff/AvailabilitySummary';
import { EventStaffPanel } from '@/components/staff/EventStaffPanel';
import { staffStrings } from '@/lib/staff';
import { formatDate, formatRange, formatTime, isUpcoming, localParts } from '@/lib/format';
import { hrefFor } from '@/lib/nav';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export default async function EventPage({ params, searchParams }: PageProps<'/c/[choir]/calendar/[id]'>) {
  const { choir, id } = await params;
  const { created } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const [{ data: e }, { data: report }, { data: reply }, { data: setList }, { data: sections }, { data: charts }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle(),
    supabase.from('absence_reports').select('kind, reason').eq('event_id', id).eq('person_id', ctx.personId).maybeSingle(),
    supabase.from('availability_replies').select('answer, comment').eq('event_id', id).eq('person_id', ctx.personId).maybeSingle(),
    supabase.from('set_list_items').select('position, pieces(id, title, composer)').eq('event_id', id).order('position'),
    supabase.from('sections').select('id, key').eq('organization_id', ctx.org.id),
    supabase.from('seating_charts').select('id, name, layout, seating_positions(person_id, row_label, seat)').eq('event_id', id).not('published_at', 'is', null),
  ]);
  if (!e) notFound();
  const chart = charts?.[0];
  const layoutRows = (chart?.layout as { rows?: { label: string; seats: number }[] } | null)?.rows ?? [];
  const myPos = chart?.seating_positions.find((p) => p.person_id === ctx.personId);

  const type = EVENT_TYPES[e.type];
  const upcoming = isUpcoming(e.starts_at);
  const calledKeys = e.section_ids.map((sid) => sections?.find((s) => s.id === sid)?.key).filter((k): k is string => Boolean(k));
  const runningOrder = Array.isArray(e.running_order) ? (e.running_order as { time?: string; item?: string; who?: string }[]) : [];
  const showAttendance = upcoming && !e.cancelled_at && e.type !== 'deadline' && !ctx.isStaff;

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <Button variant="ghost" size="sm" iconStart="arrow-left" href={hrefFor(choir, 'calendar')}>
        {t.member.calendarTitle}
      </Button>
      <header className="event-head">
        <DateLeaf date={localParts(e.starts_at).date} red={type.red} locale={lang === 'fr' ? 'fr-CA' : 'en-CA'} />
        <div className="stack" style={{ gap: 6 }}>
          <span className={'overline' + (type.red ? ' overline--accent' : '')}>
            <Icon name={type.icon} size={14} /> {type[lang]}
          </span>
          <h1 className="page__title">{e.title}</h1>
          {e.cancelled_at ? (
            <Badge tone="error" icon="calendar-x" size="md">
              {t.member.cancelled}
              {e.cancel_reason ? ` · ${e.cancel_reason}` : ''}
            </Badge>
          ) : null}
        </div>
      </header>

      {ctx.isStaff && typeof created === 'string' && Number(created) > 1 ? (
        <AlertCard tone="success">{format(t.staff.createdN, { n: Number(created) })}</AlertCard>
      ) : null}

      {ctx.can('calendar', 'edit') ? (
        <Card title={t.staff.staffPanel}>
          <EventStaffPanel
            slug={choir}
            id={e.id}
            cancelled={Boolean(e.cancelled_at)}
            upcoming={upcoming}
            availabilityRequested={e.availability_requested}
            canAttendance={ctx.can('attendance') && e.counts_for_attendance}
            canSeating={ctx.can('seating') && (e.type === 'concert' || e.type === 'tour')}
            s={staffStrings(t)}
          />
        </Card>
      ) : null}

      {ctx.isStaff && ctx.can('calendar') && (e.availability_requested || upcoming) ? (
        <AvailabilitySummary orgId={ctx.org.id} event={e} lang={lang} t={t} />
      ) : null}

      <Card title={t.member.whereAndWhen}>
        <ul className="detail-list">
          <li>
            <Icon name="clock" size={18} />
            <span>{formatRange(e.starts_at, e.ends_at, lang, e.all_day)}</span>
          </li>
          {e.call_at ? (
            <li>
              <Icon name="timer" size={18} />
              <span>{format(t.member.callTime, { time: formatTime(e.call_at, lang) })}</span>
            </li>
          ) : null}
          {e.location ? (
            <li>
              <Icon name="map-pin" size={18} />
              <span>
                {e.location}
                {e.address ? `, ${e.address}` : ''}
                {e.map_url ? (
                  <>
                    {' · '}
                    <a className="cb-link" href={e.map_url} target="_blank" rel="noopener noreferrer">
                      {t.member.directions}
                    </a>
                  </>
                ) : null}
              </span>
            </li>
          ) : null}
          {e.dress_code ? (
            <li>
              <Icon name="star" size={18} />
              <span>
                {t.member.dress}: {e.dress_code}
              </span>
            </li>
          ) : null}
          {e.bring ? (
            <li>
              <Icon name="book-open" size={18} />
              <span>
                {t.member.bring}: {e.bring}
              </span>
            </li>
          ) : null}
          <li>
            <Icon name="users" size={18} />
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {t.member.callFor}:{' '}
              {calledKeys.length ? calledKeys.map((k) => <VoicePartBadge key={k} part={k} lang={lang} showLabel />) : t.member.everyone}
            </span>
          </li>
        </ul>
        {e.description ? <p style={{ marginTop: 12 }}>{e.description}</p> : null}
        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" size="sm" iconStart="download" href={`/c/${choir}/calendar/${e.id}/ics`}>
            {t.member.addToCalendar}
          </Button>
        </div>
      </Card>

      {showAttendance ? (
        <Card title={t.member.absencesTitle}>
          <AbsenceButtons
            slug={choir}
            eventId={e.id}
            reported={report ? { kind: report.kind, reason: report.reason } : null}
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
        </Card>
      ) : null}

      {showAttendance && e.availability_requested ? (
        <Card title={t.member.availabilityTitle}>
          {e.availability_due_at ? (
            <p className="muted" style={{ marginBottom: 12 }}>
              {format(t.member.availabilityDue, { date: formatDate(e.availability_due_at, lang, { weekday: 'long', month: 'long', day: 'numeric' }) })}
            </p>
          ) : null}
          <AvailabilityForm
            slug={choir}
            eventId={e.id}
            current={reply ? { answer: reply.answer, comment: reply.comment } : null}
            s={{
              title: t.member.yourAnswer,
              yes: t.member.yes,
              no: t.member.no,
              maybe: t.member.maybe,
              comment: t.member.comment,
              save: t.member.saveAnswer,
              saved: t.member.answerSaved,
              failed: t.member.genericFail,
              pastEvent: t.member.pastEvent,
            }}
          />
        </Card>
      ) : null}

      {chart ? (
        <Card title={t.member.seatingTitle}>
          <div className="stack">
            <p>
              <strong>{myPos ? format(t.member.seatingRow, { row: myPos.row_label, seat: myPos.seat }) : t.member.seatingNotPlaced}</strong>
            </p>
            {/* Rows are drawn back to front, as seen from the audience; the front row is at the bottom. */}
            <div className="seat-chart" aria-hidden="true">
              {layoutRows.map((r) => (
                <div key={r.label} className="seat-row">
                  <span className="seat-row__label">{r.label}</span>
                  {Array.from({ length: r.seats }, (_, i) => {
                    const taken = chart.seating_positions.find((p) => p.row_label === r.label && p.seat === i + 1);
                    const mine = taken?.person_id === ctx.personId;
                    return <span key={i} className={'seat' + (mine ? ' seat--me' : taken ? ' seat--taken' : '')} />;
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {runningOrder.length ? (
        <Card title={t.member.runningOrder}>
          <ol className="running-order">
            {runningOrder.map((r, i) => (
              <li key={i}>
                <span className="running-order__time cb-tabular">{r.time}</span>
                <span>
                  <strong>{r.item}</strong>
                  {r.who ? <span className="muted"> · {r.who}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {setList?.length ? (
        <Card title={t.nav.music}>
          <ol className="running-order">
            {setList.map((s) => (
              <li key={s.position}>
                <span className="running-order__time">{s.position}.</span>
                <span>
                  <strong>{s.pieces?.title}</strong>
                  {s.pieces?.composer ? <em className="muted"> · {s.pieces.composer}</em> : null}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}
