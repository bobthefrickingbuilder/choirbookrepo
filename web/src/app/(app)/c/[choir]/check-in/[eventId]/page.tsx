import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckInClient } from '@/components/member/CheckInClient';
import { formatRange } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Check-in' };

// Where a chorister lands after scanning the door QR code (or typing its code).
export default async function CheckInPage({ params, searchParams }: PageProps<'/c/[choir]/check-in/[eventId]'>) {
  const { choir, eventId } = await params;
  const { k } = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(eventId).success) notFound();
  const supabase = await createClient();
  const { data: event } = await supabase.from('events').select('title, starts_at, ends_at').eq('id', eventId).eq('organization_id', ctx.org.id).maybeSingle();
  if (!event) notFound();
  const code = typeof k === 'string' && /^[0-9A-Fa-f]{8}$/.test(k) ? k : null;
  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <p className="overline overline--accent">{formatRange(event.starts_at, event.ends_at, lang)}</p>
      <h1 className="page__title">{event.title}</h1>
      <CheckInClient
        slug={choir}
        eventId={eventId}
        initialCode={code}
        homeHref={`/c/${choir}`}
        s={{
          present: t.staff.checkin_present,
          late: t.staff.checkin_late,
          already: t.staff.checkin_already,
          invalid: t.staff.checkin_invalid,
          closed: t.staff.checkin_closed,
          not_called: t.staff.checkin_not_called,
          code: t.staff.checkinCode,
          submit: t.staff.checkinSubmit,
          home: t.common.backHome,
          checking: t.app.loading,
        }}
      />
    </div>
  );
}
