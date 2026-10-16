'use client';

import { Checkbox } from '@choirbook/ui';
import { useOptimistic, useTransition } from 'react';
import { setPracticeDone } from '@/app/actions/member';

export function PracticeDone({ slug, assignmentId, done, label }: { slug: string; assignmentId: string; done: boolean; label: string }) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, startTransition] = useTransition();
  return (
    <Checkbox
      label={label}
      checked={optimistic}
      onChange={(e) => {
        const next = e.target.checked;
        startTransition(async () => {
          setOptimistic(next);
          await setPracticeDone(slug, assignmentId, next);
        });
      }}
    />
  );
}
