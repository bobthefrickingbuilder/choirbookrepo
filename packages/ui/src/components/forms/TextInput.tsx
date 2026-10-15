'use client';

import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';
import { Field, describedBy } from './Field';

type NativeInput = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'prefix' | keyof React.InputHTMLAttributes<HTMLInputElement>>;

export interface TextInputProps extends NativeInput {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  size?: 'sm' | 'md' | 'lg';
  iconStart?: IconName;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  trailing?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
}

export function TextInput({
  id,
  label,
  hint,
  error,
  required,
  optional,
  size = 'md',
  iconStart,
  prefix,
  suffix,
  trailing,
  multiline = false,
  rows = 4,
  disabled = false,
  className = '',
  style,
  ...rest
}: TextInputProps) {
  const auto = React.useId();
  const fid = id || auto;
  const cls = [
    'cb-control',
    'cb-control--' + size,
    multiline && 'cb-control--textarea',
    error && 'cb-control--error',
    disabled && 'cb-control--disabled',
  ]
    .filter(Boolean)
    .join(' ');
  const common = {
    id: fid,
    className: 'cb-control__input',
    disabled,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy(fid, hint, error),
    ...rest,
  };
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
      <div className={cls} style={style}>
        {iconStart ? <Icon name={iconStart} size={18} /> : null}
        {prefix ? <span className="cb-control__affix">{prefix}</span> : null}
        {multiline ? (
          <textarea rows={rows} {...(common as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
        ) : (
          <input {...common} />
        )}
        {suffix ? <span className="cb-control__affix">{suffix}</span> : null}
        {trailing ? <span className="cb-control__trail">{trailing}</span> : null}
      </div>
    </Field>
  );
}
