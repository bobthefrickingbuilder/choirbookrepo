import { format, type Lang, type Messages } from '@choirbook/shared/i18n';
import { Badge, Button, Card, EmptyState, Icon } from '@choirbook/ui';
import Link from 'next/link';
import { AidDecision, FeeCreator, RefundButton } from '@/components/staff/FinanceParts';
import { getSections } from '@/lib/data/roster';
import { formatDate, formatMoney, todayLocal } from '@/lib/format';
import type { ChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

type Tab = 'forms' | 'fees' | 'payments' | 'aid';

/** The staff side of Forms & fees. */
export async function FinanceView({ ctx, slug, lang, t, tab: wanted }: { ctx: ChoirContext; slug: string; lang: Lang; t: Messages; tab: string | undefined }) {
  const tabs = (
    [
      ['forms', t.staff.tabForms, ctx.can('forms')],
      ['fees', t.staff.tabFees, ctx.can('fees')],
      ['payments', t.staff.tabPayments, ctx.can('fees')],
      ['aid', t.staff.tabAid, ctx.can('fees')],
    ] as [Tab, string, boolean][]
  ).filter((x) => x[2]);
  const tab = tabs.find((x) => x[0] === wanted)?.[0] ?? tabs[0]![0];
  const sections = await getSections(ctx.org.id);
  const s = staffStrings(t);

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">{t.staff.financeTitle}</h1>
          <p className="page__lede">{t.staff.financeSub}</p>
        </div>
        <div className="page__actions">
          {ctx.isChorister ? (
            <Button variant="ghost" iconStart="user-round" href={`/c/${slug}/forms-fees?mine=1`}>
              {t.staff.myFormsFees}
            </Button>
          ) : null}
          {tab === 'forms' && ctx.can('forms', 'edit') ? (
            <Button iconStart="plus" href={`/c/${slug}/forms-fees/forms/new`}>
              {t.staff.newForm}
            </Button>
          ) : null}
          {tab === 'fees' && ctx.can('fees', 'edit') ? (
            <FeeCreator slug={slug} sections={sections.map((x) => ({ id: x.id, name: lang === 'fr' ? x.name_fr : x.name_en }))} s={s} />
          ) : null}
        </div>
      </div>
      <nav className="tabs" aria-label={t.staff.financeTitle}>
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/c/${slug}/forms-fees?tab=${id}` as never} className="tabs__tab" aria-current={id === tab ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'forms' ? <Forms ctx={ctx} slug={slug} lang={lang} t={t} /> : null}
      {tab === 'fees' ? <Fees ctx={ctx} slug={slug} lang={lang} t={t} /> : null}
      {tab === 'payments' ? <Payments ctx={ctx} slug={slug} lang={lang} t={t} /> : null}
      {tab === 'aid' ? <Aid ctx={ctx} slug={slug} lang={lang} t={t} /> : null}
    </div>
  );
}

type Props = { ctx: ChoirContext; slug: string; lang: Lang; t: Messages };

async function Forms({ ctx, slug, lang, t }: Props) {
  const supabase = await createClient();
  const [{ data: forms }, { data: responses }, { data: choristers }] = await Promise.all([
    supabase.from('forms').select('id, title, kind, status, due_on, section_ids, guardian_signature_required').eq('organization_id', ctx.org.id).order('created_at', { ascending: false }),
    supabase.from('form_responses').select('form_id, status').eq('organization_id', ctx.org.id),
    supabase.from('choristers').select('section_id').eq('organization_id', ctx.org.id).eq('status', 'active'),
  ]);
  const today = todayLocal();
  return (
    <Card padded={false}>
      {forms?.length ? (
        <ul className="plain-list">
          {forms.map((f) => {
            const total = (choristers ?? []).filter((c) => !f.section_ids.length || (c.section_id && f.section_ids.includes(c.section_id))).length;
            const mine = (responses ?? []).filter((r) => r.form_id === f.id);
            const doneN = mine.filter((r) => r.status === 'submitted' || r.status === 'approved').length;
            const toReview = mine.filter((r) => r.status === 'submitted').length;
            const late = f.status === 'open' && f.due_on && f.due_on < today && doneN < total;
            return (
              <li key={f.id}>
                <Link href={`/c/${slug}/forms-fees/forms/${f.id}` as never} className="event-pick" style={{ padding: '12px 16px' }}>
                  <Icon name="file-text" size={20} />
                  <span className="event-pick__main">
                    <strong>{f.title}</strong>
                    <span className="muted small">
                      {t.staff[`kind_${f.kind}`]}
                      {f.due_on ? ` · ${t.staff.feeDue} ${formatDate(`${f.due_on}T12:00:00Z`, lang, { month: 'short', day: 'numeric' })}` : ''}
                    </span>
                  </span>
                  {toReview ? <Badge tone="info">{format(t.staff.toReviewN, { n: toReview })}</Badge> : null}
                  <Badge tone={late ? 'error' : doneN >= total && total ? 'success' : 'neutral'}>{format(t.staff.responsesN, { done: doneN, total })}</Badge>
                  <Badge tone={f.status === 'open' ? 'accent' : 'slate'}>{t.staff[`formStatus_${f.status}`]}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon="file-text" size="sm">
          {t.staff.noneYet}
        </EmptyState>
      )}
    </Card>
  );
}

async function Fees({ ctx, slug, lang, t }: Props) {
  const supabase = await createClient();
  const [{ data: fees }, { data: balances }] = await Promise.all([
    supabase.from('fees').select('id, name, amount_cents, due_on, allows_instalments').eq('organization_id', ctx.org.id).order('due_on'),
    supabase.from('fee_balances').select('fee_id, amount_cents, paid_cents, adjusted_cents').eq('organization_id', ctx.org.id),
  ]);
  return (
    <Card padded={false}>
      {fees?.length ? (
        <div className="table-scroll" style={{ border: 0 }}>
          <table className="simple-table">
            <thead>
              <tr>
                <th scope="col">{t.staff.feeName}</th>
                <th scope="col">{t.staff.feeDue}</th>
                <th scope="col" className="num">{t.staff.amount}</th>
                <th scope="col" className="num">{t.staff.collected}</th>
                <th scope="col" className="num">{t.staff.outstanding}</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => {
                const rows = (balances ?? []).filter((b) => b.fee_id === f.id);
                const paid = rows.reduce((n, b) => n + (b.paid_cents ?? 0), 0);
                const owing = rows.reduce((n, b) => n + Math.max(0, (b.amount_cents ?? 0) - (b.paid_cents ?? 0) - (b.adjusted_cents ?? 0)), 0);
                return (
                  <tr key={f.id}>
                    <th scope="row">
                      <Link href={`/c/${slug}/forms-fees/fees/${f.id}` as never} className="cb-link">
                        {f.name}
                      </Link>
                      <div className="muted small">{format(t.staff.assignedN, { n: rows.length })}</div>
                    </th>
                    <td>{f.due_on ? formatDate(`${f.due_on}T12:00:00Z`, lang, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td className="num">{formatMoney(f.amount_cents, lang)}</td>
                    <td className="num">{formatMoney(paid, lang)}</td>
                    <td className="num">{formatMoney(owing, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="receipt" size="sm">
          {t.staff.noneYet}
        </EmptyState>
      )}
    </Card>
  );
}

async function Payments({ ctx, slug, lang, t }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('payments')
    .select('id, amount_cents, refunded_cents, method, status, receipt_number, received_at, created_at, payer_name, person_id, fee_assignments(fees(name))')
    .eq('organization_id', ctx.org.id)
    .order('created_at', { ascending: false })
    .limit(100);
  const ids = [...new Set((data ?? []).map((p) => p.person_id).filter((x): x is string => Boolean(x)))];
  const { data: people } = ids.length ? await supabase.from('member_directory').select('id, first_name, last_name').in('id', ids) : { data: [] };
  const name = (id: string | null, fallback: string | null) => {
    const p = people?.find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : (fallback ?? '—');
  };
  const s = staffStrings(t);
  const canEdit = ctx.can('fees', 'edit');
  return (
    <Card padded={false}>
      <div className="table-scroll" style={{ border: 0 }}>
        <table className="simple-table">
          <thead>
            <tr>
              <th scope="col">{t.staff.date}</th>
              <th scope="col">{t.staff.payer}</th>
              <th scope="col">{t.staff.feeName}</th>
              <th scope="col">{t.staff.method}</th>
              <th scope="col" className="num">{t.staff.amount}</th>
              <th scope="col">{t.staff.status}</th>
              <th scope="col">
                <span className="cb-sr-only">{t.staff.refund}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => {
              const left = p.amount_cents - p.refunded_cents;
              return (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.received_at ?? p.created_at, lang, { month: 'short', day: 'numeric' })}</td>
                  <td>{name(p.person_id, p.payer_name)}</td>
                  <td>{p.fee_assignments?.fees?.name ?? '—'}</td>
                  <td>{t.staff[`method_${p.method}`]}</td>
                  <td className="num">
                    {formatMoney(p.amount_cents, lang)}
                    {p.refunded_cents ? <div className="muted small">−{formatMoney(p.refunded_cents, lang)}</div> : null}
                  </td>
                  <td>
                    <Badge tone={p.status === 'succeeded' ? 'success' : p.status.includes('refunded') ? 'slate' : 'neutral'}>
                      {p.status === 'succeeded' ? t.staff.paid : p.status.includes('refunded') ? t.staff.refunded : p.status}
                    </Badge>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {p.receipt_number ? (
                      <Link className="cb-link small" href={`/c/${slug}/forms-fees/receipt/${p.id}` as never}>
                        {t.staff.receipt}
                      </Link>
                    ) : null}{' '}
                    {canEdit && left > 0 && p.status !== 'pending' ? <RefundButton slug={slug} paymentId={p.id} max={(left / 100).toFixed(2)} card={p.method === 'card'} s={s} /> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

async function Aid({ ctx, slug, lang, t }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('fee_adjustments')
    .select('id, kind, amount_cents, reason, created_at, fee_assignments!inner(person_id, fees(name))')
    .eq('organization_id', ctx.org.id)
    .eq('status', 'requested')
    .order('created_at');
  const ids = [...new Set((data ?? []).map((a) => a.fee_assignments.person_id))];
  const { data: people } = ids.length ? await supabase.from('member_directory').select('id, first_name, last_name').in('id', ids) : { data: [] };
  const s = staffStrings(t);
  return (
    <Card title={t.staff.aidRequests}>
      {data?.length ? (
        <ul className="plain-list">
          {data.map((a) => {
            const p = people?.find((x) => x.id === a.fee_assignments.person_id);
            return (
              <li key={a.id} className="person-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="person-row__name">
                    <Link className="cb-link" href={`/c/${slug}/roster/${a.fee_assignments.person_id}` as never}>
                      {p ? `${p.first_name} ${p.last_name}` : '—'}
                    </Link>
                    <Badge tone="info">{t.staff[`adj_${a.kind}`]}</Badge>
                  </div>
                  <div className="muted small">
                    {a.fee_assignments.fees?.name} · {format(t.staff.requested, { amount: formatMoney(a.amount_cents, lang) })} · {formatDate(a.created_at, lang, { month: 'short', day: 'numeric' })}
                  </div>
                  {a.reason ? <p className="small" style={{ margin: '4px 0 0' }}>{a.reason}</p> : null}
                </div>
                {ctx.can('fees', 'edit') ? <AidDecision slug={slug} id={a.id} s={s} /> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">{t.staff.aidNone}</p>
      )}
    </Card>
  );
}
