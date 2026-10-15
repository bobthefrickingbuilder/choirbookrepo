import * as React from 'react';
import { Icon } from '../icons/Icon';

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  description?: React.ReactNode;
  labelPosition?: 'start' | 'end';
}

export function Toggle({
  label,
  description,
  labelPosition = 'start',
  disabled = false,
  className = '',
  ...rest
}: ToggleProps) {
  const cls = [
    'cb-toggle',
    labelPosition === 'end' && 'cb-toggle--end',
    disabled && 'cb-toggle--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <label className={cls}>
      {' '}
      <input type="checkbox" role="switch" className="cb-toggle__input" disabled={disabled} {...rest} />{' '}
      <span className="cb-toggle__track" aria-hidden="true">
        {' '}
        <span className="cb-toggle__knob">
          {' '}
          <Icon name="check" size={12} strokeWidth={3} />
        </span>
      </span>{' '}
      <span className="cb-check__text">
        {' '}
        <span>{label}</span>
        {description ? <span className="cb-check__desc">{description}</span> : null}
      </span>
    </label>
  );
}
