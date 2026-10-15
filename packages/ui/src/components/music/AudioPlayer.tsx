'use client';

import * as React from 'react';
import { VoicePartBadge } from '../badges/VoicePartBadge';
import { IconButton } from '../buttons/IconButton';

import type { Lang } from '../../types';

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const RATES = [1, 0.75, 0.5];

export interface AudioPlayerProps {
  /** Without a source the player simulates playback (prototype behaviour). */
  src?: string;
  /** Seconds; replaced by the real duration once the file's metadata loads. */
  duration?: number;
  label?: string;
  part?: string;
  lang?: Lang;
  className?: string;
}

export function AudioPlayer({ src, duration = 180, label, part, lang = 'en', className = '' }: AudioPlayerProps) {
  const fr = lang === 'fr';
  const audio = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [t, setT] = React.useState(0);
  const [dur, setDur] = React.useState(duration);
  const [rate, setRate] = React.useState(1);
  const [loop, setLoop] = React.useState(false);
  React.useEffect(() => {
    if (src || !playing) return undefined;
    const id = setInterval(
      () =>
        setT((x) => {
          const n = x + 0.25 * rate;
          if (n >= dur) {
            if (loop) return 0;
            setPlaying(false);
            return dur;
          }
          return n;
        }),
      250,
    );
    return () => clearInterval(id);
  }, [playing, rate, loop, dur, src]);
  React.useEffect(() => {
    if (audio.current) audio.current.playbackRate = rate;
  }, [rate]);
  const toggle = () => {
    if (src && audio.current) {
      if (playing) audio.current.pause();
      else void audio.current.play();
    } else {
      if (t >= dur) setT(0);
      setPlaying((p) => !p);
    }
  };
  const seek = (v: number) => {
    setT(v);
    if (audio.current) audio.current.currentTime = v;
  };
  const pct = dur ? (t / dur) * 100 : 0;
  const L = fr
    ? {
        play: 'Lire',
        pause: 'Pause',
        back: 'Reculer de 5 secondes',
        loop: 'Boucle',
        seek: 'Position',
        speed: 'Vitesse',
      }
    : {
        play: 'Play',
        pause: 'Pause',
        back: 'Back 5 seconds',
        loop: 'Loop',
        seek: 'Seek',
        speed: 'Playback speed',
      };
  return (
    <div className={'cb-player' + (playing ? ' cb-player--active' : '') + ' ' + className}>
      {src ? (
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          loop={loop}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        />
      ) : null}{' '}
      <IconButton
        icon={playing ? 'pause' : 'play'}
        label={(playing ? L.pause : L.play) + (label ? ' ' + label : '')}
        variant={playing ? 'primary' : 'secondary'}
        round={true}
        onClick={toggle}
      />{' '}
      <div className="cb-player__label">
        {part ? <VoicePartBadge part={part} lang={lang} /> : null} <span>{label}</span>
      </div>{' '}
      <div className="cb-player__scrub">
        {' '}
        <span className="cb-player__time">{fmt(t)}</span>{' '}
        <span className="cb-range">
          {' '}
          <span className="cb-range__track" aria-hidden="true">
            {' '}
            <span
              className="cb-range__fill"
              style={{
                width: pct + '%',
              }}
            />
          </span>{' '}
          <input
            type="range"
            min={0}
            max={dur}
            step={0.25}
            value={t}
            onChange={(e) => seek(+e.target.value)}
            aria-label={L.seek}
            aria-valuetext={fmt(t) + ' / ' + fmt(dur)}
          />{' '}
          <span
            className="cb-range__thumb"
            aria-hidden="true"
            style={{
              left: pct + '%',
            }}
          />
        </span>{' '}
        <span className="cb-player__time">{fmt(dur)}</span>
      </div>{' '}
      <div className="cb-player__tools">
        {' '}
        <IconButton
          icon="rotate-ccw"
          label={L.back}
          size="sm"
          onClick={() => seek(Math.max(0, t - 5))}
        />{' '}
        <IconButton
          icon="repeat"
          label={L.loop}
          size="sm"
          pressed={loop}
          variant={loop ? 'tonal' : 'ghost'}
          onClick={() => setLoop((l) => !l)}
        />{' '}
        <button
          type="button"
          className="cb-rate"
          aria-label={L.speed + ' ' + rate + '×'}
          onClick={() => setRate((r) => RATES[(RATES.indexOf(r) + 1) % RATES.length] ?? 1)}
        >
          {rate}×
        </button>
      </div>
    </div>
  );
}
