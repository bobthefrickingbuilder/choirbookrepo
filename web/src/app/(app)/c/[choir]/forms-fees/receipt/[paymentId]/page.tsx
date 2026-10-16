import { Wordmark } from '@choirbook/ui';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PrintButton } from '@/components/PrintButton';
import { formatDate, formatMoney } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export default async function ReceiptPage({ params }: PageProps<'/c/[choir]/forms-fees/receipt/[paymentId]'>) {
  const { choir, paymentId } = await params;
  if (!z.uuid().safeParse(paymentId).success) notFound();
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase
    .from('payments')
    .select('id, amount_cents, refunded_cents, method, received_at, receipt_number, payer_name, status, assignment_id, fee_assignments(fees(name))')
    .eq('id', paymentId)
    .eq('person_id', ctx.personId)
    .maybeSingle();
  if (!p || (p.status !== 'succeeded' && p.status !== 'partially_refunded')) notFound();
  const method = { card: t.member.methodCard, cash: t.member.methodCash, cheque: t.member.methodCheque, etransfer: t.member.methodEtransfer }[p.method];

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="no-print">
        <PrintButton label={t.member.print} />
      </div>
      <article className="receipt" data-print-report="">
        <header className="row-between">
          <div className="stack" style={{ gap: 4 }}>
            <strong className="receipt__choir">{ctx.org.name}</strong>
            <span className="muted">{t.member.receiptTitle}</span>
          </div>
          <Wordmark size="sm" />
        </header>
        <dl className="answer-list">
          <div>
            <dt>{t.member.receiptNo}</dt>
            <dd className="cb-tabular">{p.receipt_number ?? p.id.slice(0, 8).toUpperCase()}</dd>
          </div>
          <div>
            <dt>{t.member.payer}</dt>
            <dd>{p.payer_name ?? ctx.displayName}</dd>
          </div>
          <div>
            <dt>{t.member.for}</dt>
            <dd>{p.fee_assignments?.fees?.name ?? '—'}</dd>
          </div>
          <div>
            <dt>{t.member.paidOn}</dt>
            <dd>{p.received_at ? formatDate(p.received_at, lang, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</dd>
          </div>
          <div>
            <dt>{t.member.method}</dt>
            <dd>{method}</dd>
          </div>
          <div>
            <dt>{t.member.amount}</dt>
            <dd className="cb-tabular">
              <strong>{formatMoney(p.amount_cents - p.refunded_cents, lang)}</strong>
            </dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
