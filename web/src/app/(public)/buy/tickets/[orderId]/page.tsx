import { AlertCard } from '@choirbook/ui';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { z } from 'zod';
import { PrintButton } from '@/components/PrintButton';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { formatRange } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Your tickets', robots: { index: false } };

// The buyer's tickets. The order id in the address is long and random, so the
// link itself is the key (the same way the emailed copy works).
export default async function OrderTicketsPage({ params }: PageProps<'/buy/tickets/[orderId]'>) {
  const { orderId } = await params;
  const { lang, t } = await getT();
  const frame = (body: React.ReactNode) => (
    <PublicFrame lang={lang} languageLabel={t.account.language} wide>
      {body}
    </PublicFrame>
  );
  if (!z.uuid().safeParse(orderId).success || !process.env.SUPABASE_SECRET_KEY) return frame(<AlertCard tone="error">{t.staff.buyNotFound}</AlertCard>);
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('ticket_orders')
    .select('id, buyer_name, status, events!inner(title, starts_at, ends_at, location), tickets(id, code, voided_at, scanned_at, ticket_types(name))')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return frame(<AlertCard tone="error">{t.staff.buyNotFound}</AlertCard>);
  const tickets = await Promise.all(
    order.tickets
      .filter((k) => !k.voided_at)
      .map(async (k) => ({ ...k, qr: await QRCode.toString(k.code, { type: 'svg', margin: 1, width: 180 }) })),
  );
  return frame(
    <div className="stack">
      <div className="public__heading">
        <h1>{t.staff.yourTickets}</h1>
        <p>
          {order.events.title} · {formatRange(order.events.starts_at, order.events.ends_at, lang)}
          {order.events.location ? ` · ${order.events.location}` : ''}
        </p>
        <p className="muted">{t.staff.yourTicketsIntro}</p>
      </div>
      {order.status !== 'paid' ? <AlertCard tone="warning">{t.staff.orderRefunded}</AlertCard> : null}
      <div className="ticket-grid">
        {tickets.map((k) => (
          <div key={k.id} className="ticket">
            <div className="ticket__qr" dangerouslySetInnerHTML={{ __html: k.qr }} role="img" aria-label={`${order.events.title} · ${k.code.slice(0, 8).toUpperCase()}`} />
            <div className="stack" style={{ gap: 4 }}>
              <strong>{k.ticket_types?.name}</strong>
              <span className="muted">{order.buyer_name}</span>
              <span className="cb-tabular">{k.code.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="no-print">
        <PrintButton label={t.member.print} />
      </div>
    </div>,
  );
}
