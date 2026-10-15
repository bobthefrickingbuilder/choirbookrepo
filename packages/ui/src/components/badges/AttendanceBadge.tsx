import * as React from 'react';
import type { Lang } from '../../types';
import type { IconName } from '../icons/Icon';
import { Badge, type BadgeProps, type BadgeTone } from './Badge';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'unmarked';

export const ATTENDANCE: Record<
  AttendanceStatus,
  { tone: BadgeTone; icon: IconName; key: string; en: string; fr: string }
> = {
  present: {
    tone: 'success',
    icon: 'check',
    key: 'P',
    en: 'Present',
    fr: 'Présent',
  },
  late: {
    tone: 'warning',
    icon: 'clock',
    key: 'L',
    en: 'Late',
    fr: 'En retard',
  },
  absent: {
    tone: 'error',
    icon: 'x',
    key: 'A',
    en: 'Absent',
    fr: 'Absent',
  },
  excused: {
    tone: 'slate',
    icon: 'circle-minus',
    key: 'E',
    en: 'Excused',
    fr: 'Motivé',
  },
  unmarked: {
    tone: 'unmarked',
    icon: 'circle',
    key: '–',
    en: 'Not marked',
    fr: 'Non noté',
  },
};
export function AttendanceBadge({
  status = 'unmarked',
  lang = 'en',
  solid = false,
  size,
  children,
}: {
  status?: AttendanceStatus;
  lang?: Lang;
  solid?: boolean;
  size?: BadgeProps['size'];
  children?: React.ReactNode;
}) {
  const s = ATTENDANCE[status] || ATTENDANCE.unmarked;
  return (
    <Badge tone={s.tone} solid={solid && status !== 'unmarked'} icon={s.icon} size={size}>
      {children || s[lang] || s.en}
    </Badge>
  );
}
