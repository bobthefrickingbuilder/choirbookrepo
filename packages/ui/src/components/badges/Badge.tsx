import * as React from 'react';
import type { Lang } from '../../types';
import { Icon, type IconName } from '../icons/Icon';

export type BadgeTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'error' | 'slate' | 'unmarked';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  solid?: boolean;
  size?: 'sm' | 'md';
  icon?: IconName;
}

interface StatusMeta {
  tone: BadgeTone;
  icon: IconName;
  en: string;
  fr: string;
}

export function Badge({
  tone = 'neutral',
  solid = false,
  size = 'sm',
  icon,
  className = '',
  children,
  ...rest
}: BadgeProps) {
  const cls = [
    'cb-badge',
    'cb-badge--' + tone,
    solid && 'cb-badge--solid',
    size === 'md' && 'cb-badge--md',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} {...rest}>
      {icon ? <Icon name={icon} size={size === 'md' ? 15 : 13} strokeWidth={2.25} /> : null}{' '}
      <span>{children}</span>
    </span>
  );
}
export type FormStatus = 'not_started' | 'in_progress' | 'submitted' | 'changes' | 'approved' | 'overdue';
export type FeeStatus = 'paid' | 'partial' | 'plan' | 'due' | 'overdue' | 'waived';

export const FORM_STATUS: Record<FormStatus, StatusMeta> = {
  not_started: {
    tone: 'neutral',
    icon: 'circle',
    en: 'Not started',
    fr: 'Non commencé',
  },
  in_progress: {
    tone: 'info',
    icon: 'pen-line',
    en: 'In progress',
    fr: 'En cours',
  },
  submitted: {
    tone: 'info',
    icon: 'send',
    en: 'Submitted',
    fr: 'Soumis',
  },
  changes: {
    tone: 'warning',
    icon: 'triangle-alert',
    en: 'Needs changes',
    fr: 'Modifications requises',
  },
  approved: {
    tone: 'success',
    icon: 'circle-check',
    en: 'Approved',
    fr: 'Approuvé',
  },
  overdue: {
    tone: 'error',
    icon: 'circle-alert',
    en: 'Overdue',
    fr: 'En retard',
  },
};
export const FEE_STATUS: Record<FeeStatus, StatusMeta> = {
  paid: {
    tone: 'success',
    icon: 'circle-check',
    en: 'Paid',
    fr: 'Payé',
  },
  partial: {
    tone: 'warning',
    icon: 'circle-dot',
    en: 'Partly paid',
    fr: 'Payé en partie',
  },
  plan: {
    tone: 'info',
    icon: 'repeat',
    en: 'Payment plan',
    fr: 'Versements',
  },
  due: {
    tone: 'neutral',
    icon: 'receipt',
    en: 'Due',
    fr: 'À payer',
  },
  overdue: {
    tone: 'error',
    icon: 'circle-alert',
    en: 'Overdue',
    fr: 'En souffrance',
  },
  waived: {
    tone: 'slate',
    icon: 'circle-minus',
    en: 'Waived',
    fr: 'Exonéré',
  },
};
export function FormStatusBadge({
  status = 'not_started',
  lang = 'en',
  size,
  children,
}: {
  status?: FormStatus;
  lang?: Lang;
  size?: BadgeProps['size'];
  children?: React.ReactNode;
}) {
  const s = FORM_STATUS[status] || FORM_STATUS.not_started;
  return (
    <Badge tone={s.tone} icon={s.icon} size={size}>
      {children || s[lang] || s.en}
    </Badge>
  );
}
export function FeeStatusBadge({
  status = 'due',
  lang = 'en',
  amount,
  size,
}: {
  status?: FeeStatus;
  lang?: Lang;
  amount?: string;
  size?: BadgeProps['size'];
}) {
  const s = FEE_STATUS[status] || FEE_STATUS.due;
  return (
    <Badge tone={s.tone} icon={s.icon} size={size}>
      {s[lang] || s.en}
      {amount ? ' · ' + amount : ''}
    </Badge>
  );
}
