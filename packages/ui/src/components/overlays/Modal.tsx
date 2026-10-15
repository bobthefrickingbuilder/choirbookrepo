'use client';

import * as React from 'react';
import { IconButton } from '../buttons/IconButton';

export function useDialogFocus(
  open: boolean,
  onClose: (() => void) | undefined,
  ref: React.RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = ref.current;
    const first =
      node && node.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button:not([data-close])');
    if (first) first.focus();
    else if (node) node.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && node) {
        const f = node.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        );
        const a = f[0],
          z = f[f.length - 1];
        if (!a || !z) return;
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      if (prev) prev.focus();
    };
    // Re-run only when the dialog opens or closes; onClose identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  closeLabel?: string;
  hideClose?: boolean;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  footer,
  closeLabel = 'Close',
  hideClose = false,
  children,
  className = '',
  icon,
}: ModalProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  // useId keeps server and client markup identical (Math.random would not).
  const id = 'cb-modal-' + React.useId();
  useDialogFocus(open, onClose, ref);
  if (!open) return null;
  return (
    <>
      {' '}
      <div className="cb-scrim" onClick={onClose} />{' '}
      <div
        className="cb-modal-wrap"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        {' '}
        <div
          ref={ref}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={id}
          className={['cb-modal', 'cb-modal--' + size, className].join(' ')}
        >
          {icon}{' '}
          <div className="cb-modal__head">
            {' '}
            <h2 id={id} className="cb-modal__title">
              {title}
            </h2>
            {!hideClose && <IconButton icon="x" label={closeLabel} onClick={onClose} data-close="" />}
          </div>{' '}
          <div className="cb-modal__body">{children}</div>
          {footer ? <div className="cb-modal__foot">{footer}</div> : null}
        </div>
      </div>
    </>
  );
}
