import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Runs once a night (see web/vercel.json). It rebuilds the public demo choir,
// stops guardian copies for choristers who turned 18 (telling them in the app),
// clears old rate-limit counters, and the database activity also keeps the free
// Supabase project from pausing.
// Vercel sends "Authorization: Bearer <CRON_SECRET>" with scheduled calls.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password) return NextResponse.json({ error: 'DEMO_PASSWORD is not set' }, { status: 500 });

  const admin = createAdminClient();
  // Privacy housekeeping first, so a demo problem never holds it up.
  const privacy = await admin.rpc('nightly_privacy');
  if (privacy.error) console.error('Nightly privacy job failed', privacy.error);
  const { data, error } = await admin.rpc('rebuild_demo', { demo_password: password });
  if (error) {
    console.error('Demo reset failed', error);
    return NextResponse.json({ error: 'Demo reset failed', privacy: privacy.data ?? null }, { status: 500 });
  }
  return NextResponse.json({ ok: !privacy.error, demo: data, privacy: privacy.data ?? null });
}
