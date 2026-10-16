'use client';

import { AlertCard, Button, Modal, Select, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { startConversation } from '@/app/actions/messages';

type Category = 'absence' | 'music' | 'fees' | 'general';

export interface ConversationStrings {
  newMessage: string;
  subject: string;
  category: string;
  catAbsence: string;
  catMusic: string;
  catFees: string;
  catGeneral: string;
  message: string;
  send: string;
  cancel: string;
  required: string;
  failed: string;
  paused: string;
}

export function NewConversation({ slug, s }: { slug: string; s: ConversationStrings }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!subject.trim() || !body.trim()) {
      setError(s.required);
      return;
    }
    startTransition(async () => {
      const r = await startConversation(slug, { subject, category, body });
      if (r.ok && r.id) {
        setOpen(false);
        router.push(`/c/${slug}/messages/${r.id}` as never);
      } else setError(r.ok ? s.failed : r.error === 'paused' ? s.paused : s.failed);
    });
  };

  return (
    <>
      <Button iconStart="pen-line" onClick={() => setOpen(true)}>
        {s.newMessage}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.newMessage}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button iconStart="send" loading={pending} onClick={submit}>
              {s.send}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error && error !== s.required ? <AlertCard tone="error">{error}</AlertCard> : null}
          <Select
            label={s.category}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            options={[
              { value: 'general', label: s.catGeneral },
              { value: 'absence', label: s.catAbsence },
              { value: 'music', label: s.catMusic },
              { value: 'fees', label: s.catFees },
            ]}
          />
          <TextInput
            label={s.subject}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
            error={error === s.required && !subject.trim() ? s.required : undefined}
          />
          <TextInput
            label={s.message}
            multiline
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            required
            error={error === s.required && !body.trim() ? s.required : undefined}
          />
        </div>
      </Modal>
    </>
  );
}
