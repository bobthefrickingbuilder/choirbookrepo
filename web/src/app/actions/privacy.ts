'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { CONSENT_KINDS, GUARDIAN_COPY_KINDS, REQUIRED_CONSENTS } from '@/lib/data/privacy';
import { getChoirContext, getUser } from '@/lib/session';
import { clientIp } from '@/lib/security';
import { dbError, done, fail, staffContext, type ActionResult } from '@/lib/staff';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Consents, account deletion, and the privacy settings staff choose per choir.

/** A member gives or withdraws one of their own consents, against the latest wording. */
export async function recordConsent(slug: string, kind: string, granted: boolean): Promise<ActionResult> {
  const ctx = await getChoirContext(slug);
  const parsed = z.enum(CONSENT_KINDS).safeParse(kind);
  if (!ctx || !parsed.success) return fail('not_allowed');
  // Withdrawing a required consent means leaving the choir: that goes through the office.
  if (!granted && REQUIRED_CONSENTS.includes(parsed.data)) return fail('not_allowed');
  const supabase = await createClient();
  const [{ data: wording }, user] = await Promise.all([
    supabase.from('consent_wording_versions').select('id').eq('organization_id', ctx.org.id).eq('kind', parsed.data).order('version', { ascending: false }).limit(1).maybeSingle(),
    getUser(),
  ]);
  if (!wording || !user) return fail('not_allowed');
  const { error } = await supabase.from('consents').insert({
    organization_id: ctx.org.id,
    person_id: ctx.personId,
    kind: parsed.data,
    granted: Boolean(granted),
    wording_version_id: wording.id,
    method: 'self',
    recorded_by: user.id,
    ip: await clientIp(),
  });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}`, 'layout');
  return done;
}

// ---------------------------------------------------------------------------
// Account deletion
// ---------------------------------------------------------------------------

export async function requestAccountDeletion(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('request_account_deletion');
  if (error) return fail(dbError(error));
  if (data !== 'sent') return fail(data ?? 'failed');
  revalidatePath('/account/delete');
  return done;
}

export async function cancelAccountDeletion(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_account_deletion');
  if (error) return fail(dbError(error));
  revalidatePath('/account/delete');
  return done;
}

const tokenSchema = z.string().regex(/^[0-9a-f]{48}$/);

/** The emailed link's "Delete my account" button. Works whether or not the person is signed in. */
export async function confirmAccountDeletion(fd: FormData): Promise<void> {
  const token = String(fd.get('token') ?? '');
  if (!tokenSchema.safeParse(token).success) redirect('/confirm-deletion?state=unknown');
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('Account deletion unavailable', err);
    redirect(`/confirm-deletion?state=failed&token=${token}`);
  }
  const { data, error } = await admin.rpc('complete_account_deletion', { token });
  const result = (data ?? {}) as { state?: string; photos?: string[] };
  if (error || result.state !== 'deleted') {
    if (error) console.error('Account deletion failed', error);
    redirect(`/confirm-deletion?state=${encodeURIComponent(error ? 'failed' : (result.state ?? 'failed'))}&token=${token}`);
  }
  if (result.photos?.length) {
    const { error: storageError } = await admin.storage.from('photos').remove(result.photos);
    if (storageError) console.error('Could not remove photos after account deletion', storageError);
  }
  // Clear this browser's session cookies (the account no longer exists).
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  redirect('/account-deleted');
}

// ---------------------------------------------------------------------------
// Choir settings: guardian copies and the message filter
// ---------------------------------------------------------------------------

async function mergeSettings(orgId: string, patch: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: org } = await supabase.from('organizations').select('settings').eq('id', orgId).single();
  const settings = { ...((org?.settings as Record<string, unknown>) ?? {}), ...patch };
  return supabase.from('organizations').update({ settings: settings as never }).eq('id', orgId);
}

export async function saveGuardianCopies(slug: string, kinds: string[]): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  const parsed = z.array(z.enum(GUARDIAN_COPY_KINDS)).max(GUARDIAN_COPY_KINDS.length).safeParse(kinds);
  if (!ctx) return fail('not_allowed');
  if (!parsed.success) return fail('invalid');
  const { error } = await mergeSettings(ctx.org.id, { guardian_copies: [...new Set(parsed.data)] });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/settings`);
  return done;
}

const word = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[\p{L}' -]{2,40}\*?$/u, 'invalid');

/** Words come in one per line; anything that is not a plain word or short phrase is dropped. */
const wordList = z
  .string()
  .max(4000)
  .transform((v) => [...new Set(v.split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter((w) => word.safeParse(w).success))].slice(0, 200));

export async function saveMessageFilter(slug: string, input: { filter: boolean; extra: string; allowed: string }): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  const parsed = z.object({ filter: z.boolean(), extra: wordList, allowed: wordList }).safeParse(input);
  if (!ctx) return fail('not_allowed');
  if (!parsed.success) return fail('invalid');
  const { error } = await mergeSettings(ctx.org.id, {
    moderation: { filter: parsed.data.filter, extra_words: parsed.data.extra, allowed_words: parsed.data.allowed },
  });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/settings`);
  return done;
}
