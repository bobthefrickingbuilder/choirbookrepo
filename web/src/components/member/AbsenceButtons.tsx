'use client';

import { AlertCard, Badge, Button, Modal, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cancelAbsence, reportAbsence } from '@/app/actions/member';

export interface AbsenceStrings {
  imAbsent: string;
  imLate: string;
  reportedAbsent: string;
  reportedLate: string;
  undoReport: string;
  absenceTitle: string;
  lateTitle: string;
  reason: string;
  reasonHint: string;
  sendReport: string;
  cancel: string;
  pastEvent: string;
  genericFail: string;
  required: string;
}

/** One-tap "I'll be absent / late" for an event, with a short reason. */
export function AbsenceButtons({
  slug,
  eventId,
  reported,
  s,
}: {
  slug: string;
  eventId: string;
  reported: { kind: 'absent' | 'late'; reason: string } | null;
  s: AbsenceStrings;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<'absent' | 'late' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!kind) return;
    if (!reason.trim()) {
      setError(s.required);
      return;
    }
    startTransition(async () => {
      const r = await reportAbsence(slug, { eventId, kind, reason });
      if (r.ok) {
        setKind(null);
        setReason('');
        router.refresh();
      } else setError(r.error === 'past_event' ? s.pastEvent : s.genericFail);
    });
  };

  if (reported) {
    return (
      <div className="row-between" style={{ gap: 8 }}>
        <Badge tone={reported.kind === 'absent' ? 'error' : 'warning'} icon={reported.kind === 'absent' ? 'x' : 'clock'} size="md">
          {reported.kind === 'absent' ? s.reportedAbsent : s.reportedLate}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              await cancelAbsence(slug, eventId);
              router.refresh();
            })
          }
        >
          {s.undoReport}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button size="sm" variant="secondary" iconStart="x" onClick={() => setKind('absent')}>
          {s.imAbsent}
        </Button>
        <Button size="sm" variant="secondary" iconStart="clock" onClick={() => setKind('late')}>
          {s.imLate}
        </Button>
      </div>
      <Modal
        open={kind !== null}
        onClose={() => setKind(null)}
        title={kind === 'late' ? s.lateTitle : s.absenceTitle}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setKind(null)}>
              {s.cancel}
            </Button>
            <Button iconStart="send" loading={pending} onClick={submit}>
              {s.sendReport}
            </Button>
          </>
        }
      >
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {error && error !== s.required ? <AlertCard tone="error">{error}</AlertCard> : null}
          <TextInput
            label={s.reason}
            hint={s.reasonHint}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            error={error === s.required ? error : undefined}
            required
            maxLength={500}
            data-autofocus=""
          />
        </form>
      </Modal>
    </>
  );
}
