'use client';

import * as React from 'react';
import { Icon } from '../icons/Icon';
import { Popover } from '../overlays/Popover';
import { Field, describedBy } from './Field';

const toMin = (s: string) => {
  const [h = 0, m = 0] = s.split(':').map(Number);
  return h * 60 + m;
};
const toHM = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
function parse(text: string): string | null {
  const m = String(text)
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?:[:h.]?(\d{2}))?\s*([ap])?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = +(m[2] || 0);
  if (m[3] === 'p' && h < 12) h += 12;
  if (m[3] === 'a' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return toHM(h * 60 + min);
}
export interface TimePickerProps {
  id?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  /** Controlled value, 24-hour HH:MM. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  locale?: string;
  /** Minutes between options. */
  step?: number;
  minTime?: string;
  maxTime?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({
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
  step = 15,
  minTime = '06:00',
  maxTime = '22:00',
  placeholder,
  disabled = false,
  className = '',
}: TimePickerProps) {
  const auto = React.useId();
  const fid = id || auto;
  const [inner, setInner] = React.useState(defaultValue || '');
  const v = value !== undefined ? value : inner;
  const fmt = (hm: string) => {
    if (!hm) return '';
    const [h = 0, mi = 0] = hm.split(':').map(Number);
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(2026, 0, 1, h, mi));
  };
  const [text, setText] = React.useState(fmt(v));
  const [open, setOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setText(fmt(v));
    // fmt only depends on locale, which is already listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, locale]);
  React.useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
      if (el) listRef.current.scrollTop = el.offsetTop - 96;
    }
  }, [open]);
  const commit = (hm: string) => {
    setInner(hm);
    if (onChange) onChange(hm);
    setText(fmt(hm));
  };
  const opts: string[] = [];
  for (let m = toMin(minTime); m <= toMin(maxTime); m += step) opts.push(toHM(m));
  const cls = ['cb-control', error && 'cb-control--error', disabled && 'cb-control--disabled']
    .filter(Boolean)
    .join(' ');
  const fr = locale.indexOf('fr') === 0;
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
          }}
        >
          {' '}
          <Icon name="clock" size={18} />{' '}
          <input
            id={fid}
            className="cb-control__input"
            value={text}
            placeholder={placeholder || (fr ? 'hh:mm' : 'e.g. 6:30 pm')}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              const p = parse(text);
              if (p) commit(p);
              else setText(fmt(v));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const p = parse(text);
                if (p) commit(p);
                setOpen(false);
              }
            }}
            role="combobox"
            aria-expanded={open}
            aria-controls={fid + '-list'}
            aria-autocomplete="list"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(fid, hint, error)}
          />
        </div>{' '}
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          role="listbox"
          label={label ? String(label) : 'Time'}
        >
          {' '}
          <div ref={listRef} id={fid + '-list'} className="cb-tp">
            {opts.map((hm) => (
              <button
                key={hm}
                type="button"
                role="option"
                aria-selected={hm === v}
                className="cb-menu-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  commit(hm);
                  setOpen(false);
                }}
              >
                {' '}
                <span className="cb-menu-item__label">{fmt(hm)}</span>
                {hm === v ? <Icon name="check" size={16} strokeWidth={2.25} /> : null}
              </button>
            ))}
          </div>
        </Popover>
      </div>
    </Field>
  );
}
