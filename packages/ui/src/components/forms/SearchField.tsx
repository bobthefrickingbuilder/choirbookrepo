'use client';

import * as React from 'react';
import { IconButton } from '../buttons/IconButton';
import { Icon } from '../icons/Icon';

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  clearLabel?: string;
  /** A single key that focuses the field, such as "/". */
  shortcut?: string;
  size?: 'sm' | 'md';
}

export function SearchField({
  value,
  defaultValue = '',
  onChange,
  placeholder = 'Search',
  label = 'Search',
  clearLabel = 'Clear search',
  shortcut,
  size = 'md',
  className = '',
  style,
  ...rest
}: SearchFieldProps) {
  const [inner, setInner] = React.useState(defaultValue);
  const v = value !== undefined ? value : inner;
  const set = (s: string) => {
    setInner(s);
    if (onChange) onChange(s);
  };
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!shortcut) return undefined;
    const k = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target.tagName : '';
      if (e.key === shortcut && t !== 'INPUT' && t !== 'TEXTAREA') {
        e.preventDefault();
        ref.current && ref.current.focus();
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [shortcut]);
  return (
    <div
      className={'cb-control cb-control--' + size + ' ' + className}
      style={{
        paddingRight: v ? 4 : undefined,
        ...style,
      }}
      role="search"
    >
      {' '}
      <Icon name="search" size={size === 'sm' ? 16 : 18} />{' '}
      <input
        ref={ref}
        type="search"
        className="cb-control__input"
        value={v}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && v) set('');
        }}
        {...rest}
      />
      {v ? (
        <IconButton
          icon="x"
          label={clearLabel}
          size="sm"
          onClick={() => {
            set('');
            ref.current && ref.current.focus();
          }}
        />
      ) : shortcut ? (
        <kbd className="cb-kbd" aria-hidden="true">
          {shortcut}
        </kbd>
      ) : null}
    </div>
  );
}
