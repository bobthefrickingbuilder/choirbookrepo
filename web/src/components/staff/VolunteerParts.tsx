'use client';

import { AlertCard, Button, Checkbox, ConfirmDialog, IconButton, Modal, Select, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addSignup, addSlot, deleteCheck, deleteJob, deleteSlot, removeSignup, saveCheck, saveJob, setHours, type JobInput } from '@/app/actions/volunteers';
import type { StaffStrings } from '@/lib/staff';

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
  return { pending, error, run };
}

export function JobForm({
  slug,
  id,
  initial,
  events,
  s,
}: {
  slug: string;
  id?: string;
  initial?: Required<{ [K in keyof JobInput]: JobInput[K] }>;
  events: { id: string; title: string }[];
  s: StaffStrings;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [v, setV] = useState({ title: '', description: '', event_id: '', requires_police_check: false, ...(initial ?? {}) } as {
    title: string;
    description: string;
    event_id: string;
    requires_police_check: boolean;
  });
  const { pending, error, run } = useRun(s);
  return (
    <>
      {id ? (
        <IconButton icon="pencil" size="sm" label={`${s.editJob}: ${v.title}`} onClick={() => setOpen(true)} />
      ) : (
        <Button iconStart="plus" onClick={() => setOpen(true)}>
          {s.addJob}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={id ? s.editJob : s.addJob}
        closeLabel={s.close}
        footer={
          <>
            {id ? (
              <Button variant="ghost" iconStart="trash-2" style={{ marginRight: 'auto' }} onClick={() => setConfirm(true)}>
                {s.deleteJob}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!v.title.trim()} onClick={() => run(() => saveJob(slug, id ?? null, v), () => setOpen(false))}>
              {s.save}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          <TextInput label={s.jobTitle} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={120} placeholder="Front of house" />
          <Select
            label={s.forEvent}
            value={v.event_id ?? ''}
            onChange={(e) => setV({ ...v, event_id: e.target.value })}
            options={[{ value: '', label: s.noEvent }, ...events.map((e) => ({ value: e.id, label: e.title }))]}
          />
          <TextInput label={s.description} optional multiline rows={3} value={v.description ?? ''} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={2000} />
          <Checkbox label={s.needsPoliceCheck} checked={v.requires_police_check} onChange={(e) => setV({ ...v, requires_police_check: e.target.checked })} />
        </div>
      </Modal>
      {id ? (
        <ConfirmDialog
          open={confirm}
          title={s.deleteJob}
          tone="danger"
          confirmLabel={s.delete}
          cancelLabel={s.cancel}
          loading={pending}
          onCancel={() => setConfirm(false)}
          onConfirm={() => run(() => deleteJob(slug, id), () => (setConfirm(false), setOpen(false)))}
        >
          {s.confirmDelete}
        </ConfirmDialog>
      ) : null}
    </>
  );
}

export function SlotForm({ slug, jobId, defaultDate, s }: { slug: string; jobId: string; defaultDate: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ date: defaultDate, start: '18:00', end: '20:00', needed: '2' });
  const { pending, error, run } = useRun(s);
  return (
    <>
      <Button size="sm" variant="ghost" iconStart="plus" onClick={() => setOpen(true)}>
        {s.addSlot}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.addSlot}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} onClick={() => run(() => addSlot(slug, jobId, { ...v, needed: Number(v.needed) || 1 }), () => setOpen(false))}>
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
          <TextInput label={s.date} type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
          <TextInput label={s.needed} inputMode="numeric" value={v.needed} onChange={(e) => setV({ ...v, needed: e.target.value.replace(/\D/g, '') })} />
          <TextInput label={s.slotStart} type="time" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} />
          <TextInput label={s.slotEnd} type="time" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}

export function SlotActions({ slug, slotId, people, full, s }: { slug: string; slotId: string; people: { id: string; name: string }[]; full: boolean; s: StaffStrings }) {
  const [person, setPerson] = useState('');
  const { pending, error, run } = useRun(s);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {!full ? (
        <>
          <div style={{ minWidth: 200 }}>
            <Select label={s.addVolunteer} size="sm" value={person} onChange={(e) => setPerson(e.target.value)} options={[{ value: '', label: '—' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
          </div>
          <Button size="sm" variant="secondary" iconStart="plus" disabled={!person} loading={pending} onClick={() => run(() => addSignup(slug, slotId, person), () => setPerson(''))}>
            {s.add}
          </Button>
        </>
      ) : null}
      <IconButton icon="trash-2" size="sm" label={`${s.remove} ${s.slots}`} onClick={() => run(() => deleteSlot(slug, slotId))} />
      {error ? <span className="muted small">{error}</span> : null}
    </div>
  );
}

export function SignupRow({ slug, slotId, personId, name, hours, s }: { slug: string; slotId: string; personId: string; name: string; hours: number | null; s: StaffStrings }) {
  const [h, setH] = useState(hours === null ? '' : String(hours));
  const { pending, run } = useRun(s);
  return (
    <li className="history-row">
      <span>{name}</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <span style={{ width: 90 }}>
          <TextInput
            label={s.logHours}
            size="sm"
            inputMode="decimal"
            value={h}
            onChange={(e) => setH(e.target.value)}
            onBlur={() => {
              const n = h.trim() === '' ? null : Number(h.replace(',', '.'));
              if (n === null || Number.isFinite(n)) run(() => setHours(slug, slotId, personId, n));
            }}
          />
        </span>
        <IconButton icon="x" size="sm" label={`${s.remove} ${name}`} disabled={pending} onClick={() => run(() => removeSignup(slug, slotId, personId))} />
      </span>
    </li>
  );
}

export function CheckForm({ slug, people, today, s }: { slug: string; people: { id: string; name: string }[]; today: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ personId: '', type: 'Vulnerable sector check', verified: today, expires: '' });
  const { pending, error, run } = useRun(s);
  return (
    <>
      <Button size="sm" variant="secondary" iconStart="plus" onClick={() => setOpen(true)}>
        {s.addCheck}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.addCheck}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!v.personId || !v.expires} onClick={() => run(() => saveCheck(slug, v), () => setOpen(false))}>
              {s.save}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          <Select label={s.checkPerson} value={v.personId} onChange={(e) => setV({ ...v, personId: e.target.value })} options={[{ value: '', label: '—' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
          <TextInput label={s.checkType} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })} maxLength={80} />
          <div className="form-2col">
            <TextInput label={s.verifiedOn} type="date" value={v.verified} onChange={(e) => setV({ ...v, verified: e.target.value })} />
            <TextInput label={s.expiresOn} type="date" value={v.expires} min={v.verified} onChange={(e) => setV({ ...v, expires: e.target.value })} />
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            {s.checksIntro}
          </p>
        </div>
      </Modal>
    </>
  );
}

export function DeleteCheckButton({ slug, id, s }: { slug: string; id: string; s: StaffStrings }) {
  const { pending, run } = useRun(s);
  return <IconButton icon="trash-2" size="sm" label={s.delete} disabled={pending} onClick={() => run(() => deleteCheck(slug, id))} />;
}
