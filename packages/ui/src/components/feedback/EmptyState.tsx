import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';

export interface EmptyStateProps {
  icon?: IconName;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function EmptyState({ icon = 'inbox', title, children, actions, size = 'md', className = '' }: EmptyStateProps) {
  return (
    <div className={'cb-empty' + (size === 'sm' ? ' cb-empty--sm' : '') + ' ' + className}>
      {' '}
      <span className="cb-empty__icon" aria-hidden="true">
        {' '}
        <Icon name={icon} size={24} />
      </span>
      {title ? <h3 className="cb-empty__title">{title}</h3> : null}
      {children ? <p className="cb-empty__body">{children}</p> : null}
      {actions ? <div className="cb-empty__actions">{actions}</div> : null}
    </div>
  );
}
