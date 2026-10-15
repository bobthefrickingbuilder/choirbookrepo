import { format } from '@choirbook/shared/i18n';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { getT } from '@/lib/prefs';
import { getMemberships, getUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Welcome' };

// Reached from an invitation email (via /auth/confirm). The member chooses a password.
export default async function WelcomePage() {
  const user = await getUser();
  if (!user) redirect('/sign-in?error=link');
  const [{ lang, t }, memberships] = await Promise.all([getT(), getMemberships()]);
  const choir = memberships[0]?.org.name ?? 'Choirbook';
  return (
    <PublicFrame lang={lang} languageLabel={t.account.language}>
      <NewPasswordForm
        t={t}
        title={format(t.auth.acceptInviteTitle, { choir })}
        intro={t.auth.acceptInviteIntro}
        submitLabel={t.auth.createAccount}
        email={user.email}
      />
    </PublicFrame>
  );
}
