'use client';

import * as React from 'react';
import { Field } from './Field';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: boolean;
}

export interface RadioOption<V extends string = string> {
  value: V;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<V extends string = string> {
  name?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  options?: RadioOption<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  orientation?: 'column' | 'row';
  disabled?: boolean;
  className?: string;
}

export function Radio({ label, description, disabled = false, error = false, className = '', ...rest }: RadioProps) {
  const cls = ['cb-check', error && 'cb-check--error', disabled && 'cb-check--disabled', className]
    .filter(Boolean)
    .join(' ');
  return (
    <label className={cls}>
      {' '}
      <input type="radio" className="cb-check__input" disabled={disabled} {...rest} />{' '}
      <span className="cb-check__box cb-check__box--radio" aria-hidden="true" />{' '}
      <span className="cb-check__text">
        {' '}
        <span>{label}</span>
        {description ? <span className="cb-check__desc">{description}</span> : null}
      </span>
    </label>
  );
}
export function RadioGroup<V extends string = string>({
  name,
  label,
  hint,
  error,
  required,
  options = [],
  value,
  defaultValue,
  onChange,
  orientation = 'column',
  disabled = false,
  className = '',
}: RadioGroupProps<V>) {
  const auto = React.useId();
  const gname = name || auto;
  const [inner, setInner] = React.useState<V | undefined>(defaultValue);
  const current = value !== undefined ? value : inner;
  return (
    <Field
      as="fieldset"
      id={gname}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {' '}
      <div className={'cb-radios' + (orientation === 'row' ? ' cb-radios--row' : '')} role="radiogroup">
        {options.map((o) => (
          <Radio
            key={o.value}
            name={gname}
            value={o.value}
            label={o.label}
            description={o.description}
            checked={current === o.value}
            disabled={disabled || o.disabled}
            error={!!error}
            onChange={() => {
              setInner(o.value);
              if (onChange) onChange(o.value);
            }}
          />
        ))}
      </div>
    </Field>
  );
}
