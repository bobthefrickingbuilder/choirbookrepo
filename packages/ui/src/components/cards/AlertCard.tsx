import * as React from 'react';
import { IconButton } from '../buttons/IconButton';
import { Icon, type IconName } from '../icons/Icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'error' | 'accent';

const ICONS: Record<AlertTone, IconName> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-alert',
  accent: 'megaphone',
};

export interface AlertCardProps {
  tone?: AlertTone;
  title?: React.ReactNode;
  icon?: IconName;
  actions?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export function AlertCard({
  tone = 'info',
  title,
  icon,
  actions,
  onDismiss,
  dismissLabel = 'Dismiss',
  className = '',
  children,
}: AlertCardProps) {
  const role = tone === 'error' || tone === 'warning' ? 'alert' : 'status';
  return (
    <div className={'cb-alert cb-alert--' + tone + ' ' + className} role={role}>
      {' '}
      <Icon name={icon || ICONS[tone]} size={20} />{' '}
      <div className="cb-alert__body">
        {title ? <div className="cb-alert__title">{title}</div> : null}
        {children ? <div className="cb-alert__text">{children}</div> : null}
        {actions ? <div className="cb-alert__actions">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <IconButton icon="x" label={dismissLabel} size="sm" className="cb-alert__close" onClick={onDismiss} />
      ) : null}
    </div>
  );
}
