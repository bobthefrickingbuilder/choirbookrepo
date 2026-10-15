import * as React from 'react';
import { Icon } from '../icons/Icon';

export interface FieldProps {
  id?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  requiredText?: string;
  as?: 'div' | 'fieldset';
  className?: string;
  children?: React.ReactNode;
}

export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  optional = false,
  optionalText = 'optional',
  requiredText = 'required',
  as = 'div',
  className = '',
  children,
}: FieldProps) {
  const Tag = as;
  const LabelTag = as === 'fieldset' ? 'legend' : 'label';
  return (
    <Tag className={'cb-field ' + className}>
      {label ? (
        <LabelTag className="cb-label" htmlFor={LabelTag === 'label' ? id : undefined}>
          {' '}
          <span>{label}</span>
          {required ? (
            <>
              {' '}
              <span className="cb-label__req" aria-hidden="true">
                *
              </span>{' '}
              <span className="cb-sr-only">({requiredText})</span>
            </>
          ) : null}
          {optional && !required ? <span className="cb-label__opt">({optionalText})</span> : null}
        </LabelTag>
      ) : null}
      {hint ? (
        <p className="cb-hint" id={id ? id + '-hint' : undefined}>
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="cb-errmsg" id={id ? id + '-err' : undefined}>
          {' '}
          <Icon name="circle-alert" size={16} strokeWidth={2} /> <span>{error}</span>
        </p>
      ) : null}
    </Tag>
  );
}
export function describedBy(id: string, hint?: React.ReactNode, error?: React.ReactNode): string | undefined {
  return [hint && id + '-hint', error && id + '-err'].filter(Boolean).join(' ') || undefined;
}
