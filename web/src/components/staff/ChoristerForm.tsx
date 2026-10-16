'use client';

import type { Lang } from '@choirbook/shared/i18n';
import { AlertCard, Button, Modal, Select, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createChorister, updateChorister, type ChoristerInput } from '@/app/actions/roster';
import type { SectionInfo } from '@/lib/data/roster';
import type { StaffStrings } from '@/lib/staff';

export type ChoristerValues = Required<{ [K in keyof ChoristerInput]: string }>;

const empty: ChoristerValues = {
  first_name: '',
  last_name: '',
  preferred_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  pronouns: '',
  lang: 'en',
  section_id: '',
  voice_part_id: '',
  status: 'active',
  school: '',
  joined_on: '',
};

/** Add a chorister, or edit one (when `personId` and `initial` are given). */
export function ChoristerForm({
  slug,
  lang,
  sections,
  s,
  personId,
  initial,
  trigger,
}: {
  slug: string;
  lang: Lang;
  sections: SectionInfo[];
  s: StaffStrings;
  personId?: string;
  initial?: Partial<ChoristerValues>;
  trigger: { label: string; icon: 'user-plus' | 'pencil'; variant?: 'primary' | 'secondary' };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<ChoristerValues>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof ChoristerValues) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const name = (o: { name_en: string; name_fr: string }) => (lang === 'fr' ? o.name_fr : o.name_en);
  const parts = sections.find((x) => x.id === v.section_id)?.voice_parts ?? [];

  const submit = () =>
    start(async () => {
      const input = { ...v, status: v.status as ChoristerInput['status'], lang: v.lang as 'en' | 'fr' };
      if (personId) {
        const r = await updateChorister(slug, personId, input);
        if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
        setOpen(false);
        setError(null);
        router.refresh();
      } else {
        const r = await createChorister(slug, input);
        if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
        setV(empty);
        router.push(`/c/${slug}/roster/${r.data.id}` as never);
      }
    });

  return (
    <>
      <Button iconStart={trigger.icon} variant={trigger.variant ?? 'primary'} onClick={() => setOpen(true)}>
        {trigger.label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={personId ? s.editDetails : s.addChorister}
        size="lg"
        closeLabel={s.cancel}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button onClick={submit} loading={pending} disabled={!v.first_name.trim() || !v.last_name.trim()}>
              {personId ? s.save : s.addChorister}
            </Button>
          </>
        }
      >
        <form
          className="form-2col"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {error ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <AlertCard tone="error">{error}</AlertCard>
            </div>
          ) : null}
          <TextInput label={s.firstName} value={v.first_name} onChange={set('first_name')} required maxLength={80} autoComplete="off" />
          <TextInput label={s.lastName} value={v.last_name} onChange={set('last_name')} required maxLength={80} autoComplete="off" />
          <TextInput label={s.preferredName} optional value={v.preferred_name} onChange={set('preferred_name')} maxLength={80} />
          <TextInput label={s.pronouns} optional value={v.pronouns} onChange={set('pronouns')} maxLength={40} />
          <TextInput label={s.email} optional type="email" value={v.email} onChange={set('email')} />
          <TextInput label={s.phone} optional type="tel" value={v.phone} onChange={set('phone')} maxLength={40} />
          <TextInput label={s.dob} optional type="date" value={v.date_of_birth} onChange={set('date_of_birth')} />
          <Select
            label={s.language}
            value={v.lang}
            onChange={set('lang')}
            options={[
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'Français' },
            ]}
          />
          <Select
            label={s.section}
            value={v.section_id}
            onChange={(e) => setV((x) => ({ ...x, section_id: e.target.value, voice_part_id: '' }))}
            options={[{ value: '', label: s.unplaced }, ...sections.map((x) => ({ value: x.id, label: name(x) }))]}
          />
          <Select
            label={s.voicePart}
            value={v.voice_part_id}
            onChange={set('voice_part_id')}
            disabled={!parts.length}
            options={[{ value: '', label: '—' }, ...parts.map((p) => ({ value: p.id, label: name(p) }))]}
          />
          <Select
            label={s.status}
            value={v.status}
            onChange={set('status')}
            options={[
              { value: 'active', label: s.stActive },
              { value: 'auditioning', label: s.stAuditioning },
              { value: 'on_leave', label: s.stOnLeave },
              ...(personId ? [{ value: 'departed', label: s.stDeparted }] : []),
            ]}
          />
          <TextInput label={s.school} optional value={v.school} onChange={set('school')} maxLength={120} />
          <TextInput label={s.joined} optional type="date" value={v.joined_on} onChange={set('joined_on')} />
          <button type="submit" hidden />
        </form>
      </Modal>
    </>
  );
}
