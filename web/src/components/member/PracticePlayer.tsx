'use client';

import { Button, IconButton, Select, Spinner } from '@choirbook/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { demoTrackUrl } from '@/lib/demoAudio';
import type { Voice } from '@/lib/demoMusic';

export interface PlayerTrack {
  id: string;
  label: string;
  /** S, A, T or B for a part track; null for the full choir. */
  sectionKey: string | null;
  /** A link to the real file (signed on request), or null for demo tracks. */
  src: string | null;
  /** For demo tracks: the storage path the browser renders from. */
  demoPath: string | null;
}

export interface PlayerStrings {
  title: string;
  play: string;
  pause: string;
  back: string;
  position: string;
  myPart: string;
  balance: string;
  balanceMine: string;
  balanceChoir: string;
  tempo: string;
  loop: string;
  loopStart: string;
  loopEnd: string;
  loopClear: string;
  loopHint: string;
  resumed: string;
  loading: string;
  failed: string;
}

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

async function urlFor(track: PlayerTrack): Promise<string> {
  if (track.src) return track.src;
  if (track.demoPath) return demoTrackUrl(track.demoPath, (track.sectionKey as Voice | null) ?? 'full');
  throw new Error('No source');
}

interface Saved {
  t: number;
  rate: number;
  balance: number;
  part: string;
}

/**
 * The practice player: your part and the full choir play together in sync.
 * Balance between them, slow down without changing pitch, loop a passage,
 * and pick up where you left off (remembered on this device).
 */
