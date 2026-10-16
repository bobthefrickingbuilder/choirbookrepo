'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { zonedInstant } from '@/lib/format';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Volunteer jobs, time slots and sign-ups, and chaperone police-check dates
// (staff with "volunteers" edit).

const back = (slug: string) => revalidatePath(`/c/${slug}`, 'layout');

const jobSchema = z.object({
  title: z.string().trim().min(1, 'required').max(120),
  description: z.string().trim().max(2000).transform((v) => v || null),
  event_id: z.union([z.literal(''), uuid]).transform((v) => v || null),
  requires_police_check: z.boolean(),
});
export type JobInput = z.input<typeof jobSchema>;

export async function saveJob(slug: string, id: string | null, input: JobInput): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'volunteers');
  const parsed = jobSchema.safeParse(input);
  if (!ctx || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from('volunteer_jobs').update(parsed.data).eq('id', id).eq('organization_id', ctx.org.id)
    : await supabase.from('volunteer_jobs').insert({ ...parsed.data, organization_id: ctx.org.id });
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function deleteJob(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'volunteers');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('volunteer_jobs').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function addSlot(slug: string, jobId: string, input: { date: string; start: string; end: string; needed: number }): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'volunteers');
  const parsed = z
    .object({ date: z.iso.date(), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/), needed: z.number().int().min(1).max(200) })
    .safeParse(input);
  if (!ctx || !uuid.safeParse(jobId).success || !parsed.success) return fail('invalid');
  const starts = zonedInstant(parsed.data.date, parsed.data.start);
  const ends = zonedInstant(parsed.data.date, parsed.data.end);
  if (ends <= starts) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase
    .from('volunteer_slots')
    .insert({ organization_id: ctx.org.id, job_id: jobId, starts_at: starts.toISOString(), ends_at: ends.toISOString(), needed: parsed.data.needed });
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function deleteSlot(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'volunteers');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('volunteer_slots').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function addSignup(slug: string, slotId: string, personId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'volunteers');
  if (!ctx || !uuid.safeParse(slotId).success || !uuid.safeParse(personId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('volunteer_signups').insert({ organization_id: ctx.org.id, slot_id: slotId, person_id: personId });
  if (error) return fail(error.message.includes('full') ? 'slot_full' : dbError(error));
  back(slug);
  return done;
}

export async function removeSignup(slug: string, slotId: string, personId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'volunteers');
  if (!ctx || !uuid.safeParse(slotId).success || !uuid.safeParse(personId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('volunteer_signups').delete().eq('slot_id', slotId).eq('person_id', personId);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function setHours(slug: string, slotId: string, personId: string, hours: number | null): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'volunteers');
  if (!ctx || !uuid.safeParse(slotId).success || !uuid.safeParse(personId).success || (hours !== null && !(hours >= 0 && hours <= 100))) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('volunteer_signups').update({ hours_logged: hours }).eq('slot_id', slotId).eq('person_id', personId);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function saveCheck(slug: string, input: { personId: string; type: string; verified: string; expires: string }): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'volunteers');
  const parsed = z.object({ personId: uuid, type: z.string().trim().min(1).max(80), verified: z.iso.date(), expires: z.iso.date() }).safeParse(input);
  if (!ctx || !parsed.success || parsed.data.expires <= parsed.data.verified) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('chaperone_checks').insert({
    organization_id: ctx.org.id,
    person_id: parsed.data.personId,
    check_type: parsed.data.type,
    verified_on: parsed.data.verified,
    expires_on: parsed.data.expires,
    verified_by: await currentUserId(),
  });
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function deleteCheck(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'volunteers');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('chaperone_checks').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}
