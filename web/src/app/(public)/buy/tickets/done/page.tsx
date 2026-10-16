import { AlertCard } from '@choirbook/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { completePurchase } from '@/app/actions/tickets';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { getT } from '@/lib/prefs';

export const metadata: Metadata = { title: 'Tickets', robots: { index: false } };
export const dynamic = 'force-dynamic';

// Stripe sends the buyer back here. Record the order (once), then show the tickets.
export default async function PurchaseDonePage({ searchParams }: PageProps<'/buy/tickets/done'>) {
  const { session } = await searchParams;
  const orderId = typeof session === 'string' ? await completePurchase(session) : null;
  if (orderId) redirect(`/buy/tickets/${orderId}`);
  const { lang, t } = await getT();
  return (
    <PublicFrame lang={lang} languageLabel={t.account.language}>
      <AlertCard tone="info">{t.staff.buyPending}</AlertCard>
    </PublicFrame>
  );
}
