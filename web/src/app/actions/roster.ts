'use server';

import { getMessages } from '@choirbook/shared/i18n';
import { readRosterCsv } from '@choirbook/shared/import';
import { canSelfRegister, isMinor } from '@choirbook/shared/rules/age';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSections } from '@/lib/data/roster';
import { todayLocal } from '@/lib/format';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Roster changes by staff with "roster" edit (care notes: "care"; staff notes: "staff_notes").

const text = (max: number) => z.string().trim().max(max).transform((v) => v || null).nullable().optional();

const choristerSchema = z.object({
  first_name: z.string().trim().min(1, 'required').max(80),
  last_name: z.string().trim().min(1, 'required').max(80),
  preferred_name: text(80),
  email: z.union([z.literal(''), z.email('bad_email')]).optional().transform((v) => (v ? v.toLowerCase() : null)),
  phone: text(40),
  date_of_birth: z.union([z.literal(''), z.iso.date()]).optional().transform((v) => v || null),
  pronouns: text(40),
  lang: z.enum(['en', 'fr']).default('en'),
  section_id: z.union([z.literal(''), uuid]).optional().transform((v) => v || null),
  voice_part_id: z.union([z.literal(''), uuid]).optional().transform((v) => v || null),
  status: z.enum(['auditioning', 'active', 'on_leave', 'departed']).default('active'),
  school: text(120),
  joined_on: z.union([z.literal(''), z.iso.date()]).optional().transform((v) => v || null),
});
export type ChoristerInput = z.input<typeof choristerSchema>;

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? 'invalid';

const guardianSchema = z.object({
  first_name: z.string().trim().min(1, 'required').max(80),
  last_name: z.string().trim().min(1, 'required').max(80),
  email: z.union([z.literal(''), z.email('bad_email')]).optional().transform((v) => (v ? v.toLowerCase() : null)),
  phone: text(40),
  lang: z.enum(['en', 'fr']).default('en'),
  relationship: text(40),
  is_primary: z.boolean().default(false),
  receives_copies: z.boolean().default(true),
  is_emergency_contact: z.boolean().default(true),
});
export type GuardianInput = z.input<typeof guardianSchema>;

export async function createChorister(slug: string, input: ChoristerInput, guardianInput?: GuardianInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await staffContext(slug, 'roster');
  if (!ctx) return fail('not_allowed');
  const parsed = choristerSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  if (d.date_of_birth && !canSelfRegister(d.date_of_birth)) return fail('under_14');
  // Choristers under 18 are registered with at least one parent or guardian contact.
  const minor = isMinor(d.date_of_birth);
  const guardian = minor ? guardianSchema.safeParse({ is_primary: true, ...guardianInput }) : null;
  if (minor && !guardianInput?.first_name?.trim()) return fail('guardian_required');
  if (guardian && !guardian.success) return fail(firstIssue(guardian.error));
  const supabase = await createClient();
  const { data: person, error } = await supabase
    .from('people')
    .insert({
      organization_id: ctx.org.id,
      first_name: d.first_name,
      last_name: d.last_name,
      preferred_name: d.preferred_name,
      email: d.email,
      phone: d.phone,
      date_of_birth: d.date_of_birth,
      pronouns: d.pronouns,
      lang: d.lang,
      status: 'invited',
    })
    .select('id')
    .single();
  if (error || !person) return fail(dbError(error));
  const { error: cErr } = await supabase.from('choristers').insert({
    person_id: person.id,
    organization_id: ctx.org.id,
    section_id: d.section_id,
    voice_part_id: d.voice_part_id,
    status: d.status,
    school: d.school,
    joined_on: d.joined_on ?? todayLocal(),
  });
  if (cErr) return fail(dbError(cErr));
  if (guardian?.success) {
    const saved = await saveGuardian(slug, person.id, null, { is_primary: true, ...guardianInput, first_name: guardianInput?.first_name ?? '', last_name: guardianInput?.last_name ?? '' });
    if (!saved.ok) return saved;
  }
  revalidatePath(`/c/${slug}/roster`);
  return { ok: true, data: { id: person.id } };
}

export async function updateChorister(slug: string, personId: string, input: ChoristerInput): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'roster');
  if (!ctx || !uuid.safeParse(personId).success) return fail('not_allowed');
  const parsed = choristerSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  if (d.date_of_birth && !canSelfRegister(d.date_of_birth)) return fail('under_14');
  const supabase = await createClient();
  const { error } = await supabase
    .from('people')
    .update({
      first_name: d.first_name,
      last_name: d.last_name,
      preferred_name: d.preferred_name,
      email: d.email,
      phone: d.phone,
      date_of_birth: d.date_of_birth,
      pronouns: d.pronouns,
      lang: d.lang,
    })
    .eq('id', personId)
    .eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  const { error: cErr } = await supabase
    .from('choristers')
    .update({ section_id: d.section_id, voice_part_id: d.voice_part_id, status: d.status, school: d.school, joined_on: d.joined_on })
    .eq('person_id', personId);
  if (cErr) return fail(dbError(cErr));
  revalidatePath(`/c/${slug}/roster`, 'layout');
  return done;
}

