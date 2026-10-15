'use server';

import { emailOnlySchema, newPasswordSchema, safeNextPath, signInSchema } from '@choirbook/shared/schemas';
import { format, isLang } from '@choirbook/shared/i18n';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { publicEnv } from '@/lib/env';
import { getT, LANG_COOKIE, PREF_COOKIE_OPTIONS, THEME_COOKIE, isTheme } from '@/lib/prefs';
import { createClient } from '@/lib/supabase/server';
import { translateKey } from '@/lib/translate';

export interface AuthFormState {
  status: 'idle' | 'error' | 'sent';
  message?: string;
  fieldErrors?: Partial<Record<'email' | 'password' | 'confirm', string>>;
  email?: string;
}

const field = (fd: FormData, name: string) => {
  const v = fd.get(name);
  return typeof v === 'string' ? v : '';
};

async function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const { t } = await getT();
  const out: AuthFormState['fieldErrors'] = {};
  for (const issue of issues) {
    const key = String(issue.path[0]) as 'email' | 'password' | 'confirm';
    out[key] ??= translateKey(t, issue.message);
  }
  return out;
}

function confirmUrl(next: string) {
  return `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`;
}

/** Copies the member's saved language into the cookie so the app opens in it. */
async function syncPrefsFromProfile() {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('lang, theme').maybeSingle();
  if (!data) return;
  const jar = await cookies();
  jar.set(LANG_COOKIE, data.lang, PREF_COOKIE_OPTIONS);
  jar.set(THEME_COOKIE, data.theme, PREF_COOKIE_OPTIONS);
}

export async function signInWithPassword(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({ email: field(fd, 'email'), password: field(fd, 'password') });
  if (!parsed.success) return { status: 'error', fieldErrors: await fieldErrorsFrom(parsed.error.issues), email: field(fd, 'email') };

  const { t } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.status === 429 ? t.auth.tooManyAttempts : error.code === 'invalid_credentials' || error.status === 400 ? t.auth.wrongCredentials : t.auth.genericError;
    return { status: 'error', message, email: parsed.data.email };
  }
  await syncPrefsFromProfile();
  redirect(safeNextPath(field(fd, 'next')) as never);
}

export async function sendMagicLink(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const parsed = emailOnlySchema.safeParse({ email: field(fd, 'email') });
  if (!parsed.success) return { status: 'error', fieldErrors: await fieldErrorsFrom(parsed.error.issues), email: field(fd, 'email') };

  const { t } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    // Invite-only: never create an account from the sign-in page.
    options: { shouldCreateUser: false, emailRedirectTo: confirmUrl(safeNextPath(field(fd, 'next'))) },
  });
  if (error?.status === 429) return { status: 'error', message: t.auth.tooManyAttempts, email: parsed.data.email };
  // For any other outcome (including "no such account") say the same thing, so the
  // page cannot be used to find out who is a member.
  return { status: 'sent', message: format(t.auth.magicLinkSent, { email: parsed.data.email }), email: parsed.data.email };
}

export async function requestPasswordReset(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const parsed = emailOnlySchema.safeParse({ email: field(fd, 'email') });
  if (!parsed.success) return { status: 'error', fieldErrors: await fieldErrorsFrom(parsed.error.issues), email: field(fd, 'email') };

  const { t } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: confirmUrl('/reset-password') });
  if (error?.status === 429) return { status: 'error', message: t.auth.tooManyAttempts, email: parsed.data.email };
  return { status: 'sent', message: format(t.auth.resetSent, { email: parsed.data.email }), email: parsed.data.email };
}

export async function chooseNewPassword(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({ password: field(fd, 'password'), confirm: field(fd, 'confirm') });
  if (!parsed.success) return { status: 'error', fieldErrors: await fieldErrorsFrom(parsed.error.issues) };

  const { t } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message = error.code === 'weak_password' ? t.validation.passwordShort : error.code === 'same_password' ? t.auth.genericError : t.auth.linkExpired;
    return { status: 'error', message };
  }
  await syncPrefsFromProfile();
  redirect('/');
}

/** Signs out on this device, or on every device (revokes all sessions). */
export async function signOut(fd: FormData): Promise<void> {
  const supabase = await createClient();
  const everywhere = fd.get('scope') === 'global';
  await supabase.auth.signOut({ scope: everywhere ? 'global' : 'local' });
  redirect(everywhere ? '/sign-in?signedOut=everywhere' : '/sign-in');
}

export async function setLanguage(lang: string): Promise<void> {
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, PREF_COOKIE_OPTIONS);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) await supabase.from('profiles').update({ lang }).eq('id', data.claims.sub);
}

export async function setTheme(theme: string): Promise<void> {
  if (!isTheme(theme)) return;
  (await cookies()).set(THEME_COOKIE, theme, PREF_COOKIE_OPTIONS);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) await supabase.from('profiles').update({ theme }).eq('id', data.claims.sub);
}
