'use client';

import { format } from '@choirbook/shared/i18n';
import { AlertCard, Button, IconButton, TextInput, Toggle, VoicePartBadge } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveSeating, type Placement } from '@/app/actions/seating';
import type { StaffStrings } from '@/lib/staff';

export interface SeatPerson {
  id: string;
  name: string;
  initials: string;
  part: string | null;
  sectionKey: string | null;
  sectionSort: number;
}

type Row = { label: string; seats: number };

const keyOf = (row: string, seat: number) => `${row}:${seat}`;

/**
 * Riser chart editor. Drag a chorister onto a seat, or (keyboard and touch)
 * choose a chorister, then choose a seat. Dropping on a taken seat swaps.
 */
export function SeatingEditor({
  slug,
  eventId,
  initial,
  people,
  canEdit,
  s,
}: {
  slug: string;
  eventId: string;
  initial: { name: string; rows: Row[]; placements: Placement[]; published: boolean };
  people: SeatPerson[];
  canEdit: boolean;
  s: StaffStrings;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [rows, setRows] = useState<Row[]>(initial.rows.length ? initial.rows : [{ label: 'C', seats: 14 }, { label: 'B', seats: 14 }, { label: 'A', seats: 14 }]);
  const [seats, setSeats] = useState<Record<string, string>>(() => Object.fromEntries(initial.placements.map((p) => [keyOf(p.row, p.seat), p.personId])));
  const [publish, setPublish] = useState(initial.published);
  const [picked, setPicked] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const person = (id: string | undefined) => people.find((p) => p.id === id);
  const seatOf = (pid: string) => Object.entries(seats).find(([, v]) => v === pid)?.[0];
  const unseated = people.filter((p) => !seatOf(p.id));
  const change = (next: Record<string, string>) => {
    setSeats(next);
    setDirty(true);
  };

  const place = (pid: string, target: string) => {
    const next = { ...seats };
    const from = seatOf(pid);
    const occupant = next[target];
    if (from) delete next[from];
    next[target] = pid;
    if (occupant && occupant !== pid && from) next[from] = occupant;
    change(next);
    setPicked(null);
  };
  const unseat = (pid: string) => {
    const from = seatOf(pid);
    if (!from) return;
    const next = { ...seats };
    delete next[from];
    change(next);
    setPicked(null);
  };
  const onSeat = (k: string) => {
    if (!canEdit) return;
    if (picked) place(picked, k);
    else if (seats[k]) setPicked(seats[k]!);
  };

  // Front row last in the list (it is drawn at the bottom, nearest the audience).
  const autoFill = () => {
    const order = [...people].sort((a, b) => a.sectionSort - b.sectionSort || (a.part ?? '').localeCompare(b.part ?? '') || a.name.localeCompare(b.name));
    const slots = [...rows].reverse().flatMap((r) => Array.from({ length: r.seats }, (_, i) => keyOf(r.label, i + 1)));
    change(Object.fromEntries(order.slice(0, slots.length).map((p, i) => [slots[i]!, p.id])));
  };

  const setRow = (i: number, r: Partial<Row>) => {
    setRows(rows.map((x, j) => (j === i ? { ...x, ...r } : x)));
    setDirty(true);
  };

  const save = () =>
    start(async () => {
      const placements = Object.entries(seats).map(([k, personId]) => {
        const [row, seat] = k.split(':');
        return { personId, row: row!, seat: Number(seat) };
      });
      const r = await saveSeating(slug, eventId, { name, rows, placements, publish });
      setNotice(r.ok ? { tone: 'success', text: s.saved } : { tone: 'error', text: s.errors[r.error] ?? s.failed });
      if (r.ok) {
        setDirty(false);
        router.refresh();
      }
    });

  const pickedPerson = person(picked ?? undefined);

  return (
    <div className="stack">
      {notice ? (
        <AlertCard tone={notice.tone} onDismiss={() => setNotice(null)} dismissLabel={s.close}>
          {notice.text}
        </AlertCard>
      ) : null}

      {canEdit ? (
        <div className="seating-tools no-print">
          <div style={{ maxWidth: 260 }}>
            <TextInput label={s.chartName} value={name} onChange={(e) => (setName(e.target.value), setDirty(true))} maxLength={80} />
          </div>
          <Toggle label={s.showToChoristers} checked={publish} onChange={(e) => (setPublish(e.target.checked), setDirty(true))} />
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <Button variant="secondary" iconStart="users" onClick={autoFill}>
              {s.autoFill}
            </Button>
            <Button variant="ghost" iconStart="x" onClick={() => change({})}>
              {s.clearAll}
            </Button>
            <Button variant="ghost" iconStart="printer" onClick={() => window.print()}>
              {s.print}
            </Button>
            <Button iconStart="check" loading={pending} disabled={!dirty} onClick={save}>
              {s.save}
            </Button>
          </span>
        </div>
      ) : null}

      <p className="muted small no-print" role="status" aria-live="polite" style={{ margin: 0 }}>
        {pickedPerson ? format(s.pickSeat, { name: pickedPerson.name }) : canEdit ? s.seatingHelp : null}
      </p>

      <div className="riser" data-print-report="">
        <h2 className="print-only">{name}</h2>
        {rows.map((r, i) => (
          <div key={i} className="riser__row">
            <span className="riser__label">{r.label}</span>
            <div className="riser__seats">
              {Array.from({ length: r.seats }, (_, n) => {
                const k = keyOf(r.label, n + 1);
                const p = person(seats[k]);
                return (
                  <button
                    key={k}
                    type="button"
                    className={'riser__seat' + (p ? ` riser__seat--${(p.sectionKey ?? 'x').toLowerCase()}` : '') + (p && p.id === picked ? ' is-picked' : '')}
                    aria-label={`${s.rowSeat.replace('{row}', r.label).replace('{seat}', String(n + 1))}${p ? `: ${p.name}` : ''}`}
                    title={p?.name}
                    disabled={!canEdit && !p}
                    onClick={() => onSeat(k)}
                    draggable={Boolean(p) && canEdit}
                    onDragStart={(e) => p && e.dataTransfer.setData('text/plain', p.id)}
                    onDragOver={(e) => canEdit && e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const pid = e.dataTransfer.getData('text/plain');
                      if (pid) place(pid, k);
                    }}
                  >
                    {p ? (
                      <>
                        <span className="riser__initials">{p.initials}</span>
                        <span className="riser__part">{p.part ?? p.sectionKey ?? ''}</span>
                        <span className="print-only riser__name">{p.name}</span>
                      </>
                    ) : (
                      <span className="riser__n">{n + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {canEdit ? (
              <span className="riser__edit no-print">
                <TextInput label={s.rowLabel} size="sm" value={r.label} maxLength={8} onChange={(e) => setRow(i, { label: e.target.value.toUpperCase() })} />
                <TextInput label={s.seatsN} size="sm" inputMode="numeric" value={String(r.seats)} onChange={(e) => setRow(i, { seats: Math.max(1, Math.min(40, Number(e.target.value.replace(/\D/g, '')) || 1)) })} />
                <IconButton icon="trash-2" size="sm" label={`${s.remove} ${r.label}`} disabled={rows.length <= 1} onClick={() => (setRows(rows.filter((_, j) => j !== i)), setDirty(true))} />
              </span>
            ) : null}
          </div>
        ))}
        <p className="riser__front">{s.audienceSide}</p>
      </div>
      {canEdit ? (
        <div className="no-print">
          <Button size="sm" variant="ghost" iconStart="plus" onClick={() => (setRows([{ label: String.fromCharCode(65 + rows.length), seats: 14 }, ...rows]), setDirty(true))}>
            {s.addRow}
          </Button>
        </div>
      ) : null}

      {canEdit ? (
        <section
          className="unseated no-print"
          aria-label={s.unseated}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const pid = e.dataTransfer.getData('text/plain');
            if (pid) unseat(pid);
          }}
        >
          <h3 className="section-title">
            {s.unseated} · {unseated.length}
          </h3>
          <div className="unseated__list">
            {unseated.map((p) => (
              <button
                key={p.id}
                type="button"
                className={'unseated__chip' + (p.id === picked ? ' is-picked' : '')}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                onClick={() => setPicked(p.id === picked ? null : p.id)}
                aria-pressed={p.id === picked}
              >
                {p.part || p.sectionKey ? <VoicePartBadge part={p.part ?? p.sectionKey ?? undefined} /> : null}
                {p.name}
              </button>
            ))}
          </div>
          {pickedPerson && seatOf(pickedPerson.id) ? (
            <Button size="sm" variant="ghost" iconStart="x" onClick={() => unseat(pickedPerson.id)}>
              {format(s.unseat, { name: pickedPerson.name })}
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
