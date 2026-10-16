'use server';

import { getMessages } from '@choirbook/shared/i18n';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addDays, zonedInstant } from '@/lib/format';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Calendar changes by staff with "calendar" edit.

const date = z.iso.date();
const time = z.string().regex(/^\d{2}:\d{2}$/);
const optText = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const eventSchema = z
  .object({
    type: z.enum(['rehearsal', 'sectional', 'concert', 'tour', 'social', 'deadline']),
    title: z.string().trim().min(1, 'required').max(160),
    description: optText(4000),
    date,
    all_day: z.boolean(),
    start: time.optional().or(z.literal('')),
    end: time.optional().or(z.literal('')),
    end_date: date.optional().or(z.literal('')),
    call: time.optional().or(z.literal('')),
    location: optText(200),
    address: optText(300),
    map_url: z.union([z.literal(''), z.url({ protocol: /^https$/ })]).transform((v) => v || null),
    dress_code: optText(500),
    bring: optText(500),
    section_ids: z.array(uuid).max(20),
    counts_for_attendance: z.boolean(),
    availability_requested: z.boolean(),
    availability_due: date.optional().or(z.literal('')),
    running_order: z
      .array(z.object({ time: z.string().trim().max(10), item: z.string().trim().max(200), who: z.string().trim().max(120) }))
      .max(60)
      .transform((rows) => rows.filter((r) => r.item)),
    repeat_until: date.optional().or(z.literal('')),
  })
  .refine((v) => v.all_day || Boolean(v.start), { message: 'required', path: ['start'] });
export type EventInput = z.input<typeof eventSchema>;

function toRow(v: z.output<typeof eventSchema>, day: string) {
  const endDay = v.end_date && v.end_date > v.date ? addDays(day, Math.round((Date.parse(v.end_date) - Date.parse(v.date)) / 86_400_000)) : day;
  const starts = v.all_day ? zonedInstant(day, '00:00') : zonedInstant(day, v.start!);
  let ends = v.all_day ? (endDay !== day ? zonedInstant(endDay, '23:59') : null) : v.end ? zonedInstant(endDay, v.end) : null;
  if (ends && ends < starts) ends = null;
  return {
    type: v.type,
    title: v.title,
    description: v.description,
    starts_at: starts.toISOString(),
    ends_at: ends?.toISOString() ?? null,
    all_day: v.all_day,
    call_at: !v.all_day && v.call ? zonedInstant(day, v.call).toISOString() : null,
    location: v.location,
    address: v.address,
    map_url: v.map_url,
    dress_code: v.dress_code,
    bring: v.bring,
    section_ids: v.section_ids,
    counts_for_attendance: v.counts_for_attendance && v.type !== 'deadline' && v.type !== 'social',
    availability_requested: v.availability_requested,
    availability_due_at: v.availability_requested && v.availability_due ? zonedInstant(v.availability_due, '23:59').toISOString() : null,
    running_order: v.running_order,
  };
}

export async function saveEvent(slug: string, id: string | null, input: EventInput): Promise<ActionResult<{ id: string; created: number }>> {
  const ctx = await staffContext(slug, 'calendar');
  if (!ctx || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message === 'required' ? 'required' : 'invalid');
  const v = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from('events').update(toRow(v, v.date)).eq('id', id).eq('organization_id', ctx.org.id);
    if (error) return fail(dbError(error));
    revalidatePath(`/c/${slug}`, 'layout');
    return { ok: true, data: { id, created: 0 } };
  }

  const { data: season } = await supabase.from('seasons').select('id').eq('organization_id', ctx.org.id).eq('is_current', true).maybeSingle();
  const me = await currentUserId();
  // Weekly repeats: one event per week until the end date (at most a season's worth).
  const days = [v.date];
  if (v.repeat_until && v.repeat_until > v.date) {
    while (days.length < 52) {
      const next = addDays(days[days.length - 1]!, 7);
      if (next > v.repeat_until) break;
      days.push(next);
    }
  }
  let seriesId: string | null = null;
  if (days.length > 1) {
    const weekday = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][new Date(`${v.date}T12:00:00Z`).getUTCDay()];
    const { data: series, error } = await supabase
      .from('event_series')
      .insert({ organization_id: ctx.org.id, rrule: `FREQ=WEEKLY;BYDAY=${weekday};UNTIL=${v.repeat_until!.replace(/-/g, '')}` })
      .select('id')
      .single();
    if (error || !series) return fail(dbError(error));
    seriesId = series.id;
  }
  const { data, error } = await supabase
    .from('events')
    .insert(days.map((d) => ({ ...toRow(v, d), organization_id: ctx.org.id, season_id: season?.id ?? null, series_id: seriesId, created_by: me })))
    .select('id, starts_at')
    .order('starts_at');
  if (error || !data?.length) return fail(dbError(error));
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true, data: { id: data[0]!.id, created: data.length } };
}

