'use client';

import { VOICES, demoPieceFor, type Voice } from './demoMusic';

// Renders a demo learning track in the browser (no audio files are stored for
// the demo) and returns it as a WAV object URL an <audio> element can play,
// so the player's slow-down-without-changing-pitch works the same as for real files.

const SAMPLE_RATE = 22050;
const cache = new Map<string, Promise<string>>();

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (o: number, s: string) => [...s].forEach((ch, i) => view.setUint8(o + i, ch.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

async function render(path: string, voice: Voice | 'full'): Promise<string> {
  const piece = demoPieceFor(path);
  if (!piece) throw new Error(`Not a demo track: ${path}`);
  const chordSeconds = (piece.beatsPerChord * 60) / piece.bpm;
  const total = piece.chords.length * chordSeconds + 1;
  const ctx = new OfflineAudioContext(1, Math.ceil(total * SAMPLE_RATE), SAMPLE_RATE);
  const master = ctx.createGain();
  master.gain.value = voice === 'full' ? 0.16 : 0.32;
  master.connect(ctx.destination);

  VOICES.forEach((v, vi) => {
    if (voice !== 'full' && v !== voice) return;
    piece.chords.forEach((chord, i) => {
      const t0 = i * chordSeconds;
      const t1 = t0 + chordSeconds;
      const note = chord[vi] ?? 60;
      // Skip re-attacking a held note, so lines sound connected (legato).
      const prev = piece.chords[i - 1]?.[vi];
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq(note);
      // A gentle vibrato makes it less mechanical.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = freq(note) * 0.004;
      lfo.connect(lfoGain).connect(osc.frequency);
      const env = ctx.createGain();
      const attack = prev === note ? 0.005 : 0.06;
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(1, t0 + attack);
      env.gain.setValueAtTime(1, t1 - 0.06);
      env.gain.linearRampToValueAtTime(0, t1);
      osc.connect(env).connect(master);
      osc.start(t0);
      lfo.start(t0);
      osc.stop(t1);
      lfo.stop(t1);
    });
  });
  const rendered = await ctx.startRendering();
  return URL.createObjectURL(encodeWav(rendered.getChannelData(0), SAMPLE_RATE));
}

/** An object URL for a demo track ("demo/tracks/bogo-alto.wav"), rendered once per page. */
export function demoTrackUrl(path: string, voice: Voice | 'full'): Promise<string> {
  const key = `${path}|${voice}`;
  let p = cache.get(key);
  if (!p) {
    p = render(path, voice);
    cache.set(key, p);
  }
  return p;
}
