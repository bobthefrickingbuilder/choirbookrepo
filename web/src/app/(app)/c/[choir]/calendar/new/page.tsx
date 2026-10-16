import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventEditor } from '@/components/staff/EventEditor';
import { Forbidden } from '@/components/staff/Forbidden';
import { blankEvent } from '@/lib/data/events';
import { getSections } from '@/lib/data/roster';
import { todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';

export const metadata: Metadata = { title: 'New event' };

export default async function NewEventPage({ params, searchParams }: PageProps<'/c/[choir]/calendar/new'>) {
  const { choir } = await params;
  const { date } = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('calendar', 'edit')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const sections = await getSections(ctx.org.id);
  const day = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayLocal();
  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <Link href={`/c/${choir}/calendar` as never} className="back-link">
        ← {t.member.calendarTitle}
      </Link>
      <h1 className="page__title">{t.staff.newEvent}</h1>
      <EventEditor
        slug={choir}
        lang={lang}
        id={null}
        initial={blankEvent(day)}
        sections={sections.map((s) => ({ id: s.id, name: lang === 'fr' ? s.name_fr : s.name_en }))}
        s={staffStrings(t)}
      />
    </div>
  );
}
