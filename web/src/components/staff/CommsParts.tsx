'use client';

import { format } from '@choirbook/shared/i18n';
import { AlertCard, Button, Checkbox, ConfirmDialog, RadioGroup, Select, TextInput, Toggle } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  createMonthlyUpdate,
  deleteAnnouncement,
  generateMonthlyUpdate,
  saveAnnouncement,
  saveMonthlyNotes,
  sendMonthlyUpdate,
  updateConversation,
  type AnnouncementInput,
} from '@/app/actions/comms';
import { dismissReports, setMessageHidden } from '@/app/actions/moderation';
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
  return { pending, error, setError, run, router, start };
}

export type AnnouncementValues = Required<AnnouncementInput>;

export function AnnouncementComposer({
  slug,
  id,
  initial,
  sent,
  sections,
  people,
  s,
}: {
  slug: string;
  id: string | null;
  initial: AnnouncementValues;
  sent: boolean;
  sections: { id: string; name: string }[];
  people: { id: string; name: string }[];
  s: StaffStrings;
}) {
  const [v, setV] = useState<AnnouncementValues>(initial);
  const { pending, error, setError, router, start } = useRun(s);
  const set = <K extends keyof AnnouncementValues>(k: K, value: AnnouncementValues[K]) => setV((x) => ({ ...x, [k]: value }));
  const errorText = (code: string) => (code === 'no_audience' ? s.noAudience : (s.errors[code] ?? s.failed));
  const submit = () =>
    start(async () => {
      const r = await saveAnnouncement(slug, id, v);
      if (!r.ok) return setError(errorText(r.error));
      router.push(`/c/${slug}/communications/${r.data.id}${r.data.recipients ? `?sent=${r.data.recipients}` : ''}` as never);
      router.refresh();
    });

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <TextInput label={s.title} value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={200} required />
      <TextInput label={s.body} multiline rows={8} value={v.body} onChange={(e) => set('body', e.target.value)} maxLength={10000} required />
      {!sent ? (
        <>
          <RadioGroup
            label={s.audience}
            name="audience"
            orientation="row"
            value={v.audience}
            onChange={(a) => set('audience', a as AnnouncementValues['audience'])}
            options={[
              { value: 'all', label: s.audienceAll },
              { value: 'sections', label: s.audienceSections },
              ...(people.length ? [{ value: 'people', label: format(s.audiencePeople, { n: people.length }) }] : []),
            ]}
          />
          {v.audience === 'sections' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
              {sections.map((sec) => (
                <Checkbox
                  key={sec.id}
                  label={sec.name}
                  checked={v.section_ids.includes(sec.id)}
                  onChange={(e) => set('section_ids', e.target.checked ? [...v.section_ids, sec.id] : v.section_ids.filter((x) => x !== sec.id))}
                />
              ))}
            </div>
          ) : null}
          {v.audience === 'people' ? <p className="muted small">{people.map((p) => p.name).join(', ')}</p> : null}
        </>
      ) : null}
      <div className="stack" style={{ gap: 10 }}>
        <Toggle label={s.pinned} checked={v.pinned} onChange={(e) => set('pinned', e.target.checked)} />
        <Toggle label={s.requiresAck} checked={v.requires_ack} onChange={(e) => set('requires_ack', e.target.checked)} />
        {v.requires_ack ? (
          <div style={{ maxWidth: 240 }}>
            <TextInput label={s.ackDue} optional type="date" value={v.ack_due_on ?? ''} onChange={(e) => set('ack_due_on', e.target.value)} />
          </div>
        ) : null}
      </div>
      {!sent ? (
        <>
          <RadioGroup
            label={s.when}
            name="when"
            orientation="row"
            value={v.when}
            onChange={(w) => set('when', w as AnnouncementValues['when'])}
            options={[
              { value: 'now', label: s.sendNow },
              { value: 'schedule', label: s.schedule },
              { value: 'draft', label: s.saveDraft },
            ]}
          />
          {v.when === 'schedule' ? (
            <div className="stack" style={{ gap: 8 }}>
              <div className="form-2col" style={{ maxWidth: 480 }}>
                <TextInput label={s.publishDate} type="date" value={v.publish_date} onChange={(e) => set('publish_date', e.target.value)} />
                <TextInput label={s.publishTime} type="time" value={v.publish_time} onChange={(e) => set('publish_time', e.target.value)} />
              </div>
              <p className="muted small" style={{ margin: 0 }}>
                {s.scheduleHint}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="submit" size="lg" iconStart={v.when === 'now' && !sent ? 'send' : 'check'} loading={pending} disabled={!v.title.trim() || !v.body.trim()}>
          {sent ? s.save : v.when === 'now' ? s.sendNow : v.when === 'schedule' ? s.schedule : s.saveDraft}
        </Button>
        <Button variant="ghost" size="lg" href={`/c/${slug}/communications`}>
          {s.cancel}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAnnouncementButton({ slug, id, s }: { slug: string; id: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const { pending, router, start } = useRun(s);
  return (
    <>
      <Button variant="ghost" iconStart="trash-2" onClick={() => setOpen(true)}>
        {s.deleteAnnouncement}
      </Button>
      <ConfirmDialog
        open={open}
        title={s.deleteAnnouncement}
        tone="danger"
        confirmLabel={s.delete}
        cancelLabel={s.cancel}
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const r = await deleteAnnouncement(slug, id);
            if (r.ok) router.push(`/c/${slug}/communications` as never);
            setOpen(false);
          })
        }
      >
        {s.confirmDelete}
      </ConfirmDialog>
    </>
  );
}

export function InboxControls({
  slug,
  id,
  status,
  assignedTo,
  category,
  staff,
  canEdit,
  s,
  categories,
}: {
  slug: string;
  id: string;
  status: 'open' | 'resolved';
  assignedTo: string | null;
  category: 'absence' | 'music' | 'fees' | 'general';
  staff: { id: string; name: string }[];
  canEdit: boolean;
  s: StaffStrings;
  categories: { value: string; label: string }[];
}) {
  const { pending, error, run } = useRun(s);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <div className="inbox-controls">
        <Select
          label={s.assignTo}
          size="sm"
          value={assignedTo ?? ''}
          disabled={!canEdit || pending}
          onChange={(e) => run(() => updateConversation(slug, id, { assigned_to: e.target.value || null }))}
          options={[{ value: '', label: s.unassigned }, ...staff.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <Select
          label={s.category}
          size="sm"
          value={category}
          disabled={!canEdit || pending}
          onChange={(e) => run(() => updateConversation(slug, id, { category: e.target.value as typeof category }))}
          options={categories}
        />
        {canEdit ? (
          <Button
            variant={status === 'open' ? 'secondary' : 'ghost'}
            iconStart={status === 'open' ? 'check' : 'rotate-ccw'}
            loading={pending}
            onClick={() => run(() => updateConversation(slug, id, { status: status === 'open' ? 'resolved' : 'open' }))}
          >
            {status === 'open' ? s.resolve : s.reopen}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function HideMessageButton({ slug, id, hidden, s }: { slug: string; id: string; hidden: boolean; s: StaffStrings }) {
  const { pending, run } = useRun(s);
  return (
    <Button size="sm" variant="ghost" iconStart={hidden ? 'eye' : 'eye-off'} loading={pending} onClick={() => run(() => setMessageHidden(slug, id, !hidden))}>
      {hidden ? s.showMessage : s.hideMessage}
    </Button>
  );
}

export function DismissReportsButton({ slug, messageId, s }: { slug: string; messageId: string; s: StaffStrings }) {
  const { pending, run } = useRun(s);
  return (
    <Button size="sm" variant="ghost" iconStart="x" loading={pending} onClick={() => run(() => dismissReports(slug, messageId))}>
      {s.dismiss}
    </Button>
  );
}

export function NewMonthlyUpdate({ slug, defaultMonth, s }: { slug: string; defaultMonth: string; s: StaffStrings }) {
  const [month, setMonth] = useState(defaultMonth);
  const { pending, error, run } = useRun(s);
  return (
    <div className="stack" style={{ gap: 8 }}>
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <TextInput label={s.month} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <Button iconStart="plus" loading={pending} disabled={!month} onClick={() => run(() => createMonthlyUpdate(slug, month))}>
          {s.newUpdate}
        </Button>
      </div>
    </div>
  );
}

export function MonthlyUpdateEditor({
  slug,
  id,
  status,
  initial,
  deliveries,
  s,
}: {
  slug: string;
  id: string;
  status: 'draft' | 'review' | 'scheduled' | 'sent';
  initial: { conductor_note: string; free_text: string };
  deliveries: number;
  s: StaffStrings;
}) {
  const [v, setV] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const { pending, error, setError, router, start } = useRun(s);
  const sent = status === 'sent';
  const act = (fn: () => Promise<{ ok: true; data: { n: number } } | { ok: false; error: string }>, msg: string) =>
    start(async () => {
      const saved = sent ? { ok: true as const } : await saveMonthlyNotes(slug, id, v);
      if (!saved.ok) return setError(s.errors[saved.error] ?? s.failed);
      const r = await fn();
      if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
      setError(null);
      setNotice(format(msg, { n: r.data.n }));
      router.refresh();
    });
  return (
    <div className="stack" style={{ gap: 12 }}>
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      {notice ? <AlertCard tone="success">{notice}</AlertCard> : null}
      <TextInput label={s.conductorNote} optional multiline rows={3} value={v.conductor_note} disabled={sent} onChange={(e) => setV({ ...v, conductor_note: e.target.value })} maxLength={4000} />
      <TextInput label={s.freeText} optional multiline rows={3} value={v.free_text} disabled={sent} onChange={(e) => setV({ ...v, free_text: e.target.value })} maxLength={4000} />
      {!sent ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" iconStart="refresh-cw" loading={pending} onClick={() => act(() => generateMonthlyUpdate(slug, id), s.generatedN)}>
            {s.generate}
          </Button>
          {status === 'review' && deliveries > 0 ? (
            <Button iconStart="send" loading={pending} onClick={() => act(() => sendMonthlyUpdate(slug, id), s.sentUpdate)}>
              {format(s.sendUpdate, { n: deliveries })}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SummaryCard({ content, s, money, dates }: { content: MonthlyContent; s: StaffStrings; money: string; dates: string[] }) {
  const a = content.attendance ?? { present: 0, late: 0, excused: 0, absent: 0 };
  return (
    <dl className="def-list">
      <dt>{s.sumAttendance}</dt>
      <dd>
        {s.present} {a.present} · {s.late} {a.late} · {s.excused} {a.excused} · {s.absent} {a.absent}
      </dd>
      <dt>{s.sumOwing}</dt>
      <dd>{content.owing_cents ? money : s.nothingOwing}</dd>
      <dt>{s.sumForms}</dt>
      <dd>{content.forms_due?.length ? content.forms_due.join(', ') : s.allFormsDone}</dd>
      <dt>{s.sumPractice}</dt>
      <dd>{content.practice_done ?? 0}</dd>
      <dt>{s.sumComing}</dt>
      <dd>{content.coming_up?.length ? content.coming_up.map((c, i) => `${c.title} (${dates[i] ?? ''})`).join(', ') : '—'}</dd>
    </dl>
  );
}

export interface MonthlyContent {
  first_name?: string;
  attendance?: { present: number; late: number; excused: number; absent: number };
  owing_cents?: number;
  forms_due?: string[];
  practice_done?: number;
  coming_up?: { title: string; starts_at: string; type: string }[];
}
