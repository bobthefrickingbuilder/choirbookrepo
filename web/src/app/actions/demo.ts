'use server';

import { redirect } from 'next/navigation';
import { DEMO_ACCOUNTS, DEMO_SLUG, isDemoRole, type DemoRole } from '@/lib/demo';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export interface DemoState {
  error?: 'unavailable';
}

/**
 * Signs the visitor into a shared demo account. The password lives only on the
 * server. If a visitor changed it, the server puts it back and tries once more.
 */
async function signInAs(role: DemoRole): Promise<boolean> {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return false;
  const { email, userId } = DEMO_ACCOUNTS[role];
  const supabase = await createClient();
  let { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && process.env.SUPABASE_SECRET_KEY) {
    await createAdminClient().auth.admin.updateUserById(userId, { password });
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  }
  return !error;
}

/** "Explore as a chorister" / "Explore as staff" on /demo. */
export async function startDemo(_prev: DemoState, fd: FormData): Promise<DemoState> {
  const role = fd.get('role');
  if (!isDemoRole(role)) return { error: 'unavailable' };
  // Leave any real session on this device first, on this device only.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  if (!(await signInAs(role))) return { error: 'unavailable' };
  redirect(`/c/${DEMO_SLUG}?tour=1` as never);
}

/** The role switcher in the demo banner. */
export async function switchDemoRole(role: string): Promise<void> {
  if (!isDemoRole(role)) return;
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  if (!(await signInAs(role))) redirect('/demo?error=unavailable');
  redirect(`/c/${DEMO_SLUG}` as never);
}

export async function leaveDemo(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/demo' as never);
}
