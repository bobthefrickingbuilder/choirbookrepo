'use client';

import { AlertCard, Badge, Button } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { recordConsent } from '@/app/actions/privacy';

export interface ConsentView {
  kind: string;
  label: string;
  required: boolean;
  wording: string | null;
  /** "Given on 12 Sept · wording version 1", or null when not answered. */
  stateLine: string | null;
  granted: boolean | null;
  needsAnswer: boolean;
}

/** One consent: its wording, the member's current answer, and the button to change it. */
export function ConsentItem({
  slug,
  c,
  s,
}: {
  slug: string;
  c: ConsentView;
  s: { required: string; optional: string; given: string; withdrawn: string; notAnswered: string; agree: string; withdraw: string; newWording: string; noWording: string; saved: string; failed: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const act = (granted: boolean) =>
    start(async () => {
      const r = await recordConsent(slug, c.kind, granted);
      setMsg(r.ok ? { tone: 'success', text: s.saved } : { tone: 'error', text: s.failed });
      if (r.ok) router.refresh();
    });
  const canAgree = c.wording && (c.needsAnswer || c.granted !== true);
  const canWithdraw = c.wording && !c.required && c.granted === true && !c.needsAnswer;

  return (
    <section className="note consent" aria-labelledby={`consent-${c.kind}`} data-consent={c.kind}>
      <div className="row-between">
        <h3 id={`consent-${c.kind}`} className="person-row__name" style={{ margin: 0 }}>
          {c.label}
          <Badge tone="neutral">{c.required ? s.required : s.optional}</Badge>
        </h3>
        {c.granted === null ? (
          <Badge tone="warning">{s.notAnswered}</Badge>
        ) : (
          <Badge tone={c.granted ? 'success' : 'neutral'}>{c.granted ? s.given : s.withdrawn}</Badge>
        )}
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{c.wording ?? s.noWording}</p>
      {c.stateLine ? <p className="muted small">{c.stateLine}</p> : null}
      {c.needsAnswer && c.granted !== null ? <AlertCard tone="warning">{s.newWording}</AlertCard> : null}
      {msg ? <AlertCard tone={msg.tone}>{msg.text}</AlertCard> : null}
      {canAgree || canWithdraw ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {canAgree ? (
            <Button size="sm" iconStart="check" loading={pending} onClick={() => act(true)}>
              {s.agree}
            </Button>
          ) : null}
          {canWithdraw ? (
            <Button size="sm" variant="secondary" loading={pending} onClick={() => act(false)}>
              {s.withdraw}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
