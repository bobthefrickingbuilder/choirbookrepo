import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventEditor } from '@/components/staff/EventEditor';
import { Forbidden } from '@/components/staff/Forbidden';
import { eventToValues } from '@/lib/data/events';
import { getSections } from '@/lib/data/roster';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Edit event' };

export default async function EditEventPage({ params }: PageProps<'/c/[choir]/calendar/[id]/edit'>) {
  const { choir, id } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(id).success) notFound();
  if (!ctx.can('calendar', 'edit')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const [{ data: e }, sections] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle(),
    getSections(ctx.org.id),
  ]);
  if (!e) notFound();
  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <Link href={`/c/${choir}/calendar/${id}` as never} className="back-link">
        ← {e.title}
      </Link>
      <h1 className="page__title">{t.staff.editEvent}</h1>
      <EventEditor
        slug={choir}
        lang={lang}
        id={id}
        initial={eventToValues(e)}
        sections={sections.map((s) => ({ id: s.id, name: lang === 'fr' ? s.name_fr : s.name_en }))}
        s={staffStrings(t)}
      />
    </div>
  );
}
