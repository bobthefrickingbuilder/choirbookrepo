import { format, type Messages } from '@choirbook/shared/i18n';
import { AlertCard, Badge, Card, EmptyState, FeeStatusBadge, FormStatusBadge, Icon, TextLink, type FeeStatus, type FormStatus } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AidRequest, PayButton } from '@/components/member/FeeActions';
import { FinanceView } from '@/components/staff/FinanceView';
import { getFeeBalances } from '@/lib/data/member';
import { formatDate, formatMoney, todayLocal } from '@/lib/format';
import { recordCheckout } from '@/lib/payments';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { paymentsEnabled } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Forms & fees' };

export const dynamic = 'force-dynamic';

const methodLabel = (m: string, t: Messages) =>
  ({ card: t.member.methodCard, cash: t.member.methodCash, cheque: t.member.methodCheque, etransfer: t.member.methodEtransfer })[m] ?? m;

export default async function FormsFeesPage({ params, searchParams }: PageProps<'/c/[choir]/forms-fees'>) {
  const { choir } = await params;
  const sp = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();

  // Staff see the office view (choristers who are also staff can switch to their own).
  if (ctx.isStaff && (ctx.can('forms') || ctx.can('fees')) && sp.mine !== '1' && typeof sp.paid !== 'string') {
    return <FinanceView ctx={ctx} slug={choir} lang={lang} t={t} tab={typeof sp.tab === 'string' ? sp.tab : undefined} />;
  }

  // Coming back from Stripe: confirm and record the payment before showing balances.
  let payNotice: { tone: 'success' | 'info'; text: string } | null = null;
  if (typeof sp.paid === 'string') {
    const r = await recordCheckout(sp.paid, ctx.personId);
    payNotice =
      typeof r === 'number'
        ? { tone: 'success', text: format(t.member.paymentThanks, { amount: formatMoney(r, lang) }) }
        : { tone: 'info', text: t.member.paymentPending };
  } else if (sp.cancelled) payNotice = { tone: 'info', text: t.member.paymentCancelled };

  const supabase = await createClient();
  const today = todayLocal();
  const [{ data: forms }, { data: responses }, fees, { data: instalments }, { data: payments }, { data: adjustments }] = await Promise.all([
    supabase.from('forms').select('id, title, due_on, status').eq('organization_id', ctx.org.id).neq('status', 'draft').order('due_on'),
    supabase.from('form_responses').select('form_id, status').eq('person_id', ctx.personId),
    getFeeBalances(ctx),
    supabase.from('instalments').select('assignment_id, due_on, amount_cents').order('due_on'),
    supabase.from('payments').select('id, assignment_id, amount_cents, refunded_cents, method, received_at, status').eq('person_id', ctx.personId).order('received_at', { ascending: false }),
    supabase.from('fee_adjustments').select('assignment_id, kind, status'),
  ]);
  const enabled = paymentsEnabled();
  const respByForm = new Map((responses ?? []).map((r) => [r.form_id, r.status]));
  const shownForms = (forms ?? []).filter((f) => f.status === 'open' || respByForm.has(f.id));
  const d = (iso: string) => formatDate(`${iso}T12:00:00Z`, lang, { month: 'long', day: 'numeric' });

  const feeStatus = (f: (typeof fees)[number]): FeeStatus => {
    if ((f.adjusted_cents ?? 0) >= (f.amount_cents ?? 0)) return 'waived';
    if (f.balance === 0) return 'paid';
    if (f.due_on && f.due_on < today) return 'overdue';
    if ((instalments ?? []).some((i) => i.assignment_id === f.assignment_id)) return 'plan';
    if ((f.paid_cents ?? 0) > 0) return 'partial';
    return 'due';
  };
  const formStatus = (formId: string, due: string | null): FormStatus => {
    const s = respByForm.get(formId);
    if (s === 'approved' || s === 'submitted' || s === 'changes' || s === 'in_progress') return s;
    return due && due < today ? 'overdue' : 'not_started';
  };
  const payStrings = { off: t.member.paySoon, failed: t.member.genericFail };

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <h1 className="page__title">{t.member.formsFeesTitle}</h1>
      {payNotice ? <AlertCard tone={payNotice.tone}>{payNotice.text}</AlertCard> : null}

      <Card title={t.member.formsTitle} padded={false}>
        {shownForms.length === 0 ? (
          <EmptyState icon="clipboard-list" size="sm">
            {t.member.noForms}
          </EmptyState>
        ) : (
          <ul className="plain-list">
            {shownForms.map((f) => (
              <li key={f.id}>
                <Link href={`/c/${choir}/forms-fees/${f.id}` as never} className="conv-row">
                  <Icon name="file-text" size={18} />
                  <span className="conv-row__main">
                    <strong>{f.title}</strong>
                    {f.due_on ? <span className="muted">{format(t.member.dueDate, { date: d(f.due_on) })}</span> : null}
                  </span>
                  <FormStatusBadge status={formStatus(f.id, f.due_on)} lang={lang} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="stack">
        <h2 className="section-title">{t.member.feesTitle}</h2>
        {fees.length === 0 ? <p className="muted">{t.member.noFees}</p> : null}
        {fees.map((f) => {
          const status = feeStatus(f);
          const plan = (instalments ?? []).filter((i) => i.assignment_id === f.assignment_id);
          // The first instalment not yet covered by what has been paid.
          let covered = (f.paid_cents ?? 0) + (f.adjusted_cents ?? 0);
          const nextInstalment = plan.find((i) => (covered -= i.amount_cents) < 0);
          const pendingAid = (adjustments ?? []).some((a) => a.assignment_id === f.assignment_id && a.status === 'requested');
          return (
            <Card key={f.assignment_id} title={f.name ?? ''} action={<FeeStatusBadge status={status} lang={lang} />}>
              <dl className="fee-grid">
                <div>
                  <dt>{t.member.total}</dt>
                  <dd className="cb-tabular">{formatMoney(f.amount_cents ?? 0, lang)}</dd>
                </div>
                <div>
                  <dt>{t.member.paid}</dt>
                  <dd className="cb-tabular">{formatMoney(f.paid_cents ?? 0, lang)}</dd>
                </div>
                {(f.adjusted_cents ?? 0) > 0 ? (
                  <div>
                    <dt>{t.member.adjusted}</dt>
                    <dd className="cb-tabular">{formatMoney(f.adjusted_cents ?? 0, lang)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t.member.leftToPay}</dt>
                  <dd className="cb-tabular">
                    <strong>{formatMoney(f.balance, lang)}</strong>
                  </dd>
                </div>
              </dl>
              {f.due_on && f.balance > 0 ? <p className="muted">{format(t.member.dueDate, { date: d(f.due_on) })}</p> : null}
              {plan.length ? (
                <div className="stack" style={{ gap: 6, marginTop: 12 }}>
                  <strong>{t.member.instalments}</strong>
                  <ul className="plain-list">
                    {plan.map((i, k) => (
                      <li key={k} className="history-row">
                        <span>{d(i.due_on)}</span>
                        <span className="cb-tabular">{formatMoney(i.amount_cents, lang)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {f.balance > 0 ? (
                <div className="stack" style={{ marginTop: 16, gap: 10 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                    {nextInstalment && nextInstalment.amount_cents < f.balance ? (
                      <PayButton
                        slug={choir}
                        assignmentId={f.assignment_id!}
                        amountCents={Math.min(nextInstalment.amount_cents, f.balance)}
                        label={format(t.member.payInstalment, { amount: formatMoney(Math.min(nextInstalment.amount_cents, f.balance), lang) })}
                        s={payStrings}
                      />
                    ) : null}
                    <PayButton
                      slug={choir}
                      assignmentId={f.assignment_id!}
                      amountCents={f.balance}
                      label={format(t.member.payNow, { amount: formatMoney(f.balance, lang) })}
                      variant={nextInstalment && nextInstalment.amount_cents < f.balance ? 'secondary' : 'primary'}
                      s={payStrings}
                    />
                  </div>
                  {enabled ? <p className="muted">{t.member.testCards}</p> : null}
                  {pendingAid ? (
                    <Badge tone="info" icon="clock">
                      {t.member.aidPending}
                    </Badge>
                  ) : (
                    <AidRequest
                      slug={choir}
                      assignmentId={f.assignment_id!}
                      maxCents={f.balance}
                      s={{
                        ask: t.member.askAid,
                        title: t.member.aidTitle,
                        intro: t.member.aidIntro,
                        amount: t.member.aidAmount,
                        reason: t.member.aidReason,
                        send: t.member.aidSend,
                        sent: t.member.aidSent,
                        cancel: t.common.close,
                        failed: t.member.genericFail,
                      }}
                    />
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>

      {payments?.length ? (
        <Card title={t.member.payments} padded={false}>
          <ul className="plain-list">
            {payments.map((p) => (
              <li key={p.id} className="conv-row" style={{ cursor: 'default' }}>
                <Icon name="receipt" size={18} />
                <span className="conv-row__main">
                  <strong className="cb-tabular">{formatMoney(p.amount_cents - p.refunded_cents, lang)}</strong>
                  <span className="muted">
                    {methodLabel(p.method, t)}
                    {p.received_at ? ` · ${formatDate(p.received_at, lang, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  </span>
                </span>
                {p.status === 'succeeded' || p.status === 'partially_refunded' ? (
                  <TextLink href={`/c/${choir}/forms-fees/receipt/${p.id}`}>{t.member.receipt}</TextLink>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
