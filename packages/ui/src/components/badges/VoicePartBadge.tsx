import * as React from 'react';

import type { Bilingual, Lang } from '../../types';

export type VoiceSection = 'S' | 'A' | 'T' | 'B';

export const VOICE_PARTS: Record<VoiceSection, Bilingual> = {
  S: {
    en: 'Soprano',
    fr: 'Soprano',
  },
  A: {
    en: 'Alto',
    fr: 'Alto',
  },
  T: {
    en: 'Tenor',
    fr: 'Ténor',
  },
  B: {
    en: 'Bass',
    fr: 'Basse',
  },
};
export interface VoicePartBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Section letter, optionally with a division number: "S", "A2", "B1". */
  part?: string;
  showLabel?: boolean;
  variant?: 'tile' | 'pill';
  size?: 'sm' | 'lg';
  lang?: Lang;
}

export function VoicePartBadge({
  part = 'S',
  showLabel = false,
  variant = 'tile',
  size = 'sm',
  lang = 'en',
  className = '',
  ...rest
}: VoicePartBadgeProps) {
  const key = String(part).charAt(0).toUpperCase();
  const div = String(part).slice(1);
  const p = VOICE_PARTS[key as VoiceSection] ?? VOICE_PARTS.S;
  const name = (p[lang] || p.en) + (div ? ' ' + div : '');
  const cls = [
    'cb-voice',
    'cb-voice--' + key.toLowerCase(),
    variant === 'pill' && 'cb-voice--pill',
    size === 'lg' && 'cb-voice--lg',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} title={name} {...rest}>
      {' '}
      <span
        className="cb-voice__tile"
        aria-hidden={showLabel || variant === 'pill' ? 'true' : undefined}
        role={showLabel || variant === 'pill' ? undefined : 'img'}
        aria-label={showLabel || variant === 'pill' ? undefined : name}
      >
        {key}
        {div}
      </span>
      {showLabel || variant === 'pill' ? <span>{name}</span> : null}
    </span>
  );
}
