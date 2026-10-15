import { describe, expect, it } from 'vitest';
import { ageOn, canSelfRegister, isMinor, todayInToronto } from './age';

describe('ageOn', () => {
  it('counts a birthday that has already happened this year', () => {
    expect(ageOn('2008-03-01', '2026-10-15')).toBe(18);
  });
  it('does not count a birthday later this year', () => {
    expect(ageOn('2008-12-01', '2026-10-15')).toBe(17);
  });
  it('turns over exactly on the birthday', () => {
    expect(ageOn('2008-10-15', '2026-10-14')).toBe(17);
    expect(ageOn('2008-10-15', '2026-10-15')).toBe(18);
  });
  it('handles a 29 February birthday in a common year', () => {
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18);
  });
});

describe('isMinor', () => {
  it('is true for a 17-year-old and false from the 18th birthday', () => {
    expect(isMinor('2009-01-01', '2026-10-15')).toBe(true);
    expect(isMinor('2008-10-15', '2026-10-15')).toBe(false);
  });
  it('treats an unknown birth date as not a minor (staff must enter one)', () => {
    expect(isMinor(null, '2026-10-15')).toBe(false);
  });
});

describe('canSelfRegister', () => {
  it('blocks anyone under 14', () => {
    expect(canSelfRegister('2013-01-01', '2026-10-15')).toBe(false);
    expect(canSelfRegister('2012-10-15', '2026-10-15')).toBe(true);
  });
});

describe('todayInToronto', () => {
  it('uses Toronto time, not UTC', () => {
    // 02:00 UTC on Oct 16 is still Oct 15 in Toronto (UTC−4 in October).
    expect(todayInToronto(new Date('2026-10-16T02:00:00Z'))).toBe('2026-10-15');
  });
});
