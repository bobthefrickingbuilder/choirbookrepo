import * as React from 'react';
import { VoicePartBadge } from '../badges/VoicePartBadge';
import { Icon, type IconName } from '../icons/Icon';

export type EventType = 'rehearsal' | 'sectional' | 'concert' | 'tour' | 'social' | 'deadline';

/** The shape the calendar components take for one event. */
export interface CalendarEvent {
  id?: string;
  type?: EventType;
  title: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** 24-hour HH:MM; omit for all-day. */
  start?: string;
  end?: string;
  location?: string;
  /** Voice parts called, e.g. ["T", "B"]. */
  parts?: string[];
  status?: React.ReactNode;
  cancelled?: boolean;
}

export const EVENT_TYPES: Record<EventType, { icon: IconName; en: string; fr: string; red?: boolean }> = {
  rehearsal: {
    icon: 'music',
    en: 'Rehearsal',
    fr: 'Répétition',
  },
  sectional: {
    icon: 'mic-vocal',
    en: 'Sectional',
    fr: 'Partielle',
  },
  concert: {
    icon: 'ticket',
    en: 'Performance',
    fr: 'Concert',
    red: true,
  },
  tour: {
    icon: 'bus',
    en: 'Tour',
    fr: 'Tournée',
    red: true,
  },
  social: {
    icon: 'party-popper',
    en: 'Social',
    fr: 'Activité sociale',
  },
  deadline: {
    icon: 'clipboard-check',
    en: 'Deadline',
    fr: 'Échéance',
  },
};
/** Formats a 24-hour "HH:MM" string as a localised clock time. */
export function formatTime(hm: string | undefined, locale: string): string {
  if (!hm) return '';
  const [h = 0, m = 0] = hm.split(':').map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2026, 0, 1, h, m));
}

/** Parses "YYYY-MM-DD" as a local date (new Date(iso) would use UTC and can shift the day). */
export function parseISO(iso: string): Date {
  const [y = 1970, mo = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

export function DateLeaf({ date, red = false, locale = 'en-CA' }: { date: string; red?: boolean; locale?: string }) {
  const d = parseISO(date);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o).format(d).replace('.', '');
  return (
    <span className={'cb-leaf' + (red ? ' cb-leaf--red' : '')} aria-hidden="true">
      {' '}
      <span className="cb-leaf__dow">
        {f({
          weekday: 'short',
        })}
      </span>{' '}
      <span className="cb-leaf__day">{d.getDate()}</span>{' '}
      <span className="cb-leaf__mon">
        {f({
          month: 'short',
        })}
      </span>
    </span>
  );
}
export interface EventCardProps extends Omit<CalendarEvent, 'id' | 'cancelled'> {
  href?: string;
  onClick?: () => void;
  note?: React.ReactNode;
  locale?: string;
  flat?: boolean;
  className?: string;
}

export function EventCard({
  type = 'rehearsal',
  title,
  date,
  start,
  end,
  location,
  parts,
  status,
  href,
  onClick,
  note,
  locale = 'en-CA',
  flat = false,
  className = '',
}: EventCardProps) {
  const lang = locale.indexOf('fr') === 0 ? 'fr' : 'en';
  const t = EVENT_TYPES[type];
  const longDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(parseISO(date));
  const time = start ? formatTime(start, locale) + (end ? '–' + formatTime(end, locale) : '') : '';
  const clickable = href || onClick;
  return (
    <article
      className={[
        'cb-card',
        'cb-event',
        flat && 'cb-card--flat',
        clickable && 'cb-card--interactive',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {' '}
      <DateLeaf date={date} red={t.red} locale={locale} />{' '}
      <div
        style={{
          minWidth: 0,
        }}
      >
        {' '}
        <div className={'cb-event__type' + (t.red ? ' cb-event__type--red' : '')}>
          {' '}
          <Icon name={t.icon} size={14} strokeWidth={2} />
          {t[lang]}
        </div>{' '}
        <h3 className="cb-event__title">
          {clickable ? (
            <a
              className="cb-card__stretch"
              href={href || '#'}
              onClick={
                onClick
                  ? (e) => {
                      e.preventDefault();
                      onClick();
                    }
                  : undefined
              }
            >
              {title}
            </a>
          ) : (
            title
          )}
        </h3>{' '}
        <div className="cb-meta">
          {' '}
          <span className="cb-sr-only">{longDate}</span>
          {time ? (
            <span className="cb-meta__item">
              {' '}
              <Icon name="clock" size={16} />
              {time}
            </span>
          ) : null}
          {location ? (
            <span className="cb-meta__item">
              {' '}
              <Icon name="map-pin" size={16} />
              {location}
            </span>
          ) : null}
        </div>
        {parts || status || note ? (
          <div className="cb-event__foot">
            {parts ? parts.map((p) => <VoicePartBadge key={p} part={p} lang={lang} />) : null}
            {note ? (
              <span
                style={{
                  color: 'var(--text-3)',
                  fontSize: 13,
                }}
              >
                {note}
              </span>
            ) : null}
            {status ? (
              <span
                style={{
                  marginLeft: 'auto',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {status}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
