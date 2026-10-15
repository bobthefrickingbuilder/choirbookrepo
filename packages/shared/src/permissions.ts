// Permission areas and levels. Mirrors the database enums app.perm_area and
// app.perm_level (supabase/migrations/*_foundations.sql); a test checks they match.

export const PERM_AREAS = [
  'dashboard',
  'roster',
  'care',
  'staff_notes',
  'calendar',
  'attendance',
  'music',
  'announcements',
  'inbox',
  'monthly_updates',
  'forms',
  'fees',
  'tickets',
  'seating',
  'volunteers',
  'reports',
  'users',
  'settings',
  'moderation',
  'audit',
] as const;
export type PermArea = (typeof PERM_AREAS)[number];

export const PERM_LEVELS = ['none', 'view', 'edit'] as const;
export type PermLevel = (typeof PERM_LEVELS)[number];

export type PermissionSet = Record<PermArea, PermLevel>;

export const BUILT_IN_ROLES = ['administrator', 'conductor', 'section_leader', 'office', 'treasurer', 'chaperone'] as const;
export type BuiltInRole = (typeof BUILT_IN_ROLES)[number];

export function atLeast(have: PermLevel | undefined, need: PermLevel): boolean {
  return PERM_LEVELS.indexOf(have ?? 'none') >= PERM_LEVELS.indexOf(need);
}

/** Combines several roles: the highest level per area wins. */
export function mergePermissions(sets: Partial<PermissionSet>[]): PermissionSet {
  const out = Object.fromEntries(PERM_AREAS.map((a) => [a, 'none'])) as PermissionSet;
  for (const set of sets) {
    for (const area of PERM_AREAS) {
      const level = set[area];
      if (level && atLeast(level, out[area])) out[area] = level;
    }
  }
  return out;
}
