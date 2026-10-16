import { parseCsv } from './csv';

// Reads a member list from a spreadsheet export and checks every row before
// anything is saved. Column names are matched loosely (case, accents, spaces
// and punctuation do not matter; English and French both work). Problems are
// returned as codes the app translates, with the line number in the file.

export type RosterField =
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'date_of_birth'
  | 'pronouns'
  | 'section'
  | 'voice_part'
  | 'school'
  | 'lang'
  | 'guardian_name'
  | 'guardian_email'
  | 'guardian_phone';

const ALIASES: Record<RosterField, string[]> = {
  first_name: ['firstname', 'first', 'givenname', 'prenom'],
  last_name: ['lastname', 'last', 'surname', 'familyname', 'nom', 'nomdefamille'],
  email: ['email', 'emailaddress', 'courriel', 'adressecourriel', 'mail', 'choristeremail'],
  phone: ['phone', 'phonenumber', 'mobile', 'cell', 'telephone', 'tel', 'cellulaire'],
  date_of_birth: ['dateofbirth', 'dob', 'birthdate', 'birthday', 'datedenaissance', 'naissance'],
  pronouns: ['pronouns', 'pronoms'],
  section: ['section', 'pupitre', 'voice', 'voix'],
  voice_part: ['voicepart', 'part', 'partie'],
  school: ['school', 'ecole'],
  lang: ['language', 'lang', 'langue'],
  guardian_name: ['guardian', 'guardianname', 'parent', 'parentname', 'tuteur', 'nomduparent', 'parenttuteur'],
  guardian_email: ['guardianemail', 'parentemail', 'courrielduparent', 'courrielparent'],
  guardian_phone: ['guardianphone', 'parentphone', 'telephoneduparent', 'telephoneparent'],
};

const key = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

export type ImportIssue =
  | 'missing_first_name'
  | 'missing_last_name'
  | 'bad_email'
  | 'duplicate_in_file'
  | 'already_on_roster'
  | 'bad_date'
  | 'future_date'
  | 'unknown_section'
  | 'unknown_voice_part'
  | 'bad_guardian_email'
  | 'too_long';

export interface ImportRow {
  /** Line number in the file (the header is line 1). */
  line: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  pronouns: string | null;
  section_key: string | null;
  voice_part_key: string | null;
  school: string | null;
  lang: 'en' | 'fr';
  guardian: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  /** Problems that stop the row being imported. */
  errors: ImportIssue[];
  /** Things worth knowing that do not stop it (for example an unknown section: imported unplaced). */
  warnings: ImportIssue[];
}

export interface ImportResult {
  columns: Partial<Record<RosterField, number>>;
  unmatchedColumns: string[];
  missingColumns: RosterField[];
  rows: ImportRow[];
  blankLines: number;
}

export interface ImportContext {
  /** Emails already on the roster (any case). */
  existingEmails: Iterable<string>;
  /** Section keys and names, e.g. { S: ['s', 'soprano', 'sopranos'] }. */
  sections: { key: string; names: string[] }[];
  voiceParts: { key: string; sectionKey: string; names: string[] }[];
  /** Today as YYYY-MM-DD. */
  today: string;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MONTHS: Record<string, number> = {
  jan: 1, janv: 1, feb: 2, fev: 2, fevr: 2, mar: 3, mars: 3, apr: 4, avr: 4, may: 5, mai: 5, jun: 6, juin: 6,
  jul: 7, juil: 7, aug: 8, aou: 8, aout: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Accepts 2008-03-14, 2008/03/14, 14 March 2008, March 14 2008, 14 mars 2008. Day-month-year with only numbers is refused as ambiguous. */
export function parseDate(raw: string): string | null {
  const s = raw
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d)(st|nd|rd|th|er)\b/g, '$1');
  const month = (word: string) => MONTHS[word.slice(0, 4)] ?? MONTHS[word.slice(0, 3)] ?? 0;
  let y: number, m: number, d: number;
  let match: RegExpExecArray | null;
  if ((match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s))) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})\s+([a-z]+)\.?,?\s+(\d{4})$/.exec(s))) {
    [d, m, y] = [Number(match[1]), month(match[2]!), Number(match[3])];
  } else if ((match = /^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(s))) {
    [m, d, y] = [month(match[1]!), Number(match[2]), Number(match[3])];
  } else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (!m || y < 1900 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const titleCase = (s: string) =>
  s === s.toUpperCase() || s === s.toLowerCase()
    ? s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    : s;

const splitName = (full: string): { first: string; last: string } => {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0] ?? '', last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] ?? '' };
};

