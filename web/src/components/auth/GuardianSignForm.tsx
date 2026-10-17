'use client';

import { AlertCard, Button, Checkbox, TextInput } from '@choirbook/ui';
import { useState, useTransition } from 'react';
import { signAsGuardian } from '@/app/actions/guardian';

export function GuardianSignForm({
  token,
  defaultName,
  s,
}: {
  token: string;
  defaultName: string;
  s: {
    signLabel: string;
    signHint: string;
    agree: string;
    sign: string;
    signedTitle: string;
    signedBody: string;
    errors: Record<string, string>;
  };
}) {
  const [name, setName] = useState(defaultName);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (signed) {
    return (
      <AlertCard tone="success" title={s.signedTitle.replace('{name}', signed)}>
        {s.signedBody}
      </AlertCard>
    );
  }
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await signAsGuardian(token, name, agreed);
          if (r.ok) setSigned(r.name);
          else setError(s.errors[r.error] ?? s.errors.failed ?? '');
        });
      }}
    >
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <Checkbox label={s.agree} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
      <TextInput label={s.signLabel} hint={s.signHint} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={160} required />
      <div>
        <Button type="submit" iconStart="pen-line" loading={pending}>
          {s.sign}
        </Button>
      </div>
    </form>
  );
}
