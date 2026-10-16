'use client';

import { Button, Card, TextInput } from '@choirbook/ui';
import { useState, useTransition } from 'react';
import { getCalendarFeedUrl } from '@/app/actions/member';

/** Gets (or creates) the member's private season feed and offers it to copy. */
export function SubscribeCard({
  slug,
  s,
}: {
  slug: string;
  s: { title: string; hint: string; copy: string; copied: string; show: string; apple: string; failed: string };
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card title={s.title}>
      <div className="stack" style={{ gap: 12 }}>
        <p className="muted">{s.hint}</p>
        {url ? (
          <>
            <TextInput label={s.title} value={url} readOnly onFocus={(e) => e.currentTarget.select()} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Button
                size="sm"
                variant="secondary"
                iconStart={copied ? 'check' : 'copy'}
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                }}
              >
                {copied ? s.copied : s.copy}
              </Button>
              <Button size="sm" variant="ghost" iconStart="calendar" href={url.replace(/^https?:/, 'webcal:')}>
                {s.apple}
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="secondary"
            iconStart="calendar-clock"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const u = await getCalendarFeedUrl(slug);
                if (u) setUrl(u);
                else setError(true);
              })
            }
          >
            {s.show}
          </Button>
        )}
        {error ? <p className="cb-errmsg">{s.failed}</p> : null}
      </div>
    </Card>
  );
}
