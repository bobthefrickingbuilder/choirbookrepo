import 'server-only';
import type { PermArea, PermLevel } from '@choirbook/shared/permissions';
import { cache } from 'react';
import { z } from 'zod';
import { getChoirContext, type ChoirContext } from './session';
import { createClient } from './supabase/server';

// Shared plumbing for the staff tools.

export type ActionResult<T = never> = ([T] extends [never] ? { ok: true } : { ok: true; data: T }) | { ok: false; error: string };

export const fail = (error: string) => ({ ok: false as const, error });
export const done = { ok: true as const };

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,40}$/);
export const uuid = z.uuid();

/**
 * The caller's context in a choir, if they hold at least `need` in `area`.
 * Server actions call this first; row-level security still has the final say.
 */
export async function staffContext(slug: unknown, area: PermArea, need: PermLevel = 'edit'): Promise<ChoirContext | null> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;
  const ctx = await getChoirContext(parsed.data);
  return ctx && ctx.can(area, need) ? ctx : null;
}

export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/** Maps a database error to a message key the page translates. */
export function dbError(error: { code?: string; message?: string } | null): string {
  if (!error) return 'failed';
  if (error.code === '42501') return 'not_allowed';
  if (error.code === '23505') return 'duplicate';
  return 'failed';
}

export interface Term {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  absence_limit: number | null;
}

/** The term today falls in, or the most recent one, in the current season. */
export const getCurrentTerm = cache(async (orgId: string, today: string): Promise<Term | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('terms')
    .select('id, name, starts_on, ends_on, absence_limit, seasons!inner(is_current)')
    .eq('organization_id', orgId)
    .order('starts_on', { ascending: false });
  const terms = (data ?? []).map(({ seasons: _s, ...t }) => t);
  return terms.find((t) => t.starts_on <= today && t.ends_on >= today) ?? terms.find((t) => t.starts_on <= today) ?? terms[terms.length - 1] ?? null;
});

/** Staff strings plus the error messages actions can return, for client components. */
export function staffStrings(t: import('@choirbook/shared/i18n').Messages) {
  return {
    ...t.staff,
    errors: {
      required: t.validation.required,
      bad_email: t.validation.emailInvalid,
      duplicate: t.staff.duplicate,
      not_allowed: t.staff.notAllowed,
      demo: t.staff.demoBlocked,
      failed: t.staff.failed,
      invalid: t.staff.failed,
      slot_full: t.staff.slotFull,
      last_admin: t.staff.lastAdmin,
      locked: t.staff.locked,
      in_use: t.staff.inUse,
      too_soon: t.staff.tooSoon,
      payments_off: t.staff.paymentsOff,
    } as Record<string, string>,
  };
}
export type StaffStrings = ReturnType<typeof staffStrings>;
