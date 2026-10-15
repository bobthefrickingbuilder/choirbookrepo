import * as React from 'react';
import { Icon } from '../icons/Icon';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  lines?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = 14,
  radius,
  circle = false,
  lines = 1,
  className = '',
  style,
}: SkeletonProps) {
  if (lines > 1) {
    return (
      <span
        className={'cb-skel-lines ' + className}
        aria-hidden="true"
        style={{
          width,
        }}
      >
        {Array.from(
          {
            length: lines,
          },
          (_, i) => (
            <span
              key={i}
              className="cb-skel"
              style={{
                height,
                width: i === lines - 1 ? '62%' : '100%',
                borderRadius: radius,
              }}
            />
          ),
        )}
      </span>
    );
  }
  return (
    <span
      className={'cb-skel ' + className}
      aria-hidden="true"
      style={{
        width: circle ? height : width,
        height,
        borderRadius: circle ? '50%' : radius,
        ...style,
      }}
    />
  );
}
export function Spinner({
  size = 20,
  label = 'Loading…',
  showLabel = true,
  block = false,
  className = '',
}: {
  size?: number;
  label?: string;
  showLabel?: boolean;
  block?: boolean;
  className?: string;
}) {
  return (
    <span className={'cb-spinner' + (block ? ' cb-spinner--block' : '') + ' ' + className} role="status">
      {' '}
      <Icon name="loader-circle" size={size} className="cb-spin" strokeWidth={2} />{' '}
      <span className={showLabel ? '' : 'cb-sr-only'}>{label}</span>
    </span>
  );
}
