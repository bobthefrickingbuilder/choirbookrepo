// Original practice material for the demo choir (no copyrighted music). One
// four-part progression, played in a different key and tempo for each piece.
// The browser turns it into learning tracks; the server draws it as a score.

export const VOICES = ['S', 'A', 'T', 'B'] as const;
export type Voice = (typeof VOICES)[number];

/** MIDI notes [soprano, alto, tenor, bass], in C major. */
const PROGRESSION: [number, number, number, number][] = [
  [72, 67, 64, 48], [71, 67, 62, 43], [72, 69, 64, 45], [72, 69, 65, 41],
  [72, 67, 64, 48], [74, 69, 65, 50], [74, 67, 59, 43], [72, 67, 64, 48],
  [69, 65, 60, 41], [67, 64, 60, 48], [67, 62, 59, 43], [69, 64, 60, 45],
  [69, 65, 60, 41], [67, 65, 59, 43], [67, 64, 60, 48], [72, 67, 64, 48],
];

export interface DemoPiece {
  key: string;
  transpose: number;
  bpm: number;
  beatsPerChord: number;
  chords: [number, number, number, number][];
}

const SETTINGS: Record<string, { transpose: number; bpm: number }> = {
  ubi: { transpose: 5, bpm: 66 },
  bogo: { transpose: 2, bpm: 60 },
  seal: { transpose: 7, bpm: 72 },
  swallow: { transpose: 4, bpm: 84 },
  winter: { transpose: 3, bpm: 70 },
};

/** The demo piece for a storage path such as "demo/tracks/bogo-alto.wav" or "demo/scores/bogo.pdf". */
export function demoPieceFor(path: string): DemoPiece | null {
  const key = path.match(/^demo\/(?:tracks|scores)\/([a-z]+)/)?.[1];
  if (!key) return null;
  const s = SETTINGS[key];
  if (!s) return null;
  // The progression twice: long enough to practise looping a passage.
  const chords = [...PROGRESSION, ...PROGRESSION].map((c) => c.map((n) => n + s.transpose) as [number, number, number, number]);
  return { key, transpose: s.transpose, bpm: s.bpm, beatsPerChord: 2, chords };
}

/** Which voice a demo track path is for ("full" for the whole choir). */
export function demoVoiceFor(path: string): Voice | 'full' {
  const part = path.match(/-(full|soprano|alto|tenor|bass)\.wav$/)?.[1];
  return part === 'soprano' ? 'S' : part === 'alto' ? 'A' : part === 'tenor' ? 'T' : part === 'bass' ? 'B' : 'full';
}

export const isDemoPath = (path: string) => path.startsWith('demo/');

export const pieceSeconds = (p: DemoPiece) => (p.chords.length * p.beatsPerChord * 60) / p.bpm;
