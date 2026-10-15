'use client';

import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';

export interface SegmentedOption<V extends string = string> {
  value: V;
  label: React.ReactNode;
  icon?: IconName;
}

export interface SegmentedControlProps<V extends string = string> {
  options?: SegmentedOption<V>[];
  value?: V;
  onChange?: (value: V) => void;
  label?: string;
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<V extends string = string>({
  options = [],
  value,
  onChange,
  label,
  fullWidth = false,
  className = '',
}: SegmentedControlProps<V>) {
  return (
    <div
      className={'cb-seg' + (fullWidth ? ' cb-seg--full' : '') + ' ' + className}
      role="group"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="cb-seg__btn"
          aria-pressed={o.value === value}
          onClick={() => onChange && onChange(o.value)}
        >
          {o.icon ? <Icon name={o.icon} size={16} /> : null} <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
