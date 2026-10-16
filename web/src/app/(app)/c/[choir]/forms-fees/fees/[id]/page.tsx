import { format } from '@choirbook/shared/i18n';
import { Card, FeeStatusBadge } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdjustmentForm, DeleteDefButton, PaymentRecorder } from '@/components/staff/FinanceParts';
import { Forbidden } from '@/components/staff/Forbidden';
import { feeStatusOf } from '@/lib/data/roster';
import { formatDate, formatMoney, todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Fee' };

export default async function FeePage({ params }: PageProps<'/c/[choir]/forms-fees/fees/[id]'>) {
  const { choir, id } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(id).success) notFound();
  if (!ctx.can('fees')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const [{ data: fee }, { data: balances }] = await Promise.all([
    supabase.from('fees').select('*').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle(),
    supabase.from('fee_balances').select('*').eq('fee_id', id),
  ]);
  if (!fee) notFound();
  const ids = (balances ?? []).map((b) => b.person_id).filter((x): x is string => Boolean(x));
  const { data: people } = ids.length ? await supabase.from('member_directory').select('id, first_name, last_name').in('id', ids) : { data: [] };
  const nameOf = (pid: string | null) => {
    const p = people?.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : '—';
  };
  const today = todayLocal();
  const s = staffStrings(t);
  const canEdit = ctx.can('fees', 'edit');
  const rows = [...(balances ?? [])]
    .map((b) => ({ b, left: Math.max(0, (b.amount_cents ?? 0) - (b.paid_cents ?? 0) - (b.adjusted_cents ?? 0)), status: feeStatusOf([b], today).status }))
    .sort((x, y) => y.left - x.left || nameOf(x.b.person_id).localeCompare(nameOf(y.b.person_id)));
  const owing = rows.filter((r) => r.left > 0);
  const total = (k: 'paid_cents' | 'adjusted_cents') => rows.reduce((n, r) => n + (r.b[k] ?? 0), 0);

  return (
    <div className="page page--wide">
      <Link href={`/c/${choir}/forms-fees?tab=fees` as never} className="back-link">
        ← {t.staff.financeTitle}
      </Link>
      <div className="page__head">
        <div>
          <h1 className="page__title">{fee.name}</h1>
          <p className="page__lede">
            {formatMoney(fee.amount_cents, lang)}
            {fee.due_on ? ` · ${t.staff.feeDue} ${formatDate(`${fee.due_on}T12:00:00Z`, lang, { month: 'long', day: 'numeric', year: 'numeric' })}` : ''} · {format(t.staff.assignedN, { n: rows.length })}
          </p>
        </div>
        <div className="page__actions">
          {owing.length && (ctx.can('fees', 'edit') || ctx.can('announcements', 'edit')) ? (
            <Link className="cb-btn cb-btn--secondary cb-btn--md" href={`/c/${choir}/communications/new?to=${owing.map((r) => r.b.person_id).join(',')}` as never}>
              {t.staff.remindUnpaid}
            </Link>
          ) : null}
          {canEdit ? <DeleteDefButton slug={choir} id={id} kind="fee" s={s} /> : null}
        </div>
      </div>
      <div className="stat-strip">
        <div>
          <span className="muted small">{t.staff.collected}</span>
          <strong>{formatMoney(total('paid_cents'), lang)}</strong>
        </div>
        <div>
          <span className="muted small">{t.staff.adjustments}</span>
          <strong>{formatMoney(total('adjusted_cents'), lang)}</strong>
        </div>
        <div>
          <span className="muted small">{t.staff.outstanding}</span>
          <strong>{formatMoney(owing.reduce((n, r) => n + r.left, 0), lang)}</strong>
        </div>
      </div>
      <Card padded={false}>
        <div className="table-scroll" style={{ border: 0 }}>
          <table className="simple-table">
            <thead>
              <tr>
                <th scope="col">{t.staff.colChorister}</th>
                <th scope="col" className="num">{t.staff.amount}</th>
                <th scope="col" className="num">{t.staff.paid}</th>
                <th scope="col" className="num">{t.staff.adjustments}</th>
                <th scope="col" className="num">{t.staff.balance}</th>
                <th scope="col">{t.staff.status}</th>
                {canEdit ? (
                  <th scope="col">
                    <span className="cb-sr-only">{t.staff.recordPayment}</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, left, status }) => (
                <tr key={b.assignment_id}>
                  <th scope="row">
                    <Link className="cb-link" href={`/c/${choir}/roster/${b.person_id}` as never}>
                      {nameOf(b.person_id)}
                    </Link>
                  </th>
                  <td className="num">{formatMoney(b.amount_cents ?? 0, lang)}</td>
                  <td className="num">{formatMoney(b.paid_cents ?? 0, lang)}</td>
                  <td className="num">{b.adjusted_cents ? `−${formatMoney(b.adjusted_cents, lang)}` : '—'}</td>
                  <td className="num">
                    <strong>{formatMoney(left, lang)}</strong>
                  </td>
                  <td>{status ? <FeeStatusBadge status={status} lang={lang} /> : null}</td>
                  {canEdit ? (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {left > 0 ? (
                        <>
                          <PaymentRecorder slug={choir} assignmentId={b.assignment_id!} name={nameOf(b.person_id)} balance={(left / 100).toFixed(2)} today={today} s={s} />
                          <AdjustmentForm slug={choir} assignmentId={b.assignment_id!} name={nameOf(b.person_id)} s={s} />
                        </>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
