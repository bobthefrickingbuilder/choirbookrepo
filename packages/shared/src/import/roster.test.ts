import { describe, expect, it } from 'vitest';
import { csvCell, parseCsv, toCsv } from './csv';
import { parseDate, readRosterCsv, type ImportContext } from './roster';

const ctx: ImportContext = {
  existingEmails: ['Ella.Martin@example.com'],
  sections: [
    { key: 'S', names: ['Soprano', 'Sopranos'] },
    { key: 'A', names: ['Alto', 'Altos'] },
    { key: 'T', names: ['Tenor', 'Ténors'] },
    { key: 'B', names: ['Bass', 'Basses'] },
  ],
  voiceParts: [
    { key: 'S1', sectionKey: 'S', names: ['Soprano 1'] },
    { key: 'A2', sectionKey: 'A', names: ['Alto 2'] },
  ],
  today: '2026-10-15',
};

describe('CSV reading', () => {
  it('handles quotes, embedded commas and line breaks, BOM and CRLF', () => {
    const rows = parseCsv('﻿Name,Note\r\n"Roy, Sam","Said ""hi""\nthen left"\r\n');
    expect(rows).toEqual([
      ['Name', 'Note'],
      ['Roy, Sam', 'Said "hi"\nthen left'],
    ]);
  });

  it('detects semicolons (French Excel) and tabs', () => {
    expect(parseCsv('Prénom;Nom\nÉlise;Roy')[1]).toEqual(['Élise', 'Roy']);
    expect(parseCsv('a\tb\n1\t2')[1]).toEqual(['1', '2']);
  });

  it('writes CSV that spreadsheets open safely', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('Roy, Sam')).toBe('"Roy, Sam"');
    expect(toCsv(['a'], [['é']])).toBe('﻿a\r\né\r\n');
  });
});

describe('dates', () => {
  it('accepts unambiguous formats in English and French', () => {
    expect(parseDate('2009-03-04')).toBe('2009-03-04');
    expect(parseDate('2009/3/4')).toBe('2009-03-04');
    expect(parseDate('4 March 2009')).toBe('2009-03-04');
    expect(parseDate('March 4th, 2009')).toBe('2009-03-04');
    expect(parseDate('4 mars 2009')).toBe('2009-03-04');
    expect(parseDate('1er août 2009')).toBe('2009-08-01');
  });

  it('refuses ambiguous or impossible dates', () => {
    expect(parseDate('03/04/2009')).toBeNull();
    expect(parseDate('2009-02-30')).toBeNull();
    expect(parseDate('soon')).toBeNull();
  });
});

describe('a messy real-world member list', () => {
  const file = [
    '',
    'FIRST NAME,last name, E-mail ,Date of Birth,Pupitre,Voice part,Parent / Tuteur,Parent email,Allergies',
    'ÉLISE,ROY,Elise.Roy@Example.com,2010-05-03,Sopranos,,Marc Roy,marc.roy@example.com,none',
    ',,,,,,,,',
    'sam,okafor,sam.okafor@example.com,14 March 2008,alto,A2,,,',
    'Mia,Tran,ELISE.ROY@example.com,2009-01-01,T,,,,',
    'Ella,Martin,ella.martin@EXAMPLE.com,,S,,,,',
    'Noah,,noah@example,03/04/2009,Baritone,,Pat Lee,pat@,',
    '   ',
    'Zoé,Côté,,2030-01-01,,Soprano 1,,,',
  ].join('\r\n');
  const result = readRosterCsv(file, ctx);
  const byLine = (n: number) => result.rows.find((r) => r.line === n)!;

  it('matches column names whatever their case, spacing or language', () => {
    expect(result.columns).toMatchObject({ first_name: 0, last_name: 1, email: 2, date_of_birth: 3, section: 4, voice_part: 5, guardian_name: 6, guardian_email: 7 });
    expect(result.unmatchedColumns).toEqual(['Allergies']);
    expect(result.missingColumns).toEqual([]);
  });

  it('skips blank rows and counts them', () => {
    expect(result.blankLines).toBe(2);
    expect(result.rows).toHaveLength(6);
  });

  it('tidies names, emails and sections', () => {
    expect(byLine(3)).toMatchObject({
      first_name: 'Élise',
      last_name: 'Roy',
      email: 'elise.roy@example.com',
      section_key: 'S',
      guardian: { first_name: 'Marc', last_name: 'Roy', email: 'marc.roy@example.com' },
      errors: [],
    });
    expect(byLine(5)).toMatchObject({ first_name: 'Sam', last_name: 'Okafor', date_of_birth: '2008-03-14', section_key: 'A', voice_part_key: 'A2', errors: [] });
  });

  it('flags duplicate emails, in the file and on the roster, whatever their case', () => {
    expect(byLine(6).errors).toEqual(['duplicate_in_file']);
    expect(byLine(7).errors).toEqual(['already_on_roster']);
  });

  it('explains every problem on a bad row, and keeps unknown sections as a warning', () => {
    expect(byLine(8).errors).toEqual(['missing_last_name', 'bad_email', 'bad_date', 'bad_guardian_email']);
    expect(byLine(8).warnings).toEqual(['unknown_section']);
  });

  it('refuses birth dates in the future and places a chorister from their voice part', () => {
    expect(byLine(10)).toMatchObject({ first_name: 'Zoé', last_name: 'Côté', errors: ['future_date'], section_key: 'S', voice_part_key: 'S1' });
  });

  it('matches section names in the singular or plural', () => {
    const only = { ...ctx, sections: [{ key: 'A', names: ['Altos'] }, { key: 'B', names: ['Basses'] }] };
    const r = readRosterCsv(['First,Last,Section', 'A,B,alto', 'C,D,Basse', 'E,F,ALTOS'].join('\n'), only);
    expect(r.rows.map((x) => x.section_key)).toEqual(['A', 'B', 'A']);
  });

  it('splits a single "Name" column', () => {
    const r = readRosterCsv('Name,Email\nAnna Maria Lopez,anna@example.com', ctx);
    expect(r.missingColumns).toEqual([]);
    expect(r.rows[0]).toMatchObject({ first_name: 'Anna Maria', last_name: 'Lopez' });
  });

  it('reports a file without name columns', () => {
    expect(readRosterCsv('Email\na@example.com', ctx).missingColumns).toEqual(['first_name', 'last_name']);
  });
});
