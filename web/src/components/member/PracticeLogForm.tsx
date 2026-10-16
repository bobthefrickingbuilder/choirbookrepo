'use client';

import { AlertCard, Button, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { logPractice } from '@/app/actions/member';

export function PracticeLogForm({
  slug,
  pieceId,
  s,
}: {
  slug: string;
  pieceId: string;
  s: { minutes: string; note: string; save: string; saved: string; failed: string; invalid: string };
}) {
  const router = useRouter();
  const [minutes, setMinutes] = useState('15');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed' | 'invalid'>('idle');
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="log-form"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(minutes);
        if (!Number.isInteger(n) || n < 1 || n > 600) {
          setStatus('invalid');
          return;
        }
        startTransition(async () => {
          const r = await logPractice(slug, { pieceId, minutes: n, note });
          setStatus(r.ok ? 'saved' : 'failed');
          if (r.ok) {
            setNote('');
            router.refresh();
          }
        });
      }}
    >
      <TextInput
        label={s.minutes}
        type="number"
        inputMode="numeric"
        min={1}
        max={600}
        value={minutes}
        onChange={(e) => {
          setMinutes(e.target.value);
          setStatus('idle');
        }}
        error={status === 'invalid' ? s.invalid : undefined}
        style={{ maxWidth: 140 }}
      />
      <TextInput label={s.note} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} optional />
      <div>
        <Button type="submit" iconStart="plus" loading={pending}>
          {s.save}
        </Button>
      </div>
      {status === 'saved' ? <AlertCard tone="success">{s.saved}</AlertCard> : null}
      {status === 'failed' ? <AlertCard tone="error">{s.failed}</AlertCard> : null}
    </form>
  );
}
