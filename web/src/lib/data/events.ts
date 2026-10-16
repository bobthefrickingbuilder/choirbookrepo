import 'server-only';
import type { Tables } from '@choirbook/shared/database.types';
import type { EventValues } from '@/components/staff/EventEditor';
import { localParts } from '@/lib/format';

/** An event row as the editor's form values (in the choir's time zone). */
export function eventToValues(e: Tables<'events'>): EventValues {
  const start = localParts(e.starts_at);
  const end = e.ends_at ? localParts(e.ends_at) : null;
  return {
    type: e.type,
    title: e.title,
    description: e.description ?? '',
    date: start.date,
    end_date: end && end.date !== start.date ? end.date : '',
    all_day: e.all_day,
    start: e.all_day ? '' : start.time,
    end: end && !e.all_day ? end.time : '',
    call: e.call_at ? localParts(e.call_at).time : '',
    location: e.location ?? '',
    address: e.address ?? '',
    map_url: e.map_url ?? '',
    dress_code: e.dress_code ?? '',
    bring: e.bring ?? '',
    section_ids: e.section_ids,
    counts_for_attendance: e.counts_for_attendance,
    availability_requested: e.availability_requested,
    availability_due: e.availability_due_at ? localParts(e.availability_due_at).date : '',
    running_order: Array.isArray(e.running_order)
      ? (e.running_order as { time?: string; item?: string; who?: string }[]).map((r) => ({ time: r.time ?? '', item: r.item ?? '', who: r.who ?? '' }))
      : [],
    repeat_until: '',
  };
}

export const blankEvent = (date: string): EventValues => ({
  type: 'rehearsal',
  title: '',
  description: '',
  date,
  end_date: '',
  all_day: false,
  start: '18:30',
  end: '20:30',
  call: '',
  location: '',
  address: '',
  map_url: '',
  dress_code: '',
  bring: '',
  section_ids: [],
  counts_for_attendance: true,
  availability_requested: false,
  availability_due: '',
  running_order: [],
  repeat_until: '',
});
