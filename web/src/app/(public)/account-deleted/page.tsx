import { AlertCard, Button } from '@choirbook/ui';
import type { Metadata } from 'next';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { getT } from '@/lib/prefs';

export const metadata: Metadata = { title: 'Account deleted' };

export default async function AccountDeletedPage() {
  const { lang, t } = await getT();
  return (
    <PublicFrame lang={lang} languageLabel={t.account.language}>
      <div className="stack">
        <AlertCard tone="success" title={t.privacy.delDoneTitle}>
          {t.privacy.delDoneBody}
        </AlertCard>
        <Button variant="ghost" href="/privacy">
          {t.privacy.privacyTitle}
        </Button>
      </div>
    </PublicFrame>
  );
}
