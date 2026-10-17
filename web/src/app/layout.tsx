import '@choirbook/ui/styles.css';
import './app.css';
import './staff.css';
import './dashboard.css';
import './privacy.css';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { InlineScript, THEME_SCRIPT } from '@/components/InlineScript';
import { getLang, getTheme } from '@/lib/prefs';

export const metadata: Metadata = {
  title: { default: 'Choirbook', template: '%s · Choirbook' },
  description: 'The shared book for running a choir.',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Choirbook', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F1' },
    { media: '(prefers-color-scheme: dark)', color: '#15130F' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [lang, theme, h] = await Promise.all([getLang(), getTheme(), headers()]);
  return (
    <html
      lang={lang === 'fr' ? 'fr-CA' : 'en-CA'}
      data-theme={theme}
      // With "auto", the inline script below swaps in the device's setting before first paint.
      data-mode={theme === 'dark' ? 'dark' : 'light'}
      data-choir="choirbook"
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={THEME_SCRIPT} nonce={h.get('x-nonce') ?? undefined} />
      </head>
      <body>{children}</body>
    </html>
  );
}
