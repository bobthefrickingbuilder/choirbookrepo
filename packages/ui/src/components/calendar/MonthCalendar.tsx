'use client';

import * as React from 'react';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';
import type { Lang } from '../../types';
import { EVENT_TYPES, formatTime, type CalendarEvent } from '../cards/EventCard';
import { Icon } from '../icons/Icon';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export interface CalendarBarProps {
  title: React.ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  tools?: React.ReactNode;
  lang?: Lang;
}

export function CalendarBar({ title, onPrev, onNext, onToday, tools, lang = 'en' }: CalendarBarProps) {
  const fr = lang === 'fr';
  return (
    <div className="cb-cal__bar">
      {' '}
      <h2 className="cb-cal__title" aria-live="polite">
        {title}
      </h2>
      {tools}{' '}
      <div className="cb-cal__nav">
        {onToday ? (
          <Button variant="secondary" size="sm" onClick={onToday}>
            {fr ? 'Aujourd’hui' : 'Today'}
          </Button>
        ) : null}{' '}
        <IconButton icon="chevron-left" label={fr ? 'Précédent' : 'Previous'} onClick={onPrev} size="sm" />{' '}
        <IconButton icon="chevron-right" label={fr ? 'Suivant' : 'Next'} onClick={onNext} size="sm" />
      </div>
    </div>
  );
}
export interface MonthCalendarProps {
  /** Controlled month, YYYY-MM. */
  month?: string;
  defaultMonth?: string;
  onMonthChange?: (month: string) => void;
  events?: CalendarEvent[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  today?: string;
  locale?: string;
  /** 0 = Sunday. */
  weekStartsOn?: number;
  maxPerDay?: number;
  tools?: React.ReactNode;
  className?: string;
}

export function MonthCalendar({
  month,
  defaultMonth,
  onMonthChange,
  events = [],
  selectedDate,
  onSelectDate,
  onEventClick,
  today,
  locale = 'en-CA',
  weekStartsOn = 0,
  maxPerDay = 3,
  tools,
  className = '',
}: MonthCalendarProps) {
  const lang = locale.indexOf('fr') === 0 ? 'fr' : 'en';
  const todayISO = today || iso(new Date());
  const [inner, setInner] = React.useState(defaultMonth || todayISO.slice(0, 7));
  const m = month || inner;
  const [y = 1970, mo = 1] = m.split('-').map(Number);
  const first = new Date(y, mo - 1, 1);
  const go = (d: number) => {
    const n = new Date(y, mo - 1 + d, 1);
    const s = n.getFullYear() + '-' + pad(n.getMonth() + 1);
    setInner(s);
    if (onMonthChange) onMonthChange(s);
  };
  const toToday = () => {
    const s = todayISO.slice(0, 7);
    setInner(s);
    if (onMonthChange) onMonthChange(s);
  };
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const weeks = Math.ceil((offset + new Date(y, mo, 0).getDate()) / 7);
  const cells = Array.from(
    {
      length: weeks * 7,
    },
    (_, i) => new Date(y, mo - 1, 1 - offset + i),
  );
  const dowF = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
  });
  const byDay: Record<string, CalendarEvent[]> = {};
  events.forEach((e) => {
    (byDay[e.date] = byDay[e.date] || []).push(e);
  });
  Object.values(byDay).forEach((list) => list.sort((a, b) => (a.start || '').localeCompare(b.start || '')));
  return (
    <div className={'cb-cal ' + className}>
      {' '}
      <CalendarBar
        title={new Intl.DateTimeFormat(locale, {
          month: 'long',
          year: 'numeric',
        }).format(first)}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        onToday={toToday}
        tools={tools}
        lang={lang}
      />{' '}
      <div className="cb-month" role="grid">
        {Array.from(
          {
            length: 7,
          },
          (_, i) => (
            <div key={i} className="cb-month__dow" role="columnheader">
              {dowF.format(new Date(2026, 1, 1 + ((i + weekStartsOn) % 7))).replace('.', '')}
            </div>
          ),
        )}
        {cells.map((d) => {
          const k = iso(d);
          const evs = byDay[k] || [];
          const cls = [
            'cb-month__cell',
            d.getMonth() !== mo - 1 && 'is-outside',
            k === todayISO && 'is-today',
            k === selectedDate && 'is-selected',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={k} className={cls} role="gridcell" aria-selected={k === selectedDate || undefined}>
              {' '}
              <button
                type="button"
                className="cb-month__num"
                onClick={() => onSelectDate && onSelectDate(k)}
                aria-label={
                  new Intl.DateTimeFormat(locale, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  }).format(d) +
                  (evs.length
                    ? ', ' +
                      evs.length +
                      (lang === 'fr' ? ' événement(s)' : ' event' + (evs.length > 1 ? 's' : ''))
                    : '')
                }
              >
                {d.getDate()}
              </button>{' '}
              <div
                className="cb-month__evs"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                }}
              >
                {evs.slice(0, maxPerDay).map((e) => {
                  const t = EVENT_TYPES[e.type ?? 'rehearsal'];
                  return (
                    <button
                      key={e.id || e.title}
                      type="button"
                      className={'cb-calev' + (t.red ? ' cb-calev--red' : '')}
                      onClick={() => onEventClick && onEventClick(e)}
                      title={e.title}
                    >
                      {' '}
                      <Icon name={t.icon} size={12} strokeWidth={2} />
                      {e.start ? (
                        <span className="cb-calev__time">
                          {formatTime(e.start, locale).replace(/\s?[ap]\.?m\.?/i, '')}
                        </span>
                      ) : null}{' '}
                      <span className="cb-calev__t">{e.title}</span>
                    </button>
                  );
                })}
              </div>
              {evs.length > maxPerDay ? (
                <button
                  type="button"
                  className="cb-month__more"
                  onClick={() => onSelectDate && onSelectDate(k)}
                >
                  +{evs.length - maxPerDay} {lang === 'fr' ? 'de plus' : 'more'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
