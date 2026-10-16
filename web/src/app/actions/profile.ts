'use server';

import { profileSchema } from '@choirbook/shared/schemas';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './member';

export async function getSalesLink(slug: string, eventId: string): Promise<ActionResult> {
  const ctx = await getChoirContext(slug);
  if (!ctx || !z.uuid().safeParse(eventId).success) return { ok: false, error: 'not_allowed' };
  const supabase = await createClient();
  const code = randomBytes(6).toString('hex');
  const { error } = await supabase
    .from('seller_links')
    .upsert({ organization_id: ctx.org.id, event_id: eventId, person_id: ctx.personId, code }, { onConflict: 'event_id,person_id', ignoreDuplicates: true });
  if (error) return { ok: false, error: 'failed' };
  revalidatePath(`/c/${slug}/tickets`);
  return { ok: true };
}

export async function setVolunteerSignup(slug: string, slotId: string, on: boolean): Promise<ActionResult> {
  const ctx = await getChoirContext(slug);
  if (!ctx || !z.uuid().safeParse(slotId).success) return { ok: false, error: 'not_allowed' };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from('volunteer_signups').insert({ organization_id: ctx.org.id, slot_id: slotId, person_id: ctx.personId })
    : await supabase.from('volunteer_signups').delete().eq('slot_id', slotId).eq('person_id', ctx.personId);
  if (error) return { ok: false, error: error.message.includes('full') ? 'full' : 'failed' };
  revalidatePath(`/c/${slug}/volunteering`);
  return { ok: true };
}

export async function saveProfile(
  slug: string,
  input: { preferredName?: string; pronouns?: string; phone?: string; contactVisibility: 'private' | 'choir' },
): Promise<ActionResult> {
  const ctx = await getChoirContext(slug);
  if (!ctx) return { ok: false, error: 'not_allowed' };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('people')
    .update({
      preferred_name: parsed.data.preferredName || null,
      pronouns: parsed.data.pronouns || null,
      phone: parsed.data.phone || null,
      contact_visibility: parsed.data.contactVisibility,
    })
    .eq('id', ctx.personId);
  if (error) return { ok: false, error: 'failed' };
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true };
}

const categories = z.enum(['announcements', 'schedule', 'music', 'messages', 'forms', 'fees', 'tickets', 'volunteers', 'system']);

export async function setNotificationPref(category: string, channel: 'in_app' | 'email_digest' | 'push', value: boolean): Promise<ActionResult> {
  const cat = categories.safeParse(category);
  if (!cat.success || !['in_app', 'email_digest', 'push'].includes(channel)) return { ok: false, error: 'invalid' };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { ok: false, error: 'not_allowed' };
  const { data: existing } = await supabase.from('notification_preferences').select('*').eq('category', cat.data).maybeSingle();
  const row = { in_app: true, email_digest: true, push: false, ...(existing ?? {}), user_id: userId, category: cat.data, [channel]: value };
  const { error } = await supabase.from('notification_preferences').upsert(row, { onConflict: 'user_id,category' });
  return error ? { ok: false, error: 'failed' } : { ok: true };
}

export async function markNotificationsRead(slug: string): Promise<void> {
  const ctx = await getChoirContext(slug);
  if (!ctx) return;
  const supabase = await createClient();
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('organization_id', ctx.org.id).is('read_at', null);
  revalidatePath(`/c/${slug}`, 'layout');
}
