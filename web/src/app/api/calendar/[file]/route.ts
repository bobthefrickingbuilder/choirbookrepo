import type { Database } from '@choirbook/shared/database.types';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { publicEnv } from '@/lib/env';
import { buildIcs } from '@/lib/ics';

// A member's private season feed: /api/calendar/<token>.ics
// Calendar apps fetch it without signing in; the long random token is the key.
export async function GET(_request: Request, { params }: RouteContext<'/api/calendar/[file]'>) {
  const { file } = await params;
  const token = file.replace(/\.ics$/, '');
  if (!/^[0-9a-f]{48}$/.test(token)) return new NextResponse('Not found', { status: 404 });

  const env = publicEnv();
  const anon = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await anon.rpc('calendar_feed', { feed_token: token });
  if (error || !data?.length) return new NextResponse('Not found', { status: 404 });

  const ics = buildIcs(
    data[0]!.choir_name,
    data.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      allDay: e.all_day,
      location: [e.location, e.address].filter(Boolean).join(', ') || null,
      updatedAt: e.updated_at,
    })),
  );
  return new NextResponse(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=900' },
  });
}
