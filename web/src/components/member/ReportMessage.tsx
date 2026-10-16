'use client';

import { AlertCard, Button, Modal, TextInput } from '@choirbook/ui';
import { useState, useTransition } from 'react';
import { reportMessage } from '@/app/actions/messages';

export function ReportMessage({
  slug,
  messageId,
  s,
}: {
  slug: string;
  messageId: string;
  s: { report: string; title: string; intro: string; reason: string; send: string; done: string; cancel: string; failed: string };
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button type="button" className="cb-link msg__report" onClick={() => setOpen(true)}>
        {s.report}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.title}
        size="sm"
        footer={
          state === 'done' ? (
            <Button onClick={() => setOpen(false)}>{s.cancel}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {s.cancel}
              </Button>
              <Button
                variant="danger"
                iconStart="triangle-alert"
                loading={pending}
                disabled={!reason.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const r = await reportMessage(slug, { messageId, reason });
                    setState(r.ok ? 'done' : 'failed');
                  })
                }
              >
                {s.send}
              </Button>
            </>
          )
        }
      >
        {state === 'done' ? (
          <AlertCard tone="success">{s.done}</AlertCard>
        ) : (
          <div className="stack">
            <p className="muted">{s.intro}</p>
            {state === 'failed' ? <AlertCard tone="error">{s.failed}</AlertCard> : null}
            <TextInput label={s.reason} multiline rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
          </div>
        )}
      </Modal>
    </>
  );
}
