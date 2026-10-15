import * as React from 'react';
import type { Lang } from '../../types';
import { Wordmark } from './Wordmark';

export interface PoweredByProps extends React.HTMLAttributes<HTMLElement> {
  href?: string;
  lang?: Lang;
}

export function PoweredBy({ href, lang = 'en', className = '', ...rest }: PoweredByProps) {
  const text = lang === 'fr' ? 'Propulsé par' : 'Powered by';
  const inner = (
    <>
      {' '}
      <span>{text}</span> <Wordmark size="xs" />
    </>
  );
  if (href)
    return (
      <a href={href} className={'cb-powered ' + className} {...rest}>
        {inner}
      </a>
    );
  return (
    <span className={'cb-powered ' + className} {...rest}>
      {inner}
    </span>
  );
}
