import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  /** Photo URL. Only pass one when the member has consented to showing their photo. */
  src?: string | null;
  size?: number;
  square?: boolean;
}

export function Avatar({ name = '', src, size = 32, square = false, className = '', ...rest }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={'cb-avatar' + (square ? ' cb-avatar--square' : '') + ' ' + className}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
      }}
      role="img"
      aria-label={name}
      {...rest}
    >
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initials}</span>}
    </span>
  );
}
