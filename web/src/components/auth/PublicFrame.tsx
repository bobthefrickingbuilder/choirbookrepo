import { getMessages, type Lang } from '@choirbook/shared/i18n';
import Link from 'next/link';
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
          <nav className="public__legal small" aria-label={getMessages(lang).privacy.legalLinks}>
            <Link href="/privacy">{getMessages(lang).privacy.privacy}</Link>
            <Link href="/terms">{getMessages(lang).privacy.terms}</Link>
          </nav>
        </div>
      </div>
      <PoweredBy lang={lang} />
    </main>
  );
}
