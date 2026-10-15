import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: IconName;
  iconEnd?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Renders a link styled as a button. */
  href?: string;
};

export type ButtonProps = ButtonOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps | 'type'>;

export function Button({
  variant = 'primary',
  size = 'md',
  iconStart,
  iconEnd,
  loading = false,
  fullWidth = false,
  disabled = false,
  href,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'cb-btn',
    'cb-btn--' + variant,
    'cb-btn--' + size,
    fullWidth && 'cb-btn--full',
    loading && 'is-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const s = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  const inner = (
    <>
      {loading ? (
        <Icon name="loader-circle" size={s} className="cb-spin" />
      ) : iconStart ? (
        <Icon name={iconStart} size={s} />
      ) : null}
      {children != null && <span className="cb-btn__label">{children}</span>}
      {iconEnd && !loading ? <Icon name={iconEnd} size={s} /> : null}
    </>
  );
  if (href)
    return (
      <a href={disabled ? undefined : href} className={cls} aria-disabled={disabled || undefined} {...rest}>
        {inner}
      </a>
    );
  return (
    <button type={type} className={cls} disabled={disabled} aria-busy={loading || undefined} {...rest}>
      {inner}
    </button>
  );
}
