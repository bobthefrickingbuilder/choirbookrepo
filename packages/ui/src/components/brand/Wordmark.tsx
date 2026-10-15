import * as React from 'react';

export type BrandTone = 'default' | 'inverse' | 'mono';

export interface WordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: BrandTone;
}

export function Wordmark({ size = 'md', tone = 'default', className = '', ...rest }: WordmarkProps) {
  const cls = ['cb-wordmark', 'cb-wordmark--' + size, tone !== 'default' && 'cb-wordmark--' + tone, className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} role="img" aria-label="Choirbook" {...rest}>
      {' '}
      <span className="cb-wordmark__c" aria-hidden="true">
        C
      </span>{' '}
      <span aria-hidden="true">hoirbook</span>
    </span>
  );
}
export interface BrandMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  tone?: BrandTone;
}

export function BrandMark({ size = 32, tone = 'default', className = '', ...rest }: BrandMarkProps) {
  const cls = ['cb-mark', tone !== 'default' && 'cb-mark--' + tone, className].filter(Boolean).join(' ');
  return (
    <span
      className={cls}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.78),
      }}
      role="img"
      aria-label="Choirbook"
      {...rest}
    >
      {' '}
      <span aria-hidden="true">C</span>
    </span>
  );
}
