'use client';

import { format } from '@choirbook/shared/i18n';
import { Button, IconButton } from '@choirbook/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export interface TourStep {
  title: string;
  body: string;
  /** A link href or CSS selector for the thing this step points at (null for none). */
  target: string | null;
}

export interface TourStrings {
  step: string;
  next: string;
  back: string;
  skip: string;
  done: string;
}

function findTarget(target: string): HTMLElement | null {
  const candidates = target.startsWith('/')
    ? document.querySelectorAll<HTMLElement>(`a[href="${target}"]`)
    : document.querySelectorAll<HTMLElement>(target);
  // The first one that is actually on screen (sidebar on laptops, bottom bar on phones).
  return [...candidates].find((el) => el.getClientRects().length > 0) ?? null;
}

/** A short, skippable tour. Opens when the URL has ?tour=1. */
export function GuidedTour({ steps, s }: { steps: TourStep[]; s: TourStrings }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = params.get('tour') === '1';
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[Math.min(index, steps.length - 1)];

  const close = () => {
    setIndex(0);
    router.replace(pathname as never, { scroll: false });
  };

  // Outline the element the current step talks about.
  useEffect(() => {
    if (!open || !step?.target) return;
    const el = findTarget(step.target);
    if (!el) return;
    el.classList.add('tour-target');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return () => el.classList.remove('tour-target');
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIndex(0);
        router.replace(pathname as never, { scroll: false });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, index, pathname, router]);

  if (!open || !step) return null;
  const last = index === steps.length - 1;

  return (
    <div ref={cardRef} className="tour" role="dialog" aria-modal="false" aria-labelledby="tour-title" tabIndex={-1}>
      <div className="tour__head">
        <span className="overline">{format(s.step, { n: index + 1, total: steps.length })}</span>
        <IconButton icon="x" label={s.skip} size="sm" onClick={close} />
      </div>
      <h2 id="tour-title" className="tour__title">
        {step.title}
      </h2>
      <p className="tour__body" aria-live="polite">
        {step.body}
      </p>
      <div className="tour__progress" aria-hidden="true">
        {steps.map((_, i) => (
          <span key={i} className={i === index ? 'is-on' : undefined} />
        ))}
      </div>
      <div className="tour__actions">
        {index > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setIndex(index - 1)}>
            {s.back}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={close}>
            {s.skip}
          </Button>
        )}
        <Button size="sm" iconEnd={last ? undefined : 'arrow-right'} onClick={() => (last ? close() : setIndex(index + 1))}>
          {last ? s.done : s.next}
        </Button>
      </div>
    </div>
  );
}
