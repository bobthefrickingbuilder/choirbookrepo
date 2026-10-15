'use client';

import * as React from 'react';
import { EVENT_TYPES, formatTime, parseISO, type CalendarEvent } from '../cards/EventCard';
import { Icon } from '../icons/Icon';
import { CalendarBar } from './MonthCalendar';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const mins = (hm: string) => {
  const [h = 0, m = 0] = hm.split(':').map(Number);
  return h * 60 + m;
};
type TimedEvent = CalendarEvent & { start: string };
function lanes(evs: TimedEvent[]) {
  const sorted = evs.slice().sort((a, b) => mins(a.start) - mins(b.start));
  const ends: number[] = [];
  const out = sorted.map((e) => {
    let l = ends.findIndex((end) => end <= mins(e.start));
    if (l < 0) {
      l = ends.length;
      ends.push(0);
    }
    ends[l] = mins(e.end || e.start) || mins(e.start) + 60;
    return {
      e,
      lane: l,
    };
  });
  return out.map((o) => ({
    ...o,
    count: ends.length,
  }));
}
export interface WeekCalendarProps {
  /** Controlled first day of the week, YYYY-MM-DD. */
  weekStart?: string;
  defaultWeekStart?: string;
  onWeekChange?: (weekStart: string) => void;
  events?: CalendarEvent[];
  startHour?: number;
  endHour?: number;
  hourHeight?: number;
  today?: string;
  /** HH:MM, for the "now" line. */
  now?: string;
  onEventClick?: (event: CalendarEvent) => void;
  locale?: string;
  tools?: React.ReactNode;
  height?: number;
  className?: string;
}

export function WeekCalendar({
  weekStart,
  defaultWeekStart,
  onWeekChange,
  events = [],
  startHour = 9,
  endHour = 22,
  hourHeight = 44,
  today,
  now,
  onEventClick,
  locale = 'en-CA',
  tools,
  height = 520,
  className = '',
}: WeekCalendarProps) {
  const lang = locale.indexOf('fr') === 0 ? 'fr' : 'en';
  const todayISO = today || iso(new Date());
  const [inner, setInner] = React.useState(defaultWeekStart || todayISO);
  const ws = parseISO(weekStart || inner);
  const days = Array.from(
    {
      length: 7,
    },
    (_, i) => new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i),
  );
  const go = (d: number) => {
    const n = iso(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + d * 7));
    setInner(n);
    if (onWeekChange) onWeekChange(n);
  };
  const hours = Array.from(
    {
      length: endHour - startHour,
    },
    (_, i) => startHour + i,
  );
  const total = (endHour - startHour) * hourHeight;
  const y = (hm: string) => ((mins(hm) - startHour * 60) / 60) * hourHeight;
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o);
  const firstDay = days[0] ?? ws;
  const lastDay = days[6] ?? ws;
  const title =
    f({
      month: 'long',
      day: 'numeric',
    }).format(firstDay) +
    ' – ' +
    f({
      month: firstDay.getMonth() === lastDay.getMonth() ? undefined : 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(lastDay);
  const nowHM = now || pad(new Date().getHours()) + ':' + pad(new Date().getMinutes());
  return (
    <div className={'cb-cal ' + className}>
      {' '}
      <CalendarBar
        title={title}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        onToday={() => {
          setInner(todayISO);
          if (onWeekChange) onWeekChange(todayISO);
        }}
        tools={tools}
        lang={lang}
      />{' '}
      <div
        className="cb-week"
        style={{
          maxHeight: height,
        }}
      >
        {' '}
        <div className="cb-week__corner" />
        {days.map((d) => (
          <div key={iso(d)} className={'cb-week__head' + (iso(d) === todayISO ? ' is-today' : '')}>
            {f({
              weekday: 'short',
            })
              .format(d)
              .replace('.', '')}{' '}
            <b>{d.getDate()}</b>
          </div>
        ))}{' '}
        <div
          className="cb-week__gutter"
          style={{
            height: total,
          }}
        >
          {hours.slice(1).map((h) => (
            <span
              key={h}
              className="cb-week__hour"
              style={{
                top: (h - startHour) * hourHeight,
              }}
            >
              {formatTime(pad(h) + ':00', locale).replace(':00', '')}
            </span>
          ))}
        </div>
        {days.map((d) => {
          const k = iso(d);
          const evs = events.filter((e): e is TimedEvent => e.date === k && !!e.start);
          return (
            <div
              key={k}
              className={'cb-week__col' + (k === todayISO ? ' is-today' : '')}
              style={{
                height: total,
                backgroundImage:
                  'repeating-linear-gradient(to bottom, transparent 0, transparent ' +
                  (hourHeight - 1) +
                  'px, var(--border-subtle) ' +
                  (hourHeight - 1) +
                  'px, var(--border-subtle) ' +
                  hourHeight +
                  'px)',
              }}
            >
              {lanes(evs).map(({ e, lane, count }) => {
                const t = EVENT_TYPES[e.type ?? 'rehearsal'];
                const top = y(e.start);
                const h = Math.max(24, y(e.end || e.start) - top || hourHeight);
                return (
                  <button
                    key={e.id || e.title}
                    type="button"
                    className={'cb-wev' + (t.red ? ' cb-wev--red' : '')}
                    onClick={() => onEventClick && onEventClick(e)}
                    style={{
                      top: top + 1,
                      height: h - 2,
                      left: 'calc(' + (lane / count) * 100 + '% + 2px)',
                      width: 'calc(' + 100 / count + '% - 4px)',
                    }}
                  >
                    {' '}
                    <span className="cb-wev__t">
                      {' '}
                      <Icon name={t.icon} size={12} strokeWidth={2} />{' '}
                      <span className="cb-calev__t">{e.title}</span>
                    </span>{' '}
                    <span className="cb-wev__m">
                      {formatTime(e.start, locale)}
                      {e.end ? '–' + formatTime(e.end, locale) : ''}
                    </span>
                    {h > 56 && e.location ? <span className="cb-wev__m">{e.location}</span> : null}
                  </button>
                );
              })}
              {k === todayISO && mins(nowHM) >= startHour * 60 && mins(nowHM) <= endHour * 60 ? (
                <span
                  className="cb-week__now"
                  style={{
                    top: y(nowHM),
                  }}
                  aria-label={(lang === 'fr' ? 'Maintenant ' : 'Now ') + formatTime(nowHM, locale)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
