export type Lang = 'en' | 'fr';
export type Mode = 'light' | 'dark';

/** A string in both official languages. */
export interface Bilingual {
  en: string;
  fr: string;
}
