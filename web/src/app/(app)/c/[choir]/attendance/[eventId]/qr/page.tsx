import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { QrDoor } from '@/components/staff/QrDoor';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'QR check-in' };

// Shown on a screen at the door. Choristers scan it with their phone camera.
export default async function QrPage({ params }: PageProps<'/c/[choir]/attendance/[eventId]/qr'>) {
  const { choir, eventId } = await params;
  const [ctx, { t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(eventId).success) notFound();
  if (!ctx.can('attendance', 'edit')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const { data: event } = await supabase.from('events').select('title').eq('id', eventId).eq('organization_id', ctx.org.id).maybeSingle();
  if (!event) notFound();
  return (
    <QrDoor
      slug={choir}
      eventId={eventId}
      title={event.title}
      backHref={`/c/${choir}/attendance/${eventId}`}
      s={{
        qrTitle: t.staff.qrTitle,
        qrHelp: t.staff.qrHelp,
        qrManual: t.staff.qrManual,
        checkedInN: t.staff.checkedInN,
        exitFullScreen: t.staff.exitFullScreen,
        failed: t.staff.failed,
      }}
    />
  );
}
