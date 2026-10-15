import 'server-only';
import { DEFAULT_LANG, getMessages, isLang, langFromAcceptLanguage, type Lang, type Messages } from '@choirbook/shared/i18n';
import { cookies, headers } from 'next/headers';

export const LANG_COOKIE = 'cb-lang';
export const THEME_COOKIE = 'cb-theme';
export const THEMES = ['auto', 'light', 'dark'] as const;
export type ThemePref = (typeof THEMES)[number];

export const isTheme = (v: unknown): v is ThemePref => typeof v === 'string' && (THEMES as readonly string[]).includes(v);

/** The member's language: their saved choice, else what their browser prefers. */
export async function getLang(): Promise<Lang> {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(saved)) return saved;
  return langFromAcceptLanguage((await headers()).get('accept-language')) ?? DEFAULT_LANG;
}

export async function getT(): Promise<{ lang: Lang; t: Messages }> {
  const lang = await getLang();
  return { lang, t: getMessages(lang) };
}

export async function getTheme(): Promise<ThemePref> {
  const saved = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(saved) ? saved : 'auto';
}

/** One year; these are preferences, not secrets. */
export const PREF_COOKIE_OPTIONS = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const, httpOnly: false };
