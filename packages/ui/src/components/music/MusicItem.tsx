import * as React from 'react';
import { Badge } from '../badges/Badge';
import { Button } from '../buttons/Button';
import { Icon } from '../icons/Icon';
import type { Lang } from '../../types';
import { AudioPlayer } from './AudioPlayer';

export interface MusicTrack {
  label: string;
  part?: string;
  src?: string;
  /** Seconds. */
  duration?: number;
}

export interface MusicItemProps {
  title: string;
  composer?: string;
  arranger?: string;
  voicing?: string;
  duration?: string;
  language?: string;
  scoreHref?: string;
  scoreSize?: string;
  tracks?: MusicTrack[];
  due?: string;
  lang?: Lang;
  className?: string;
}

export function MusicItem({
  title,
  composer,
  arranger,
  voicing,
  duration,
  language,
  scoreHref,
  scoreSize,
  tracks = [],
  due,
  lang = 'en',
  className = '',
}: MusicItemProps) {
  const fr = lang === 'fr';
  const L = fr
    ? {
        score: 'Partition',
        tracks: 'Pistes d’apprentissage',
        arr: 'arr.',
        due: 'Par cœur pour le',
      }
    : {
        score: 'Score',
        tracks: 'Learning tracks',
        arr: 'arr.',
        due: 'Memorise by',
      };
  return (
    <article className={'cb-card cb-music ' + className}>
      {' '}
      <div className="cb-music__head">
        {' '}
        <span className="cb-music__icon" aria-hidden="true">
          {' '}
          <Icon name="file-music" size={22} />
        </span>{' '}
        <div
          style={{
            minWidth: 0,
          }}
        >
          {' '}
          <h3 className="cb-music__title">{title}</h3>
          {composer || arranger ? (
            <div className="cb-music__by">
              {composer}
              {arranger ? (composer ? ', ' : '') + L.arr + ' ' + arranger : ''}
            </div>
          ) : null}{' '}
          <div className="cb-music__meta">
            {voicing ? <Badge tone="neutral">{voicing}</Badge> : null}
            {duration ? <span>{duration}</span> : null}
            {language ? <span>{language}</span> : null}
            {due ? (
              <Badge tone="accent" icon="calendar-check">
                {L.due} {due}
              </Badge>
            ) : null}
          </div>
        </div>
        {scoreHref ? (
          <Button
            variant="secondary"
            size="sm"
            iconStart="file-text"
            href={scoreHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {L.score}
            {' (PDF'}
            {scoreSize ? ', ' + scoreSize : ''})
          </Button>
        ) : null}
      </div>
      {tracks.length ? (
        <div className="cb-music__tracks">
          {' '}
          <div className="cb-music__tracks-h">{L.tracks}</div>
          {tracks.map((tr) => (
            <AudioPlayer
              key={tr.label}
              part={tr.part}
              label={tr.label}
              src={tr.src}
              duration={tr.duration}
              lang={lang}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
