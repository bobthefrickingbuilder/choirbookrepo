'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@choirbook/shared/database.types';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Supabase client for Client Components. One per tab. */
export function createClient() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}
