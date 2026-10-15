import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';

export interface ChipProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
  selected?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Makes a removable (static) chip with an × button. */
  onRemove?: () => void;
  removeLabel?: string;
  icon?: IconName;
  count?: number | null;
  disabled?: boolean;
}

export function Chip({
  selected,
  onClick,
  onRemove,
  removeLabel = 'Remove',
  icon,
  count,
  disabled = false,
  className = '',
  children,
  ...rest
}: ChipProps) {
  if (onRemove) {
    return (
      <span className={'cb-chip cb-chip--static ' + className} {...rest}>
        {icon ? <Icon name={icon} size={15} /> : null} <span>{children}</span>{' '}
        <button
          type="button"
          className="cb-chip__remove"
          aria-label={removeLabel + ' ' + (typeof children === 'string' ? children : '')}
          onClick={onRemove}
        >
          {' '}
          <Icon name="x" size={14} strokeWidth={2.25} />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={'cb-chip ' + className}
      aria-pressed={!!selected}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {selected ? (
        <Icon name="check" size={15} strokeWidth={2.25} />
      ) : icon ? (
        <Icon name={icon} size={15} />
      ) : null}{' '}
      <span>{children}</span>
      {count != null ? <span className="cb-chip__count">{count}</span> : null}
    </button>
  );
}
