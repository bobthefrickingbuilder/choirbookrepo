'use client';

import { SegmentedControl } from '@choirbook/ui';
import { useState, useTransition } from 'react';
import { setTheme } from '@/app/actions/auth';

type Theme = 'auto' | 'light' | 'dark';

export function ThemeSwitch({ value, label, labels }: { value: Theme; label: string; labels: Record<Theme, string> }) {
  const [current, setCurrent] = useState<Theme>(value);
  const [, startTransition] = useTransition();
  return (
    <SegmentedControl<Theme>
      fullWidth
      label={label}
      value={current}
      options={[
        { value: 'auto', label: labels.auto, icon: 'sliders-horizontal' },
        { value: 'light', label: labels.light, icon: 'sun' },
        { value: 'dark', label: labels.dark, icon: 'moon' },
      ]}
      onChange={(next) => {
        const root = document.documentElement;
        root.dataset.theme = next;
        root.dataset.mode =
          next === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next;
        setCurrent(next);
        startTransition(() => setTheme(next));
      }}
    />
  );
}
