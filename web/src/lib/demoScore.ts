import type { DemoPiece } from './demoMusic';

// Draws a simple two-page practice score (SATB on treble and bass staves) as a
// PDF, straight from the demo piece's notes. Hand-written PDF: no libraries.

const PAGE_W = 612;
const PAGE_H = 792;
const LINE_GAP = 6; // space between staff lines
const CHORDS_PER_SYSTEM = 8;
const SYSTEMS_PER_PAGE = 2;

// Diatonic step of a MIDI note (C4 = 0). Accidentals are rounded down to the natural.
const STEP_IN_OCTAVE = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const diatonic = (midi: number) => (Math.floor(midi / 12) - 5) * 7 + (STEP_IN_OCTAVE[midi % 12] ?? 0);

// PDF base fonts are Latin-1 only: fold accents and curly quotes to plain ASCII.
const esc = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[\\()]/g, (c) => `\\${c}`)
    .replace(/[^\x20-\x7e]/g, '?');

function noteHead(x: number, y: number) {
  // A filled ellipse from four Bézier curves.
  const rx = 4.2;
  const ry = 3.2;
  const k = 0.5523;
  return [
    `${x + rx} ${y} m`,
    `${x + rx} ${y + ry * k} ${x + rx * k} ${y + ry} ${x} ${y + ry} c`,
    `${x - rx * k} ${y + ry} ${x - rx} ${y + ry * k} ${x - rx} ${y} c`,
    `${x - rx} ${y - ry * k} ${x - rx * k} ${y - ry} ${x} ${y - ry} c`,
    `${x + rx * k} ${y - ry} ${x + rx} ${y - ry * k} ${x + rx} ${y} c f`,
  ].join('\n');
}

function staff(x0: number, x1: number, bottom: number) {
  return Array.from({ length: 5 }, (_, i) => `${x0} ${bottom + i * LINE_GAP} m ${x1} ${bottom + i * LINE_GAP} l S`).join('\n');
}

/** Ledger lines for a note outside its staff. */
function ledgers(x: number, step: number, bottomStep: number, bottomY: number) {
  const out: string[] = [];
  const topStep = bottomStep + 8;
  for (let s = topStep + 2; s <= step; s += 2) {
    const y = bottomY + ((s - bottomStep) * LINE_GAP) / 2;
    out.push(`${x - 7} ${y} m ${x + 7} ${y} l S`);
  }
  for (let s = bottomStep - 2; s >= step; s -= 2) {
    const y = bottomY + ((s - bottomStep) * LINE_GAP) / 2;
    out.push(`${x - 7} ${y} m ${x + 7} ${y} l S`);
  }
  return out.join('\n');
}

function pageContent(piece: DemoPiece, title: string, composer: string, pageIndex: number, pages: number) {
  const ops: string[] = ['0.1 0.09 0.08 rg 0.1 0.09 0.08 RG 0.6 w'];
  const text = (x: number, y: number, size: number, s: string, font = 'F1') => ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`);

  if (pageIndex === 0) {
    text(72, PAGE_H - 90, 22, title, 'F2');
    text(72, PAGE_H - 112, 11, composer);
    text(72, PAGE_H - 128, 9, 'Practice score for the Choirbook demo. Original exercise, not the published work.');
  }
  text(PAGE_W - 120, 36, 9, `Page ${pageIndex + 1} of ${pages}`);

  const x0 = 72;
  const x1 = PAGE_W - 60;
  // Treble: bottom line E4 (step 2). Bass: bottom line G2 (step -10).
  const TREBLE_BOTTOM = 2;
  const BASS_BOTTOM = -10;
  for (let sys = 0; sys < SYSTEMS_PER_PAGE; sys++) {
    const top = PAGE_H - 200 - sys * 260;
    const trebleY = top - 24;
    const bassY = top - 110;
    ops.push(staff(x0, x1, trebleY), staff(x0, x1, bassY));
    ops.push(`${x0} ${bassY} m ${x0} ${trebleY + 4 * LINE_GAP} l S`);
    text(x0 - 34, trebleY + 8, 9, 'S A');
    text(x0 - 34, bassY + 8, 9, 'T B');

    const first = (pageIndex * SYSTEMS_PER_PAGE + sys) * CHORDS_PER_SYSTEM;
    const chords = piece.chords.slice(first, first + CHORDS_PER_SYSTEM);
    const slot = (x1 - x0 - 30) / CHORDS_PER_SYSTEM;
    text(x0 + 2, trebleY + 4 * LINE_GAP + 10, 8, String(first / 4 + 1));
    chords.forEach((chord, i) => {
      const x = x0 + 30 + i * slot + slot / 2;
      if (i % 4 === 0 && i > 0) ops.push(`${x - slot / 2} ${bassY} m ${x - slot / 2} ${trebleY + 4 * LINE_GAP} l S`);
      chord.forEach((midi, v) => {
        const step = diatonic(midi);
        const onTreble = v < 2;
        const bottomStep = onTreble ? TREBLE_BOTTOM : BASS_BOTTOM;
        const bottomY = onTreble ? trebleY : bassY;
        const y = bottomY + ((step - bottomStep) * LINE_GAP) / 2;
        // Lower voice on each staff sits slightly left so unisons stay readable.
        const nx = x + (v % 2 === 1 ? -3 : 3);
        ops.push(ledgers(nx, step, bottomStep, bottomY), noteHead(nx, y));
      });
    });
    ops.push(`${x1} ${bassY} m ${x1} ${trebleY + 4 * LINE_GAP} l S`);
  }
  return ops.join('\n');
}

/** A complete PDF file for a demo piece. */
export function buildDemoScorePdf(piece: DemoPiece, title: string, composer: string): Uint8Array {
  const pages = Math.ceil(piece.chords.length / (CHORDS_PER_SYSTEM * SYSTEMS_PER_PAGE));
  const objects: string[] = [];
  const add = (body: string) => objects.push(body); // the new length is the 1-based object number

  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('PAGES_PLACEHOLDER');
  const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>');
  const pageRefs: number[] = [];
  for (let p = 0; p < pages; p++) {
    const stream = pageContent(piece, title, composer, p, pages);
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageRefs.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${content} 0 R /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> >>`,
      ),
    );
  }
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((r) => `${r} 0 R`).join(' ')}] /Count ${pages} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
