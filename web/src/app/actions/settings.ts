'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Choir settings (staff with "settings" edit).

const back = (slug: string) => revalidatePath(`/c/${slug}`, 'layout');
const date = z.iso.date();

export async function saveChoirDetails(
  slug: string,
  input: { name: string; short_name: string; brand_color: string; kind: 'youth' | 'adult'; default_lang: 'en' | 'fr' },
): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  const parsed = z
    .object({
      name: z.string().trim().min(2, 'required').max(120),
      short_name: z.string().trim().max(8).transform((v) => v || null),
      brand_color: z.union([z.literal(''), z.string().regex(/^#[0-9A-Fa-f]{6}$/)]).transform((v) => v || null),
      kind: z.enum(['youth', 'adult']),
      default_lang: z.enum(['en', 'fr']),
    })
    .safeParse(input);
  if (!ctx) return fail('not_allowed');
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('organizations').update(parsed.data).eq('id', ctx.org.id);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

/** Records the logo the browser has uploaded (or clears it), removing the previous file. */
export async function setLogo(slug: string, path: string | null): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  if (!ctx || (path !== null && !new RegExp(`^${ctx.org.id}/logo-[0-9a-f-]{36}\\.(png|svg|webp|jpg|jpeg)$`).test(path))) return fail('not_allowed');
  const supabase = await createClient();
  const { data: org } = await supabase.from('organizations').select('logo_path').eq('id', ctx.org.id).single();
  const { error } = await supabase.from('organizations').update({ logo_path: path }).eq('id', ctx.org.id);
  if (error) return fail(dbError(error));
  if (org?.logo_path && org.logo_path !== path && org.logo_path.startsWith(`${ctx.org.id}/`)) await supabase.storage.from('choir-logos').remove([org.logo_path]);
  back(slug);
  return done;
}

const rangeSchema = z.object({ name: z.string().trim().min(1, 'required').max(60), starts_on: date, ends_on: date }).refine((v) => v.ends_on >= v.starts_on, { message: 'invalid' });

export async function saveSeason(slug: string, id: string | null, input: z.input<typeof rangeSchema>): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  const parsed = rangeSchema.safeParse(input);
  if (!ctx || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const supabase = await createClient();
  const { count } = await supabase.from('seasons').select('id', { count: 'exact', head: true }).eq('organization_id', ctx.org.id);
  const { error } = id
    ? await supabase.from('seasons').update(parsed.data).eq('id', id).eq('organization_id', ctx.org.id)
    : await supabase.from('seasons').insert({ ...parsed.data, organization_id: ctx.org.id, is_current: !count });
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function makeSeasonCurrent(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  await supabase.from('seasons').update({ is_current: false }).eq('organization_id', ctx.org.id).eq('is_current', true);
  const { error } = await supabase.from('seasons').update({ is_current: true }).eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function saveTerm(
  slug: string,
  id: string | null,
  seasonId: string,
  input: z.input<typeof rangeSchema> & { absence_limit: string },
): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  const parsed = rangeSchema.safeParse(input);
  const limit = input.absence_limit.trim() === '' ? null : Number(input.absence_limit);
  if (!ctx || !uuid.safeParse(seasonId).success || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  if (!parsed.success || (limit !== null && !(Number.isInteger(limit) && limit >= 0 && limit <= 100))) return fail('invalid');
  const supabase = await createClient();
  const row = { ...parsed.data, absence_limit: limit };
  const { error } = id
    ? await supabase.from('terms').update(row).eq('id', id).eq('organization_id', ctx.org.id)
    : await supabase.from('terms').insert({ ...row, organization_id: ctx.org.id, season_id: seasonId });
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function deleteTerm(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('terms').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

const sectionSchema = z.object({
  key: z.string().trim().regex(/^[A-Z][A-Za-z0-9]{0,5}$/, 'invalid'),
  name_en: z.string().trim().min(1, 'required').max(60),
  name_fr: z.string().trim().min(1, 'required').max(60),
  sort: z.number().int().min(0).max(100),
});

export async function saveSection(slug: string, id: string | null, input: z.input<typeof sectionSchema>): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  const parsed = sectionSchema.safeParse(input);
  if (!ctx || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from('sections').update(parsed.data).eq('id', id).eq('organization_id', ctx.org.id)
    : await supabase.from('sections').insert({ ...parsed.data, organization_id: ctx.org.id });
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function savePart(slug: string, id: string | null, sectionId: string, input: z.input<typeof sectionSchema>): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  const parsed = sectionSchema.safeParse(input);
  if (!ctx || !uuid.safeParse(sectionId).success || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from('voice_parts').update(parsed.data).eq('id', id).eq('organization_id', ctx.org.id)
    : await supabase.from('voice_parts').insert({ ...parsed.data, organization_id: ctx.org.id, section_id: sectionId });
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function deleteSectionOrPart(slug: string, kind: 'section' | 'part', id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  // Choristers in it become unplaced (the database clears their link).
  const { error } = await supabase.from(kind === 'section' ? 'sections' : 'voice_parts').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function savePolicies(slug: string, input: { late_after_minutes: number; family_discount_default: number; etransfer_instructions: string }): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  const parsed = z
    .object({ late_after_minutes: z.number().int().min(0).max(120), family_discount_default: z.number().int().min(0).max(100), etransfer_instructions: z.string().trim().max(1000) })
    .safeParse(input);
  if (!ctx || !parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { data: org } = await supabase.from('organizations').select('settings').eq('id', ctx.org.id).single();
  const settings = { ...((org?.settings as Record<string, unknown>) ?? {}), ...parsed.data };
  const { error } = await supabase.from('organizations').update({ settings }).eq('id', ctx.org.id);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}

export async function newConsentVersion(slug: string, kind: string, body_en: string, body_fr: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'settings');
  const parsed = z
    .object({ kind: z.enum(['participation', 'code_of_conduct', 'photo_video', 'medical_info']), body_en: z.string().trim().min(10).max(8000), body_fr: z.string().trim().min(10).max(8000) })
    .safeParse({ kind, body_en, body_fr });
  if (!ctx || !parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { data: last } = await supabase.from('consent_wording_versions').select('version').eq('organization_id', ctx.org.id).eq('kind', parsed.data.kind).order('version', { ascending: false }).limit(1);
  const { error } = await supabase.from('consent_wording_versions').insert({
    organization_id: ctx.org.id,
    kind: parsed.data.kind,
    version: (last?.[0]?.version ?? 0) + 1,
    body_en: parsed.data.body_en,
    body_fr: parsed.data.body_fr,
    created_by: await currentUserId(),
  });
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}
