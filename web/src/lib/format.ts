import { localeFor, type Lang } from '@choirbook/shared/i18n';

// Every date and time is shown in the choir's own time zone, on the server and in
// the browser alike, so a page never changes after it loads.
export const CHOIR_TZ = 'America/Toronto';

/** "YYYY-MM-DD" and "HH:MM" for an instant, in the choir's time zone (what the calendar components take). */
export function localParts(iso: string, tz = CHOIR_TZ): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }, tz = CHOIR_TZ) {
  return new Intl.DateTimeFormat(localeFor(lang), { timeZone: tz, ...opts }).format(new Date(iso));
}

export function formatTime(iso: string, lang: Lang, tz = CHOIR_TZ) {
  return new Intl.DateTimeFormat(localeFor(lang), { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** "Wednesday, October 14 · 6:30–9:00 p.m." style range. */
export function formatRange(startIso: string, endIso: string | null, lang: Lang, allDay = false) {
  const day = formatDate(startIso, lang);
  if (allDay) return day;
  return `${day} · ${formatTime(startIso, lang)}${endIso ? `–${formatTime(endIso, lang)}` : ''}`;
}

export function formatMoney(cents: number, lang: Lang) {
  return new Intl.NumberFormat(localeFor(lang), { style: 'currency', currency: 'CAD' }).format(cents / 100);
}

/** Whole days between two YYYY-MM-DD dates. */
export function daysBetween(fromDate: string, toDate: string) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000);
}

export function todayLocal(tz = CHOIR_TZ) {
  return localParts(new Date().toISOString(), tz).date;
}

/** Has this not started yet (with a little grace, so "tonight" stays actionable until it ends)? */
export function isUpcoming(iso: string, graceHours = 3) {
  return Date.parse(iso) > Date.now() - graceHours * 3600_000;
}

/** An instant some days from now (negative for the past), as ISO text. */
export function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/**
 * The instant for a wall-clock date and time in the choir's time zone
 * ("2026-11-05", "18:30" → the matching UTC instant), daylight saving included.
 */
export function zonedInstant(date: string, time: string, tz = CHOIR_TZ): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, mi] = time.split(':').map(Number) as [number, number];
  const wanted = Date.UTC(y, m - 1, d, h, mi);
  let guess = wanted;
  // Two rounds settle the offset even across a daylight-saving change.
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(guess).toISOString(), tz);
    const shown = Date.parse(`${p.date}T${p.time}:00Z`);
    guess += wanted - shown;
  }
  return new Date(guess);
}

/** YYYY-MM-DD plus a number of days. */
export function addDays(date: string, days: number) {
  const t = Date.parse(`${date}T12:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
