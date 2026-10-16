'use client';

import { AlertCard, Button, TextInput, Toggle } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveProfile } from '@/app/actions/profile';

export function ProfileForm({
  slug,
  initial,
  s,
}: {
  slug: string;
  initial: { preferredName: string; pronouns: string; phone: string; shared: boolean };
  s: { preferredName: string; pronouns: string; phone: string; share: string; shareHint: string; save: string; saved: string; failed: string };
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof v, value: string | boolean) => {
    setV((x) => ({ ...x, [k]: value }));
    setStatus('idle');
  };
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveProfile(slug, {
            preferredName: v.preferredName,
            pronouns: v.pronouns,
            phone: v.phone,
            contactVisibility: v.shared ? 'choir' : 'private',
          });
          setStatus(r.ok ? 'saved' : 'failed');
          if (r.ok) router.refresh();
        });
      }}
    >
      <div className="form-2col">
        <TextInput label={s.preferredName} value={v.preferredName} onChange={(e) => set('preferredName', e.target.value)} maxLength={80} optional autoComplete="given-name" />
        <TextInput label={s.pronouns} value={v.pronouns} onChange={(e) => set('pronouns', e.target.value)} maxLength={40} optional />
      </div>
      <TextInput label={s.phone} type="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} maxLength={40} optional autoComplete="tel" />
      <Toggle label={s.share} description={s.shareHint} checked={v.shared} onChange={(e) => set('shared', e.target.checked)} />
      {status === 'saved' ? <AlertCard tone="success">{s.saved}</AlertCard> : null}
      {status === 'failed' ? <AlertCard tone="error">{s.failed}</AlertCard> : null}
      <div>
        <Button type="submit" iconStart="check" loading={pending}>
          {s.save}
        </Button>
      </div>
    </form>
  );
}
