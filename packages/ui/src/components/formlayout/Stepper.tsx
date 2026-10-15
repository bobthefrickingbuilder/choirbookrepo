import * as React from 'react';
import { Icon } from '../icons/Icon';

import type { Lang } from '../../types';

export interface StepperStep {
  label: React.ReactNode;
  description?: React.ReactNode;
}

export interface StepperProps {
  steps?: StepperStep[];
  /** Zero-based index of the current step. */
  current?: number;
  /** Lets people go back to a completed step. */
  onStepClick?: (index: number) => void;
  lang?: Lang;
  label?: string;
  className?: string;
}

export function Stepper({ steps = [], current = 0, onStepClick, lang = 'en', label, className = '' }: StepperProps) {
  const fr = lang === 'fr';
  const L = fr
    ? {
        done: 'Terminé : ',
        cur: 'Étape actuelle : ',
        of: (a: number, b: number) => 'Étape ' + a + ' sur ' + b,
        label: 'Progression',
      }
    : {
        done: 'Completed: ',
        cur: 'Current step: ',
        of: (a: number, b: number) => 'Step ' + a + ' of ' + b,
        label: 'Progress',
      };
  return (
    <nav aria-label={label || L.label} className={className}>
      {' '}
      <ol className="cb-stepper">
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          const clickable = !!onStepClick && i < current;
          const Tag = clickable ? 'button' : 'div';
          return (
            <li
              key={i}
              className={'cb-step cb-step--' + state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {' '}
              <Tag
                className="cb-step__btn"
                type={clickable ? 'button' : undefined}
                onClick={clickable ? () => onStepClick?.(i) : undefined}
              >
                {' '}
                <span className="cb-step__marker" aria-hidden="true">
                  {state === 'done' ? <Icon name="check" size={15} strokeWidth={3} /> : i + 1}
                </span>{' '}
                <span>
                  {' '}
                  <span className="cb-sr-only">
                    {state === 'done' ? L.done : state === 'current' ? L.cur : ''}
                  </span>{' '}
                  <span className="cb-step__label">{s.label}</span>
                  {s.description ? (
                    <span
                      className="cb-step__desc"
                      style={{
                        display: 'block',
                      }}
                    >
                      {s.description}
                    </span>
                  ) : null}
                </span>
              </Tag>
            </li>
          );
        })}
      </ol>{' '}
      <div className="cb-stepper-compact" aria-hidden="true">
        {' '}
        <div className="cb-stepper-compact__t">
          {' '}
          <span>{L.of(current + 1, steps.length)}</span> <span>{steps[current]?.label}</span>
        </div>{' '}
        <div className="cb-progress">
          {' '}
          <div
            className="cb-progress__bar"
            style={{
              width: ((current + 1) / steps.length) * 100 + '%',
            }}
          />
        </div>
      </div>
    </nav>
  );
}
