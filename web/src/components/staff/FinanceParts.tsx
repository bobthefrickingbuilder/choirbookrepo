'use client';

import { format } from '@choirbook/shared/i18n';
import { AlertCard, Button, Card, Checkbox, ConfirmDialog, IconButton, Modal, RadioGroup, Select, TextInput, Toggle } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  addAdjustment,
  createFee,
  decideAdjustment,
  deleteFee,
  deleteFormDef,
  recordPayment,
  refundPayment,
  reviewResponse,
  saveFormDef,
  staffResendGuardian,
  type FormDefInput,
} from '@/app/actions/finance';
import type { FormField } from '@/lib/formFields';
import type { StaffStrings } from '@/lib/staff';

type Result = { ok: true } | { ok: false; error: string };

function useRun(s: StaffStrings) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const msg = (code: string) => (code === 'too_soon' ? s.tooSoon : code === 'payments_off' ? s.paymentsOff : (s.errors[code] ?? s.failed));
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(msg(r.error));
      setError(null);
      after?.();
      router.refresh();
    });
  return { pending, error, setError, run, router, start, msg };
}

/** Dollars typed by staff → cents. */
const toCents = (v: string) => Math.round(Number(v.replace(',', '.').replace(/[^0-9.]/g, '')) * 100) || 0;

// ---- Form builder ----

export type FormDefValues = Omit<Required<FormDefInput>, 'fields'> & { fields: FormField[] };

const slugify = (s: string, taken: string[]) => {
  const base =
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 30) || 'q';
  let id = base;
  for (let i = 2; taken.includes(id); i++) id = `${base}_${i}`;
  return id;
};

