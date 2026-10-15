import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@choirbook/shared/database.types';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * It acts as the signed-in member, so row-level security applies to every query.
 */
export async function createClient() {
  const env = publicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy
          // refreshes the session on every request, so this is safe to ignore.
        }
      },
    },
  });
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>;
