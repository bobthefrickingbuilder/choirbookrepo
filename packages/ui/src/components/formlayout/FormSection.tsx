import * as React from 'react';

export interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function FormSection({ title, description, className = '', children }: FormSectionProps) {
  return (
    <section className={'cb-fsec ' + className}>
      {' '}
      <div className="cb-fsec__grid">
        {' '}
        <div>
          {title ? <h2 className="cb-fsec__title">{title}</h2> : null}
          {description ? <p className="cb-fsec__desc">{description}</p> : null}
        </div>{' '}
        <div className="cb-fsec__fields">{children}</div>
      </div>
    </section>
  );
}
export function FormRow({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <div className={'cb-form-row ' + className}>{children}</div>;
}
export function FormActions({
  start,
  children,
  className = '',
}: {
  start?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={'cb-form-actions ' + className}>
      {start ? <div>{start}</div> : null} <div className="cb-form-actions__end">{children}</div>
    </div>
  );
}
