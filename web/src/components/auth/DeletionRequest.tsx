'use client';

import { AlertCard, Button } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cancelAccountDeletion, requestAccountDeletion } from '@/app/actions/privacy';

export function DeletionRequest({
  pending: pendingLine,
  blocked,
  s,
}: {
  /** "You asked to delete your account on …", when a request is open. */
  pending: string | null;
  /** Why deletion is not possible right now (demo, last administrator), if so. */
  blocked: string | null;
  s: { send: string; sent: string; cancel: string; cancelled: string; errors: Record<string, string> };
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (blocked) return <AlertCard tone="info">{blocked}</AlertCard>;
  return (
    <div className="stack">
      {msg ? <AlertCard tone={msg.tone}>{msg.text}</AlertCard> : null}
      {pendingLine && !msg ? <AlertCard tone="info">{pendingLine}</AlertCard> : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          variant="danger"
          iconStart="trash-2"
          loading={busy}
          onClick={() =>
            start(async () => {
              const r = await requestAccountDeletion();
              setMsg(r.ok ? { tone: 'success', text: s.sent } : { tone: 'error', text: s.errors[r.error] ?? s.errors.failed ?? '' });
              router.refresh();
            })
          }
        >
          {s.send}
        </Button>
        {pendingLine ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await cancelAccountDeletion();
                setMsg(r.ok ? { tone: 'info', text: s.cancelled } : { tone: 'error', text: s.errors.failed ?? '' });
                router.refresh();
              })
            }
          >
            {s.cancel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
