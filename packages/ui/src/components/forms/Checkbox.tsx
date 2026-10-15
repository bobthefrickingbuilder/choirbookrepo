'use client';

import * as React from 'react';
import { Icon } from '../icons/Icon';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  indeterminate?: boolean;
  error?: boolean;
}

export function Checkbox({
  label,
  description,
  indeterminate = false,
  error = false,
  disabled = false,
  className = '',
  ...rest
}: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const cls = ['cb-check', error && 'cb-check--error', disabled && 'cb-check--disabled', className]
    .filter(Boolean)
    .join(' ');
  return (
    <label className={cls}>
      {' '}
      <input
        ref={ref}
        type="checkbox"
        className="cb-check__input"
        disabled={disabled}
        aria-invalid={error || undefined}
        {...rest}
      />{' '}
      <span className="cb-check__box" aria-hidden="true">
        {' '}
        <Icon
          name="check"
          size={14}
          strokeWidth={3}
          className="cb-icon--on"
          style={{
            position: 'absolute',
          }}
        />{' '}
        <Icon
          name="minus"
          size={14}
          strokeWidth={3}
          className="cb-icon--mixed"
          style={{
            position: 'absolute',
          }}
        />
      </span>
      {label || description ? (
        <span className="cb-check__text">
          {label ? <span>{label}</span> : null}
          {description ? <span className="cb-check__desc">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}
