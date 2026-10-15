import * as React from 'react';
import { Badge } from '../badges/Badge';
import { VoicePartBadge } from '../badges/VoicePartBadge';
import { EVENT_TYPES, formatTime, parseISO, type CalendarEvent } from '../cards/EventCard';
import { Icon } from '../icons/Icon';

export interface AgendaListProps {
  events?: CalendarEvent[];
  /** ISO date (YYYY-MM-DD) treated as today. */
  today?: string;
  onEventClick?: (event: CalendarEvent) => void;
  locale?: string;
  className?: string;
}

export function AgendaList({ events = [], today, onEventClick, locale = 'en-CA', className = '' }: AgendaListProps) {
  const lang = locale.indexOf('fr') === 0 ? 'fr' : 'en';
  const pad = (n: number) => String(n).padStart(2, '0');
  const t0 = today ? parseISO(today) : new Date();
  const todayISO = t0.getFullYear() + '-' + pad(t0.getMonth() + 1) + '-' + pad(t0.getDate());
  const tm = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + 1);
  const tomorrowISO = tm.getFullYear() + '-' + pad(tm.getMonth() + 1) + '-' + pad(tm.getDate());
  const groups: Record<string, CalendarEvent[]> = {};
  events
    .slice()
    .sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')))
    .forEach((e) => {
      (groups[e.date] = groups[e.date] || []).push(e);
    });
  return (
    <div className={'cb-agenda ' + className}>
      {Object.keys(groups).map((date) => (
        <section key={date} className="cb-agenda__day" aria-label={date}>
          {' '}
          <h3 className="cb-agenda__date">
            {new Intl.DateTimeFormat(locale, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(parseISO(date))}
            {date === todayISO ? (
              <Badge tone="accent" solid={true}>
                {lang === 'fr' ? 'Aujourd’hui' : 'Today'}
              </Badge>
            ) : date === tomorrowISO ? (
              <Badge tone="neutral">{lang === 'fr' ? 'Demain' : 'Tomorrow'}</Badge>
            ) : null}
          </h3>
          {(groups[date] ?? []).map((e) => {
            const t = EVENT_TYPES[e.type ?? 'rehearsal'];
            const Tag = onEventClick ? 'button' : 'div';
            return (
              <Tag
                key={e.id || e.title}
                type={onEventClick ? 'button' : undefined}
                className="cb-agenda__row"
                onClick={onEventClick ? () => onEventClick(e) : undefined}
              >
                {' '}
                <span className="cb-agenda__time">
                  {e.start ? formatTime(e.start, locale) : lang === 'fr' ? 'Toute la journée' : 'All day'}
                  {e.end ? <small>{formatTime(e.end, locale)}</small> : null}
                </span>{' '}
                <span
                  className={'cb-agenda__icon' + (t.red ? ' cb-agenda__icon--red' : '')}
                  aria-hidden="true"
                >
                  {' '}
                  <Icon name={t.icon} size={16} />
                </span>{' '}
                <span
                  style={{
                    minWidth: 0,
                  }}
                >
                  {' '}
                  <span
                    className="cb-agenda__title"
                    style={{
                      display: 'block',
                    }}
                  >
                    {e.title}
                  </span>{' '}
                  <span className="cb-agenda__meta">
                    {' '}
                    <span>{t[lang]}</span>
                    {e.location ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {' '}
                        <Icon name="map-pin" size={13} />
                        {e.location}
                      </span>
                    ) : null}
                    {e.parts ? e.parts.map((p) => <VoicePartBadge key={p} part={p} lang={lang} />) : null}
                  </span>
                </span>
                {e.status ? <span>{e.status}</span> : <span />}
              </Tag>
            );
          })}
        </section>
      ))}
    </div>
  );
}
