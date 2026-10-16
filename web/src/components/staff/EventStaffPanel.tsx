'use client';

import { format } from '@choirbook/shared/i18n';
import { AlertCard, Button, ConfirmDialog, Modal, TextInput, Toggle } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cancelEvent, deleteEvent, requestAvailability, restoreEvent } from '@/app/actions/events';
import type { StaffStrings } from '@/lib/staff';

/** Edit, cancel (with notification), restore, delete and ask for availability. */
export function EventStaffPanel({
  slug,
  id,
  cancelled,
  upcoming,
  availabilityRequested,
  canAttendance,
  s,
}: {
  slug: string;
  id: string;
  cancelled: boolean;
  upcoming: boolean;
  availabilityRequested: boolean;
  canAttendance: boolean;
  s: StaffStrings;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<'cancel' | 'delete' | 'ask' | null>(null);
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [due, setDue] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const after = (r: { ok: true; data?: { notified: number } } | { ok: false; error: string }) => {
    setDialog(null);
    if (!r.ok) setNotice({ tone: 'error', text: s.errors[r.error] ?? s.failed });
    else if (r.data?.notified) setNotice({ tone: 'success', text: format(s.notifiedN, { n: r.data.notified }) });
    router.refresh();
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      {notice ? (
        <AlertCard tone={notice.tone} onDismiss={() => setNotice(null)} dismissLabel={s.close}>
          {notice.text}
        </AlertCard>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button variant="secondary" iconStart="pencil" href={`/c/${slug}/calendar/${id}/edit`}>
          {s.editEvent}
        </Button>
        {canAttendance ? (
          <Button variant="secondary" iconStart="clipboard-check" href={`/c/${slug}/attendance/${id}`}>
            {s.takeAttendance}
          </Button>
        ) : null}
        {upcoming && !cancelled ? (
          <Button variant="secondary" iconStart="calendar-check" onClick={() => setDialog('ask')}>
            {availabilityRequested ? s.askAgain : s.askNow}
          </Button>
        ) : null}
        {cancelled ? (
          <Button variant="ghost" iconStart="undo-2" loading={pending} onClick={() => start(async () => after(await restoreEvent(slug, id)))}>
            {s.restoreEvent}
          </Button>
        ) : (
          <Button variant="ghost" iconStart="calendar-x" onClick={() => setDialog('cancel')}>
            {s.cancelEvent}
          </Button>
        )}
        <Button variant="ghost" iconStart="trash-2" onClick={() => setDialog('delete')}>
          {s.deleteEvent}
        </Button>
      </div>

      <Modal
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        title={s.cancelEvent}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {s.back}
            </Button>
            <Button variant="danger" iconStart="calendar-x" loading={pending} onClick={() => start(async () => after(await cancelEvent(slug, id, reason, notify)))}>
              {s.cancelEvent}
            </Button>
          </>
        }
      >
        <div className="stack">
          <TextInput label={s.cancelReason} optional multiline rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          <Toggle label={s.notifyCalled} checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        </div>
      </Modal>

      <Modal
        open={dialog === 'ask'}
        onClose={() => setDialog(null)}
        title={availabilityRequested ? s.askAgain : s.askNow}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {s.back}
            </Button>
            <Button iconStart="send" loading={pending} onClick={() => start(async () => after(await requestAvailability(slug, id, due)))}>
              {s.sendAsk}
            </Button>
          </>
        }
      >
        <div style={{ maxWidth: 260 }}>
          <TextInput label={s.availabilityDue} optional type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </Modal>

      <ConfirmDialog
        open={dialog === 'delete'}
        title={s.deleteEvent}
        tone="danger"
        confirmLabel={s.deleteEvent}
        cancelLabel={s.back}
        loading={pending}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          start(async () => {
            const r = await deleteEvent(slug, id);
            if (r.ok) router.push(`/c/${slug}/calendar` as never);
            else after(r);
          })
        }
      >
        {s.deleteEventBody}
      </ConfirmDialog>
    </div>
  );
}