export function readRosterCsv(text: string, ctx: ImportContext): ImportResult {
  const table = parseCsv(text);
  const headerIndex = table.findIndex((r) => r.some((c) => c !== ''));
  const header = headerIndex >= 0 ? table[headerIndex]! : [];

  const columns: Partial<Record<RosterField, number>> = {};
  const unmatchedColumns: string[] = [];
  header.forEach((h, i) => {
    const k = key(h);
    const field = (Object.keys(ALIASES) as RosterField[]).find((f) => !(f in columns) && (k === key(f) || ALIASES[f].includes(k)));
    if (field) columns[field] = i;
    else if (h.trim()) unmatchedColumns.push(h.trim());
  });
  // "Name" alone, split into first and last.
  const fullNameIndex = header.findIndex((h) => ['name', 'fullname', 'nomcomplet', 'chorister', 'choriste'].includes(key(h)));
  const missingColumns = (['first_name', 'last_name'] as RosterField[]).filter((f) => columns[f] === undefined && fullNameIndex < 0);
  if (fullNameIndex >= 0) {
    const label = header[fullNameIndex]!.trim();
    const at = unmatchedColumns.indexOf(label);
    if (at >= 0) unmatchedColumns.splice(at, 1);
  }

  const existing = new Set([...ctx.existingEmails].map((e) => e.toLowerCase()));
  const seen = new Map<string, number>();
  const sectionByName = new Map<string, string>();
  // Singular or plural both work ("Alto" or "Altos", "Basse" or "Basses").
  const singular = (k: string) => (k.length > 3 ? k.replace(/s$/, '') : k);
  for (const s of ctx.sections) for (const n of [s.key, ...s.names]) {
    sectionByName.set(key(n), s.key);
    sectionByName.set(singular(key(n)), s.key);
  }
  const partByName = new Map<string, { key: string; sectionKey: string }>();
  // Keys like "S1" keep their digit, so match on letters and digits.
  const partKey = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const p of ctx.voiceParts) for (const n of [p.key, ...p.names]) partByName.set(partKey(n), p);

  const rows: ImportRow[] = [];
  let blankLines = 0;
  const get = (r: string[], f: RosterField) => {
    const i = columns[f];
    return i === undefined ? '' : (r[i] ?? '').trim();
  };

  table.slice(headerIndex + 1).forEach((r, i) => {
    const line = headerIndex + 2 + i;
    if (r.every((c) => c.trim() === '')) {
      blankLines += 1;
      return;
    }
    const errors: ImportIssue[] = [];
    const warnings: ImportIssue[] = [];

    let first = get(r, 'first_name');
    let last = get(r, 'last_name');
    if (!first && !last && fullNameIndex >= 0) ({ first, last } = splitName(r[fullNameIndex] ?? ''));
    first = titleCase(first);
    last = titleCase(last);
    if (!first) errors.push('missing_first_name');
    if (!last) errors.push('missing_last_name');

    const rawEmail = get(r, 'email').toLowerCase().replace(/^mailto:/, '');
    let email: string | null = null;
    if (rawEmail) {
      if (!EMAIL.test(rawEmail)) errors.push('bad_email');
      else if (existing.has(rawEmail)) errors.push('already_on_roster');
      else if (seen.has(rawEmail)) errors.push('duplicate_in_file');
      else {
        email = rawEmail;
        seen.set(rawEmail, line);
      }
    }

    const rawDob = get(r, 'date_of_birth');
    let dob: string | null = null;
    if (rawDob) {
      dob = parseDate(rawDob);
      if (!dob) errors.push('bad_date');
      else if (dob > ctx.today) {
        errors.push('future_date');
        dob = null;
      }
    }

    const rawSection = get(r, 'section');
    let sectionKey: string | null = null;
    if (rawSection) {
      sectionKey = sectionByName.get(key(rawSection)) ?? sectionByName.get(singular(key(rawSection))) ?? null;
      if (!sectionKey) warnings.push('unknown_section');
    }
    const rawPart = get(r, 'voice_part');
    let voicePart: string | null = null;
    if (rawPart) {
      const p = partByName.get(partKey(rawPart));
      if (p) {
        voicePart = p.key;
        sectionKey ??= p.sectionKey;
      } else warnings.push('unknown_voice_part');
    }

    const gName = get(r, 'guardian_name');
    const gEmailRaw = get(r, 'guardian_email').toLowerCase();
    const gPhone = get(r, 'guardian_phone');
    let guardian: ImportRow['guardian'] = null;
    if (gName || gEmailRaw || gPhone) {
      const g = splitName(gName);
      if (gEmailRaw && !EMAIL.test(gEmailRaw)) errors.push('bad_guardian_email');
      guardian = {
        first_name: titleCase(g.first) || titleCase(last) || '—',
        last_name: titleCase(g.last) || last || '—',
        email: gEmailRaw && EMAIL.test(gEmailRaw) ? gEmailRaw : null,
        phone: gPhone || null,
      };
    }

    const lang = /^(fr|francais|french)/.test(key(get(r, 'lang'))) ? 'fr' : 'en';
    const tooLong = [first, last, get(r, 'pronouns')].some((v) => v.length > 80) || get(r, 'school').length > 120 || get(r, 'phone').length > 40;
    if (tooLong) errors.push('too_long');

    rows.push({
      line,
      first_name: first,
      last_name: last,
      email,
      phone: get(r, 'phone') || null,
      date_of_birth: dob,
      pronouns: get(r, 'pronouns') || null,
      section_key: sectionKey,
      voice_part_key: voicePart,
      school: get(r, 'school') || null,
      lang,
      guardian,
      errors,
      warnings,
    });
  });

  return { columns, unmatchedColumns, missingColumns, rows, blankLines };
}
