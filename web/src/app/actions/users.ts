'use server';

import { PERM_AREAS, PERM_LEVELS } from '@choirbook/shared/permissions';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Staff, roles and permissions (staff with "users" edit). The database keeps the
// administrator role locked and a choir always keeps at least one administrator.

const back = (slug: string) => revalidatePath(`/c/${slug}`, 'layout');

/** Sets exactly which roles a person has (and the section a section leader looks after). */
export async function setRoles(slug: string, personId: string, roles: { roleId: string; sectionId: string | null }[]): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'users');
  const parsed = z.array(z.object({ roleId: uuid, sectionId: uuid.nullable() })).max(20).safeParse(roles);
  if (!ctx || !uuid.safeParse(personId).success || !parsed.success) return fail('not_allowed');
  const supabase = await createClient();
  const { data: current } = await supabase.from('member_roles').select('role_id, section_id').eq('person_id', personId);
  const wanted = new Map(parsed.data.map((r) => [r.roleId, r.sectionId]));
  // Add or update first, so removing the last administrator is caught by the database, not left half done.
  for (const [roleId, sectionId] of wanted) {
    const existing = current?.find((c) => c.role_id === roleId);
    if (!existing) {
      const { error } = await supabase.from('member_roles').insert({ organization_id: ctx.org.id, person_id: personId, role_id: roleId, section_id: sectionId });
      if (error) return fail(dbError(error));
    } else if (existing.section_id !== sectionId) {
      const { error } = await supabase.from('member_roles').update({ section_id: sectionId }).eq('person_id', personId).eq('role_id', roleId);
      if (error) return fail(dbError(error));
    }
  }
  for (const c of current ?? []) {
    if (!wanted.has(c.role_id)) {
      const { error } = await supabase.from('member_roles').delete().eq('person_id', personId).eq('role_id', c.role_id);
      if (error) return fail(error.message.includes('administrator') ? 'last_admin' : dbError(error));
    }
  }
  back(slug);
  return done;
}

const newStaffSchema = z.object({
  first_name: z.string().trim().min(1, 'required').max(80),
  last_name: z.string().trim().min(1, 'required').max(80),
  email: z.email('bad_email').transform((v) => v.toLowerCase()),
  lang: z.enum(['en', 'fr']),
});

/** Adds a staff member who is not on the roster yet (they are invited separately). */
export async function addStaffPerson(slug: string, input: z.input<typeof newStaffSchema>, roleId: string): Promise<ActionResult<{ personId: string }>> {
  const ctx = await staffContext(slug, 'users');
  const parsed = newStaffSchema.safeParse(input);
  if (!ctx || !uuid.safeParse(roleId).success) return fail('not_allowed');
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const supabase = await createClient();
  const { data: existing } = await supabase.from('people').select('id').eq('organization_id', ctx.org.id).eq('email', parsed.data.email).maybeSingle();
  let personId = existing?.id;
  if (!personId) {
    const { data, error } = await supabase
      .from('people')
      .insert({ ...parsed.data, organization_id: ctx.org.id, status: 'invited' })
      .select('id')
      .single();
    if (error || !data) return fail(dbError(error));
    personId = data.id;
  }
  const { error } = await supabase.from('member_roles').upsert({ organization_id: ctx.org.id, person_id: personId, role_id: roleId }, { onConflict: 'person_id,role_id' });
  if (error) return fail(dbError(error));
  back(slug);
  return { ok: true, data: { personId } };
}

const roleSchema = z.object({
  name_en: z.string().trim().min(1, 'required').max(60),
  name_fr: z.string().trim().min(1, 'required').max(60),
  description_en: z.string().trim().max(300).transform((v) => v || null),
  description_fr: z.string().trim().max(300).transform((v) => v || null),
});

export async function createRole(slug: string, input: z.input<typeof roleSchema>, copyFrom: string | null): Promise<ActionResult<{ id: string }>> {
  const ctx = await staffContext(slug, 'users');
  const parsed = roleSchema.safeParse(input);
  if (!ctx || (copyFrom && !uuid.safeParse(copyFrom).success)) return fail('not_allowed');
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const supabase = await createClient();
  const { data: role, error } = await supabase.from('roles').insert({ ...parsed.data, organization_id: ctx.org.id }).select('id').single();
  if (error || !role) return fail(dbError(error));
  const { data: source } = copyFrom ? await supabase.from('role_permissions').select('area, level').eq('role_id', copyFrom) : { data: [] };
  const levels = new Map((source ?? []).map((p) => [p.area, p.level]));
  const { error: pErr } = await supabase
    .from('role_permissions')
    .insert(PERM_AREAS.map((area) => ({ organization_id: ctx.org.id, role_id: role.id, area, level: levels.get(area) ?? 'none' })));
  if (pErr) return fail(dbError(pErr));
  back(slug);
  return { ok: true, data: { id: role.id } };
}

export async function updateRole(slug: string, roleId: string, input: z.input<typeof roleSchema>): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'users');
  const parsed = roleSchema.safeParse(input);
  if (!ctx || !uuid.safeParse(roleId).success || !parsed.success) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase.from('roles').update(parsed.data).eq('id', roleId).eq('organization_id', ctx.org.id);
  if (error) return fail(error.code === '42501' ? 'locked' : dbError(error));
  back(slug);
  return done;
}

export async function setPermission(slug: string, roleId: string, area: string, level: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'users');
  if (!ctx || !uuid.safeParse(roleId).success || !(PERM_AREAS as readonly string[]).includes(area) || !(PERM_LEVELS as readonly string[]).includes(level)) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase
    .from('role_permissions')
    .upsert(
      { organization_id: ctx.org.id, role_id: roleId, area: area as (typeof PERM_AREAS)[number], level: level as (typeof PERM_LEVELS)[number] },
      { onConflict: 'role_id,area' },
    );
  if (error) return fail(error.code === '42501' ? 'locked' : dbError(error));
  back(slug);
  return done;
}

export async function deleteRole(slug: string, roleId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'users');
  if (!ctx || !uuid.safeParse(roleId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { data: role } = await supabase.from('roles').select('key').eq('id', roleId).eq('organization_id', ctx.org.id).maybeSingle();
  // Built-in roles stay (they can be left unused); custom ones can go once nobody holds them.
  if (!role || role.key) return fail('locked');
  const { count } = await supabase.from('member_roles').select('person_id', { count: 'exact', head: true }).eq('role_id', roleId);
  if (count) return fail('in_use');
  const { error } = await supabase.from('roles').delete().eq('id', roleId);
  if (error) return fail(dbError(error));
  back(slug);
  return done;
}