export function FormBuilder({
  slug,
  id,
  initial,
  sections,
  s,
}: {
  slug: string;
  id: string | null;
  initial: FormDefValues;
  sections: { id: string; name: string }[];
  s: StaffStrings;
}) {
  const [v, setV] = useState<FormDefValues>(initial);
  const { pending, error, setError, router, start, msg } = useRun(s);
  const set = <K extends keyof FormDefValues>(k: K, value: FormDefValues[K]) => setV((x) => ({ ...x, [k]: value }));
  const setField = (i: number, f: Partial<FormField>) => set('fields', v.fields.map((x, j) => (j === i ? { ...x, ...f } : x)));
  const kinds = ['registration', 'permission', 'medical', 'consent', 'agreement', 'survey', 'other'] as const;

  const submit = () =>
    start(async () => {
      // Questions get a stable id from their English wording the first time they are saved.
      const taken: string[] = [];
      const fields = v.fields
        .filter((f) => f.label_en.trim() || f.label_fr.trim())
        .map((f) => {
          const fid = f.id || slugify(f.label_en || f.label_fr, taken);
          taken.push(fid);
          return { ...f, id: fid, label_fr: f.label_fr.trim() || f.label_en.trim(), label_en: f.label_en.trim() || f.label_fr.trim() };
        });
      const r = await saveFormDef(slug, id, { ...v, fields });
      if (!r.ok) return setError(msg(r.error));
      router.push(`/c/${slug}/forms-fees/forms/${r.data.id}` as never);
      router.refresh();
    });

  return (
    <div className="stack">
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <Card>
        <div className="form-2col">
          <TextInput label={s.title} value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={200} />
          <Select label={s.formKind} value={v.kind} onChange={(e) => set('kind', e.target.value as FormDefValues['kind'])} options={kinds.map((k) => ({ value: k, label: s[`kind_${k}`] }))} />
          <TextInput label={s.feeDue} optional type="date" value={v.due_on ?? ''} onChange={(e) => set('due_on', e.target.value)} />
          <Select
            label={s.status}
            value={v.status}
            onChange={(e) => set('status', e.target.value as FormDefValues['status'])}
            options={(['draft', 'open', 'closed'] as const).map((k) => ({ value: k, label: s[`formStatus_${k}`] }))}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <TextInput label={s.description} optional multiline rows={3} value={v.description ?? ''} onChange={(e) => set('description', e.target.value)} maxLength={4000} />
          </div>
        </div>
        <div className="stack" style={{ gap: 10, marginTop: 14 }}>
          <Toggle label={s.requiresSignature} checked={v.requires_signature} onChange={(e) => set('requires_signature', e.target.checked)} />
          <Toggle label={s.guardianSignature} checked={v.guardian_signature_required} onChange={(e) => set('guardian_signature_required', e.target.checked)} />
        </div>
      </Card>

      <Card title={s.whoIsCalled}>
        <p className="muted small" style={{ margin: '0 0 8px' }}>
          {s.whoIsCalledHint}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
          {sections.map((sec) => (
            <Checkbox
              key={sec.id}
              label={sec.name}
              checked={v.section_ids.includes(sec.id)}
              onChange={(e) => set('section_ids', e.target.checked ? [...v.section_ids, sec.id] : v.section_ids.filter((x) => x !== sec.id))}
            />
          ))}
        </div>
      </Card>

      <Card title={s.questions}>
        <div className="stack" style={{ gap: 14 }}>
          {v.fields.map((f, i) => (
            <div key={i} className="note question-edit">
              <div className="form-2col">
                <TextInput label={s.qLabelEn} value={f.label_en} onChange={(e) => setField(i, { label_en: e.target.value })} maxLength={300} />
                <TextInput label={s.qLabelFr} value={f.label_fr} onChange={(e) => setField(i, { label_fr: e.target.value })} maxLength={300} />
                <Select
                  label={s.qType}
                  value={f.type}
                  onChange={(e) => setField(i, { type: e.target.value as FormField['type'] })}
                  options={(['text', 'textarea', 'checkbox', 'select'] as const).map((k) => ({ value: k, label: s[`qType_${k}`] }))}
                />
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: 'space-between' }}>
                  <Checkbox label={s.qRequired} checked={Boolean(f.required)} onChange={(e) => setField(i, { required: e.target.checked })} />
                  <span style={{ display: 'flex', gap: 4 }}>
                    <IconButton icon="arrow-up" size="sm" label={s.moveUp} disabled={i === 0} onClick={() => set('fields', swap(v.fields, i, i - 1))} />
                    <IconButton icon="arrow-down" size="sm" label={s.moveDown} disabled={i === v.fields.length - 1} onClick={() => set('fields', swap(v.fields, i, i + 1))} />
                    <IconButton icon="trash-2" size="sm" label={`${s.remove} ${i + 1}`} onClick={() => set('fields', v.fields.filter((_, j) => j !== i))} />
                  </span>
                </div>
                {f.type === 'select' ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <TextInput
                      label={s.qOptions}
                      multiline
                      rows={3}
                      value={(f.options ?? []).map((o) => (o.label_fr && o.label_fr !== o.label_en ? `${o.label_en} | ${o.label_fr}` : o.label_en)).join('\n')}
                      onChange={(e) =>
                        setField(i, {
                          options: e.target.value.split('\n').map((line, k) => {
                            const [en = '', fr = ''] = line.split('|').map((x) => x.trim());
                            return { value: slugify(en || `${k + 1}`, []), label_en: en, label_fr: fr || en };
                          }),
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div>
            <Button size="sm" variant="secondary" iconStart="plus" onClick={() => set('fields', [...v.fields, { id: '', type: 'text', label_en: '', label_fr: '', required: false }])}>
              {s.addQuestion}
            </Button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button size="lg" iconStart="check" onClick={submit} loading={pending} disabled={!v.title.trim()}>
          {s.save}
        </Button>
        <Button size="lg" variant="ghost" href={id ? `/c/${slug}/forms-fees/forms/${id}` : `/c/${slug}/forms-fees`}>
          {s.cancel}
        </Button>
      </div>
    </div>
  );
}

function swap<T>(xs: T[], a: number, b: number): T[] {
  const n = [...xs];
  [n[a], n[b]] = [n[b]!, n[a]!];
  return n;
}

export function ReviewButtons({ slug, responseId, s }: { slug: string; responseId: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const { pending, error, run } = useRun(s);
  return (
    <>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <Button size="sm" variant="tonal" iconStart="check" loading={pending} onClick={() => run(() => reviewResponse(slug, responseId, 'approved', ''))}>
          {s.approve}
        </Button>
        <Button size="sm" variant="ghost" iconStart="pen-line" onClick={() => setOpen(true)}>
          {s.requestChanges}
        </Button>
      </span>
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.requestChanges}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!note.trim()} onClick={() => run(() => reviewResponse(slug, responseId, 'changes', note), () => setOpen(false))}>
              {s.requestChanges}
            </Button>
          </>
        }
      >
        <TextInput label={s.reviewNote} multiline rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </Modal>
    </>
  );
}

export function ResendGuardianButton({ slug, responseId, s }: { slug: string; responseId: string; s: StaffStrings }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [demoLink, setDemoLink] = useState<string | null>(null);
  const { pending, start, msg, router } = useRun(s);
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button
        size="sm"
        variant="ghost"
        iconStart="send"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await staffResendGuardian(slug, responseId);
            setDemoLink(r.ok && r.data.demoLink ? r.data.demoLink : null);
            setNotice(r.ok ? (r.data.demoLink ? s.demoLinkReady : format(s.resentN, { n: r.data.sent })) : msg(r.error));
            router.refresh();
          })
        }
      >
        {s.resendGuardian}
      </Button>
      {notice ? <span className="muted small" role="status">{notice}</span> : null}
      {demoLink ? (
        <Button size="sm" iconStart="external-link" href={demoLink}>
          {s.openGuardianLink}
        </Button>
      ) : null}
    </span>
  );
}

