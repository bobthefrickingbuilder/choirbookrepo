import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { SeatingEditor } from '@/components/staff/SeatingEditor';
import { formatRange } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Seating chart' };

export default async function SeatingPage({ params }: PageProps<'/c/[choir]/calendar/[id]/seating'>) {
  const { choir, id } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(id).success) notFound();
  if (!ctx.can('seating')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const [{ data: e }, { data: charts }, { data: choristers }] = await Promise.all([
    supabase.from('events').select('id, title, starts_at, ends_at, section_ids').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle(),
    supabase.from('seating_charts').select('id, name, layout, published_at, seating_positions(person_id, row_label, seat)').eq('event_id', id),
    supabase
      .from('choristers')
      .select('person_id, section_id, people!inner(first_name, last_name, preferred_name), sections(key, sort), voice_parts(key)')
      .eq('organization_id', ctx.org.id)
      .eq('status', 'active'),
  ]);
  if (!e) notFound();
  const chart = charts?.[0];
  const rows = ((chart?.layout as { rows?: { label: string; seats: number }[] } | null)?.rows ?? []).map((r) => ({ label: r.label, seats: r.seats }));
  const people = (choristers ?? [])
    .filter((c) => !e.section_ids.length || (c.section_id && e.section_ids.includes(c.section_id)))
    .map((c) => {
      const first = c.people.preferred_name || c.people.first_name;
      return {
        id: c.person_id,
        name: `${first} ${c.people.last_name}`,
        initials: `${first[0] ?? ''}${c.people.last_name[0] ?? ''}`.toUpperCase(),
        part: c.voice_parts?.key ?? null,
        sectionKey: c.sections?.key ?? null,
        sectionSort: c.sections?.sort ?? 99,
      };
    })
    .sort((a, b) => a.sectionSort - b.sectionSort || a.name.localeCompare(b.name));

  return (
    <div className="page page--wide">
      <Link href={`/c/${choir}/calendar/${id}` as never} className="back-link">
        ← {e.title}
      </Link>
      <div>
        <p className="overline overline--accent">{formatRange(e.starts_at, e.ends_at, lang)}</p>
        <h1 className="page__title">{t.staff.seatingTitle}</h1>
      </div>
      <SeatingEditor
        slug={choir}
        eventId={id}
        canEdit={ctx.can('seating', 'edit')}
        people={people}
        s={staffStrings(t)}
        initial={{
          name: chart?.name ?? 'Risers',
          rows,
          placements: (chart?.seating_positions ?? []).map((p) => ({ personId: p.person_id, row: p.row_label, seat: p.seat })),
          published: Boolean(chart?.published_at),
        }}
      />
    </div>
  );
}
