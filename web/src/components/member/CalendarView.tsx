'use client';

import { AgendaList, MonthCalendar, SegmentedControl, type CalendarEvent } from '@choirbook/ui';
import { usePathname, useRouter } from 'next/navigation';

type View = 'list' | 'month';

/** Season calendar as an agenda list or a month grid. The choice lives in the URL (?view=). */
export function CalendarView({
  slug,
  events,
  today,
  locale,
  view,
  labels,
}: {
  slug: string;
  events: CalendarEvent[];
  today: string;
  locale: string;
  view: View;
  labels: { list: string; month: string; view: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const open = (e: CalendarEvent) => e.id && router.push(`/c/${slug}/calendar/${e.id}` as never);
  const toggle = (
    <SegmentedControl<View>
      label={labels.view}
      value={view}
      options={[
        { value: 'list', label: labels.list, icon: 'list' },
        { value: 'month', label: labels.month, icon: 'calendar-days' },
      ]}
      onChange={(v) => router.replace(`${pathname}?view=${v}` as never, { scroll: false })}
    />
  );

  if (view === 'month') {
    return <MonthCalendar events={events} today={today} locale={locale} onEventClick={open} onSelectDate={() => undefined} tools={toggle} />;
  }
  return (
    <div className="stack">
      <div className="row-between">{toggle}</div>
      <AgendaList events={events.filter((e) => e.date >= today)} today={today} locale={locale} onEventClick={open} />
    </div>
  );
}
