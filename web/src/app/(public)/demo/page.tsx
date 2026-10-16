import type { Metadata } from 'next';
import { PoweredBy, Wordmark } from '@choirbook/ui';
import { LanguageSwitch } from '@/components/auth/LanguageSwitch';
import { DemoChoices } from '@/components/demo/DemoChoices';
import { getT } from '@/lib/prefs';

export const metadata: Metadata = { title: 'Try the demo' };

export default async function DemoPage({ searchParams }: PageProps<'/demo'>) {
  const { error } = await searchParams;
  const { lang, t } = await getT();
  return (
    <main className="public" id="main">
      <div className="public__card public__card--demo">
        <Wordmark size="lg" />
        <div className="public__heading">
          <h1>{t.demo.pageTitle}</h1>
          <p>{t.demo.intro}</p>
        </div>
        <DemoChoices t={t} unavailable={error === 'unavailable'} />
        <div className="public__foot">
          <LanguageSwitch lang={lang} label={t.account.language} />
        </div>
      </div>
      <PoweredBy lang={lang} />
    </main>
  );
}