/** Marks choristers departed (they lose access to the choir) or brings them back. */
export async function setDeparted(slug: string, personIds: string[], departed: boolean): Promise<ActionResult<{ n: number }>> {
  const ctx = await staffContext(slug, 'roster');
  const ids = z.array(uuid).max(500).safeParse(personIds);
  if (!ctx || !ids.success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase
    .from('choristers')
    .update({ status: departed ? 'departed' : 'active', departed_on: departed ? todayLocal() : null })
    .in('person_id', ids.data)
    .eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  if (departed) {
    await supabase.from('people').update({ status: 'archived', archived_at: new Date().toISOString() }).in('id', ids.data).eq('organization_id', ctx.org.id);
  } else {
    // Back to active if they have an account, otherwise waiting for their invitation.
    const { data: people } = await supabase.from('people').select('id, user_id').in('id', ids.data);
    for (const p of people ?? []) {
      await supabase.from('people').update({ status: p.user_id ? 'active' : 'invited', archived_at: null }).eq('id', p.id);
    }
  }
  revalidatePath(`/c/${slug}/roster`, 'layout');
  return { ok: true, data: { n: ids.data.length } };
}

export async function addStaffNote(slug: string, personId: string, body: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'staff_notes');
  const parsed = z.object({ personId: uuid, body: z.string().trim().min(1).max(4000) }).safeParse({ personId, body });
  if (!ctx || !parsed.success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase
    .from('staff_notes')
    .insert({ organization_id: ctx.org.id, person_id: parsed.data.personId, body: parsed.data.body, author_id: await currentUserId() });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/roster/${personId}`);
  return done;
}

export async function deleteStaffNote(slug: string, noteId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'staff_notes');
  if (!ctx || !uuid.safeParse(noteId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error, count } = await supabase.from('staff_notes').delete({ count: 'exact' }).eq('id', noteId);
  if (error || !count) return fail(error ? dbError(error) : 'not_allowed');
  revalidatePath(`/c/${slug}/roster`, 'layout');
  return done;
}

export async function addCareNote(slug: string, personId: string, input: { label: string; detail?: string; severity: 'medium' | 'high' }): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'care');
  const parsed = z
    .object({ label: z.string().trim().min(1).max(120), detail: text(2000), severity: z.enum(['medium', 'high']) })
    .safeParse(input);
  if (!ctx || !parsed.success || !uuid.safeParse(personId).success) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase
    .from('care_notes')
    .insert({ organization_id: ctx.org.id, person_id: personId, ...parsed.data, created_by: await currentUserId() });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/roster/${personId}`);
  return done;
}

export async function deleteCareNote(slug: string, noteId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'care');
  if (!ctx || !uuid.safeParse(noteId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('care_notes').delete().eq('id', noteId).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/roster`, 'layout');
  return done;
}



export async function saveGuardian(slug: string, choristerId: string, guardianId: string | null, input: GuardianInput): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'roster');
  if (!ctx || !uuid.safeParse(choristerId).success || (guardianId && !uuid.safeParse(guardianId).success)) return fail('not_allowed');
  const parsed = guardianSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { relationship, is_primary, receives_copies, is_emergency_contact, ...g } = parsed.data;
  const supabase = await createClient();
  let id = guardianId;
  if (id) {
    const { error } = await supabase.from('guardians').update(g).eq('id', id).eq('organization_id', ctx.org.id);
    if (error) return fail(dbError(error));
  } else {
    const { data, error } = await supabase.from('guardians').insert({ ...g, organization_id: ctx.org.id }).select('id').single();
    if (error || !data) return fail(dbError(error));
    id = data.id;
  }
  if (is_primary) {
    await supabase.from('guardian_links').update({ is_primary: false }).eq('chorister_id', choristerId).neq('guardian_id', id);
  }
  const { error } = await supabase.from('guardian_links').upsert(
    { organization_id: ctx.org.id, guardian_id: id, chorister_id: choristerId, relationship, is_primary, receives_copies, is_emergency_contact },
    { onConflict: 'guardian_id,chorister_id' },
  );
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/roster/${choristerId}`);
  return done;
}

