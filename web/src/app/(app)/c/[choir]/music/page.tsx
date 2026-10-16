import { format } from '@choirbook/shared/i18n';
import { Card, EmptyState } from '@choirbook/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MusicList } from '@/components/member/MusicList';
import { getMemberProfile, getMyAssignments } from '@/lib/data/member';
import { formatDate, todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Music' };

const mmss = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : null);

export default async function MusicPage({ params }: PageProps<'/c/[choir]/music'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const profile = await getMemberProfile(ctx);
  const supabase = await createClient();
  const [{ data: pieces }, { data: tracks }, assignments] = await Promise.all([
    supabase.from('pieces').select('id, title, composer, arranger, voicing, language, duration_seconds').eq('organization_id', ctx.org.id).order('title'),
    supabase.from('learning_tracks').select('piece_id').eq('organization_id', ctx.org.id),
    getMyAssignments(ctx, profile.sectionId),
  ]);
  const today = todayLocal();

  const items = (pieces ?? [])
    .map((p) => {
      const n = (tracks ?? []).filter((x) => x.piece_id === p.id).length;
      const next = assignments.filter((a) => a.piece_id === p.id && !a.done && a.due_on && a.due_on >= today)[0];
      return {
        id: p.id,
        title: p.title,
        composer: p.composer,
        arranger: p.arranger,
        voicing: p.voicing,
        language: p.language,
        duration: mmss(p.duration_seconds),
        tracks: n ? format(t.member.tracksN, { n }) : null,
        due: next?.due_on ? format(t.member.dueOn, { date: formatDate(`${next.due_on}T12:00:00Z`, lang, { month: 'short', day: 'numeric' }) }) : null,
      };
    })
    // Pieces with something due come first.
    .sort((a, b) => Number(Boolean(b.due)) - Number(Boolean(a.due)));

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div>
        <h1 className="page__title">{t.member.musicTitle}</h1>
        <p className="page__lede">{t.member.musicIntro}</p>
      </div>
      {items.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon="music" size="sm">
            {t.member.noMusic}
          </EmptyState>
        </Card>
      ) : (
        <MusicList slug={choir} items={items} s={{ search: t.member.searchMusic, noMatch: t.member.noMatch, arr: lang === 'fr' ? 'arr.' : 'arr.' }} />
      )}
    </div>
  );
}
