'use server';

import { revalidatePath } from 'next/cache';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Moderation (staff with "moderation" edit): reported messages, hiding content,
// pausing a member's messaging.

export async function setMessagingSuspended(slug: string, personId: string, suspended: boolean): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'moderation');
  if (!ctx || !uuid.safeParse(personId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_messaging_suspended', { person: personId, suspended: Boolean(suspended) });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}`, 'layout');
  return done;
}

/** Hides (or restores) a message and closes the reports about it. */
export async function setMessageHidden(slug: string, messageId: string, hidden: boolean): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'moderation');
  if (!ctx || !uuid.safeParse(messageId).success) return fail('not_allowed');
  const supabase = await createClient();
  const me = await currentUserId();
  const { error } = await supabase
    .from('messages')
    .update(hidden ? { hidden_at: new Date().toISOString(), hidden_by: me, held_for_review: false } : { hidden_at: null, hidden_by: null, held_for_review: false })
    .eq('id', messageId)
    .eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  await supabase
    .from('message_reports')
    .update({ status: hidden ? 'actioned' : 'dismissed', reviewed_by: me, reviewed_at: new Date().toISOString() })
    .eq('message_id', messageId)
    .eq('status', 'open');
  revalidatePath(`/c/${slug}`, 'layout');
  return done;
}

export async function dismissReports(slug: string, messageId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'moderation');
  if (!ctx || !uuid.safeParse(messageId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase
    .from('message_reports')
    .update({ status: 'dismissed', reviewed_by: await currentUserId(), reviewed_at: new Date().toISOString() })
    .eq('message_id', messageId)
    .eq('status', 'open');
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}`, 'layout');
  return done;
}
