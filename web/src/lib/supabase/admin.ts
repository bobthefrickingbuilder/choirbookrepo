import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@choirbook/shared/database.types';
import { publicEnv } from '@/lib/env';

/**
 * Supabase client with the secret key. It BYPASSES row-level security, so only
 * use it after checking the caller's permission yourself, and only for things
 * members cannot do directly (sending invitations, writing the email queue).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set on the server.');
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
