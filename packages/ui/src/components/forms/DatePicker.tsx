'use client';

import * as React from 'react';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';
import { Icon } from '../icons/Icon';
import { Popover } from '../overlays/Popover';
import { Field, describedBy } from './Field';

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fromISO = (s: string): Date | null => {
  if (!s) return null;
  const [y = 1970, m = 1, d = 1] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export interface DatePickerProps {
  id?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  /** Controlled value, YYYY-MM-DD ('' for none). */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  locale?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  weekStartsOn?: number;
  className?: string;
}

export function DatePicker({
  id,
  label,
  hint,
  error,
  required,
  optional,
  value,
  defaultValue,
  onChange,
  locale = 'en-CA',
  min,
  max,
  placeholder,
  disabled = false,
  weekStartsOn = 0,
  className = '',
}: DatePickerProps) {
  const auto = React.useId();
  const fid = id || auto;
  const fr = locale.indexOf('fr') === 0;
  const [inner, setInner] = React.useState(defaultValue || '');
  const v = value !== undefined ? value : inner;
  const sel = fromISO(v);
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => {
    const b = sel || new Date();
    return new Date(b.getFullYear(), b.getMonth(), 1);
  });
  React.useEffect(() => {
    if (open && sel) setView(new Date(sel.getFullYear(), sel.getMonth(), 1));
    // Only re-centre when the popover opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const pick = (d: Date) => {
    const iso = toISO(d);
    setInner(iso);
    if (onChange) onChange(iso);
    setOpen(false);
  };
  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const title = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(view);
  const dowFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
  });
  const dows = Array.from(
    {
      length: 7,
    },
    (_, i) => dowFmt.format(new Date(2026, 1, 1 + ((i + weekStartsOn) % 7))).replace('.', ''),
  );
  const offset = (view.getDay() - weekStartsOn + 7) % 7;
  const today = toISO(new Date());
  const cells = Array.from(
    {
      length: 42,
    },
    (_, i) => new Date(view.getFullYear(), view.getMonth(), 1 - offset + i),
  );
  const cls = ['cb-control', error && 'cb-control--error', disabled && 'cb-control--disabled']
    .filter(Boolean)
    .join(' ');
  const t = fr
    ? {
        prev: 'Mois précédent',
        next: 'Mois suivant',
        open: 'Choisir une date',
        today: 'Aujourd’hui',
        clear: 'Effacer',
      }
    : {
        prev: 'Previous month',
        next: 'Next month',
        open: 'Choose date',
        today: 'Today',
        clear: 'Clear',
      };
  return (
    <Field
      id={fid}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={className}
    >
      {' '}
      <div
        className="cb-anchor"
        style={{
          display: 'flex',
        }}
      >
        {' '}
        <div
          className={cls}
          style={{
            flex: 1,
            paddingRight: 4,
          }}
        >
          {' '}
          <Icon name="calendar" size={18} />{' '}
          <input
            id={fid}
            className="cb-control__input"
            readOnly={true}
            value={sel ? fmt.format(sel) : ''}
            placeholder={placeholder || (fr ? 'jj mmm aaaa' : 'Select a date')}
            onClick={() => !disabled && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
              }
            }}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(fid, hint, error)}
          />{' '}
          <IconButton
            icon="chevron-down"
            label={t.open}
            size="sm"
            onClick={() => setOpen((o) => !o)}
            disabled={disabled}
          />
        </div>{' '}
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          label={label ? String(label) : t.open}
          className="cb-dp"
        >
          {' '}
          <div className="cb-dp__head">
            {' '}
            <IconButton
              icon="chevron-left"
              label={t.prev}
              size="sm"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            />{' '}
            <span className="cb-dp__title" aria-live="polite">
              {title}
            </span>{' '}
            <IconButton
              icon="chevron-right"
              label={t.next}
              size="sm"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            />
          </div>{' '}
          <div className="cb-dp__grid" role="grid">
            {dows.map((d, i) => (
              <span key={'d' + i} className="cb-dp__dow" role="columnheader">
                {d}
              </span>
            ))}
            {cells.map((d) => {
              const iso = toISO(d);
              const out = d.getMonth() !== view.getMonth();
              const dis = (!!min && iso < min) || (!!max && iso > max);
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  className={'cb-dp__day' + (out ? ' is-outside' : '') + (iso === today ? ' is-today' : '')}
                  aria-selected={iso === v}
                  disabled={dis}
                  onClick={() => pick(d)}
                  aria-label={new Intl.DateTimeFormat(locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }).format(d)}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>{' '}
          <div className="cb-dp__foot">
            {' '}
            <Button variant="ghost" size="sm" onClick={() => pick(new Date())}>
              {t.today}
            </Button>
            {v ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInner('');
                  if (onChange) onChange('');
                  setOpen(false);
                }}
              >
                {t.clear}
              </Button>
            ) : null}
          </div>
        </Popover>
      </div>
    </Field>
  );
}
