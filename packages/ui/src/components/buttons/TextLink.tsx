import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  tone?: 'accent' | 'subtle';
  standalone?: boolean;
  external?: boolean;
  iconEnd?: IconName;
  disabled?: boolean;
}

export function TextLink({
  href,
  tone = 'accent',
  standalone = false,
  external = false,
  iconEnd,
  disabled = false,
  className = '',
  children,
  ...rest
}: TextLinkProps) {
  const cls = [
    'cb-link',
    tone === 'subtle' && 'cb-link--subtle',
    standalone && 'cb-link--standalone',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const end: IconName | undefined = external ? 'external-link' : iconEnd;
  const ext = external
    ? {
        target: '_blank',
        rel: 'noopener noreferrer',
      }
    : {};
  return (
    <a
      href={disabled ? undefined : href}
      className={cls}
      aria-disabled={disabled || undefined}
      {...ext}
      {...rest}
    >
      {children}
      {end ? <Icon name={end} size={14} strokeWidth={2} /> : null}
      {external ? <span className="cb-sr-only">{' (opens in a new tab)'}</span> : null}
    </a>
  );
}
