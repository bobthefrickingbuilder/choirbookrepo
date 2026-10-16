import type { Metadata } from 'next';
import { BuyPage } from '@/components/public/BuyPage';
import { getSeller } from '@/lib/data/buy';

export const metadata: Metadata = { title: 'Tickets', robots: { index: false } };

// A chorister's personal sales link: sales through it are credited to them.
export default async function SellerBuyPage({ params }: PageProps<'/buy/[code]'>) {
  const { code } = await params;
  const seller = await getSeller(code);
  return <BuyPage eventId={seller?.eventId ?? null} seller={seller ? { code, firstName: seller.firstName } : null} />;
}
