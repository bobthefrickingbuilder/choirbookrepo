'use client';

import * as React from 'react';
import { ChoirLogo } from '../brand/ChoirLogo';
import { Icon } from '../icons/Icon';
import { MenuItem, Popover } from '../overlays/Popover';

export interface ChoirOption {
  id: string;
  name: string;
  shortName?: string;
  logoSrc?: string | null;
  subtitle?: React.ReactNode;
  /** Value for data-choir, which selects the choir's colour layer. */
  theme?: string;
}

export interface ChoirSwitcherProps {
  choirs?: ChoirOption[];
  currentId?: string;
  onChange?: (id: string) => void;
  label?: string;
  size?: number;
}

export function ChoirSwitcher({
  choirs = [],
  currentId,
  onChange,
  label = 'Switch choir',
  size = 32,
}: ChoirSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const cur = choirs.find((c) => c.id === currentId) || choirs[0];
  if (!cur) return null;
  if (choirs.length < 2)
    return (
      <span className="cb-switcher cb-switcher--static">
        {' '}
        <ChoirLogo
          name={cur.name}
          shortName={cur.shortName}
          logoSrc={cur.logoSrc}
          subtitle={cur.subtitle}
          size={size}
        />
      </span>
    );
  return (
    <span
      className="cb-anchor"
      style={{
        minWidth: 0,
      }}
    >
      {' '}
      <button
        type="button"
        className="cb-switcher"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={cur.name}
      >
        {' '}
        <ChoirLogo
          name={cur.name}
          shortName={cur.shortName}
          logoSrc={cur.logoSrc}
          subtitle={cur.subtitle}
          size={size}
        />{' '}
        <Icon name="chevrons-up-down" size={16} />
      </button>{' '}
      <Popover open={open} onClose={() => setOpen(false)} role="menu" label={label} width={300}>
        {' '}
        <div className="cb-menu-label">{label}</div>{' '}
        <div className="cb-switch-list">
          {choirs.map((c) => (
            <span
              key={c.id}
              data-choir={c.theme || 'choirbook'}
              style={{
                display: 'block',
              }}
            >
              {' '}
              <MenuItem
                checked={c.id === cur.id}
                onClick={() => {
                  setOpen(false);
                  if (onChange) onChange(c.id);
                }}
              >
                {' '}
                <ChoirLogo
                  name={c.name}
                  shortName={c.shortName}
                  logoSrc={c.logoSrc}
                  subtitle={c.subtitle}
                  size={28}
                />
              </MenuItem>
            </span>
          ))}
        </div>
      </Popover>
    </span>
  );
}