export function PracticePlayer({
  pieceId,
  parts,
  full,
  defaultPartId,
  s,
}: {
  pieceId: string;
  parts: PlayerTrack[];
  full: PlayerTrack | null;
  defaultPartId: string | null;
  s: PlayerStrings;
}) {
  const storageKey = `cb-practice:${pieceId}`;
  const partRef = useRef<HTMLAudioElement>(null);
  const fullRef = useRef<HTMLAudioElement>(null);
  const [partId, setPartId] = useState(defaultPartId ?? parts[0]?.id ?? '');
  const [loaded, setLoaded] = useState<{ key: string; part: string | null; full: string | null; failed?: boolean } | null>(null);
  const [playError, setPlayError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [balance, setBalance] = useState(0.5);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  const restoredOnce = useRef(false);

  const part = parts.find((p) => p.id === partId) ?? null;
  const loadKey = `${part?.id ?? ''}|${full?.id ?? ''}`;
  const urls = loaded?.key === loadKey && !loaded.failed ? loaded : null;
  const error = playError || (loaded?.key === loadKey && loaded.failed === true);
  const master = () => fullRef.current ?? partRef.current;
  const elements = () => [partRef.current, fullRef.current].filter((x): x is HTMLAudioElement => Boolean(x));

  // Load (or render) the audio for the chosen part and the full choir.
  useEffect(() => {
    let cancelled = false;
    Promise.all([part ? urlFor(part) : Promise.resolve(null), full ? urlFor(full) : Promise.resolve(null)])
      .then(([p, f]) => !cancelled && setLoaded({ key: loadKey, part: p, full: f }))
      .catch(() => !cancelled && setLoaded({ key: loadKey, part: null, full: null, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [part, full, loadKey]);

  // Volumes follow the balance; tempo changes keep the pitch.
  useEffect(() => {
    if (partRef.current) partRef.current.volume = fullRef.current ? Math.min(1, 2 * (1 - balance)) : 1;
    if (fullRef.current) fullRef.current.volume = partRef.current ? Math.min(1, 2 * balance) : 1;
  }, [balance, urls]);
  useEffect(() => {
    for (const el of elements()) {
      el.preservesPitch = true;
      el.playbackRate = rate;
    }
  }, [rate, urls]);

  const seek = useCallback((t: number) => {
    for (const el of [partRef.current, fullRef.current]) if (el) el.currentTime = t;
    setTime(t);
  }, []);

  const save = useCallback(
    (t: number) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ t, rate, balance, part: partId } satisfies Saved));
      } catch {
        // Ignore: remembering the position is a convenience.
      }
    },
    [storageKey, rate, balance, partId],
  );

  // Keep the two tracks together, enforce the loop, and remember the position.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let lastSave = 0;
    const tick = (now: number) => {
      const m = master();
      if (m) {
        const t = m.currentTime;
        if (loopA !== null && loopB !== null && loopB > loopA && t >= loopB) {
          seek(loopA);
        } else {
          const other = m === fullRef.current ? partRef.current : null;
          if (other && Math.abs(other.currentTime - t) > 0.06) other.currentTime = t;
          setTime(t);
        }
        if (now - lastSave > 2000) {
          save(t);
          lastSave = now;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, loopA, loopB, seek, save]);

  const toggle = async () => {
    const els = elements();
    if (playing) {
      els.forEach((el) => el.pause());
      setPlaying(false);
      save(master()?.currentTime ?? 0);
      return;
    }
    const t = master()?.currentTime ?? 0;
    els.forEach((el) => (el.currentTime = t));
    try {
      await Promise.all(els.map((el) => el.play()));
      setPlaying(true);
    } catch {
      setPlayError(true);
    }
  };

  // When the audio is ready, pick up where the member left off last time (this device only).
  const onLoaded = () => {
    const m = master();
    if (!m || !Number.isFinite(m.duration)) return;
    setDuration(m.duration);
    if (restoredOnce.current) return;
    restoredOnce.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      if (saved.part === partId) {
        setRate(saved.rate);
        setBalance(saved.balance);
      }
      if (saved.t > 1 && saved.t < m.duration - 1) {
        seek(saved.t);
        setResumedAt(saved.t);
      }
    } catch {
      // Private browsing or blocked storage: start fresh.
    }
  };

  const onEnded = () => {
    setPlaying(false);
    seek(0);
  };

  if (error) return <p className="cb-errmsg">{s.failed}</p>;

  return (
    <section className="player" aria-label={s.title}>
      {urls?.part ? <audio ref={partRef} src={urls.part} preload="auto" onLoadedMetadata={full ? undefined : onLoaded} onEnded={full ? undefined : onEnded} /> : null}
      {urls?.full ? <audio ref={fullRef} src={urls.full} preload="auto" onLoadedMetadata={onLoaded} onEnded={onEnded} /> : null}

      {!urls ? (
        <Spinner label={s.loading} />
      ) : (
        <>
          <div className="player__transport">
            <IconButton icon={playing ? 'pause' : 'play'} label={playing ? s.pause : s.play} variant="primary" round size="lg" onClick={toggle} />
            <IconButton icon="rotate-ccw" label={s.back} onClick={() => seek(Math.max(0, time - 5))} />
            <span className="player__time cb-tabular">{fmt(time)}</span>
            <span className="player__scrub">
              <input
                className="player__range"
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={time}
                aria-label={s.position}
                aria-valuetext={`${fmt(time)} / ${fmt(duration)}`}
                onChange={(e) => seek(Number(e.target.value))}
              />
              {loopA !== null && duration > 0 ? (
                <span className="player__loopbar" aria-hidden="true">
                  <span
                    style={{
                      left: `${(loopA / duration) * 100}%`,
                      width: `${(((loopB ?? duration) - loopA) / duration) * 100}%`,
                    }}
                  />
                </span>
              ) : null}
            </span>
            <span className="player__time cb-tabular">{fmt(duration)}</span>
          </div>
          {resumedAt !== null ? <p className="muted">{s.resumed.replace('{time}', fmt(resumedAt))}</p> : null}

          <div className="player__grid">
            {parts.length > 1 ? (
              <Select
                label={s.myPart}
                size="sm"
                value={partId}
                onChange={(e) => {
                  setPlaying(false);
                  setPartId(e.target.value);
                }}
                options={parts.map((p) => ({ value: p.id, label: p.label }))}
              />
            ) : null}
            {part && full ? (
              <label className="player__control">
                <span className="cb-label">{s.balance}</span>
                <input className="player__range" type="range" min={0} max={1} step={0.05} value={balance} onChange={(e) => setBalance(Number(e.target.value))} aria-valuetext={`${Math.round((1 - balance) * 100)}% ${s.balanceMine}`} />
                <span className="player__ends">
                  <span>{s.balanceMine}</span>
                  <span>{s.balanceChoir}</span>
                </span>
              </label>
            ) : null}
            <label className="player__control">
              <span className="cb-label">
                {s.tempo}: {Math.round(rate * 100)}%
              </span>
              <input className="player__range" type="range" min={0.5} max={1} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-valuetext={`${Math.round(rate * 100)}%`} />
            </label>
          </div>

          <div className="player__loop" role="group" aria-label={s.loop}>
            <span className="cb-label">{s.loop}</span>
            <Button size="sm" variant={loopA !== null ? 'tonal' : 'secondary'} onClick={() => setLoopA(time)}>
              {s.loopStart}
              {loopA !== null ? ` · ${fmt(loopA)}` : ''}
            </Button>
            <Button size="sm" variant={loopB !== null ? 'tonal' : 'secondary'} onClick={() => setLoopB(time)} disabled={loopA === null || time <= loopA}>
              {s.loopEnd}
              {loopB !== null ? ` · ${fmt(loopB)}` : ''}
            </Button>
            {loopA !== null ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setLoopA(null);
                  setLoopB(null);
                }}
              >
                {s.loopClear}
              </Button>
            ) : null}
          </div>
          <p className="muted">{s.loopHint}</p>
        </>
      )}
    </section>
  );
}
