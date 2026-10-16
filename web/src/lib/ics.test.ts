import { describe, expect, it } from 'vitest';
import { buildIcs } from './ics';

describe('buildIcs', () => {
  const ics = buildIcs('Maple Valley Youth Choir', [
    {
      id: 'e1',
      title: 'Rehearsal 6; full choir, bring folders',
      startsAt: '2026-10-15T22:30:00Z',
      endsAt: '2026-10-16T00:30:00Z',
      location: 'Grace Hall, 41 Linden Street',
    },
    { id: 'e2', title: 'Annual fee due', startsAt: '2026-10-31T04:00:00Z', allDay: true },
  ]);

  it('uses CRLF line endings and wraps events in a calendar', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.split('\r\n').filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(2);
  });

  it('writes timed events in UTC', () => {
    expect(ics).toContain('DTSTART:20261015T223000Z');
    expect(ics).toContain('DTEND:20261016T003000Z');
  });

  it('writes all-day events as Toronto dates', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261031');
    expect(ics).toContain('DTEND;VALUE=DATE:20261101');
  });

  it('escapes commas and semicolons', () => {
    expect(ics).toContain('SUMMARY:Rehearsal 6\\; full choir\\, bring folders');
  });

  it('folds lines longer than 75 bytes', () => {
    const long = buildIcs('x', [{ id: 'e', title: 'é'.repeat(80), startsAt: '2026-10-15T22:30:00Z' }]);
    for (const line of long.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
