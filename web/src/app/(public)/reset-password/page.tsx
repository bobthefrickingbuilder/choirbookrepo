import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { getT } from '@/lib/prefs';
import { getUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Choose a new password' };

// Reached from the emailed reset link (via /auth/confirm, which signs the member in).
export default async function ResetPasswordPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in?error=link');
  const { lang, t } = await getT();
  return (
    <PublicFrame lang={lang} languageLabel={t.account.language}>
      <NewPasswordForm
        t={t}
        title={t.auth.newPasswordTitle}
        intro={user.email ?? ''}
        submitLabel={t.auth.savePassword}
        email={user.email}
      />
    </PublicFrame>
  );
}
