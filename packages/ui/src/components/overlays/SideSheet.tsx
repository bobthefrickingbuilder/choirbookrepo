'use client';

import * as React from 'react';
import { IconButton } from '../buttons/IconButton';
import { useDialogFocus } from './Modal';

export interface SideSheetProps {
  open: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  label: string;
  /** Renders in the page flow instead of as a modal dialog. */
  inline?: boolean;
  closeLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SideSheet({
  open,
  onClose,
  header,
  footer,
  label,
  inline = false,
  closeLabel = 'Close',
  className = '',
  children,
}: SideSheetProps) {
  const ref = React.useRef<HTMLElement>(null);
  useDialogFocus(open && !inline, onClose, ref);
  if (!open) return null;
  const sheet = (
    <aside
      ref={ref}
      tabIndex={-1}
      role={inline ? 'complementary' : 'dialog'}
      aria-modal={inline ? undefined : 'true'}
      aria-label={label}
      className={['cb-sheet', inline && 'cb-sheet--inline', className].filter(Boolean).join(' ')}
    >
      {' '}
      <div className="cb-sheet__head">
        {' '}
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          {header}
        </div>{' '}
        <IconButton icon="x" label={closeLabel} onClick={onClose} data-close="" />
      </div>{' '}
      <div className="cb-sheet__body">{children}</div>
      {footer ? <div className="cb-sheet__foot">{footer}</div> : null}
    </aside>
  );
  if (inline) return sheet;
  return (
    <>
      {' '}
      <div className="cb-scrim cb-scrim--sheet" onClick={onClose} />
      {sheet}
    </>
  );
}
