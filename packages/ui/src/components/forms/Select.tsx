'use client';

import * as React from 'react';
import { Icon } from '../icons/Icon';
import { Field, describedBy } from './Field';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  size?: 'sm' | 'md' | 'lg';
  options?: (string | SelectOption)[];
  placeholder?: string;
}

export function Select({
  id,
  label,
  hint,
  error,
  required,
  optional,
  size = 'md',
  options = [],
  placeholder,
  disabled = false,
  className = '',
  value,
  defaultValue,
  ...rest
}: SelectProps) {
  const auto = React.useId();
  const fid = id || auto;
  const cls = [
    'cb-control',
    'cb-control--select',
    'cb-control--' + size,
    error && 'cb-control--error',
    disabled && 'cb-control--disabled',
  ]
    .filter(Boolean)
    .join(' ');
  const dv = value === undefined && defaultValue === undefined && placeholder ? '' : defaultValue;
  return (
    <Field
      id={fid}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={className}
    >
      {' '}
      <div className={cls}>
        {' '}
        <select
          id={fid}
          className="cb-control__input"
          disabled={disabled}
          required={required || !!placeholder}
          value={value}
          defaultValue={dv}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fid, hint, error)}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled={true}>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) =>
            typeof o === 'string' ? (
              <option key={o} value={o}>
                {o}
              </option>
            ) : (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ),
          )}
        </select>{' '}
        <Icon name="chevron-down" size={18} className="cb-select__chev" />
      </div>
    </Field>
  );
}
