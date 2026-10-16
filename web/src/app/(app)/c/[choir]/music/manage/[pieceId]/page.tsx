import { format } from '@choirbook/shared/i18n';
import { Badge, Button, Card, Icon } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { AssignmentForm, DeletePieceButton, DeleteRowButton, FileUpload, PieceForm, ReleaseButton } from '@/components/staff/MusicStaff';
import { getSections } from '@/lib/data/roster';
import { isDemoPath } from '@/lib/demoMusic';
import { formatDate } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Edit piece' };

const mmss = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');

export default async function ManagePiecePage({ params }: PageProps<'/c/[choir]/music/manage/[pieceId]'>) {
  const { choir, pieceId } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(pieceId).success) notFound();
  if (!ctx.can('music')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const org = ctx.org.id;
  const [{ data: piece }, { data: scores }, { data: tracks }, { data: assignments }, sections, { data: choristers }] = await Promise.all([
    supabase.from('pieces').select('*').eq('id', pieceId).eq('organization_id', org).maybeSingle(),
    supabase.from('score_files').select('*').eq('piece_id', pieceId).order('created_at'),
    supabase.from('learning_tracks').select('*').eq('piece_id', pieceId).order('label'),
    supabase.from('practice_assignments').select('*, practice_completions(person_id)').eq('piece_id', pieceId).order('due_on'),
    getSections(org),
    supabase.from('choristers').select('person_id, section_id, people!inner(first_name, last_name, preferred_name)').eq('organization_id', org).eq('status', 'active'),
  ]);
  if (!piece) notFound();
  const s = staffStrings(t);
  const canEdit = ctx.can('music', 'edit');
  const secName = (id: string | null) => {
    const x = sections.find((y) => y.id === id);
    return x ? (lang === 'fr' ? x.name_fr : x.name_en) : t.staff.everyone;
  };
  const kindLabel: Record<string, string> = { full: t.staff.trackFull, part: t.staff.trackPart, predominant: t.staff.trackPredominant };
  const files = [
    ...(scores ?? []).map((f) => ({
      kind: 'score' as const,
      id: f.id,
      label: f.label,
      detail: secName(f.section_id),
      released: Boolean(f.released_at),
      size: f.size_bytes,
      demo: isDemoPath(f.storage_path),
    })),
    ...(tracks ?? []).map((f) => ({
      kind: 'track' as const,
      id: f.id,
      label: f.label,
      detail: [kindLabel[f.kind], f.kind === 'full' ? null : secName(f.section_id), mmss(f.duration_seconds)].filter(Boolean).join(' · '),
      released: Boolean(f.released_at),
      size: f.size_bytes,
      demo: isDemoPath(f.storage_path),
    })),
  ];
  const dueText = (d: string | null) => (d ? `${t.staff.dueOn} ${formatDate(`${d}T12:00:00Z`, lang, { month: 'short', day: 'numeric' })}` : null);

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <Link href={`/c/${choir}/music/manage` as never} className="back-link">
        ← {t.staff.libraryTitle}
      </Link>
      <div className="page__head">
        <div>
          <h1 className="page__title">{piece.title}</h1>
          <p className="page__lede">
            {[piece.composer, piece.arranger ? `arr. ${piece.arranger}` : null, piece.voicing, piece.language, mmss(piece.duration_seconds)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="page__actions">
          <Button variant="ghost" iconStart="eye" href={`/c/${choir}/music/${piece.id}`}>
            {t.staff.practiceView}
          </Button>
          {canEdit ? (
            <>
              <PieceForm
                slug={choir}
                id={piece.id}
                s={s}
                initial={{
                  title: piece.title,
                  composer: piece.composer ?? '',
                  arranger: piece.arranger ?? '',
                  voicing: piece.voicing ?? '',
                  language: piece.language ?? '',
                  duration: mmss(piece.duration_seconds),
                  notes: piece.notes ?? '',
                }}
              />
              <DeletePieceButton slug={choir} id={piece.id} s={s} />
            </>
          ) : null}
        </div>
      </div>

      <Card
        title={t.staff.files}
        action={
          canEdit ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <FileUpload slug={choir} orgId={org} pieceId={piece.id} kind="score" sections={sections} lang={lang} s={s} />
              <FileUpload slug={choir} orgId={org} pieceId={piece.id} kind="track" sections={sections} lang={lang} s={s} />
            </div>
          ) : undefined
        }
      >
        {files.length ? (
          <ul className="plain-list">
            {files.map((f) => (
              <li key={f.id} className="person-row">
                <span className="icon-disc icon-disc--sm">
                  <Icon name={f.kind === 'score' ? 'file-music' : 'headphones'} size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="person-row__name">
                    {f.label}
                    <Badge tone={f.released ? 'success' : 'slate'} icon={f.released ? 'eye' : 'eye-off'}>
                      {f.released ? t.staff.released : t.staff.notReleased}
                    </Badge>
                  </div>
                  <div className="muted small">
                    {f.detail}
                    {f.size ? ` · ${(f.size / 1024 / 1024).toFixed(1)} MB` : ''}
                  </div>
                </div>
                {canEdit ? (
                  <>
                    <ReleaseButton slug={choir} kind={f.kind} id={f.id} released={f.released} s={s} />
                    {!f.demo ? <DeleteRowButton slug={choir} kind={f.kind} id={f.id} label={f.label} s={s} /> : null}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t.staff.noFiles}</p>
        )}
      </Card>

      <Card title={t.staff.assignments} action={canEdit ? <AssignmentForm slug={choir} pieceId={piece.id} sections={sections} lang={lang} s={s} /> : undefined}>
        {assignments?.length ? (
          <div className="stack" style={{ gap: 16 }}>
            {assignments.map((a) => {
              const assigned = (choristers ?? []).filter((c) => !a.section_ids.length || (c.section_id && a.section_ids.includes(c.section_id)));
              const doneIds = new Set(a.practice_completions.map((c) => c.person_id));
              const notDone = assigned.filter((c) => !doneIds.has(c.person_id));
              return (
                <div key={a.id} className="note">
                  <div className="row-between">
                    <div>
                      <strong>{a.title}</strong>
                      <div className="muted small">
                        {[a.bars, dueText(a.due_on), a.section_ids.map(secName).join(', ') || t.staff.everyone].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Badge tone={a.released_at ? 'neutral' : 'slate'}>
                        {a.released_at ? format(t.staff.completion, { done: assigned.length - notDone.length, total: assigned.length }) : t.staff.notReleased}
                      </Badge>
                      {canEdit ? (
                        <>
                          <ReleaseButton slug={choir} kind="assignment" id={a.id} released={Boolean(a.released_at)} s={s} />
                          <AssignmentForm
                            slug={choir}
                            pieceId={piece.id}
                            id={a.id}
                            sections={sections}
                            lang={lang}
                            s={s}
                            initial={{ title: a.title, instructions: a.instructions ?? '', bars: a.bars ?? '', due_on: a.due_on ?? '', section_ids: a.section_ids }}
                          />
                          <DeleteRowButton slug={choir} kind="assignment" id={a.id} label={a.title} s={s} />
                        </>
                      ) : null}
                    </div>
                  </div>
                  {a.released_at && notDone.length ? (
                    <details className="history">
                      <summary>
                        {t.staff.notYet} ({notDone.length})
                      </summary>
                      <p className="small" style={{ margin: '6px 0 0' }}>
                        {notDone.map((c) => `${c.people.preferred_name || c.people.first_name} ${c.people.last_name}`).join(', ')}
                      </p>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">{t.staff.noneYet}</p>
        )}
      </Card>
    </div>
  );
}
