'use client';

import { AlertCard, Button, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { sendMessage } from '@/app/actions/messages';

export function ReplyBox({
  slug,
  conversationId,
  s,
}: {
  slug: string;
  conversationId: string;
  s: { reply: string; send: string; failed: string; paused: string };
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="stack"
      style={{ gap: 10 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        startTransition(async () => {
          const r = await sendMessage(slug, conversationId, body);
          if (r.ok) {
            setBody('');
            setError(null);
            router.refresh();
          } else setError(r.error === 'paused' ? s.paused : s.failed);
        });
      }}
    >
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <TextInput label={s.reply} multiline rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
      <div>
        <Button type="submit" iconStart="send" loading={pending} disabled={!body.trim()}>
          {s.send}
        </Button>
      </div>
    </form>
  );
}
