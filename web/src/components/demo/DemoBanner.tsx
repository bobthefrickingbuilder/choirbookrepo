'use client';

import { Button, Icon, SegmentedControl } from '@choirbook/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { leaveDemo, switchDemoRole } from '@/app/actions/demo';
import type { DemoRole } from '@/lib/demo';

export interface DemoBannerStrings {
  banner: string;
  viewingAs: string;
  asAdmin: string;
  asSectionLeader: string;
  asTreasurer: string;
  tryStaff: string;
  tryChorister: string;
  takeTour: string;
  leave: string;
}

type StaffRole = Exclude<DemoRole, 'chorister'>;

/** The strip above the header in the demo: what this is, role preview, tour, exit. */
export function DemoBanner({ role, s }: { role: DemoRole; s: DemoBannerStrings }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const switchTo = (next: DemoRole) => startTransition(() => switchDemoRole(next));

  return (
    <div className="demo-banner" role="region" aria-label={s.banner} aria-busy={pending || undefined}>
      <span className="demo-banner__label">
        <Icon name="info" size={16} strokeWidth={2} />
        {s.banner}
      </span>
      <div className="demo-banner__actions">
        {role === 'chorister' ? (
          <Button size="sm" variant="secondary" onClick={() => switchTo('administrator')} loading={pending}>
            {s.tryStaff}
          </Button>
        ) : (
          <div className="demo-banner__roles">
            <span className="demo-banner__k">{s.viewingAs}</span>
            <SegmentedControl<StaffRole>
              label={s.viewingAs}
              value={role}
              options={[
                { value: 'administrator', label: s.asAdmin },
                { value: 'section_leader', label: s.asSectionLeader },
                { value: 'treasurer', label: s.asTreasurer },
              ]}
              onChange={switchTo}
            />
            <Button size="sm" variant="ghost" onClick={() => switchTo('chorister')} disabled={pending}>
              {s.tryChorister}
            </Button>
          </div>
        )}
        <Button size="sm" variant="ghost" iconStart="circle-help" onClick={() => router.push(`${pathname}?tour=1` as never)}>
          {s.takeTour}
        </Button>
        <Button size="sm" variant="ghost" iconStart="log-out" onClick={() => startTransition(() => leaveDemo())}>
          {s.leave}
        </Button>
      </div>
    </div>
  );
}
