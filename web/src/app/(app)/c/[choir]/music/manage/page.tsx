import { format } from '@choirbook/shared/i18n';
import { Badge, Card, EmptyState, Icon } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { PieceForm, SetListEditor } from '@/components/staff/MusicStaff';
import { formatDate, isoDaysFromNow } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Music library' };

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1)} MB`;

export default async function ManageMusicPage({ params }: PageProps<'/c/[choir]/music/manage'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('music')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const org = ctx.org.id;
  const [
    { data: pieces },
    { data: scores },
    { data: tracks },
    { data: assignments },
    { data: completions },
    { data: choristers },
    { data: concerts },
    { data: setItems },
    { data: used },
  ] = await Promise.all([
    supabase.from('pieces').select('id, title, composer, arranger, voicing').eq('organization_id', org).order('title'),
    supabase.from('score_files').select('piece_id').eq('organization_id', org),
    supabase.from('learning_tracks').select('piece_id').eq('organization_id', org),
    supabase.from('practice_assignments').select('id, piece_id, title, due_on, section_ids, released_at').eq('organization_id', org).order('due_on'),
    supabase.from('practice_completions').select('assignment_id').eq('organization_id', org),
    supabase.from('choristers').select('section_id').eq('organization_id', org).eq('status', 'active'),
    supabase.from('events').select('id, title, starts_at').eq('organization_id', org).eq('type', 'concert').gte('starts_at', isoDaysFromNow(-60)).order('starts_at'),
    supabase.from('set_list_items').select('event_id, piece_id, position').eq('organization_id', org).order('position'),
    supabase.rpc('music_storage_used', { org }),
  ]);
  const s = staffStrings(t);
  const canEdit = ctx.can('music', 'edit');
  const count = (rows: { piece_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.piece_id === id).length;
  const onSets = (id: string) => (setItems ?? []).some((x) => x.piece_id === id);
  const assigned = (sectionIds: string[]) => (choristers ?? []).filter((c) => !sectionIds.length || (c.section_id && sectionIds.includes(c.section_id))).length;
  const pieceTitle = (id: string) => pieces?.find((p) => p.id === id)?.title ?? '—';

  return (
    <div className="page page--wide">
      <Link href={`/c/${choir}/music` as never} className="back-link">
        ← {t.member.musicTitle}
      </Link>
      <div className="page__head">
        <div>
          <h1 className="page__title">{t.staff.libraryTitle}</h1>
          <p className="page__lede">{format(t.staff.librarySub, { n: pieces?.length ?? 0, used: mb(Number(used ?? 0)) })}</p>
        </div>
        {canEdit ? (
          <div className="page__actions">
            <PieceForm slug={choir} s={s} />
          </div>
        ) : null}
      </div>

      <div className="profile-grid">
        <Card padded={false}>
          {pieces?.length ? (
            <ul className="plain-list">
              {pieces.map((p) => (
                <li key={p.id}>
                  <Link href={`/c/${choir}/music/manage/${p.id}` as never} className="event-pick" style={{ padding: '10px 16px' }}>
                    <Icon name="music" size={20} />
                    <span className="event-pick__main">
                      <strong>{p.title}</strong>
                      <span className="muted small">{[p.composer, p.arranger ? `arr. ${p.arranger}` : null, p.voicing].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="muted small" style={{ textAlign: 'right' }}>
                      {format(t.staff.scoresCount, { n: count(scores, p.id) })} · {format(t.staff.tracksCount, { n: count(tracks, p.id) })}
                    </span>
                    {onSets(p.id) ? <Badge tone="accent">{t.staff.onSetLists}</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="music" size="sm">
              {t.member.noMusic}
            </EmptyState>
          )}
        </Card>

        <div className="stack">
          <Card title={t.staff.assignments}>
            {assignments?.length ? (
              <ul className="plain-list">
                {assignments.map((a) => {
                  const total = assigned(a.section_ids);
                  const doneN = (completions ?? []).filter((c) => c.assignment_id === a.id).length;
                  return (
                    <li key={a.id}>
                      <Link href={`/c/${choir}/music/manage/${a.piece_id}` as never} className="event-pick">
                        <span className="event-pick__main">
                          <strong>{a.title}</strong>
                          <span className="muted small">
                            {pieceTitle(a.piece_id)}
                            {a.due_on ? ` · ${t.staff.dueOn} ${formatDate(`${a.due_on}T12:00:00Z`, lang, { month: 'short', day: 'numeric' })}` : ''}
                          </span>
                        </span>
                        {a.released_at ? (
                          <Badge tone={doneN >= total * 0.75 ? 'success' : 'neutral'}>{format(t.staff.completion, { done: doneN, total })}</Badge>
                        ) : (
                          <Badge tone="slate" icon="eye-off">
                            {t.staff.notReleased}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">{t.staff.noneYet}</p>
            )}
          </Card>

          <Card title={t.staff.setLists}>
            {concerts?.length ? (
              <div className="stack" style={{ gap: 14 }}>
                {concerts.map((c) => {
                  const items = (setItems ?? []).filter((x) => x.event_id === c.id);
                  return (
                    <div key={c.id}>
                      <div className="row-between">
                        <strong>
                          {c.title} · <span className="muted small">{formatDate(c.starts_at, lang, { month: 'short', day: 'numeric' })}</span>
                        </strong>
                        {canEdit ? (
                          <SetListEditor
                            slug={choir}
                            eventId={c.id}
                            title={c.title}
                            initial={items.map((x) => x.piece_id)}
                            pieces={(pieces ?? []).map((p) => ({ id: p.id, title: p.title }))}
                            s={s}
                          />
                        ) : null}
                      </div>
                      {items.length ? (
                        <ol className="setlist">
                          {items.map((x) => (
                            <li key={x.piece_id}>{pieceTitle(x.piece_id)}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className="muted small">{t.staff.setListEmpty}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted">{t.staff.noneYet}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
