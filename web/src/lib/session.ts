import 'server-only';
import { mergePermissions, type PermArea, type PermissionSet, type PermLevel } from '@choirbook/shared/permissions';
import type { Tables } from '@choirbook/shared/database.types';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export interface SessionUser {
  id: string;
  email: string | null;
}

/** The signed-in account, verified against Supabase's signing keys. Null when signed out. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = typeof data.claims.email === 'string' ? data.claims.email : null;
  return { id: data.claims.sub, email };
});

type Org = Pick<Tables<'organizations'>, 'id' | 'slug' | 'name' | 'short_name' | 'kind' | 'brand_color' | 'logo_path' | 'is_demo'>;

export interface Membership {
  personId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  org: Org;
}

/** Every choir the signed-in account belongs to (active memberships only). */
export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('people')
    .select('id, first_name, last_name, preferred_name, organizations!inner(id, slug, name, short_name, kind, brand_color, logo_path, is_demo)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at');
  if (error) throw new Error(`Could not load your choirs: ${error.message}`);
  return data.map((p) => ({
    personId: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    displayName: `${p.preferred_name || p.first_name} ${p.last_name}`,
    org: p.organizations,
  }));
});

export interface ChoirContext extends Membership {
  roles: { key: string | null; nameEn: string; nameFr: string }[];
  permissions: PermissionSet;
  isStaff: boolean;
  isChorister: boolean;
  can: (area: PermArea, need?: PermLevel) => boolean;
}

/** The signed-in member's context in one choir, by its URL slug. Null if they are not a member. */
export const getChoirContext = cache(async (slug: string): Promise<ChoirContext | null> => {
  const membership = (await getMemberships()).find((m) => m.org.slug === slug);
  if (!membership) return null;
  const supabase = await createClient();

  const [rolesRes, choristerRes] = await Promise.all([
    supabase
      .from('member_roles')
      .select('roles!inner(id, key, name_en, name_fr, role_permissions(area, level))')
      .eq('person_id', membership.personId),
    supabase.from('choristers').select('person_id, status').eq('person_id', membership.personId).maybeSingle(),
  ]);
  if (rolesRes.error) throw new Error(`Could not load your roles: ${rolesRes.error.message}`);

  const roles = rolesRes.data.map((r) => r.roles);
  const permissions = mergePermissions(
    roles.map((r) => Object.fromEntries(r.role_permissions.map((p) => [p.area, p.level])) as Partial<PermissionSet>),
  );
  const order: PermLevel[] = ['none', 'view', 'edit'];
  return {
    ...membership,
    roles: roles.map((r) => ({ key: r.key, nameEn: r.name_en, nameFr: r.name_fr })),
    permissions,
    isStaff: roles.length > 0,
    isChorister: Boolean(choristerRes.data && choristerRes.data.status !== 'departed'),
    can: (area, need = 'view') => order.indexOf(permissions[area]) >= order.indexOf(need),
  };
});
