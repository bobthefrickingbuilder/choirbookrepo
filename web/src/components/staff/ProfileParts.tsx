'use client';

import { AlertCard, Badge, Button, Checkbox, ConfirmDialog, IconButton, Modal, Select, TextInput, Toggle } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { inviteMember } from '@/app/actions/invitations';
import { setMessagingSuspended } from '@/app/actions/moderation';
import {
  addCareNote,
  addStaffNote,
  deleteCareNote,
  deleteStaffNote,
  removeGuardian,
  saveGuardian,
  setDeparted,
  type GuardianInput,
} from '@/app/actions/roster';
import type { StaffStrings } from '@/lib/staff';

type Result = { ok: true } | { ok: false; error: string };

/** Runs a server action, shows its error, refreshes the page on success. */
function useAction(s: StaffStrings) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError(null);
        after?.();
        router.refresh();
      } else setError(s.errors[r.error] ?? s.failed);
    });
  return { pending, error, setError, run };
}

export function StaffNoteForm({ slug, personId, s }: { slug: string; personId: string; s: StaffStrings }) {
  const [body, setBody] = useState('');
  const { pending, error, run } = useAction(s);
  return (
    <form
      className="stack"
      style={{ gap: 10 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addStaffNote(slug, personId, body), () => setBody(''));
      }}
    >
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <TextInput label={s.addNote} multiline rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={s.notePlaceholder} maxLength={4000} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" size="sm" variant="secondary" iconStart="plus" loading={pending} disabled={!body.trim()}>
          {s.saveNote}
        </Button>
      </div>
    </form>
  );
}

export function DeleteNoteButton({ slug, id, kind, s }: { slug: string; id: string; kind: 'staff' | 'care'; s: StaffStrings }) {
  const [confirm, setConfirm] = useState(false);
  const { pending, run } = useAction(s);
  return (
    <>
      <IconButton icon="trash-2" size="sm" label={s.delete} onClick={() => setConfirm(true)} />
      <ConfirmDialog
        open={confirm}
        title={s.delete}
        tone="danger"
        confirmLabel={s.delete}
        cancelLabel={s.cancel}
        loading={pending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => run(() => (kind === 'staff' ? deleteStaffNote(slug, id) : deleteCareNote(slug, id)), () => setConfirm(false))}
      >
        {s.confirmDelete}
      </ConfirmDialog>
    </>
  );
}

export function CareNoteForm({ slug, personId, s }: { slug: string; personId: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ label: '', detail: '', high: false });
  const { pending, error, run } = useAction(s);
  return (
    <>
      <Button size="sm" variant="ghost" iconStart="plus" onClick={() => setOpen(true)}>
        {s.addCareNote}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.addCareNote}
        closeLabel={s.cancel}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button
              loading={pending}
              disabled={!v.label.trim()}
              onClick={() =>
                run(
                  () => addCareNote(slug, personId, { label: v.label, detail: v.detail, severity: v.high ? 'high' : 'medium' }),
                  () => {
                    setOpen(false);
                    setV({ label: '', detail: '', high: false });
                  },
                )
              }
            >
              {s.save}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          <TextInput label={s.careLabel} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} maxLength={120} />
          <TextInput label={s.careDetail} optional multiline rows={3} value={v.detail} onChange={(e) => setV({ ...v, detail: e.target.value })} maxLength={2000} />
          <Checkbox label={s.careHigh} checked={v.high} onChange={(e) => setV({ ...v, high: e.target.checked })} />
        </div>
      </Modal>
    </>
  );
}

export interface GuardianValues {
  id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lang: 'en' | 'fr';
  relationship: string;
  is_primary: boolean;
  receives_copies: boolean;
  is_emergency_contact: boolean;
}

