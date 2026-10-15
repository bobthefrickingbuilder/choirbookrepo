import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  icon?: IconName;
  delta?: React.ReactNode;
  trend?: 'up' | 'down' | 'flat';
  /** Whether the change is good news. Leave undefined for neutral. */
  good?: boolean;
  context?: React.ReactNode;
  /** 0 to 1. */
  progress?: number | null;
  progressLabel?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  icon,
  delta,
  trend = 'flat',
  good,
  context,
  progress,
  progressLabel,
  className = '',
}: StatCardProps) {
  const tone = good === undefined ? 'flat' : good ? 'good' : 'bad';
  const arrow: IconName =trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'minus';
  return (
    <section className={'cb-card cb-statc ' + className}>
      {' '}
      <div className="cb-statc__label">
        {icon ? <Icon name={icon} size={16} /> : null}
        {label}
      </div>{' '}
      <div className="cb-statc__value">
        {value}
        {unit ? <span className="cb-statc__unit">{unit}</span> : null}
      </div>
      {progress != null ? (
        <div
          className="cb-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label={progressLabel || label}
        >
          {' '}
          <div
            className="cb-progress__bar"
            style={{
              width: Math.round(progress * 100) + '%',
            }}
          />
        </div>
      ) : null}
      {delta || context ? (
        <div className={'cb-statc__delta cb-statc__delta--' + tone}>
          {delta ? (
            <>
              {' '}
              <Icon name={arrow} size={14} strokeWidth={2.25} /> <span>{delta}</span>
            </>
          ) : null}
          {context ? <span className="cb-statc__ctx">{context}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
