'use client';

import type { Lang } from '@choirbook/shared/i18n';
import { AlertCard, Button, Card, Checkbox, EVENT_TYPES, IconButton, Select, TextInput, Toggle } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveEvent, type EventInput } from '@/app/actions/events';
import type { StaffStrings } from '@/lib/staff';

export type EventValues = Omit<EventInput, 'running_order'> & { running_order: { time: string; item: string; who: string }[] };

export function EventEditor({
  slug,
  lang,
  id,
  initial,
  sections,
  s,
}: {
  slug: string;
  lang: Lang;
  id: string | null;
  initial: EventValues;
  sections: { id: string; name: string }[];
  s: StaffStrings;
}) {
  const router = useRouter();
  const [v, setV] = useState<EventValues>(initial);
  const [repeat, setRepeat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof EventValues>(k: K, value: EventValues[K]) => setV((x) => ({ ...x, [k]: value }));
  const text = (k: keyof EventValues) => (e: { target: { value: string } }) => set(k, e.target.value as never);

  const submit = () =>
    start(async () => {
      const r = await saveEvent(slug, id, { ...v, repeat_until: repeat ? v.repeat_until : '' });
      if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
      router.push(`/c/${slug}/calendar/${r.data.id}${r.data.created > 1 ? `?created=${r.data.created}` : ''}` as never);
      router.refresh();
    });

  const ro = v.running_order;
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <Card>
        <div className="form-2col">
          <Select
            label={s.eventType}
            value={v.type}
            onChange={(e) => {
              const type = e.target.value as EventValues['type'];
              setV((x) => ({ ...x, type, counts_for_attendance: type !== 'deadline' && type !== 'social' }));
            }}
            options={(Object.keys(EVENT_TYPES) as (keyof typeof EVENT_TYPES)[]).map((k) => ({ value: k, label: EVENT_TYPES[k][lang] }))}
          />
          <TextInput label={s.title} value={v.title} onChange={text('title')} required maxLength={160} />
          <TextInput label={s.startDate} type="date" value={v.date} onChange={text('date')} required />
          <TextInput label={s.endDate} optional type="date" value={v.end_date ?? ''} onChange={text('end_date')} min={v.date} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Toggle label={s.allDay} checked={v.all_day} onChange={(e) => set('all_day', e.target.checked)} />
          </div>
          {!v.all_day ? (
            <>
              <TextInput label={s.startTime} type="time" value={v.start ?? ''} onChange={text('start')} required />
              <TextInput label={s.endTime} optional type="time" value={v.end ?? ''} onChange={text('end')} />
              <TextInput label={s.callTime} optional type="time" value={v.call ?? ''} onChange={text('call')} />
            </>
          ) : null}
        </div>
        {!id ? (
          <div className="stack" style={{ gap: 10, marginTop: 16 }}>
            <Toggle label={s.repeatWeekly} description={s.repeatHint} checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            {repeat ? (
              <div style={{ maxWidth: 260 }}>
                <TextInput label={s.repeatUntil} type="date" value={v.repeat_until ?? ''} onChange={text('repeat_until')} min={v.date} />
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="form-2col">
          <TextInput label={s.location} optional value={v.location ?? ''} onChange={text('location')} maxLength={200} />
          <TextInput label={s.address} optional value={v.address ?? ''} onChange={text('address')} maxLength={300} />
          <TextInput label={s.mapUrl} optional type="url" value={v.map_url ?? ''} onChange={text('map_url')} placeholder="https://" />
          <TextInput label={s.dressCode} optional value={v.dress_code ?? ''} onChange={text('dress_code')} maxLength={500} />
          <TextInput label={s.bring} optional value={v.bring ?? ''} onChange={text('bring')} maxLength={500} />
          <div style={{ gridColumn: '1 / -1' }}>
            <TextInput label={s.description} optional multiline rows={4} value={v.description ?? ''} onChange={text('description')} maxLength={4000} />
          </div>
        </div>
      </Card>

      <Card title={s.whoIsCalled}>
        <p className="muted" style={{ margin: '0 0 10px' }}>
          {s.whoIsCalledHint}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
          {sections.map((sec) => (
            <Checkbox
              key={sec.id}
              label={sec.name}
              checked={v.section_ids.includes(sec.id)}
              onChange={(e) => set('section_ids', e.target.checked ? [...v.section_ids, sec.id] : v.section_ids.filter((x) => x !== sec.id))}
            />
          ))}
        </div>
        <div className="stack" style={{ gap: 10, marginTop: 16 }}>
          <Toggle label={s.countsForAttendance} checked={v.counts_for_attendance} onChange={(e) => set('counts_for_attendance', e.target.checked)} />
          <Toggle label={s.requestAvailability} checked={v.availability_requested} onChange={(e) => set('availability_requested', e.target.checked)} />
          {v.availability_requested ? (
            <div style={{ maxWidth: 260 }}>
              <TextInput label={s.availabilityDue} optional type="date" value={v.availability_due ?? ''} onChange={text('availability_due')} max={v.date} />
            </div>
          ) : null}
        </div>
      </Card>

      <Card title={s.runningOrder}>
        <div className="stack" style={{ gap: 8 }}>
          {ro.map((r, i) => (
            <div key={i} className="ro-row">
              <TextInput label={s.roTime} size="sm" value={r.time} maxLength={10} placeholder="18:45" onChange={(e) => set('running_order', ro.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
              <TextInput label={s.roItem} size="sm" value={r.item} maxLength={200} onChange={(e) => set('running_order', ro.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))} />
              <TextInput label={s.roWho} size="sm" value={r.who} maxLength={120} onChange={(e) => set('running_order', ro.map((x, j) => (j === i ? { ...x, who: e.target.value } : x)))} />
              <IconButton icon="trash-2" size="sm" label={`${s.remove} ${i + 1}`} onClick={() => set('running_order', ro.filter((_, j) => j !== i))} />
            </div>
          ))}
          <div>
            <Button size="sm" variant="ghost" iconStart="plus" onClick={() => set('running_order', [...ro, { time: '', item: '', who: '' }])}>
              {s.addRow}
            </Button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="submit" size="lg" iconStart="check" loading={pending} disabled={!v.title.trim() || !v.date || (!v.all_day && !v.start)}>
          {id ? s.save : s.create}
        </Button>
        <Button variant="ghost" size="lg" href={id ? `/c/${slug}/calendar/${id}` : `/c/${slug}/calendar`}>
          {s.cancel}
        </Button>
      </div>
    </form>
  );
}
