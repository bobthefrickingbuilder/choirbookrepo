import type { Lang } from '@choirbook/shared/i18n';
import { PoweredBy, Wordmark } from '@choirbook/ui';
import { LanguageSwitch } from './LanguageSwitch';

/** The centred card used by sign-in and the other signed-out pages. */
export function PublicFrame({
  lang,
  languageLabel,
  wide = false,
  children,
}: {
  lang: Lang;
  languageLabel: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="public" id="main">
      <div className={wide ? 'public__card public__card--wide' : 'public__card'}>
        <Wordmark size="lg" />
        {children}
        <div className="public__foot">
          <LanguageSwitch lang={lang} label={languageLabel} />
        </div>
      </div>
      <PoweredBy lang={lang} />
    </main>
  );
}