/** People an event calls: active choristers of its sections (or everyone), plus staff. */
async function calledPeople(orgId: string, sectionIds: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.from('choristers').select('person_id, section_id').eq('organization_id', orgId).neq('status', 'departed');
  return (data ?? []).filter((c) => !sectionIds.length || (c.section_id && sectionIds.includes(c.section_id))).map((c) => c.person_id);
}

export async function cancelEvent(slug: string, id: string, reason: string, notify: boolean): Promise<ActionResult<{ notified: number }>> {
  const ctx = await staffContext(slug, 'calendar');
  const r = z.string().trim().max(500).safeParse(reason);
  if (!ctx || !uuid.safeParse(id).success || !r.success) return fail('not_allowed');
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from('events')
    .update({ cancelled_at: new Date().toISOString(), cancel_reason: r.data || null })
    .eq('id', id)
    .eq('organization_id', ctx.org.id)
    .select('title, section_ids, starts_at')
    .single();
  if (error || !event) return fail(dbError(error));
  let notified = 0;
  if (notify) {
    const en = getMessages('en').staff;
    const fr = getMessages('fr').staff;
    const { data: n } = await supabase.rpc('notify_people', {
      org: ctx.org.id,
      people: await calledPeople(ctx.org.id, event.section_ids),
      category: 'schedule',
      title: en.cancelledTitle.replace('{title}', event.title),
      body: r.data || en.cancelledBody,
      link: `/c/${slug}/calendar/${id}`,
      title_fr: fr.cancelledTitle.replace('{title}', event.title),
      body_fr: r.data || fr.cancelledBody,
    });
    notified = n ?? 0;
  }
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true, data: { notified } };
}

export async function restoreEvent(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'calendar');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('events').update({ cancelled_at: null, cancel_reason: null }).eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}`, 'layout');
  return done;
}

export async function deleteEvent(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'calendar');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('events').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}`, 'layout');
  return done;
}

/** Asks the called members for their availability (in-app notification). */
export async function requestAvailability(slug: string, id: string, due: string): Promise<ActionResult<{ notified: number }>> {
  const ctx = await staffContext(slug, 'calendar');
  if (!ctx || !uuid.safeParse(id).success || (due && !date.safeParse(due).success)) return fail('not_allowed');
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from('events')
    .update({ availability_requested: true, availability_due_at: due ? zonedInstant(due, '23:59').toISOString() : null })
    .eq('id', id)
    .eq('organization_id', ctx.org.id)
    .select('title, section_ids')
    .single();
  if (error || !event) return fail(dbError(error));
  const { data: answered } = await supabase.from('availability_replies').select('person_id').eq('event_id', id);
  const people = (await calledPeople(ctx.org.id, event.section_ids)).filter((p) => !answered?.some((a) => a.person_id === p));
  const en = getMessages('en').staff;
  const fr = getMessages('fr').staff;
  const { data: n } = await supabase.rpc('notify_people', {
    org: ctx.org.id,
    people,
    category: 'schedule',
    title: en.availabilityAsk.replace('{title}', event.title),
    link: `/c/${slug}/calendar/${id}`,
    title_fr: fr.availabilityAsk.replace('{title}', event.title),
  });
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true, data: { notified: n ?? 0 } };
}
