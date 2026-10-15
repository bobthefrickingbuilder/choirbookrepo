import type { Messages } from '@choirbook/shared/i18n';

/** Looks up a dotted key such as "validation.emailInvalid"; returns the key itself if missing. */
export function translateKey(t: Messages, key: string): string {
  let node: unknown = t;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part];
    else return key;
  }
  return typeof node === 'string' ? node : key;
}
