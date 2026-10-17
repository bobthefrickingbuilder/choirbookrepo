'use client';

import { format, type Lang } from '@choirbook/shared/i18n';
import {
  AlertCard,
  Avatar,
  Badge,
  Button,
  DataTable,
  FeeStatusBadge,
  FormStatusBadge,
  Modal,
  RadioGroup,
  TextInput,
  VoicePartBadge,
  type DataColumn,
  type DataFilter,
} from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { sendReminder, setDeparted } from '@/app/actions/roster';
import type { RosterRow } from '@/lib/data/roster';
import type { StaffStrings } from '@/lib/staff';

export function RosterTable({
  slug,
  lang,
  rows,
  limit,
  can,
  s,
}: {
  slug: string;
  lang: Lang;
  rows: RosterRow[];
  limit: number | null;
  can: { edit: boolean; remind: boolean; message: boolean; attendance: boolean; forms: boolean; fees: boolean };
  s: StaffStrings;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<(string | number)[]>([]);
  const [remindOpen, setRemindOpen] = useState(false);
  const [kind, setKind] = useState<'forms' | 'fees' | 'custom'>('forms');
  const [custom, setCustom] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pending, start] = useTransition();

  const statusLabel = { active: s.stActive, on_leave: s.stOnLeave, auditioning: s.stAuditioning, departed: s.stDeparted };
  const statusTone = { active: 'success', on_leave: 'warning', auditioning: 'info', departed: 'neutral' } as const;
  const atLimit = (r: RosterRow) => limit !== null && r.absences !== null && r.absences >= Math.max(1, limit - 1);

  const columns: DataColumn<RosterRow>[] = [
    {
      key: 'name',
      header: s.colChorister,
      sortable: true,
      sortValue: (r) => `${r.last} ${r.first}`,
      render: (r) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={r.name} size={30} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{r.name}</span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3)' }}>{r.pronouns ?? r.email ?? ''}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'section',
      header: s.section,
      sortable: true,
      sortValue: (r) => 'SATB'.indexOf(r.sectionKey ?? 'Z') + 1 || 9,
      render: (r) =>
        r.sectionKey ? (
          <VoicePartBadge part={r.partKey ?? r.sectionKey} showLabel={!r.partKey} lang={lang} />
        ) : (
          <Badge tone="info" icon="user-plus">
            {s.unplaced}
          </Badge>
        ),
    },
    {
      key: 'status',
      header: s.colStatus,
      sortable: true,
      render: (r) => <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>,
    },
    {
      key: 'guardian',
      header: s.colGuardian,
      sortable: true,
      render: (r) =>
        r.minor && !r.guardian ? (
          <Badge tone="warning">{s.minorNoGuardian}</Badge>
        ) : (
          <span style={{ whiteSpace: 'nowrap' }}>{r.guardian ?? '—'}</span>
        ),
    },
    ...(can.attendance
      ? [
          {
            key: 'absences',
            header: s.colAttendance,
            align: 'right' as const,
            sortable: true,
            sortValue: (r: RosterRow) => r.absences ?? 0,
            render: (r: RosterRow) =>
              atLimit(r) ? (
                <Badge tone="error" icon="triangle-alert">
                  {limit !== null ? format(s.absencesOf, { n: r.absences ?? 0, limit }) : r.absences}
                </Badge>
              ) : (
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.absences ?? '—'}</span>
              ),
          },
        ]
      : []),
    ...(can.forms
      ? [
          {
            key: 'forms',
            header: s.colForms,
            sortable: true,
            sortValue: (r: RosterRow) => r.formsMissing,
            render: (r: RosterRow) => (r.forms ? <FormStatusBadge status={r.forms} lang={lang} /> : '—'),
          },
        ]
      : []),
    ...(can.fees
      ? [
          {
            key: 'fees',
            header: s.colFees,
            sortable: true,
            sortValue: (r: RosterRow) => ({ overdue: 0, due: 1, partial: 2, plan: 3, paid: 4, waived: 5 })[r.fees ?? 'paid'],
            render: (r: RosterRow) => (r.fees ? <FeeStatusBadge status={r.fees} lang={lang} /> : '—'),
          },
        ]
      : []),
  ];

  const count = (f: (r: RosterRow) => boolean) => rows.filter(f).length;
  const filters: DataFilter<RosterRow>[] = [
    {
      id: 'section',
      label: s.section,
      options: [
        ...[...new Set(rows.map((r) => r.sectionKey).filter((k): k is string => Boolean(k)))].map((k) => ({
          value: k,
          label: k,
          count: count((r) => r.sectionKey === k),
        })),
        { value: '_', label: s.unplaced, count: count((r) => !r.sectionKey) },
      ],
      match: (r, v) => (v === '_' ? !r.sectionKey : r.sectionKey === v),
    },
    {
      id: 'status',
      label: s.colStatus,
      options: (['active', 'auditioning', 'on_leave', 'departed'] as const)
        .map((k) => ({ value: k, label: statusLabel[k], count: count((r) => r.status === k) }))
        .filter((o) => o.count > 0),
      match: (r, v) => r.status === v,
    },
    ...(can.attendance && limit !== null
      ? [{ id: 'att', label: s.colAttendance, options: [{ value: 'limit', label: s.filterAtLimit, count: count(atLimit) }], match: atLimit }]
      : []),
    ...(can.forms
      ? [{ id: 'forms', label: s.colForms, options: [{ value: 'out', label: s.filterOutstanding, count: count((r) => r.formsMissing > 0) }], match: (r: RosterRow) => r.formsMissing > 0 }]
      : []),
    ...(can.fees
      ? [
          {
            id: 'fees',
            label: s.colFees,
            options: [
              { value: 'overdue', label: s.feesOverdue, count: count((r) => r.fees === 'overdue') },
              { value: 'owing', label: s.feesOwing, count: count((r) => r.owingCents > 0) },
            ],
            match: (r: RosterRow, v: string) => (v === 'overdue' ? r.fees === 'overdue' : r.owingCents > 0),
          },
        ]
      : []),
    {
      id: 'account',
      label: s.colAccount,
      options: [
        { value: 'active', label: s.accSignedUp, count: count((r) => r.account === 'active') },
        { value: 'invited', label: s.accInvited, count: count((r) => r.account === 'invited') },
        { value: 'none', label: s.accNoEmail, count: count((r) => r.account === 'none') },
      ],
      match: (r, v) => r.account === v,
    },
  ];

  const ids = () => selected.map(String);
  const exportHref = (only?: string[]) => `/c/${slug}/roster/export${only ? `?ids=${only.join(',')}` : ''}`;

  const remind = () =>
    start(async () => {
      const r = await sendReminder(slug, ids(), { kind, text: custom });
      setRemindOpen(false);
      setNotice(r.ok ? { tone: 'success', text: format(s.remindSent, { n: r.data.n }) } : { tone: 'error', text: s.errors[r.error] ?? s.failed });
    });

  const archive = () =>
    start(async () => {
      const r = await setDeparted(slug, ids(), true);
      setNotice(r.ok ? { tone: 'success', text: format(s.archivedN, { n: r.data.n }) } : { tone: 'error', text: s.errors[r.error] ?? s.failed });
      setSelected([]);
      router.refresh();
    });

  return (
    <>
      {notice ? (
        <AlertCard tone={notice.tone} onDismiss={() => setNotice(null)} dismissLabel={s.close}>
          {notice.text}
        </AlertCard>
      ) : null}
      <DataTable
        caption={s.rosterTitle}
        lang={lang}
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        rowLabel={(r) => r.name}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        searchable
        searchKeys={['name', 'email', 'school', 'guardian']}
        searchPlaceholder={s.searchRoster}
        filters={filters}
        defaultSort={{ key: 'name', dir: 'asc' }}
        onRowClick={(r) => router.push(`/c/${slug}/roster/${r.id}` as never)}
        footer={<span>{format(s.footerN, { n: rows.length })}</span>}
        bulkActions={() => (
          <>
            {can.message ? (
              <Button size="sm" variant="secondary" iconStart="mail" href={`/c/${slug}/communications/new?to=${ids().join(',')}`}>
                {s.bulkMessage}
              </Button>
            ) : null}
            {can.remind ? (
              <Button size="sm" variant="secondary" iconStart="bell" onClick={() => setRemindOpen(true)}>
                {s.bulkRemind}
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" iconStart="download" href={exportHref(ids())}>
              {s.bulkExport}
            </Button>
            {can.edit ? (
              <Button size="sm" variant="ghost" iconStart="archive" onClick={archive} loading={pending}>
                {s.bulkArchive}
              </Button>
            ) : null}
          </>
        )}
      />
      <Modal
        open={remindOpen}
        onClose={() => setRemindOpen(false)}
        title={s.remindTitle}
        closeLabel={s.cancel}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemindOpen(false)}>
              {s.cancel}
            </Button>
            <Button iconStart="bell" onClick={remind} loading={pending} disabled={kind === 'custom' && !custom.trim()}>
              {s.bulkRemind}
            </Button>
          </>
        }
      >
        <div className="stack" style={{ gap: 14 }}>
          <p className="muted" style={{ margin: 0 }}>
            {s.remindBody} {format(s.selectedN, { n: selected.length })}
          </p>
          <RadioGroup
            label={s.remindWhat}
            name="remind-kind"
            value={kind}
            onChange={(v) => setKind(v as typeof kind)}
            options={[
              ...(can.forms ? [{ value: 'forms', label: s.remindForms, description: s.remindFormsText }] : []),
              ...(can.fees ? [{ value: 'fees', label: s.remindFees, description: s.remindFeesText }] : []),
              { value: 'custom', label: s.remindCustom },
            ]}
          />
          {kind === 'custom' ? <TextInput label={s.remindText} multiline rows={3} value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={500} /> : null}
        </div>
      </Modal>
    </>
  );
}
