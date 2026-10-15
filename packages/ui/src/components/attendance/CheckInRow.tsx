'use client';

import * as React from 'react';
import type { Lang } from '../../types';
import { ATTENDANCE, type AttendanceStatus } from '../badges/AttendanceBadge';
import { VoicePartBadge } from '../badges/VoicePartBadge';
import { Icon, type IconName } from '../icons/Icon';
import { Avatar } from '../people/Avatar';

const ORDER = ['present', 'late', 'absent', 'excused'] as const satisfies readonly AttendanceStatus[];

export interface CheckInRowProps {
  name: string;
  part?: string | null;
  avatarSrc?: string | null;
  detail?: React.ReactNode;
  note?: React.ReactNode;
  noteIcon?: IconName;
  status?: AttendanceStatus;
  /** Clicking the current status again clears it back to "unmarked". */
  onChange?: (status: AttendanceStatus) => void;
  lang?: Lang;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CheckInRow({
  name,
  part,
  avatarSrc,
  detail,
  note,
  noteIcon = 'message-square',
  status = 'unmarked',
  onChange,
  lang = 'en',
  compact = false,
  disabled = false,
  className = '',
}: CheckInRowProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const set = (s: AttendanceStatus) => {
    if (onChange) onChange(s === status ? 'unmarked' : s);
  };
  const idx = (ORDER as readonly AttendanceStatus[]).indexOf(status);
  const focusIdx = idx > -1 ? idx : 0;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + ORDER.length) % ORDER.length;
    refs.current[n]?.focus();
    const next = ORDER[n];
    if (onChange && next) onChange(next);
  };
  return (
    <div className={'cb-checkin' + (compact ? ' cb-checkin--compact' : '') + ' ' + className}>
      {' '}
      <Avatar name={name} src={avatarSrc} size={compact ? 40 : 48} />{' '}
      <div
        style={{
          minWidth: 0,
        }}
      >
        {' '}
        <div className="cb-checkin__name">{name}</div>{' '}
        <div className="cb-checkin__sub">
          {part ? <VoicePartBadge part={part} lang={lang} /> : null}
          {detail ? <span>{detail}</span> : null}
          {note ? (
            <span className="cb-checkin__note">
              {' '}
              <Icon name={noteIcon} size={14} />
              {note}
            </span>
          ) : null}
        </div>
      </div>{' '}
      <div
        className="cb-checkin__opts"
        role="radiogroup"
        aria-label={(lang === 'fr' ? 'Présence de ' : 'Attendance for ') + name}
      >
        {ORDER.map((s, i) => {
          const m = ATTENDANCE[s];
          const on = status === s;
          return (
            <button
              key={s}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={i === focusIdx ? 0 : -1}
              className={'cb-ci cb-ci--' + s}
              disabled={disabled}
              onClick={() => set(s)}
              onKeyDown={(e) => onKey(e, i)}
              aria-label={compact ? m[lang] : undefined}
            >
              {' '}
              <Icon name={m.icon} size={compact ? 20 : 22} strokeWidth={on ? 2.5 : 2} />{' '}
              <span className="cb-ci__label">{compact ? m.key : m[lang]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