export function DeleteDefButton({ slug, id, kind, s }: { slug: string; id: string; kind: 'form' | 'fee'; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const { pending, router, start } = useRun(s);
  return (
    <>
      <Button variant="ghost" iconStart="trash-2" onClick={() => setOpen(true)}>
        {kind === 'form' ? s.deleteForm : s.deleteFee}
      </Button>
      <ConfirmDialog
        open={open}
        title={kind === 'form' ? s.deleteForm : s.deleteFee}
        tone="danger"
        confirmLabel={s.delete}
        cancelLabel={s.cancel}
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const r = kind === 'form' ? await deleteFormDef(slug, id) : await deleteFee(slug, id);
            setOpen(false);
            if (r.ok) router.push(`/c/${slug}/forms-fees?tab=${kind === 'form' ? 'forms' : 'fees'}` as never);
          })
        }
      >
        {kind === 'form' ? s.confirmDelete : s.deleteFeeBody}
      </ConfirmDialog>
    </>
  );
}

// ---- Fees ----

export function FeeCreator({ slug, sections, s }: { slug: string; sections: { id: string; name: string }[]; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: '', description: '', amount: '', due_on: '', instalments: '1', assign: 'all' as 'all' | 'sections' | 'none', section_ids: [] as string[], discount: '0' });
  const [notice, setNotice] = useState<string | null>(null);
  const { pending, error, setError, start, msg, router } = useRun(s);
  const submit = () =>
    start(async () => {
      const r = await createFee(slug, {
        name: v.name,
        description: v.description,
        amount: toCents(v.amount),
        due_on: v.due_on,
        instalments: Number(v.instalments) || 1,
        assign: v.assign,
        section_ids: v.section_ids,
        family_discount_percent: Math.min(100, Math.max(0, Math.round(Number(v.discount) || 0))),
      });
      if (!r.ok) return setError(msg(r.error));
      setOpen(false);
      setNotice(format(s.feeCreated, { n: r.data.assigned }));
      router.refresh();
    });
  return (
    <>
      {notice ? (
        <AlertCard tone="success" onDismiss={() => setNotice(null)} dismissLabel={s.close}>
          {notice}
        </AlertCard>
      ) : null}
      <Button iconStart="plus" onClick={() => setOpen(true)}>
        {s.newFee}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.newFee}
        size="lg"
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button onClick={submit} loading={pending} disabled={!v.name.trim() || !v.amount}>
              {s.create}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          <div className="form-2col">
            <TextInput label={s.feeName} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={160} />
            <TextInput label={s.amount} inputMode="decimal" prefix="$" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
            <TextInput label={s.feeDue} optional type="date" value={v.due_on} onChange={(e) => setV({ ...v, due_on: e.target.value })} />
            <Select
              label={s.instalmentsN}
              hint={s.instalmentsHint}
              value={v.instalments}
              disabled={!v.due_on}
              onChange={(e) => setV({ ...v, instalments: e.target.value })}
              options={['1', '2', '3', '4', '6', '10']}
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <TextInput label={s.description} optional multiline rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={2000} />
            </div>
          </div>
          <RadioGroup
            label={s.feeAssignTo}
            name="fee-assign"
            value={v.assign}
            onChange={(a) => setV({ ...v, assign: a as typeof v.assign })}
            options={[
              { value: 'all', label: s.assignAll },
              { value: 'sections', label: s.assignSections },
              { value: 'none', label: s.assignNone },
            ]}
          />
          {v.assign === 'sections' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
              {sections.map((sec) => (
                <Checkbox
                  key={sec.id}
                  label={sec.name}
                  checked={v.section_ids.includes(sec.id)}
                  onChange={(e) => setV({ ...v, section_ids: e.target.checked ? [...v.section_ids, sec.id] : v.section_ids.filter((x) => x !== sec.id) })}
                />
              ))}
            </div>
          ) : null}
          <div style={{ maxWidth: 320 }}>
            <TextInput label={s.familyDiscount} hint={s.familyDiscountHint} inputMode="numeric" suffix="%" value={v.discount} onChange={(e) => setV({ ...v, discount: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  );
}

export function PaymentRecorder({ slug, assignmentId, name, balance, today, s }: { slug: string; assignmentId: string; name: string; balance: string; today: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ amount: balance, method: 'cash' as 'cash' | 'cheque' | 'etransfer', note: '', received_on: today });
  const { pending, error, run } = useRun(s);
  return (
    <>
      <IconButton icon="wallet" size="sm" label={`${s.recordPayment}: ${name}`} onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${s.recordPayment} · ${name}`}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!toCents(v.amount)} onClick={() => run(() => recordPayment(slug, assignmentId, { ...v, amount: toCents(v.amount) }), () => setOpen(false))}>
              {s.recordPayment}
            </Button>
          </>
        }
      >
        <div className="form-2col">
          {error ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <AlertCard tone="error">{error}</AlertCard>
            </div>
          ) : null}
          <TextInput label={s.amount} prefix="$" inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
          <Select
            label={s.method}
            value={v.method}
            onChange={(e) => setV({ ...v, method: e.target.value as typeof v.method })}
            options={(['cash', 'cheque', 'etransfer'] as const).map((m) => ({ value: m, label: s[`method_${m}`] }))}
          />
          <TextInput label={s.receivedOn} type="date" value={v.received_on} onChange={(e) => setV({ ...v, received_on: e.target.value })} />
          <TextInput label={s.notes} optional value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={500} placeholder="Cheque #" />
        </div>
      </Modal>
    </>
  );
}

export function AdjustmentForm({ slug, assignmentId, name, s }: { slug: string; assignmentId: string; name: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ kind: 'waiver' as 'waiver' | 'financial_aid' | 'family_discount' | 'other', amount: '', reason: '' });
  const { pending, error, run } = useRun(s);
  return (
    <>
      <IconButton icon="receipt" size="sm" label={`${s.adjust}: ${name}`} onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${s.adjust} · ${name}`}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!toCents(v.amount)} onClick={() => run(() => addAdjustment(slug, assignmentId, { ...v, amount: toCents(v.amount) }), () => setOpen(false))}>
              {s.save}
            </Button>
          </>
        }
      >
        <div className="form-2col">
          {error ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <AlertCard tone="error">{error}</AlertCard>
            </div>
          ) : null}
          <Select
            label={s.adjKind}
            value={v.kind}
            onChange={(e) => setV({ ...v, kind: e.target.value as typeof v.kind })}
            options={(['waiver', 'financial_aid', 'family_discount', 'other'] as const).map((k) => ({ value: k, label: s[`adj_${k}`] }))}
          />
          <TextInput label={s.amount} prefix="$" inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
          <div style={{ gridColumn: '1 / -1' }}>
            <TextInput label={s.reason} optional value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} maxLength={2000} />
          </div>
        </div>
      </Modal>
    </>
  );
}

