'use client';

import { Button } from '@choirbook/ui';

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="secondary" iconStart="printer" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
