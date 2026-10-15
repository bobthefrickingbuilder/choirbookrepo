import type { Metadata } from 'next';
import { Wordmark } from '@choirbook/ui';
import { redirect } from 'next/navigation';
import { isConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'Setup needed' };

// Shown until the Supabase environment variables are set (local dev or a new Vercel project).
export default function SetupPage() {
  if (isConfigured()) redirect('/');
  return (
    <main className="public" id="main">
      <div className="public__card public__card--wide">
        <Wordmark size="lg" />
        <div className="public__heading">
          <h1>Choirbook needs its database settings</h1>
          <p>
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to the
            environment (locally in <code>web/.env.local</code>, or in Vercel’s project settings), then reload.
          </p>
        </div>
      </div>
    </main>
  );
}
