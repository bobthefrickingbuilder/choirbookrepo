import * as React from 'react';

export interface ChoirLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  shortName?: string;
  logoSrc?: string | null;
  subtitle?: React.ReactNode;
  size?: number;
  hideName?: boolean;
}

export function ChoirLogo({
  name,
  shortName,
  logoSrc,
  subtitle,
  size = 32,
  hideName = false,
  className = '',
  ...rest
}: ChoirLogoProps) {
  const mono =
    shortName ||
    (name || '')
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase();
  const fs = Math.max(9, Math.round(size * (mono.length > 3 ? 0.3 : 0.36)));
  return (
    <span className={'cb-choir ' + className} {...rest}>
      {' '}
      <span
        className="cb-choir__tile"
        style={{
          width: size,
          height: size,
          fontSize: fs,
        }}
        aria-hidden={!hideName || undefined}
        role={hideName ? 'img' : undefined}
        aria-label={hideName ? name : undefined}
      >
        {logoSrc ? <img src={logoSrc} alt="" /> : mono}
      </span>
      {!hideName && (
        <span className="cb-choir__text">
          {' '}
          <span className="cb-choir__name">{name}</span>
          {subtitle ? <span className="cb-choir__sub">{subtitle}</span> : null}
        </span>
      )}
    </span>
  );
}
