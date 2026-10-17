'use client';

import { AlertCard, Button, Checkbox, TextInput, Toggle } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveGuardianCopies, saveMessageFilter } from '@/app/actions/privacy';
import { setMessageHidden } from '@/app/actions/moderation';

type Result = { ok: true } | { ok: false; error: string };

function useSave(failed: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<'idle' | 'saved' | 'error'>('idle');
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      setState(r.ok ? 'saved' : 'error');
      if (r.ok) router.refresh();
    });
  return { pending, state, run, failed };
}

export function GuardianCopiesForm({
  slug,
  options,
  initial,
  disabled,
  s,
}: {
  slug: string;
  options: { key: string; label: string }[];
  initial: string[];
  disabled: boolean;
  s: { save: string; saved: string; failed: string };
}) {
  const [chosen, setChosen] = useState(new Set(initial));
  const { pending, state, run } = useSave(s.failed);
  return (
    <div className="stack">
      {state === 'saved' ? <AlertCard tone="success">{s.saved}</AlertCard> : null}
      {state === 'error' ? <AlertCard tone="error">{s.failed}</AlertCard> : null}
      <div className="stack" style={{ gap: 8 }}>
        {options.map((o) => (
          <Checkbox
            key={o.key}
            label={o.label}
            disabled={disabled}
            checked={chosen.has(o.key)}
            onChange={(e) => {
              const next = new Set(chosen);
              if (e.target.checked) next.add(o.key);
              else next.delete(o.key);
              setChosen(next);
            }}
          />
        ))}
      </div>
      {disabled ? null : (
        <div>
          <Button iconStart="check" loading={pending} onClick={() => run(() => saveGuardianCopies(slug, [...chosen]))}>
            {s.save}
          </Button>
        </div>
      )}
    </div>
  );
}

export function MessageFilterForm({
  slug,
  initial,
  s,
}: {
  slug: string;
  initial: { filter: boolean; extra: string[]; allowed: string[] };
  s: { filterOn: string; extraWords: string; extraHint: string; allowedWords: string; allowedHint: string; save: string; saved: string; failed: string };
}) {
  const [filter, setFilter] = useState(initial.filter);
  const [extra, setExtra] = useState(initial.extra.join('\n'));
  const [allowed, setAllowed] = useState(initial.allowed.join('\n'));
  const { pending, state, run } = useSave(s.failed);
  return (
    <div className="stack">
      {state === 'saved' ? <AlertCard tone="success">{s.saved}</AlertCard> : null}
      {state === 'error' ? <AlertCard tone="error">{s.failed}</AlertCard> : null}
      <Toggle label={s.filterOn} checked={filter} onChange={(e) => setFilter(e.target.checked)} />
      <div className="form-2col">
        <TextInput label={s.extraWords} hint={s.extraHint} optional multiline rows={4} value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={4000} />
        <TextInput label={s.allowedWords} hint={s.allowedHint} optional multiline rows={4} value={allowed} onChange={(e) => setAllowed(e.target.value)} maxLength={4000} />
      </div>
      <div>
        <Button iconStart="check" loading={pending} onClick={() => run(() => saveMessageFilter(slug, { filter, extra, allowed }))}>
          {s.save}
        </Button>
      </div>
    </div>
  );
}

/** Release or hide one message the filter held back. */
export function HeldMessageActions({ slug, messageId, s }: { slug: string; messageId: string; s: { release: string; hide: string; failed: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const act = (hidden: boolean) =>
    start(async () => {
      const r = await setMessageHidden(slug, messageId, hidden);
      setError(!r.ok);
      if (r.ok) router.refresh();
    });
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <Button size="sm" iconStart="check" loading={pending} onClick={() => act(false)}>
        {s.release}
      </Button>
      <Button size="sm" variant="secondary" iconStart="eye-off" disabled={pending} onClick={() => act(true)}>
        {s.hide}
      </Button>
      {error ? (
        <span className="small" role="alert">
          {s.failed}
        </span>
      ) : null}
    </span>
  );
}
