'use server';

import { absenceSchema, availabilitySchema, practiceLogSchema } from '@choirbook/shared/schemas';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { publicEnv } from '@/lib/env';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// A member's own actions. Each one re-checks who is signed in and which choir,
// then writes as that member, so row-level security has the final say.

export type ActionResult = { ok: true } | { ok: false; error: string };

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,40}$/);

async function memberContext(slug: unknown) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;
  return getChoirContext(parsed.data);
}

const fail = (error: string): ActionResult => ({ ok: false, error });

export async function reportAbsence(slug: string, input: { eventId: string; kind: 'absent' | 'late'; reason: string }): Promise<ActionResult> {
  const ctx = await memberContext(slug);
  if (!ctx) return fail('not_allowed');
  const parsed = absenceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { error } = await supabase.from('absence_reports').upsert(
    {
      organization_id: ctx.org.id,
      event_id: parsed.data.eventId,
      person_id: ctx.personId,
      kind: parsed.data.kind,
      reason: parsed.data.reason,
      reported_by: auth?.claims?.sub ?? null,
    },
    { onConflict: 'event_id,person_id' },
  );
  if (error) return fail(error.code === '42501' ? 'past_event' : 'failed');
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true };
}

export async function cancelAbsence(slug: string, eventId: string): Promise<ActionResult> {
  const ctx = await memberContext(slug);
  if (!ctx || !z.uuid().safeParse(eventId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('absence_reports').delete().eq('event_id', eventId).eq('person_id', ctx.personId);
  if (error) return fail('failed');
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true };
}

export async function setAvailability(
  slug: string,
  input: { eventId: string; answer: 'yes' | 'no' | 'maybe'; comment?: string },
): Promise<ActionResult> {
  const ctx = await memberContext(slug);
  if (!ctx) return fail('not_allowed');
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('availability_replies').upsert(
    {
      organization_id: ctx.org.id,
      event_id: parsed.data.eventId,
      person_id: ctx.personId,
      answer: parsed.data.answer,
      comment: parsed.data.comment || null,
    },
    { onConflict: 'event_id,person_id' },
  );
  if (error) return fail(error.code === '42501' ? 'past_event' : 'failed');
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true };
}

export async function setPracticeDone(slug: string, assignmentId: string, done: boolean): Promise<ActionResult> {
  const ctx = await memberContext(slug);
  if (!ctx || !z.uuid().safeParse(assignmentId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = done
    ? await supabase
        .from('practice_completions')
        .upsert({ organization_id: ctx.org.id, assignment_id: assignmentId, person_id: ctx.personId }, { onConflict: 'assignment_id,person_id' })
    : await supabase.from('practice_completions').delete().eq('assignment_id', assignmentId).eq('person_id', ctx.personId);
  if (error) return fail('failed');
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true };
}

/** The member's private season feed link (created the first time). */
export async function getCalendarFeedUrl(slug: string): Promise<string | null> {
  const ctx = await memberContext(slug);
  if (!ctx) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  let { data } = await supabase.from('calendar_feeds').select('token').eq('organization_id', ctx.org.id).maybeSingle();
  if (!data) {
    ({ data } = await supabase
      .from('calendar_feeds')
      .insert({ user_id: userId, organization_id: ctx.org.id })
      .select('token')
      .single());
  }
  return data ? `${publicEnv().NEXT_PUBLIC_SITE_URL}/api/calendar/${data.token}.ics` : null;
}

export async function logPractice(slug: string, input: { pieceId: string | null; minutes: number; note?: string }): Promise<ActionResult> {
  const ctx = await memberContext(slug);
  if (!ctx) return fail('not_allowed');
  const parsed = practiceLogSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('practice_log').insert({
    organization_id: ctx.org.id,
    person_id: ctx.personId,
    piece_id: parsed.data.pieceId,
    minutes: parsed.data.minutes,
    note: parsed.data.note || null,
  });
  if (error) return fail('failed');
  revalidatePath(`/c/${slug}`, 'layout');
  return { ok: true };
}
