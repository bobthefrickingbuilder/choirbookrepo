'use client';

import { AlertCard, Button, Modal, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { requestAid, resendGuardianLink, startCardPayment } from '@/app/actions/forms';

/** "Pay $X by card": sends the member to Stripe's secure page (test mode). */
export function PayButton({
  slug,
  assignmentId,
  amountCents,
  label,
  variant = 'primary',
  s,
}: {
  slug: string;
  assignmentId: string;
  amountCents: number;
  label: string;
  variant?: 'primary' | 'secondary';
  s: { off: string; failed: string };
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="stack" style={{ gap: 8 }}>
      <Button
        variant={variant}
        iconStart="credit-card"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await startCardPayment(slug, assignmentId, amountCents);
            if (r.ok && r.url) window.location.assign(r.url);
            else setError(!r.ok && r.error === 'payments_off' ? s.off : s.failed);
          })
        }
      >
        {label}
      </Button>
      {error ? <AlertCard tone="info">{error}</AlertCard> : null}
    </div>
  );
}

export function AidRequest({
  slug,
  assignmentId,
  maxCents,
  s,
}: {
  slug: string;
  assignmentId: string;
  maxCents: number;
  s: { ask: string; title: string; intro: string; amount: string; reason: string; send: string; sent: string; cancel: string; failed: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((maxCents / 100).toFixed(2));
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'sent' | 'failed'>('idle');
  const [pending, startTransition] = useTransition();
  const cents = Math.round(Number(amount) * 100);
  const valid = Number.isFinite(cents) && cents >= 100 && cents <= maxCents;
  return (
    <>
      <Button variant="ghost" size="sm" iconStart="circle-help" onClick={() => setOpen(true)}>
        {s.ask}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.title}
        size="sm"
        footer={
          state === 'sent' ? (
            <Button onClick={() => setOpen(false)}>{s.cancel}</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {s.cancel}
              </Button>
              <Button
                iconStart="send"
                loading={pending}
                disabled={!valid}
                onClick={() =>
                  startTransition(async () => {
                    const r = await requestAid(slug, assignmentId, cents, reason);
                    setState(r.ok ? 'sent' : 'failed');
                    if (r.ok) router.refresh();
                  })
                }
              >
                {s.send}
              </Button>
            </>
          )
        }
      >
        {state === 'sent' ? (
          <AlertCard tone="success">{s.sent}</AlertCard>
        ) : (
          <div className="stack">
            <p className="muted">{s.intro}</p>
            {state === 'failed' ? <AlertCard tone="error">{s.failed}</AlertCard> : null}
            <TextInput label={s.amount} type="number" inputMode="decimal" min={1} step="0.01" prefix="$" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <TextInput label={s.reason} multiline rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} optional />
          </div>
        )}
      </Modal>
    </>
  );
}

export function ResendGuardian({
  slug,
  responseId,
  s,
}: {
  slug: string;
  responseId: string;
  s: { resend: string; sent: string; tooSoon: string; failed: string; demoReady?: string; openLink?: string };
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [demoLink, setDemoLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div>
        <Button
          size="sm"
          variant="secondary"
          iconStart="send"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await resendGuardianLink(slug, responseId);
              setDemoLink(r.ok && r.demoLink ? r.demoLink : null);
              setMsg(
                r.ok
                  ? { tone: r.demoLink ? 'info' : 'success', text: r.demoLink ? (s.demoReady ?? s.sent) : s.sent }
                  : r.error === 'too_soon'
                    ? { tone: 'info', text: s.tooSoon }
                    : { tone: 'error', text: s.failed },
              );
              if (r.ok) router.refresh();
            })
          }
        >
          {s.resend}
        </Button>
      </div>
      {msg ? <AlertCard tone={msg.tone}>{msg.text}</AlertCard> : null}
      {demoLink ? (
        <div>
          <Button size="sm" iconStart="external-link" href={demoLink}>
            {s.openLink ?? s.resend}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
