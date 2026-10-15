'use server';

import { z } from 'zod';
import { publicEnv } from '@/lib/env';
import { getChoirContext, getMemberships } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type InviteResult =
  | { ok: true; outcome: 'invited' | 'linked' }
  | { ok: false; reason: 'not_allowed' | 'demo' | 'no_email' | 'already_active' | 'not_found' | 'failed' };

const input = z.object({ organizationId: z.uuid(), personId: z.uuid() });

/**
 * Sends a Choirbook invitation to someone on a choir's roster. Staff with "users"
 * or "roster" edit permission can invite. The invitation email links to
 * /auth/confirm, then /welcome, where the person chooses a password; their
 * account is linked to the roster entry automatically.
 */
export async function inviteMember(organizationId: string, personId: string): Promise<InviteResult> {
  const parsed = input.safeParse({ organizationId, personId });
  if (!parsed.success) return { ok: false, reason: 'not_found' };

  const membership = (await getMemberships()).find((m) => m.org.id === parsed.data.organizationId);
  const ctx = membership ? await getChoirContext(membership.org.slug) : null;
  if (!ctx || !(ctx.can('users', 'edit') || ctx.can('roster', 'edit'))) return { ok: false, reason: 'not_allowed' };
  // Demo choirs never send real email.
  if (ctx.org.is_demo) return { ok: false, reason: 'demo' };

  // Read the person as the inviter, so row-level security confirms they may see them.
  const supabase = await createClient();
  const { data: person } = await supabase
    .from('people')
    .select('id, email, first_name, last_name, user_id, status, organization_id')
    .eq('id', parsed.data.personId)
    .eq('organization_id', parsed.data.organizationId)
    .maybeSingle();
  if (!person) return { ok: false, reason: 'not_found' };
  if (!person.email) return { ok: false, reason: 'no_email' };
  if (person.user_id) return { ok: false, reason: 'already_active' };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(person.email, {
    redirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/welcome`,
    data: { display_name: `${person.first_name} ${person.last_name}` },
  });

  if (!error) return { ok: true, outcome: 'invited' };

  // Already has a Choirbook account (for example, a member of another choir): link it.
  if (error.code === 'email_exists' || error.status === 422) {
    const { data: linked } = await admin.rpc('link_existing_account', { person: person.id });
    return linked ? { ok: true, outcome: 'linked' } : { ok: false, reason: 'failed' };
  }
  return { ok: false, reason: 'failed' };
}
