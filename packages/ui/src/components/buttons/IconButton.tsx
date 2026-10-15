import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';
import type { ButtonSize, ButtonVariant } from './Button';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Required: icon-only buttons need an accessible name. Also shown as the tooltip. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  round?: boolean;
  count?: number;
  pressed?: boolean;
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  round = false,
  count,
  pressed,
  disabled = false,
  className = '',
  ...rest
}: IconButtonProps) {
  const cls = [
    'cb-btn',
    'cb-btn--icon',
    'cb-btn--' + variant,
    'cb-btn--' + size,
    round && 'cb-btn--round',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const s = size === 'sm' ? 16 : size === 'lg' ? 22 : 20;
  const a11y = count ? label + ', ' + count : label;
  return (
    <button
      type="button"
      className={cls}
      aria-label={a11y}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      {...rest}
    >
      {' '}
      <Icon name={icon} size={s} />
      {count ? (
        <span className="cb-btn__count" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  );
}
