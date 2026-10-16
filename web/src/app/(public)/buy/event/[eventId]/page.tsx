import type { Metadata } from 'next';
import { z } from 'zod';
import { BuyPage } from '@/components/public/BuyPage';

export const metadata: Metadata = { title: 'Tickets' };

// The choir's own public sales page for a concert.
export default async function EventBuyPage({ params }: PageProps<'/buy/event/[eventId]'>) {
  const { eventId } = await params;
  return <BuyPage eventId={z.uuid().safeParse(eventId).success ? eventId : null} seller={null} />;
}
