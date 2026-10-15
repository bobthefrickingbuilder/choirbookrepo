import { Button, Card, Field } from '@choirbook/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { LanguageSwitch } from '@/components/auth/LanguageSwitch';
import { ThemeSwitch } from '@/components/auth/ThemeSwitch';
import { getT, getTheme } from '@/lib/prefs';
import { getUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Account settings' };

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in?next=/account');
  const [{ lang, t }, theme] = await Promise.all([getT(), getTheme()]);

  return (
    <main className="public" id="main">
      <div className="public__card public__card--wide">
        <div className="public__heading">
          <h1>{t.account.settings}</h1>
          <p>{t.account.settingsIntro}</p>
          <p className="muted">{user.email}</p>
        </div>
        <Field as="fieldset" label={t.account.language}>
          <LanguageSwitch lang={lang} label={t.account.language} />
        </Field>
        <Field as="fieldset" label={t.account.appearance}>
          <ThemeSwitch
            value={theme}
            label={t.account.appearance}
            labels={{ auto: t.account.themeAuto, light: t.account.light, dark: t.account.dark }}
          />
        </Field>
        <Card title={t.account.sessions} flat>
          <div className="stack">
            <p className="muted">{t.account.signOutEverywhereHint}</p>
            <form action={signOut} className="row-between">
              <Button type="submit" variant="secondary" iconStart="log-out">
                {t.account.signOutHere}
              </Button>
              <Button type="submit" variant="danger" iconStart="log-out" name="scope" value="global">
                {t.account.signOutEverywhere}
              </Button>
            </form>
          </div>
        </Card>
        <Button variant="ghost" iconStart="arrow-left" href="/">
          {t.common.backHome}
        </Button>
      </div>
    </main>
  );
}
