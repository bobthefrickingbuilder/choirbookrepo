import { format } from '@choirbook/shared/i18n';
import { Badge, Button, Card } from '@choirbook/ui';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PracticeDone } from '@/components/member/PracticeDone';
import { PracticeLogForm } from '@/components/member/PracticeLogForm';
import { PracticePlayer, type PlayerTrack } from '@/components/member/PracticePlayer';
import { ScoreViewer } from '@/components/member/ScoreViewer';
import { getMemberProfile, getMyAssignments } from '@/lib/data/member';
import { isDemoPath } from '@/lib/demoMusic';
import { daysBetween, formatDate, todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export default async function PiecePage({ params }: PageProps<'/c/[choir]/music/[pieceId]'>) {
  const { choir, pieceId } = await params;
  if (!z.uuid().safeParse(pieceId).success) notFound();
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const profile = await getMemberProfile(ctx);
  const supabase = await createClient();
  const [{ data: piece }, { data: scores }, { data: tracks }, { data: sections }, { data: log }, assignments] = await Promise.all([
    supabase.from('pieces').select('*').eq('id', pieceId).eq('organization_id', ctx.org.id).maybeSingle(),
    supabase.from('score_files').select('id, label, storage_path').eq('piece_id', pieceId),
    supabase.from('learning_tracks').select('id, label, kind, section_id, storage_path').eq('piece_id', pieceId).order('label'),
    supabase.from('sections').select('id, key').eq('organization_id', ctx.org.id),
    supabase.from('practice_log').select('id, minutes, practised_on, note').eq('person_id', ctx.personId).eq('piece_id', pieceId).order('practised_on', { ascending: false }).limit(10),
    getMyAssignments(ctx, profile.sectionId),
  ]);
  if (!piece) notFound();

  const keyOf = (sectionId: string | null) => sections?.find((s) => s.id === sectionId)?.key ?? null;
  const toPlayer = (tr: NonNullable<typeof tracks>[number]): PlayerTrack => ({
    id: tr.id,
    label: tr.label,
    sectionKey: tr.kind === 'full' ? null : keyOf(tr.section_id),
    src: isDemoPath(tr.storage_path) ? null : `/c/${choir}/music/file/track/${tr.id}`,
    demoPath: isDemoPath(tr.storage_path) ? tr.storage_path : null,
  });
  const parts = (tracks ?? []).filter((tr) => tr.kind !== 'full').map(toPlayer);
  const fullTrack = (tracks ?? []).find((tr) => tr.kind === 'full');
  const mine = parts.find((p) => p.sectionKey === profile.sectionKey) ?? null;
  const score = scores?.[0];
  const today = todayLocal();
  const minutesThisWeek = (log ?? []).filter((l) => daysBetween(l.practised_on, today) < 7).reduce((n, l) => n + l.minutes, 0);
  const pieceAssignments = assignments.filter((a) => a.piece_id === piece.id);

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <Button variant="ghost" size="sm" iconStart="arrow-left" href={`/c/${choir}/music`}>
        {t.member.musicTitle}
      </Button>
      <header className="stack" style={{ gap: 6 }}>
        <h1 className="page__title">{piece.title}</h1>
        <p className="piece-card__by">
          {piece.composer}
          {piece.arranger ? `, arr. ${piece.arranger}` : ''}
        </p>
        <div className="piece-card__meta">
          {piece.voicing ? <Badge tone="neutral">{piece.voicing}</Badge> : null}
          {piece.language ? <span>{piece.language}</span> : null}
        </div>
      </header>

      {pieceAssignments.length ? (
        <Card title={t.member.assignments}>
          <ul className="practice-list">
            {pieceAssignments.map((a) => (
              <li key={a.id} className="practice-list__item">
                <div className="practice-list__main">
                  <strong>
                    {a.title}
                    {a.bars ? ` · ${a.bars}` : ''}
                  </strong>
                  {a.instructions ? <p className="muted">{a.instructions}</p> : null}
                  {a.due_on ? (
                    <Badge tone="accent" icon="calendar-check">
                      {format(t.member.dueOn, { date: formatDate(`${a.due_on}T12:00:00Z`, lang, { weekday: 'short', month: 'short', day: 'numeric' }) })}
                    </Badge>
                  ) : null}
                </div>
                <PracticeDone slug={choir} assignmentId={a.id} done={a.done} label={t.member.done} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {parts.length || fullTrack ? (
        <Card title={t.member.player}>
          <PracticePlayer
            pieceId={piece.id}
            parts={parts}
            full={fullTrack ? toPlayer(fullTrack) : null}
            defaultPartId={mine?.id ?? null}
            s={{
              title: t.member.player,
              play: t.member.play,
              pause: t.member.pause,
              back: t.member.back5,
              position: t.member.position,
              myPart: t.member.myPart,
              balance: t.member.balance,
              balanceMine: t.member.balanceMine,
              balanceChoir: t.member.balanceChoir,
              tempo: t.member.tempo,
              loop: t.member.loop,
              loopStart: t.member.loopStart,
              loopEnd: t.member.loopEnd,
              loopClear: t.member.loopClear,
              loopHint: t.member.loopHint,
              resumed: t.member.resumed,
              loading: t.member.loadingAudio,
              failed: t.member.audioFailed,
            }}
          />
        </Card>
      ) : null}

      {score ? (
        <Card title={t.member.scoreTitle}>
          <ScoreViewer
            url={`/c/${choir}/music/file/score/${score.id}`}
            s={{
              title: t.member.scoreTitle,
              prev: t.member.prevPage,
              next: t.member.nextPage,
              zoomIn: t.member.zoomIn,
              zoomOut: t.member.zoomOut,
              page: t.member.pageOf,
              open: t.member.openPdf,
              loading: t.member.loadingScore,
              failed: t.member.scoreFailed,
            }}
          />
        </Card>
      ) : null}

      <Card title={t.member.practiceLog} action={<span className="muted">{format(t.member.thisWeek, { n: minutesThisWeek })}</span>}>
        <div className="stack">
          <PracticeLogForm
            slug={choir}
            pieceId={piece.id}
            s={{
              minutes: t.member.logMinutes,
              note: t.member.logNote,
              save: t.member.logSave,
              saved: t.member.logged,
              failed: t.member.genericFail,
              invalid: t.validation.minutes,
            }}
          />
          {log?.length ? (
            <ul className="plain-list">
              {log.map((l) => (
                <li key={l.id} className="history-row">
                  <span>
                    {formatDate(`${l.practised_on}T12:00:00Z`, lang, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {l.note ? <span className="muted"> · {l.note}</span> : null}
                  </span>
                  <span className="cb-tabular">{l.minutes} min</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t.member.noLog}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
