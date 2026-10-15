import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { getT } from '@/lib/prefs';

export const metadata: Metadata = { title: 'Reset your password' };

export default async function ForgotPasswordPage({ searchParams }: PageProps<'/forgot-password'>) {
  const { email } = await searchParams;
  const { lang, t } = await getT();
  return (
    <PublicFrame lang={lang} languageLabel={t.account.language}>
      <ForgotPasswordForm t={t} email={typeof email === 'string' ? email : undefined} />
    </PublicFrame>
  );
}
