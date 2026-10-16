'use client';

import { format, type Lang } from '@choirbook/shared/i18n';
import { AlertCard, AttendanceBadge, Button, CheckInRow, ConfirmDialog, EmptyState, SearchField, SegmentedControl, type AttendanceStatus } from '@choirbook/ui';
import { useOptimistic, useState, useTransition } from 'react';
import { markAttendance } from '@/app/actions/attendance';
import type { StaffStrings } from '@/lib/staff';

export interface SheetRow {
  id: string;
  name: string;
  last: string;
  sectionId: string | null;
  part: string | null;
  status: AttendanceStatus;
  note: string | null;
}

type Change = { ids: string[]; status: AttendanceStatus };

export function AttendanceSheet({
  slug,
  eventId,
  lang,
  rows,
  sections,
  defaultSection,
  canEdit,
  s,
}: {
  slug: string;
  eventId: string;
  lang: Lang;
  rows: SheetRow[];
  sections: { id: string; key: string; name: string }[];
  defaultSection: string | null;
  canEdit: boolean;
  s: StaffStrings;
}) {
  const [filter, setFilter] = useState<string>(defaultSection && sections.some((x) => x.id === defaultSection) ? defaultSection : 'all');
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const [view, apply] = useOptimistic(rows, (current, change: Change) =>
    current.map((r) => (change.ids.includes(r.id) ? { ...r, status: change.status } : r)),
  );

  const set = (ids: string[], status: AttendanceStatus) =>
    start(async () => {
      apply({ ids, status });
      const r = await markAttendance(slug, eventId, ids, status);
      setError(r.ok ? null : (s.errors[r.error] ?? s.failed));
    });

  const q = query.trim().toLowerCase();
  const visible = view.filter((r) => (filter === 'all' || r.sectionId === filter) && (!q || r.name.toLowerCase().includes(q)));
  const groups = [
    ...sections.map((x) => ({ id: x.id, label: x.name, key: x.key, rows: visible.filter((r) => r.sectionId === x.id) })),
    { id: '_', label: s.unplaced, key: null as string | null, rows: visible.filter((r) => !r.sectionId) },
  ].filter((g) => g.rows.length);
  const scope = view.filter((r) => filter === 'all' || r.sectionId === filter);
  const marked = scope.filter((r) => r.status !== 'unmarked').length;
  const unmarked = scope.filter((r) => r.status === 'unmarked').map((r) => r.id);
  const tally = (st: AttendanceStatus) => scope.filter((r) => r.status === st).length;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <div className="take-head card-bar">
        <div style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <SearchField value={query} onChange={setQuery} placeholder={s.search} label={s.search} />
        </div>
        {sections.length > 1 ? (
          <SegmentedControl
            label={s.section}
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: s.all }, ...sections.map((x) => ({ value: x.id, label: x.key }))]}
          />
        ) : null}
        <div role="status" aria-live="polite" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 'auto' }}>
          {(['present', 'late', 'excused', 'absent'] as const).map((st) => (
            <AttendanceBadge key={st} status={st} lang={lang}>
              {`${s[st]} ${tally(st)}`}
            </AttendanceBadge>
          ))}
        </div>
      </div>

      {groups.length ? (
        groups.map((g) => (
          <section key={g.id} aria-label={g.label} className="take-group">
            <div className="take-group__head">
              <span>
                {g.label} · {g.rows.length}
              </span>
              <span className="muted small">{format(s.markedN, { marked: g.rows.filter((r) => r.status !== 'unmarked').length, total: g.rows.length })}</span>
            </div>
            <ul className="checkin-list" style={{ padding: 8 }}>
              {g.rows.map((r) => (
                <li key={r.id}>
                  <CheckInRow
                    name={r.name}
                    part={r.part}
                    status={r.status}
                    note={r.note ?? undefined}
                    lang={lang}
                    disabled={!canEdit}
                    onChange={(st) => set([r.id], st)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <EmptyState icon="search" size="sm">
          {s.noneYet}
        </EmptyState>
      )}

      <div className="take-foot">
        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{format(s.markedN, { marked, total: scope.length })}</strong>
          <div className="qr-bar" style={{ width: '100%' }} aria-hidden>
            <span style={{ width: `${scope.length ? Math.round((marked / scope.length) * 100) : 0}%` }} />
          </div>
          <span className="muted small">{s.autoSaved}</span>
        </div>
        {canEdit ? (
          <Button size="lg" variant="secondary" iconStart="check-check" disabled={!unmarked.length} onClick={() => setConfirm(true)}>
            {s.markRestPresent}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirm}
        title={s.markRestPresent}
        confirmLabel={`${s.present} (${unmarked.length})`}
        cancelLabel={s.cancel}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          set(unmarked, 'present');
        }}
      >
        {format(s.markedN, { marked, total: scope.length })}
      </ConfirmDialog>
    </div>
  );
}
