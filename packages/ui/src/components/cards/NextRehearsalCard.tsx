import * as React from 'react';
import { Icon } from '../icons/Icon';
import { formatTime, parseISO } from './EventCard';

export interface FocusPiece {
  title: string;
  composer?: string;
  note?: string;
}

export interface NextRehearsalCardProps {
  overline?: string;
  /** Near-term relative label such as "Tonight". */
  when?: string;
  /** ISO date YYYY-MM-DD. */
  date?: string;
  /** 24-hour HH:MM. */
  start?: string;
  end?: string;
  callTime?: string;
  location?: React.ReactNode;
  address?: React.ReactNode;
  mapHref?: string;
  bring?: React.ReactNode;
  pieces?: FocusPiece[];
  countdown?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  locale?: string;
  className?: string;
}

export function NextRehearsalCard({
  overline,
  when,
  date,
  start,
  end,
  callTime,
  location,
  address,
  mapHref,
  bring,
  pieces = [],
  countdown,
  status,
  actions,
  locale = 'en-CA',
  className = '',
}: NextRehearsalCardProps) {
  const fr = locale.indexOf('fr') === 0;
  const t = fr
    ? {
        over: 'Prochaine répétition',
        where: 'Lieu',
        call: 'Heure d’arrivée',
        bring: 'À apporter',
        focus: 'Au programme',
        dir: 'Itinéraire',
      }
    : {
        over: 'Next rehearsal',
        where: 'Where',
        call: 'Call time',
        bring: 'Bring',
        focus: 'Focus pieces',
        dir: 'Directions',
      };
  const longDate = date
    ? new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(parseISO(date))
    : '';
  const time = start ? formatTime(start, locale) + (end ? '–' + formatTime(end, locale) : '') : '';
  return (
    <section className={'cb-card cb-next ' + className} aria-label={overline || t.over}>
      {' '}
      <div className="cb-next__top">
        {' '}
        <span className="cb-next__over">{overline || t.over}</span>
        {countdown ? (
          <span className="cb-badge cb-badge--accent cb-badge--md">
            {' '}
            <Icon name="timer" size={15} strokeWidth={2.25} />
            {countdown}
          </span>
        ) : null}
      </div>{' '}
      <div>
        {' '}
        <div className="cb-next__when">{when || longDate}</div>{' '}
        <div className="cb-next__date">
          {when ? longDate + ' · ' : ''}
          {time}
        </div>
      </div>{' '}
      <div className="cb-next__grid">
        {location ? (
          <div className="cb-next__item">
            {' '}
            <Icon name="map-pin" size={18} />{' '}
            <div>
              {' '}
              <div className="cb-next__k">{t.where}</div> <div className="cb-next__v">{location}</div>
              {address ? (
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-3)',
                  }}
                >
                  {address}
                  {mapHref ? (
                    <>
                      {' \xB7 '}{' '}
                      <a className="cb-link" href={mapHref}>
                        {t.dir}
                      </a>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {callTime ? (
          <div className="cb-next__item">
            {' '}
            <Icon name="clock" size={18} />{' '}
            <div>
              {' '}
              <div className="cb-next__k">{t.call}</div>{' '}
              <div className="cb-next__v cb-tabular">{formatTime(callTime, locale)}</div>
            </div>
          </div>
        ) : null}
        {bring ? (
          <div className="cb-next__item">
            {' '}
            <Icon name="book-open" size={18} />{' '}
            <div>
              {' '}
              <div className="cb-next__k">{t.bring}</div> <div className="cb-next__v">{bring}</div>
            </div>
          </div>
        ) : null}
        {pieces.length ? (
          <div className="cb-next__item">
            {' '}
            <Icon name="music" size={18} />{' '}
            <div>
              {' '}
              <div className="cb-next__k">{t.focus}</div>{' '}
              <ul className="cb-next__pieces">
                {pieces.map((p) => (
                  <li key={p.title} className="cb-next__piece">
                    {' '}
                    <span>{p.title}</span>
                    {p.composer ? <em>{p.composer}</em> : null}
                    {p.note ? <small>{p.note}</small> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
      {status || actions ? (
        <div className="cb-next__actions">
          {actions}
          {status ? (
            <span
              style={{
                marginLeft: 'auto',
              }}
            >
              {status}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
