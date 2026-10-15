'use client';

import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';

export interface PopoverProps {
  open: boolean;
  onClose?: () => void;
  placement?: 'bottom' | 'top';
  align?: 'start' | 'end';
  width?: number | string;
  label?: string;
  role?: 'dialog' | 'menu' | 'listbox';
  className?: string;
  children?: React.ReactNode;
}

export function Popover({
  open,
  onClose,
  placement = 'bottom',
  align = 'start',
  width,
  label,
  role = 'dialog',
  className = '',
  children,
}: PopoverProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const anchor = ref.current && ref.current.parentElement;
    const down = (e: MouseEvent) => {
      if (anchor && e.target instanceof Node && !anchor.contains(e.target) && onClose) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role={role}
      aria-label={label}
      className={['cb-popover', 'cb-popover--' + placement, 'cb-popover--' + align, className].join(' ')}
      style={
        width
          ? {
              width,
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
type MenuItemOwnProps = {
  icon?: IconName;
  hint?: React.ReactNode;
  /** Set to true or false to make this a radio-style item. */
  checked?: boolean;
  danger?: boolean;
  href?: string;
};

export type MenuItemProps = MenuItemOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof MenuItemOwnProps> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof MenuItemOwnProps | 'type'>;

export function MenuItem({ icon, hint, checked, danger = false, href, className = '', children, ...rest }: MenuItemProps) {
  const cls = ['cb-menu-item', danger && 'cb-menu-item--danger', className].filter(Boolean).join(' ');
  const role = checked === undefined ? 'menuitem' : 'menuitemradio';
  const inner = (
    <>
      {icon ? <Icon name={icon} size={18} /> : null} <span className="cb-menu-item__label">{children}</span>
      {hint ? <span className="cb-menu-item__hint">{hint}</span> : null}
      {checked ? <Icon name="check" size={16} strokeWidth={2.25} className="cb-menu-item__check" /> : null}
    </>
  );
  if (href)
    return (
      <a href={href} role={role} aria-checked={checked} className={cls} {...rest}>
        {inner}
      </a>
    );
  return (
    <button type="button" role={role} aria-checked={checked} className={cls} {...rest}>
      {inner}
    </button>
  );
}
