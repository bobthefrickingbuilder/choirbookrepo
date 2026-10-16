'use client';

import type { Lang } from '@choirbook/shared/i18n';
import { AlertCard, Button, Checkbox, ConfirmDialog, IconButton, Modal, Select, TextInput, Toggle } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  deleteAssignment,
  deleteFile,
  deletePiece,
  registerFile,
  saveAssignment,
  savePiece,
  saveSetList,
  setReleased,
  type PieceInput,
} from '@/app/actions/music';
import type { SectionInfo } from '@/lib/data/roster';
import type { StaffStrings } from '@/lib/staff';
import { createClient } from '@/lib/supabase/browser';

type Result = { ok: true } | { ok: false; error: string };

function useRun(s: StaffStrings) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
      setError(null);
      after?.();
      router.refresh();
    });
  return { pending, error, setError, run, router };
}

const blankPiece: Required<PieceInput> = { title: '', composer: '', arranger: '', voicing: '', language: '', duration: '', notes: '' };

export function PieceForm({ slug, id, initial, s }: { slug: string; id?: string; initial?: Required<PieceInput>; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Required<PieceInput>>(initial ?? blankPiece);
  const { pending, error, setError, router } = useRun(s);
  const [busy, start] = useTransition();
  const set = (k: keyof PieceInput) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const submit = () =>
    start(async () => {
      const r = await savePiece(slug, id ?? null, v);
      if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
      setOpen(false);
      if (!id) router.push(`/c/${slug}/music/manage/${r.data.id}` as never);
      else router.refresh();
    });
  return (
    <>
      <Button iconStart={id ? 'pencil' : 'plus'} variant={id ? 'secondary' : 'primary'} onClick={() => setOpen(true)}>
        {id ? s.editPiece : s.addPiece}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={id ? s.editPiece : s.addPiece}
        closeLabel={s.close}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button onClick={submit} loading={busy || pending} disabled={!v.title.trim()}>
              {s.save}
            </Button>
          </>
        }
      >
        <div className="form-2col">
          {error ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <AlertCard tone="error">{error}</AlertCard>
            </div>
          ) : null}
          <TextInput label={s.title} value={v.title} onChange={set('title')} maxLength={200} />
          <TextInput label={s.composer} optional value={v.composer ?? ''} onChange={set('composer')} maxLength={200} />
          <TextInput label={s.arranger} optional value={v.arranger ?? ''} onChange={set('arranger')} maxLength={200} />
          <TextInput label={s.voicing} optional value={v.voicing ?? ''} onChange={set('voicing')} maxLength={40} placeholder="SATB" />
          <TextInput label={s.pieceLanguage} optional value={v.language ?? ''} onChange={set('language')} maxLength={60} />
          <TextInput label={s.duration} optional value={v.duration ?? ''} onChange={set('duration')} placeholder="3:45" inputMode="numeric" />
          <div style={{ gridColumn: '1 / -1' }}>
            <TextInput label={s.notes} optional multiline rows={3} value={v.notes ?? ''} onChange={set('notes')} maxLength={4000} />
          </div>
        </div>
      </Modal>
    </>
  );
}

export function DeletePieceButton({ slug, id, s }: { slug: string; id: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const { pending, error, router } = useRun(s);
  const [busy, start] = useTransition();
  return (
    <>
      <Button variant="ghost" iconStart="trash-2" onClick={() => setOpen(true)}>
        {s.deletePiece}
      </Button>
      <ConfirmDialog
        open={open}
        title={s.deletePiece}
        tone="danger"
        confirmLabel={s.delete}
        cancelLabel={s.cancel}
        loading={busy || pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const r = await deletePiece(slug, id);
            if (r.ok) router.push(`/c/${slug}/music/manage` as never);
            else setOpen(false);
          })
        }
      >
        {error ?? s.deletePieceBody}
      </ConfirmDialog>
    </>
  );
}

const audioDuration = (file: File) =>
  new Promise<number | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : null);
    };
    a.onerror = () => resolve(null);
    a.src = url;
  });

