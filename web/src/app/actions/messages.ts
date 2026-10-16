'use server';

import { messageSchema, newConversationSchema, reportMessageSchema } from '@choirbook/shared/schemas';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './member';

const ids = z.array(z.uuid()).max(200);

export async function markAnnouncementsRead(slug: string, announcementIds: string[]): Promise<void> {
  const ctx = await getChoirContext(slug);
  const parsed = ids.safeParse(announcementIds);
  if (!ctx || !parsed.success || parsed.data.length === 0) return;
  const supabase = await createClient();
  await supabase
    .from('announcement_recipients')
    .update({ read_at: new Date().toISOString() })
    .eq('person_id', ctx.personId)
    .in('announcement_id', parsed.data)
    .is('read_at', null);
  revalidatePath(`/c/${slug}`, 'layout');
}

export async function acknowledgeAnnouncement(slug: string, announcementId: string): Promise<ActionResult> {
  const ctx = await getChoirContext(slug);
  if (!ctx || !z.uuid().safeParse(announcementId).success) return { ok: false, error: 'not_allowed' };
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('announcement_recipients')
    .update({ acknowledged_at: now, read_at: now })
    .eq('person_id', ctx.personId)
    .eq('announcement_id', announcementId);
  if (error) return { ok: false, error: 'failed' };
  revalidatePath(`/c/${slug}/announcements`);
  return { ok: true };
}

export async function startConversation(
  slug: string,
  input: { subject: string; category: 'absence' | 'music' | 'fees' | 'general'; body: string },
): Promise<ActionResult & { id?: string }> {
  const ctx = await getChoirContext(slug);
  if (!ctx) return { ok: false, error: 'not_allowed' };
  const parsed = newConversationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const supabase = await createClient();
  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({ organization_id: ctx.org.id, member_id: ctx.personId, subject: parsed.data.subject, category: parsed.data.category })
    .select('id')
    .single();
  if (error || !conv) return { ok: false, error: 'failed' };
  const sent = await supabase
    .from('messages')
    .insert({ organization_id: ctx.org.id, conversation_id: conv.id, author_person_id: ctx.personId, body: parsed.data.body });
  if (sent.error) return { ok: false, error: sent.error.message.includes('paused') ? 'paused' : 'failed' };
  revalidatePath(`/c/${slug}/messages`);
  return { ok: true, id: conv.id };
}

export async function sendMessage(slug: string, conversationId: string, body: string): Promise<ActionResult> {
  const ctx = await getChoirContext(slug);
  if (!ctx || !z.uuid().safeParse(conversationId).success) return { ok: false, error: 'not_allowed' };
  const parsed = messageSchema.safeParse({ body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('messages')
    .insert({ organization_id: ctx.org.id, conversation_id: conversationId, author_person_id: ctx.personId, body: parsed.data.body });
  if (error) return { ok: false, error: error.message.includes('paused') ? 'paused' : 'failed' };
  revalidatePath(`/c/${slug}/messages/${conversationId}`);
  return { ok: true };
}

export async function reportMessage(slug: string, input: { messageId: string; reason: string }): Promise<ActionResult> {
  const ctx = await getChoirContext(slug);
  if (!ctx) return { ok: false, error: 'not_allowed' };
  const parsed = reportMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const supabase = await createClient();
  const { error } = await supabase.from('message_reports').upsert(
    { organization_id: ctx.org.id, message_id: parsed.data.messageId, reporter_person_id: ctx.personId, reason: parsed.data.reason },
    { onConflict: 'message_id,reporter_person_id' },
  );
  return error ? { ok: false, error: 'failed' } : { ok: true };
}
