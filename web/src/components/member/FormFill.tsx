'use client';

import type { Lang } from '@choirbook/shared/i18n';
import { AlertCard, Button, Checkbox, ConsentSignature, Select, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveForm } from '@/app/actions/forms';
import type { Answers, FormField } from '@/lib/formFields';

export interface FormFillStrings {
  saveDraft: string;
  submit: string;
  signAndSubmit: string;
  draftSaved: string;
  submitted: string;
  locked: string;
  missing: string;
  signature: string;
  failed: string;
  guardianSent: string;
  signTitle: string;
}

export function FormFill({
  slug,
  formId,
  fields,
  initial,
  requiresSignature,
  wording,
  lang,
  s,
}: {
  slug: string;
  formId: string;
  fields: FormField[];
  initial: Answers;
  requiresSignature: boolean;
  wording: string | null;
  lang: Lang;
  s: FormFillStrings;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initial);
  const [signed, setSigned] = useState<{ name: string; at: string } | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const label = (f: FormField) => (lang === 'fr' ? f.label_fr : f.label_en);
  const set = (id: string, v: string | boolean) => setAnswers((a) => ({ ...a, [id]: v }));

  const run = (mode: 'draft' | 'submit') =>
    startTransition(async () => {
      const r = await saveForm(slug, formId, answers, mode, signed?.name);
      if (r.ok) {
        setStatus({ tone: 'success', text: mode === 'draft' ? s.draftSaved : r.guardians ? `${s.submitted} ${s.guardianSent}` : s.submitted });
        router.refresh();
      } else {
        const text = { missing: s.missing, signature: s.signature, locked: s.locked }[r.error] ?? s.failed;
        setStatus({ tone: 'error', text });
      }
    });

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        run('submit');
      }}
    >
      {fields.map((f) =>
        f.type === 'checkbox' ? (
          <Checkbox key={f.id} label={label(f)} checked={answers[f.id] === true} onChange={(e) => set(f.id, e.target.checked)} required={f.required} />
        ) : f.type === 'select' ? (
          <Select
            key={f.id}
            label={label(f)}
            value={typeof answers[f.id] === 'string' ? (answers[f.id] as string) : ''}
            placeholder="—"
            onChange={(e) => set(f.id, e.target.value)}
            options={(f.options ?? []).map((o) => ({ value: o.value, label: lang === 'fr' ? o.label_fr : o.label_en }))}
            required={f.required}
          />
        ) : (
          <TextInput
            key={f.id}
            label={label(f)}
            multiline={f.type === 'textarea'}
            rows={4}
            value={typeof answers[f.id] === 'string' ? (answers[f.id] as string) : ''}
            onChange={(e) => set(f.id, e.target.value)}
            required={f.required}
            optional={!f.required}
            maxLength={2000}
          />
        ),
      )}
      {requiresSignature ? (
        <ConsentSignature
          title={s.signTitle}
          signed={signed}
          onSign={setSigned}
          onClear={() => setSigned(null)}
          locale={lang === 'fr' ? 'fr-CA' : 'en-CA'}
        >
          {wording ? <p style={{ whiteSpace: 'pre-line' }}>{wording}</p> : null}
        </ConsentSignature>
      ) : null}
      {status ? <AlertCard tone={status.tone}>{status.text}</AlertCard> : null}
      <div className="row-between">
        <Button type="button" variant="secondary" onClick={() => run('draft')} disabled={pending}>
          {s.saveDraft}
        </Button>
        <Button type="submit" iconStart="send" loading={pending} disabled={requiresSignature && !signed}>
          {requiresSignature ? s.signAndSubmit : s.submit}
        </Button>
      </div>
    </form>
  );
}
