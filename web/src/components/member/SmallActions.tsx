'use client';

import { Badge, Button, Checkbox } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { getSalesLink, markNotificationsRead, setNotificationPref, setVolunteerSignup } from '@/app/actions/profile';

export function SalesLinkButton({ slug, eventId, label }: { slug: string; eventId: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      iconStart="ticket"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await getSalesLink(slug, eventId);
          router.refresh();
        })
      }
    >
      {label}
    </Button>
  );
}

export function CopyText({ text, copy, copied }: { text: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      iconStart={done ? 'check' : 'copy'}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
      }}
    >
      {done ? copied : copy}
    </Button>
  );
}

export function VolunteerToggle({
  slug,
  slotId,
  signedUp,
  full,
  s,
}: {
  slug: string;
  slotId: string;
  signedUp: boolean;
  full: boolean;
  s: { signUp: string; signedUp: string; withdraw: string; full: string; failed: string };
}) {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const run = (on: boolean) =>
    startTransition(async () => {
      const r = await setVolunteerSignup(slug, slotId, on);
      setError(!r.ok);
      router.refresh();
    });
  if (signedUp) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge tone="success" icon="circle-check" size="md">
          {s.signedUp}
        </Badge>
        <Button size="sm" variant="ghost" loading={pending} onClick={() => run(false)}>
          {s.withdraw}
        </Button>
      </div>
    );
  }
  if (full) return <Badge tone="neutral">{s.full}</Badge>;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <Button size="sm" iconStart="user-plus" loading={pending} onClick={() => run(true)}>
        {s.signUp}
      </Button>
      {error ? <span className="cb-errmsg">{s.failed}</span> : null}
    </div>
  );
}

export function PrefToggle({ category, channel, checked, label }: { category: string; channel: 'in_app' | 'email_digest' | 'push'; checked: boolean; label: string }) {
  const [value, setValue] = useOptimistic(checked);
  const [, startTransition] = useTransition();
  return (
    <Checkbox
      aria-label={label}
      checked={value}
      onChange={(e) => {
        const next = e.target.checked;
        startTransition(async () => {
          setValue(next);
          await setNotificationPref(category, channel, next);
        });
      }}
    />
  );
}

export function MarkAllRead({ slug, label }: { slug: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      iconStart="check-check"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationsRead(slug);
          router.refresh();
        })
      }
    >
      {label}
    </Button>
  );
}
