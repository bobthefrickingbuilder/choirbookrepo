import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildIcs } from '@/lib/ics';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// One event as an .ics file, for "Add to my calendar".
export async function GET(_request: Request, { params }: RouteContext<'/c/[choir]/calendar/[id]/ics'>) {
  const { choir, id } = await params;
  const ctx = await getChoirContext(choir);
  if (!ctx || !z.uuid().safeParse(id).success) return new NextResponse('Not found', { status: 404 });
  const supabase = await createClient();
  const { data: e } = await supabase.from('events').select('*').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle();
  if (!e) return new NextResponse('Not found', { status: 404 });
  const ics = buildIcs(ctx.org.name, [
    {
      id: e.id,
      title: e.title,
      description: e.description,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      allDay: e.all_day,
      location: [e.location, e.address].filter(Boolean).join(', ') || null,
      updatedAt: e.updated_at,
    },
  ]);
  const name = e.title.replace(/[^\w-]+/g, '-').toLowerCase();
  return new NextResponse(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.ics"` },
  });
}
