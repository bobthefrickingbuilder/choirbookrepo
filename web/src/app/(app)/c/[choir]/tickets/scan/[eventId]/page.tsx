import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { DoorScanner } from '@/components/staff/TicketParts';
import { formatRange } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Door scanning' };

export default async function ScanPage({ params }: PageProps<'/c/[choir]/tickets/scan/[eventId]'>) {
  const { choir, eventId } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(eventId).success) notFound();
  if (!ctx.can('tickets', 'edit')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const { data: e } = await supabase.from('events').select('title, starts_at, ends_at').eq('id', eventId).eq('organization_id', ctx.org.id).maybeSingle();
  if (!e) notFound();
  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <Link href={`/c/${choir}/tickets` as never} className="back-link">
        ← {t.staff.ticketsTitle}
      </Link>
      <div>
        <p className="overline overline--accent">{formatRange(e.starts_at, e.ends_at, lang)}</p>
        <h1 className="page__title">{e.title}</h1>
        <p className="page__lede">{t.staff.scanHelp}</p>
      </div>
      <DoorScanner slug={choir} eventId={eventId} s={staffStrings(t)} />
    </div>
  );
}
