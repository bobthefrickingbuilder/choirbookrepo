import { describe, expect, it } from 'vitest';
import { addDays, localParts, zonedInstant } from './format';

describe('choir time zone', () => {
  it('turns Toronto wall-clock time into the right instant, in summer and winter', () => {
    expect(zonedInstant('2026-07-02', '18:30').toISOString()).toBe('2026-07-02T22:30:00.000Z');
    expect(zonedInstant('2026-12-03', '18:30').toISOString()).toBe('2026-12-03T23:30:00.000Z');
  });

  it('round-trips across the November daylight-saving change', () => {
    for (const date of ['2026-10-29', '2026-11-01', '2026-11-05']) {
      expect(localParts(zonedInstant(date, '19:00').toISOString())).toEqual({ date, time: '19:00' });
    }
  });

  it('adds days to a date', () => {
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
  });
});
