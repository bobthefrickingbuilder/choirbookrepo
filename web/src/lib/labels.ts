import type { Messages } from '@choirbook/shared/i18n';

export type MessageCategory = 'absence' | 'music' | 'fees' | 'general';

export const categoryLabel = (c: MessageCategory, t: Messages) =>
  ({ absence: t.member.catAbsence, music: t.member.catMusic, fees: t.member.catFees, general: t.member.catGeneral })[c];
