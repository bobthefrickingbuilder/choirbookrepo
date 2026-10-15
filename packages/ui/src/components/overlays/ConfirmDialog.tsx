import * as React from 'react';
import { Button } from '../buttons/Button';
import { Icon } from '../icons/Icon';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  children?: React.ReactNode;
  /** Repeat the verb: "Cancel rehearsal", not "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  loading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const icon = (
    <span
      className={'cb-confirm__icon' + (tone === 'danger' ? '' : ' cb-confirm__icon--default')}
      aria-hidden="true"
    >
      {' '}
      <Icon name={tone === 'danger' ? 'triangle-alert' : 'circle-help'} size={22} />
    </span>
  );
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      icon={icon}
      hideClose={true}
      footer={
        <>
          {' '}
          <Button variant="secondary" onClick={onCancel} data-autofocus="">
            {cancelLabel}
          </Button>{' '}
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
