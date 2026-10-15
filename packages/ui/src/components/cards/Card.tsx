import * as React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  action?: React.ReactNode;
  flat?: boolean;
  interactive?: boolean;
  padded?: boolean;
  as?: 'section' | 'div' | 'article' | 'li' | 'aside';
}

export function Card({
  title,
  action,
  flat = false,
  interactive = false,
  padded = true,
  as = 'section',
  className = '',
  children,
  ...rest
}: CardProps) {
  const Tag = as;
  const cls = ['cb-card', flat && 'cb-card--flat', interactive && 'cb-card--interactive', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={cls} {...rest}>
      {title || action ? (
        <div className="cb-card__head">
          {title ? (
            <h3 className="cb-card__title">{title}</h3>
          ) : (
            <span
              style={{
                flex: 1,
              }}
            />
          )}
          {action}
        </div>
      ) : null}
      {padded ? <div className="cb-card__body">{children}</div> : children}
    </Tag>
  );
}