export function GuardianEditor({ slug, choristerId, initial, s }: { slug: string; choristerId: string; initial?: GuardianValues; s: StaffStrings }) {
  const blank: GuardianValues = {
    id: null,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lang: 'en',
    relationship: '',
    is_primary: false,
    receives_copies: true,
    is_emergency_contact: true,
  };
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<GuardianValues>(initial ?? blank);
  const [confirm, setConfirm] = useState(false);
  const { pending, error, run } = useAction(s);
  const set = (k: keyof GuardianValues) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const { id, ...input } = v;
  return (
    <>
      {initial ? (
        <IconButton icon="pencil" size="sm" label={`${s.edit} ${initial.first_name} ${initial.last_name}`} onClick={() => setOpen(true)} />
      ) : (
        <Button size="sm" variant="ghost" iconStart="plus" onClick={() => setOpen(true)}>
          {s.addGuardian}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={initial ? `${initial.first_name} ${initial.last_name}` : s.addGuardian}
        closeLabel={s.cancel}
        footer={
          <>
            {initial ? (
              <Button variant="ghost" iconStart="trash-2" onClick={() => setConfirm(true)} style={{ marginRight: 'auto' }}>
                {s.remove}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button
              loading={pending}
              disabled={!v.first_name.trim() || !v.last_name.trim()}
              onClick={() => run(() => saveGuardian(slug, choristerId, id, input as GuardianInput), () => setOpen(false))}
            >
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
          <TextInput label={s.firstName} value={v.first_name} onChange={set('first_name')} maxLength={80} />
          <TextInput label={s.lastName} value={v.last_name} onChange={set('last_name')} maxLength={80} />
          <TextInput label={s.email} optional type="email" value={v.email} onChange={set('email')} />
          <TextInput label={s.phone} optional type="tel" value={v.phone} onChange={set('phone')} maxLength={40} />
          <TextInput label={s.relationship} optional value={v.relationship} onChange={set('relationship')} maxLength={40} />
          <Select
            label={s.language}
            value={v.lang}
            onChange={set('lang')}
            options={[
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'Français' },
            ]}
          />
          <div className="stack" style={{ gridColumn: '1 / -1', gap: 8 }}>
            <Toggle label={s.primary} checked={v.is_primary} onChange={(e) => setV({ ...v, is_primary: e.target.checked })} />
            <Toggle label={s.receivesCopies} checked={v.receives_copies} onChange={(e) => setV({ ...v, receives_copies: e.target.checked })} />
            <Toggle label={s.emergencyContact} checked={v.is_emergency_contact} onChange={(e) => setV({ ...v, is_emergency_contact: e.target.checked })} />
          </div>
        </div>
      </Modal>
      {initial?.id ? (
        <ConfirmDialog
          open={confirm}
          title={s.remove}
          tone="danger"
          confirmLabel={s.remove}
          cancelLabel={s.cancel}
          loading={pending}
          onCancel={() => setConfirm(false)}
          onConfirm={() =>
            run(
              () => removeGuardian(slug, choristerId, initial.id!),
              () => {
                setConfirm(false);
                setOpen(false);
              },
            )
          }
        >
          {s.confirmDelete}
        </ConfirmDialog>
      ) : null}
    </>
  );
}

export function ProfileActions({
  slug,
  orgId,
  personId,
  departed,
  canEdit,
  canInvite,
  canModerate,
  account,
  suspended,
  s,
}: {
  slug: string;
  orgId: string;
  personId: string;
  departed: boolean;
  canEdit: boolean;
  canInvite: boolean;
  canModerate: boolean;
  account: 'active' | 'invited' | 'none';
  suspended: boolean;
  s: StaffStrings;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const invite = () =>
    start(async () => {
      const r = await inviteMember(orgId, personId);
      if (r.ok) setNotice({ tone: 'success', text: r.outcome === 'linked' ? s.inviteLinked : s.inviteSent });
      else
        setNotice({
          tone: 'error',
          text: { demo: s.demoBlocked, no_email: s.inviteNoEmail, already_active: s.inviteAlready }[r.reason as string] ?? s.failed,
        });
      router.refresh();
    });
  const archive = () =>
    start(async () => {
      const r = await setDeparted(slug, [personId], !departed);
      if (!r.ok) setNotice({ tone: 'error', text: s.errors[r.error] ?? s.failed });
      router.refresh();
    });
  const suspend = () =>
    start(async () => {
      const r = await setMessagingSuspended(slug, personId, !suspended);
      if (!r.ok) setNotice({ tone: 'error', text: s.errors[r.error] ?? s.failed });
      router.refresh();
    });
  return (
    <div className="stack" style={{ gap: 10 }}>
      {notice ? (
        <AlertCard tone={notice.tone} onDismiss={() => setNotice(null)} dismissLabel={s.close}>
          {notice.text}
        </AlertCard>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {canInvite && account === 'invited' && !departed ? (
          <Button variant="secondary" iconStart="send" onClick={invite} loading={pending}>
            {s.invite}
          </Button>
        ) : null}
        {canModerate ? (
          <Button variant="ghost" iconStart={suspended ? 'message-square' : 'message-square-off'} onClick={suspend} loading={pending}>
            {suspended ? s.restoreMessaging : s.pauseMessaging}
          </Button>
        ) : null}
        {canEdit ? (
          <Button variant="ghost" iconStart={departed ? 'undo-2' : 'archive'} onClick={archive} loading={pending}>
            {departed ? s.restore : s.archive}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function SuspendedBadge({ s }: { s: StaffStrings }) {
  return (
    <Badge tone="warning" icon="message-square-off">
      {s.messagingPaused}
    </Badge>
  );
}