export function RefundButton({ slug, paymentId, max, card, s }: { slug: string; paymentId: string; max: string; card: boolean; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(max);
  const { pending, error, run } = useRun(s);
  return (
    <>
      <Button size="sm" variant="ghost" iconStart="rotate-ccw" onClick={() => setOpen(true)}>
        {s.refund}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.refund}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button variant="danger" loading={pending} disabled={!toCents(amount)} onClick={() => run(() => refundPayment(slug, paymentId, toCents(amount)), () => setOpen(false))}>
              {s.refund}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          <TextInput label={s.refundAmount} prefix="$" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {card ? <p className="muted small">{s.refundCardNote}</p> : null}
        </div>
      </Modal>
    </>
  );
}

export function AidDecision({ slug, id, s }: { slug: string; id: string; s: StaffStrings }) {
  const { pending, error, run } = useRun(s);
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <Button size="sm" variant="tonal" iconStart="check" loading={pending} onClick={() => run(() => decideAdjustment(slug, id, 'approved'))}>
        {s.approve}
      </Button>
      <Button size="sm" variant="ghost" iconStart="x" loading={pending} onClick={() => run(() => decideAdjustment(slug, id, 'declined'))}>
        {s.decline}
      </Button>
      {error ? <span className="muted small">{error}</span> : null}
    </span>
  );
}
