import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { RosterImport } from '@/components/staff/RosterImport';
import { getSections } from '@/lib/data/roster';
import { todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Import members' };

export default async function ImportPage({ params }: PageProps<'/c/[choir]/roster/import'>) {
  const { choir } = await params;
  const [ctx, { t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('roster', 'edit')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const [{ data: people }, sections] = await Promise.all([
    supabase.from('people').select('email').eq('organization_id', ctx.org.id).not('email', 'is', null),
    getSections(ctx.org.id),
  ]);

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <Link href={`/c/${choir}/roster` as never} className="back-link">
        ← {t.staff.rosterTitle}
      </Link>
      <h1 className="page__title">{t.staff.importTitle}</h1>
      <RosterImport
        slug={choir}
        s={staffStrings(t)}
        context={{
          existingEmails: (people ?? []).map((p) => p.email!),
          sections: sections.map((s) => ({ key: s.key, names: [s.name_en, s.name_fr] })),
          voiceParts: sections.flatMap((s) => s.voice_parts.map((p) => ({ key: p.key, sectionKey: s.key, names: [p.name_en, p.name_fr] }))),
          today: todayLocal(),
        }}
      />
    </div>
  );
}
