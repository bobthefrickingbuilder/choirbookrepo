'use client';

import { AlertCard, Button, RadioGroup, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { setAvailability } from '@/app/actions/member';

type Answer = 'yes' | 'no' | 'maybe';

export function AvailabilityForm({
  slug,
  eventId,
  current,
  s,
}: {
  slug: string;
  eventId: string;
  current: { answer: Answer; comment: string | null } | null;
  s: { title: string; yes: string; no: string; maybe: string; comment: string; save: string; saved: string; failed: string; pastEvent: string };
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState<Answer | undefined>(current?.answer);
  const [comment, setComment] = useState(current?.comment ?? '');
  const [status, setStatus] = useState<'idle' | 'saved' | string>('idle');
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="stack"
      style={{ gap: 14 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!answer) return;
        startTransition(async () => {
          const r = await setAvailability(slug, { eventId, answer, comment });
          setStatus(r.ok ? 'saved' : r.error === 'past_event' ? s.pastEvent : s.failed);
          if (r.ok) router.refresh();
        });
      }}
    >
      <RadioGroup<Answer>
        label={s.title}
        orientation="row"
        value={answer}
        onChange={(v) => {
          setAnswer(v);
          setStatus('idle');
        }}
        options={[
          { value: 'yes', label: s.yes },
          { value: 'no', label: s.no },
          { value: 'maybe', label: s.maybe },
        ]}
      />
      <TextInput label={s.comment} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} optional />
      <div>
        <Button type="submit" iconStart="check" loading={pending} disabled={!answer}>
          {s.save}
        </Button>
      </div>
      {status === 'saved' ? (
        <AlertCard tone="success">{s.saved}</AlertCard>
      ) : status !== 'idle' ? (
        <AlertCard tone="error">{status}</AlertCard>
      ) : null}
    </form>
  );
}
