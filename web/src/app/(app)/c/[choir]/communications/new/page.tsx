import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AnnouncementComposer } from '@/components/staff/CommsParts';
import { Forbidden } from '@/components/staff/Forbidden';
import { getSections } from '@/lib/data/roster';
import { todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'New announcement' };

// ?to=id,id… prefills a custom group (from the roster's bulk "Message").
export default async function NewAnnouncementPage({ params, searchParams }: PageProps<'/c/[choir]/communications/new'>) {
  const { choir } = await params;
  const { to } = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('announcements', 'edit')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const ids = (typeof to === 'string' ? to.split(',') : []).filter((x) => uuid.safeParse(x).success).slice(0, 1000);
  const supabase = await createClient();
  const [sections, { data: people }] = await Promise.all([
    getSections(ctx.org.id),
    ids.length ? supabase.from('member_directory').select('id, first_name, last_name').in('id', ids) : Promise.resolve({ data: [] }),
  ]);
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <Link href={`/c/${choir}/communications` as never} className="back-link">
        ← {t.staff.commsTitle}
      </Link>
      <h1 className="page__title">{t.staff.newAnnouncement}</h1>
      <AnnouncementComposer
        slug={choir}
        id={null}
        sent={false}
        sections={sections.map((s) => ({ id: s.id, name: lang === 'fr' ? s.name_fr : s.name_en }))}
        people={(people ?? []).map((p) => ({ id: p.id!, name: `${p.first_name} ${p.last_name}` }))}
        s={staffStrings(t)}
        initial={{
          title: '',
          body: '',
          audience: people?.length ? 'people' : 'all',
          section_ids: [],
          person_ids: (people ?? []).map((p) => p.id!),
          pinned: false,
          requires_ack: false,
          ack_due_on: '',
          when: 'now',
          publish_date: todayLocal(),
          publish_time: '09:00',
        }}
      />
    </div>
  );
}
