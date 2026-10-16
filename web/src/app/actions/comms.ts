'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { zonedInstant } from '@/lib/format';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Announcements (staff with "announcements" edit), the office inbox ("inbox"),
// and monthly member updates ("monthly_updates").

const announcementSchema = z
  .object({
    title: z.string().trim().min(1, 'required').max(200),
    body: z.string().trim().min(1, 'required').max(10000),
    audience: z.enum(['all', 'sections', 'people']),
    section_ids: z.array(uuid).max(20),
    person_ids: z.array(uuid).max(1000),
    pinned: z.boolean(),
    requires_ack: z.boolean(),
    ack_due_on: z.union([z.literal(''), z.iso.date()]).transform((v) => v || null),
    when: z.enum(['now', 'schedule', 'draft']),
    publish_date: z.union([z.literal(''), z.iso.date()]),
    publish_time: z.union([z.literal(''), z.string().regex(/^\d{2}:\d{2}$/)]),
  })
  .refine((v) => v.audience !== 'sections' || v.section_ids.length > 0, { message: 'no_audience' })
  .refine((v) => v.audience !== 'people' || v.person_ids.length > 0, { message: 'no_audience' })
  .refine((v) => v.when !== 'schedule' || (v.publish_date && v.publish_time), { message: 'required' });
export type AnnouncementInput = z.input<typeof announcementSchema>;

export async function saveAnnouncement(slug: string, id: string | null, input: AnnouncementInput): Promise<ActionResult<{ id: string; recipients: number }>> {
  const ctx = await staffContext(slug, 'announcements');
  if (!ctx || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const v = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { data: existing } = await supabase.from('announcements').select('notified_at').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle();
    if (!existing) return fail('not_allowed');
    // Once it has gone out, only the wording, pin and acknowledgement can change.
    if (existing.notified_at) {
      const { error } = await supabase
        .from('announcements')
        .update({ title: v.title, body: v.body, pinned: v.pinned, requires_ack: v.requires_ack, ack_due_on: v.ack_due_on })
        .eq('id', id);
      if (error) return fail(dbError(error));
      revalidatePath(`/c/${slug}`, 'layout');
      return { ok: true, data: { id, recipients: 0 } };
    }
  }

  const audience = v.audience === 'all' ? { all: true } : v.audience === 'sections' ? { section_ids: v.section_ids } : { person_ids: v.person_ids };
  const publishAt = v.when === 'schedule' ? zonedInstant(v.publish_date, v.publish_time).toISOString() : null;
  const row = {
    title: v.title,
    body: v.body,
    audience,
    pinned: v.pinned,
    requires_ack: v.requires_ack,
    ack_due_on: v.requires_ack ? v.ack_due_on : null,
    publish_at: publishAt,
    published_at: null,
  };
  const res = id
    ? await supabase.from('announcements').update(row).eq('id', id).select('id').single()
    : await supabase.from('announcements').insert({ ...row, organization_id: ctx.org.id, author_id: await currentUserId() }).select('id').single();
  if (res.error || !res.data) return fail(dbError(res.error));

  let recipients = 0;
  if (v.when !== 'draft') {
    const { data, error } = await supabase.rpc('publish_announcement', { ann_id: res.data.id });
    if (error) return fail(dbError(error));
    recipients = data ?? 0;
  } else {
    await supabase.from('announcement_recipients').delete().eq('announcement_id', res.data.id);
  }
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true, data: { id: res.data.id, recipients } };
}

export async function deleteAnnouncement(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'announcements');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('announcements').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}`, 'layout');
  return done;
}

// ---- Inbox ----

export async function updateConversation(
  slug: string,
  id: string,
  change: { status?: 'open' | 'resolved'; assigned_to?: string | null; category?: 'absence' | 'music' | 'fees' | 'general' },
): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'inbox');
  const parsed = z
    .object({
      status: z.enum(['open', 'resolved']).optional(),
      assigned_to: uuid.nullable().optional(),
      category: z.enum(['absence', 'music', 'fees', 'general']).optional(),
    })
    .safeParse(change);
  if (!ctx || !uuid.safeParse(id).success || !parsed.success) return fail('not_allowed');
  const c = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from('conversations')
    .update({
      ...c,
      ...(c.status ? { resolved_at: c.status === 'resolved' ? new Date().toISOString() : null } : {}),
    })
    .eq('id', id)
    .eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}`, 'layout');
  return done;
}

// ---- Monthly updates ----

export async function createMonthlyUpdate(slug: string, month: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await staffContext(slug, 'monthly_updates');
  if (!ctx || !/^\d{4}-\d{2}$/.test(month)) return fail('invalid');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('monthly_updates')
    .upsert({ organization_id: ctx.org.id, month: `${month}-01` }, { onConflict: 'organization_id,month', ignoreDuplicates: false })
    .select('id')
    .single();
  if (error || !data) return fail(dbError(error));
  revalidatePath(`/c/${slug}/communications`);
  return { ok: true, data: { id: data.id } };
}

export async function saveMonthlyNotes(slug: string, id: string, input: { conductor_note: string; free_text: string }): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'monthly_updates');
  const parsed = z.object({ conductor_note: z.string().trim().max(4000), free_text: z.string().trim().max(4000) }).safeParse(input);
  if (!ctx || !uuid.safeParse(id).success || !parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase
    .from('monthly_updates')
    .update({ conductor_note: parsed.data.conductor_note || null, free_text: parsed.data.free_text || null })
    .eq('id', id)
    .eq('organization_id', ctx.org.id)
    .neq('status', 'sent');
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/communications`);
  return done;
}

export async function generateMonthlyUpdate(slug: string, id: string): Promise<ActionResult<{ n: number }>> {
  const ctx = await staffContext(slug, 'monthly_updates');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('generate_monthly_update', { target: id });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/communications`);
  return { ok: true, data: { n: data ?? 0 } };
}

export async function sendMonthlyUpdate(slug: string, id: string): Promise<ActionResult<{ n: number }>> {
  const ctx = await staffContext(slug, 'monthly_updates');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('send_monthly_update', { target: id });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true, data: { n: data ?? 0 } };
}