export async function removeGuardian(slug: string, choristerId: string, guardianId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'roster');
  if (!ctx || !uuid.safeParse(choristerId).success || !uuid.safeParse(guardianId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('guardian_links').delete().eq('guardian_id', guardianId).eq('chorister_id', choristerId);
  if (error) return fail(dbError(error));
  // A guardian linked to no one else is removed entirely.
  const { count } = await supabase.from('guardian_links').select('guardian_id', { count: 'exact', head: true }).eq('guardian_id', guardianId);
  if (!count) await supabase.from('guardians').delete().eq('id', guardianId);
  revalidatePath(`/c/${slug}/roster/${choristerId}`);
  return done;
}

/** In-app reminder (and digest line) to selected members. */
export async function sendReminder(
  slug: string,
  personIds: string[],
  input: { kind: 'forms' | 'fees' | 'custom'; text?: string },
): Promise<ActionResult<{ n: number }>> {
  const ctx = (await staffContext(slug, 'roster', 'view')) ?? null;
  const ids = z.array(uuid).min(1).max(500).safeParse(personIds);
  const parsed = z.object({ kind: z.enum(['forms', 'fees', 'custom']), text: z.string().trim().max(500).optional() }).safeParse(input);
  if (!ctx || !ids.success || !parsed.success) return fail('invalid');
  if (!(ctx.can('forms', 'edit') || ctx.can('fees', 'edit') || ctx.can('announcements', 'edit') || ctx.can('roster', 'edit'))) return fail('not_allowed');
  const { kind, text: custom } = parsed.data;
  if (kind === 'custom' && !custom) return fail('required');
  const en = getMessages('en').staff;
  const fr = getMessages('fr').staff;
  const title = { forms: [en.remindForms, fr.remindForms], fees: [en.remindFees, fr.remindFees], custom: [ctx.org.name, ctx.org.name] }[kind];
  const body = { forms: [en.remindFormsText, fr.remindFormsText], fees: [en.remindFeesText, fr.remindFeesText], custom: [custom!, custom!] }[kind];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('notify_people', {
    org: ctx.org.id,
    people: ids.data,
    category: kind === 'fees' ? 'fees' : kind === 'forms' ? 'forms' : 'system',
    title: title[0]!,
    body: body[0]!,
    link: `/c/${slug}/forms-fees`,
    title_fr: title[1]!,
    body_fr: body[1]!,
  });
  if (error) return fail(dbError(error));
  return { ok: true, data: { n: data ?? 0 } };
}

/** Imports the valid rows of a CSV member list. The file is checked again here; rows with problems are skipped. */
export async function importRoster(slug: string, csv: string): Promise<ActionResult<{ n: number; skipped: number }>> {
  const ctx = await staffContext(slug, 'roster');
  if (!ctx || typeof csv !== 'string' || csv.length > 2_000_000) return fail('not_allowed');
  const supabase = await createClient();
  const [{ data: existing }, sections] = await Promise.all([
    supabase.from('people').select('email').eq('organization_id', ctx.org.id).not('email', 'is', null),
    getSections(ctx.org.id),
  ]);
  const result = readRosterCsv(csv, {
    existingEmails: (existing ?? []).map((p) => p.email!),
    sections: sections.map((s) => ({ key: s.key, names: [s.name_en, s.name_fr] })),
    voiceParts: sections.flatMap((s) => s.voice_parts.map((p) => ({ key: p.key, sectionKey: s.key, names: [p.name_en, p.name_fr] }))),
    today: todayLocal(),
  });
  if (result.missingColumns.length) return fail('missing_columns');
  const good = result.rows.filter((r) => r.errors.length === 0);
  if (good.length > 1000) return fail('too_many');
  const sectionId = new Map(sections.map((s) => [s.key, s.id]));
  const partId = new Map(sections.flatMap((s) => s.voice_parts.map((p) => [p.key, p.id] as const)));

  const { data: people, error } = await supabase
    .from('people')
    .insert(
      good.map((r) => ({
        organization_id: ctx.org.id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        phone: r.phone,
        date_of_birth: r.date_of_birth,
        pronouns: r.pronouns,
        lang: r.lang,
        status: 'invited' as const,
      })),
    )
    .select('id');
  if (error || !people) return fail(dbError(error));

  const today = todayLocal();
  const { error: cErr } = await supabase.from('choristers').insert(
    people.map((p, i) => ({
      person_id: p.id,
      organization_id: ctx.org.id,
      section_id: good[i]!.section_key ? (sectionId.get(good[i]!.section_key!) ?? null) : null,
      voice_part_id: good[i]!.voice_part_key ? (partId.get(good[i]!.voice_part_key!) ?? null) : null,
      school: good[i]!.school,
      joined_on: today,
    })),
  );
  if (cErr) return fail(dbError(cErr));

  const withGuardian = good.map((r, i) => ({ r, personId: people[i]!.id })).filter((x) => x.r.guardian);
  if (withGuardian.length) {
    const { data: guardians } = await supabase
      .from('guardians')
      .insert(withGuardian.map(({ r }) => ({ organization_id: ctx.org.id, ...r.guardian!, lang: r.lang })))
      .select('id');
    if (guardians) {
      await supabase.from('guardian_links').insert(
        guardians.map((g, i) => ({ organization_id: ctx.org.id, guardian_id: g.id, chorister_id: withGuardian[i]!.personId, is_primary: true })),
      );
    }
  }
  revalidatePath(`/c/${slug}/roster`);
  return { ok: true, data: { n: people.length, skipped: result.rows.length - good.length } };
}
