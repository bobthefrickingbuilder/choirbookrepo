'use client';

import { AlertCard, Button, TextInput } from '@choirbook/ui';
import { useEffect, useState, useTransition } from 'react';
import { checkIn, type CheckInOutcome } from '@/app/actions/attendance';

type S = Record<CheckInOutcome | 'code' | 'submit' | 'home' | 'checking', string>;

const TONE: Record<CheckInOutcome, 'success' | 'info' | 'warning' | 'error'> = {
  present: 'success',
  late: 'success',
  already: 'info',
  invalid: 'error',
  closed: 'warning',
  not_called: 'info',
};

/** Checks the chorister in straight away when they arrive from the QR code; otherwise asks for the code. */
export function CheckInClient({ slug, eventId, initialCode, homeHref, s }: { slug: string; eventId: string; initialCode: string | null; homeHref: string; s: S }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CheckInOutcome | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!initialCode) return;
    let live = true;
    void checkIn(slug, eventId, initialCode).then((r) => {
      if (live) setResult(r);
    });
    return () => {
      live = false;
    };
  }, [slug, eventId, initialCode]);

  if (initialCode && !result) return <p className="muted" role="status">{s.checking}</p>;

  return (
    <div className="stack">
      {result ? (
        <AlertCard tone={TONE[result]} icon={result === 'present' || result === 'late' ? 'circle-check' : undefined}>
          <span role="status" style={{ fontSize: 18 }}>
            {s[result]}
          </span>
        </AlertCard>
      ) : null}
      {!result || result === 'invalid' ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => setResult(await checkIn(slug, eventId, code.trim())));
          }}
        >
          <TextInput
            label={s.code}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', fontSize: 22 }}
          />
          <div>
            <Button type="submit" size="lg" iconStart="check" loading={pending} disabled={code.trim().length !== 8}>
              {s.submit}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button variant="secondary" iconStart="house" href={homeHref}>
            {s.home}
          </Button>
        </div>
      )}
    </div>
  );
}
