// Age and minor-status rules. The database computes the same thing in
// public.is_minor(); keep the two in step (tests cover both).

/** Age of majority used for guardian handling (Ontario and Quebec are both 18). */
export const AGE_OF_MAJORITY = 18;
/** Youngest age that may consent and register without a guardian flow (Quebec Law 25). */
export const MIN_SELF_CONSENT_AGE = 14;

/** Today's date in Canada/Eastern as YYYY-MM-DD, so a birthday flips at local midnight. */
export function todayInToronto(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Whole years between a YYYY-MM-DD birth date and a YYYY-MM-DD "today". */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

export function isMinor(birthDate: string | null | undefined, today: string = todayInToronto()): boolean {
  if (!birthDate) return false;
  return ageOn(birthDate, today) < AGE_OF_MAJORITY;
}

export function canSelfRegister(birthDate: string, today: string = todayInToronto()): boolean {
  return ageOn(birthDate, today) >= MIN_SELF_CONSENT_AGE;
}
