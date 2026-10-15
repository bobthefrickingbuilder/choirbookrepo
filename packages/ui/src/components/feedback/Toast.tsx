'use client';

import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

const ICONS: Record<ToastTone, IconName> = {
  success: 'circle-check',
  error: 'circle-alert',
  warning: 'triangle-alert',
  info: 'info',
};

export interface ToastProps {
  tone?: ToastTone;
  title: React.ReactNode;
  children?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  closeLabel?: string;
  /** Auto-dismiss after this many milliseconds. */
  duration?: number;
  className?: string;
}

export interface ToastItem extends Omit<ToastProps, 'onClose'> {
  id: string | number;
}

export function Toast({
  tone = 'success',
  title,
  children,
  actionLabel,
  onAction,
  onClose,
  closeLabel = 'Dismiss',
  duration,
  className = '',
}: ToastProps) {
  React.useEffect(() => {
    if (!duration || !onClose) return undefined;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [duration, onClose]);
  return (
    <div
      className={'cb-toast cb-toast--' + tone + ' ' + className}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {' '}
      <Icon name={ICONS[tone] || 'info'} size={20} />{' '}
      <div className="cb-toast__body">
        {' '}
        <div className="cb-toast__title">{title}</div>
        {children ? <div className="cb-toast__text">{children}</div> : null}
      </div>
      {actionLabel ? (
        <button type="button" className="cb-toast__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
      {onClose ? (
        <button type="button" className="cb-toast__close" aria-label={closeLabel} onClick={onClose}>
          {' '}
          <Icon name="x" size={16} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
export function ToastStack({
  toasts = [],
  onDismiss,
  inline = false,
  label = 'Notifications',
}: {
  toasts?: ToastItem[];
  onDismiss?: (id: ToastItem['id']) => void;
  inline?: boolean;
  label?: string;
}) {
  return (
    <div
      className={'cb-toasts' + (inline ? ' cb-toasts--inline' : '')}
      aria-live="polite"
      aria-label={label}
      role="region"
    >
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onClose={onDismiss ? () => onDismiss(t.id) : undefined} />
      ))}
    </div>
  );
}
