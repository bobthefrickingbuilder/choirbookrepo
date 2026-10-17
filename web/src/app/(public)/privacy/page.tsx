import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
