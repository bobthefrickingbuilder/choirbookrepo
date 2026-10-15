import { en, type Messages } from './en';
import { fr } from './fr';

export type { Messages };
export const LANGS = ['en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

const dictionaries: Record<Lang, Messages> = { en, fr };

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

export function getMessages(lang: Lang): Messages {
  return dictionaries[lang];
}

/** BCP 47 locale for Intl formatting in Canada. */
export function localeFor(lang: Lang): string {
  return lang === 'fr' ? 'fr-CA' : 'en-CA';
}

/** Replaces {name} placeholders. Unknown placeholders are left as they are. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

/** Picks a language from an Accept-Language header; French wins only when preferred over English. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_LANG;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { lang: tag.trim().slice(0, 2).toLowerCase(), q: q ? Number(q.split('=')[1]) : 1 };
    })
    .filter((x) => isLang(x.lang) && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);
  const first = ranked[0]?.lang;
  return isLang(first) ? first : DEFAULT_LANG;
}