export function FileUpload({
  slug,
  orgId,
  pieceId,
  kind,
  sections,
  lang,
  s,
}: {
  slug: string;
  orgId: string;
  pieceId: string;
  kind: 'score' | 'track';
  sections: SectionInfo[];
  lang: Lang;
  s: StaffStrings;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [voicePartId, setVoicePartId] = useState('');
  const [trackKind, setTrackKind] = useState<'full' | 'part' | 'predominant'>('part');
  const [release, setRelease] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const name = (o: { name_en: string; name_fr: string }) => (lang === 'fr' ? o.name_fr : o.name_en);
  const parts = sections.find((x) => x.id === sectionId)?.voice_parts ?? [];

  const upload = async () => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return setError(s.tooBig);
    setBusy(true);
    setError(null);
    const ext = (file.name.split('.').pop() ?? (kind === 'score' ? 'pdf' : 'mp3')).toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${orgId}/${pieceId}/${crypto.randomUUID()}.${ext}`;
    const bucket = kind === 'score' ? 'scores' : 'tracks';
    const contentType = kind === 'score' ? 'application/pdf' : ext === 'm4a' ? 'audio/x-m4a' : file.type || 'audio/mpeg';
    const { error: upErr } = await createClient().storage.from(bucket).upload(path, file, { contentType, upsert: false });
    if (upErr) {
      setBusy(false);
      return setError(s.uploadFailed);
    }
    const r = await registerFile(slug, {
      kind,
      pieceId,
      path,
      size: file.size,
      label: label.trim() || file.name.replace(/\.[^.]+$/, '').slice(0, 80),
      sectionId,
      voicePartId,
      trackKind,
      duration: kind === 'track' ? await audioDuration(file) : null,
      release,
    });
    setBusy(false);
    if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
    setOpen(false);
    setFile(null);
    setLabel('');
    router.refresh();
  };

  return (
    <>
      <Button size="sm" variant="secondary" iconStart="upload" onClick={() => setOpen(true)}>
        {kind === 'score' ? s.uploadScore : s.uploadTrack}
      </Button>
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={kind === 'score' ? s.uploadScore : s.uploadTrack}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {s.cancel}
            </Button>
            <Button iconStart="upload" onClick={upload} loading={busy} disabled={!file}>
              {busy ? s.uploading : s.save}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          <label className="file-pick">
            <input
              type="file"
              accept={kind === 'score' ? 'application/pdf,.pdf' : 'audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,.mp3,.m4a,.aac'}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="cb-btn cb-btn--secondary cb-btn--md">{file ? file.name : kind === 'score' ? s.uploadScore : s.uploadTrack}</span>
          </label>
          <TextInput label={s.fileLabel} optional value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder={kind === 'score' ? 'Score' : 'Alto 2'} />
          {kind === 'track' ? (
            <Select
              label={s.trackKind}
              value={trackKind}
              onChange={(e) => setTrackKind(e.target.value as typeof trackKind)}
              options={[
                { value: 'part', label: s.trackPart },
                { value: 'predominant', label: s.trackPredominant },
                { value: 'full', label: s.trackFull },
              ]}
            />
          ) : null}
          {kind === 'score' || trackKind !== 'full' ? (
            <div className="form-2col">
              <Select
                label={s.forSection}
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setVoicePartId('');
                }}
                options={[{ value: '', label: s.everyone }, ...sections.map((x) => ({ value: x.id, label: name(x) }))]}
              />
              {kind === 'track' ? (
                <Select
                  label={s.forPart}
                  value={voicePartId}
                  onChange={(e) => setVoicePartId(e.target.value)}
                  disabled={!parts.length}
                  options={[{ value: '', label: '—' }, ...parts.map((p) => ({ value: p.id, label: name(p) }))]}
                />
              ) : null}
            </div>
          ) : null}
          <Toggle label={s.releaseNow} checked={release} onChange={(e) => setRelease(e.target.checked)} />
        </div>
      </Modal>
    </>
  );
}

export function ReleaseButton({ slug, kind, id, released, s }: { slug: string; kind: 'score' | 'track' | 'assignment'; id: string; released: boolean; s: StaffStrings }) {
  const { pending, run } = useRun(s);
  return (
    <Button size="sm" variant={released ? 'ghost' : 'tonal'} iconStart={released ? 'eye-off' : 'eye'} loading={pending} onClick={() => run(() => setReleased(slug, kind, id, !released))}>
      {released ? s.unrelease : s.release}
    </Button>
  );
}

export function DeleteRowButton({ slug, kind, id, label, s }: { slug: string; kind: 'score' | 'track' | 'assignment'; id: string; label: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun(s);
  return (
    <>
      <IconButton icon="trash-2" size="sm" label={`${s.delete} ${label}`} onClick={() => setOpen(true)} />
      <ConfirmDialog
        open={open}
        title={`${s.delete} ${label}`}
        tone="danger"
        confirmLabel={s.delete}
        cancelLabel={s.cancel}
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => run(() => (kind === 'assignment' ? deleteAssignment(slug, id) : deleteFile(slug, kind, id)), () => setOpen(false))}
      >
        {s.confirmDelete}
      </ConfirmDialog>
    </>
  );
}

export interface AssignmentValues {
  title: string;
  instructions: string;
  bars: string;
  due_on: string;
  section_ids: string[];
}

export function AssignmentForm({
  slug,
  pieceId,
  id,
  initial,
  sections,
  lang,
  s,
}: {
  slug: string;
  pieceId: string;
  id?: string;
  initial?: AssignmentValues;
  sections: SectionInfo[];
  lang: Lang;
  s: StaffStrings;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<AssignmentValues>(initial ?? { title: '', instructions: '', bars: '', due_on: '', section_ids: [] });
  const [release, setRelease] = useState(true);
  const { pending, error, run } = useRun(s);
  return (
    <>
      {id ? (
        <IconButton icon="pencil" size="sm" label={`${s.edit} ${initial?.title ?? ''}`} onClick={() => setOpen(true)} />
      ) : (
        <Button size="sm" variant="secondary" iconStart="plus" onClick={() => setOpen(true)}>
          {s.addAssignment}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={id ? s.edit : s.addAssignment}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!v.title.trim()} onClick={() => run(() => saveAssignment(slug, id ?? null, { ...v, pieceId, release }), () => setOpen(false))}>
              {s.save}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          <TextInput label={s.title} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={160} placeholder="Learn bars 1–24" />
          <div className="form-2col">
            <TextInput label={s.bars} optional value={v.bars} onChange={(e) => setV({ ...v, bars: e.target.value })} maxLength={60} />
            <TextInput label={s.dueOn} optional type="date" value={v.due_on} onChange={(e) => setV({ ...v, due_on: e.target.value })} />
          </div>
          <TextInput label={s.instructions} optional multiline rows={3} value={v.instructions} onChange={(e) => setV({ ...v, instructions: e.target.value })} maxLength={2000} />
          <fieldset className="plain-fieldset">
            <legend className="cb-label">{s.forSections}</legend>
            <p className="muted small" style={{ margin: '0 0 8px' }}>
              {s.whoIsCalledHint}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
              {sections.map((sec) => (
                <Checkbox
                  key={sec.id}
                  label={lang === 'fr' ? sec.name_fr : sec.name_en}
                  checked={v.section_ids.includes(sec.id)}
                  onChange={(e) => setV({ ...v, section_ids: e.target.checked ? [...v.section_ids, sec.id] : v.section_ids.filter((x) => x !== sec.id) })}
                />
              ))}
            </div>
          </fieldset>
          {!id ? <Toggle label={s.releaseNow} checked={release} onChange={(e) => setRelease(e.target.checked)} /> : null}
        </div>
      </Modal>
    </>
  );
}

export function SetListEditor({
  slug,
  eventId,
  title,
  initial,
  pieces,
  s,
}: {
  slug: string;
  eventId: string;
  title: string;
  initial: string[];
  pieces: { id: string; title: string }[];
  s: StaffStrings;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<string[]>(initial);
  const [adding, setAdding] = useState('');
  const { pending, error, run } = useRun(s);
  const titleOf = (id: string) => pieces.find((p) => p.id === id)?.title ?? '—';
  const move = (i: number, d: number) =>
    setList((l) => {
      const n = [...l];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x!);
      return n;
    });
  return (
    <>
      <Button size="sm" variant="ghost" iconStart="pencil" onClick={() => setOpen(true)}>
        {s.editSetList}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} onClick={() => run(() => saveSetList(slug, eventId, list), () => setOpen(false))}>
              {s.save}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          {list.length ? (
            <ol className="setlist-edit">
              {list.map((id, i) => (
                <li key={id}>
                  <span className="setlist-edit__n">{i + 1}</span>
                  <span style={{ flex: 1 }}>{titleOf(id)}</span>
                  <IconButton icon="arrow-up" size="sm" label={`${s.moveUp}: ${titleOf(id)}`} disabled={i === 0} onClick={() => move(i, -1)} />
                  <IconButton icon="arrow-down" size="sm" label={`${s.moveDown}: ${titleOf(id)}`} disabled={i === list.length - 1} onClick={() => move(i, 1)} />
                  <IconButton icon="x" size="sm" label={`${s.remove}: ${titleOf(id)}`} onClick={() => setList(list.filter((x) => x !== id))} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">{s.setListEmpty}</p>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Select
                label={s.addToSetList}
                value={adding}
                onChange={(e) => setAdding(e.target.value)}
                options={[{ value: '', label: '—' }, ...pieces.filter((p) => !list.includes(p.id)).map((p) => ({ value: p.id, label: p.title }))]}
              />
            </div>
            <Button
              variant="secondary"
              iconStart="plus"
              disabled={!adding}
              onClick={() => {
                setList([...list, adding]);
                setAdding('');
              }}
            >
              {s.add}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
