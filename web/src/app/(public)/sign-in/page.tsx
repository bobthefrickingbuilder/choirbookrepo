import { safeNextPath } from '@choirbook/shared/schemas';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PublicFrame } from '@/components/auth/PublicFrame';
import { SignInForm } from '@/components/auth/SignInForm';
import { getT } from '@/lib/prefs';
import { getUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getUser()) redirect(next as never);

  const { lang, t } = await getT();
  const notice =
    params.error === 'link' ? t.auth.linkExpired : params.signedOut === 'everywhere' ? t.account.signedOutEverywhere : undefined;

  return (
    <PublicFrame lang={lang} languageLabel={t.account.language}>
      <SignInForm t={t} next={next} notice={notice} />
    </PublicFrame>
  );
}
