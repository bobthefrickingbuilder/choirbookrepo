'use client';

import { AlertCard, Button, Checkbox, ConfirmDialog, IconButton, Modal, Select, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { inviteMember } from '@/app/actions/invitations';
import { addStaffPerson, createRole, deleteRole, setPermission, setRoles } from '@/app/actions/users';
import type { StaffStrings } from '@/lib/staff';

type Result = { ok: true } | { ok: false; error: string };

function useRun(s: StaffStrings) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
      setError(null);
      after?.();
      router.refresh();
    });
  return { pending, error, setError, run, router, start };
}

export interface RoleOption {
  id: string;
  key: string | null;
  name: string;
  locked: boolean;
}

export function RolesEditor({
  slug,
  personId,
  name,
  roles,
  current,
  sections,
  s,
}: {
  slug: string;
  personId: string;
  name: string;
  roles: RoleOption[];
  current: { roleId: string; sectionId: string | null }[];
  sections: { id: string; name: string }[];
  s: StaffStrings;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(current);
  const { pending, error, run } = useRun(s);
  const has = (id: string) => v.some((x) => x.roleId === id);
  return (
    <>
      <IconButton icon="pencil" size="sm" label={`${s.editRoles}: ${name}`} onClick={() => setOpen(true)} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${s.editRoles} · ${name}`}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} onClick={() => run(() => setRoles(slug, personId, v), () => setOpen(false))}>
              {s.save}
            </Button>
          </>
        }
      >
        <div className="stack" style={{ gap: 10 }}>
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          {roles.map((r) => (
            <div key={r.id} className="stack" style={{ gap: 6 }}>
              <Checkbox
                label={r.name}
                checked={has(r.id)}
                onChange={(e) => setV(e.target.checked ? [...v, { roleId: r.id, sectionId: null }] : v.filter((x) => x.roleId !== r.id))}
              />
              {r.key === 'section_leader' && has(r.id) ? (
                <div style={{ marginLeft: 30, maxWidth: 260 }}>
                  <Select
                    label={s.sectionScope}
                    size="sm"
                    value={v.find((x) => x.roleId === r.id)?.sectionId ?? ''}
                    onChange={(e) => setV(v.map((x) => (x.roleId === r.id ? { ...x, sectionId: e.target.value || null } : x)))}
                    options={[{ value: '', label: s.allSections }, ...sections.map((x) => ({ value: x.id, label: x.name }))]}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

export function AddStaffForm({ slug, orgId, roles, isDemo, s }: { slug: string; orgId: string; roles: RoleOption[]; isDemo: boolean; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ first_name: '', last_name: '', email: '', lang: 'en' as 'en' | 'fr', role: roles.find((r) => r.key === 'office')?.id ?? roles[0]?.id ?? '' });
  const [invite, setInvite] = useState(!isDemo);
  const { pending, error, setError, router, start } = useRun(s);
  const submit = () =>
    start(async () => {
      const r = await addStaffPerson(slug, v, v.role);
      if (!r.ok) return setError(s.errors[r.error] ?? s.failed);
      if (invite && !isDemo) await inviteMember(orgId, r.data.personId);
      setOpen(false);
      router.refresh();
    });
  return (
    <>
      <Button iconStart="user-plus" onClick={() => setOpen(true)}>
        {s.addStaff}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.addStaff}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!v.first_name.trim() || !v.last_name.trim() || !v.email.trim()} onClick={submit}>
              {s.addAndInvite}
            </Button>
          </>
        }
      >
        <div className="form-2col">
          {error ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <AlertCard tone="error">{error}</AlertCard>
            </div>
          ) : null}
          <TextInput label={s.firstName} value={v.first_name} onChange={(e) => setV({ ...v, first_name: e.target.value })} maxLength={80} />
          <TextInput label={s.lastName} value={v.last_name} onChange={(e) => setV({ ...v, last_name: e.target.value })} maxLength={80} />
          <TextInput label={s.email} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
          <Select
            label={s.language}
            value={v.lang}
            onChange={(e) => setV({ ...v, lang: e.target.value as 'en' | 'fr' })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'Français' },
            ]}
          />
          <Select label={s.roles} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            {isDemo ? (
              <p className="muted small">{s.demoBlocked}</p>
            ) : (
              <Checkbox label={s.invite} description={s.inviteStaffHint} checked={invite} onChange={(e) => setInvite(e.target.checked)} />
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

export function InviteButton({ orgId, personId, s }: { orgId: string; personId: string; s: StaffStrings }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <Button
        size="sm"
        variant="ghost"
        iconStart="send"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await inviteMember(orgId, personId);
            setMsg(r.ok ? (r.outcome === 'linked' ? s.inviteLinked : s.inviteSent) : ({ demo: s.demoBlocked, no_email: s.inviteNoEmail, already_active: s.inviteAlready } as Record<string, string>)[r.reason] ?? s.failed);
          })
        }
      >
        {s.invite}
      </Button>
      {msg ? <span className="muted small" role="status">{msg}</span> : null}
    </span>
  );
}

export function PermissionCell({ slug, roleId, area, level, locked, label, s }: { slug: string; roleId: string; area: string; level: string; locked: boolean; label: string; s: StaffStrings }) {
  const [v, setV] = useState(level);
  const { pending, error, run } = useRun(s);
  if (locked) return <span className={`perm perm--${level}`}>{s[`lvl_${level}` as 'lvl_none']}</span>;
  return (
    <span title={error ?? undefined}>
      <select
        className={`perm-select perm--${v}`}
        aria-label={label}
        value={v}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          setV(next);
          run(() => setPermission(slug, roleId, area, next));
        }}
      >
        <option value="none">{s.lvl_none}</option>
        <option value="view">{s.lvl_view}</option>
        <option value="edit">{s.lvl_edit}</option>
      </select>
    </span>
  );
}

export function NewRoleForm({ slug, roles, s }: { slug: string; roles: RoleOption[]; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name_en: '', name_fr: '', description_en: '', description_fr: '', copy: '' });
  const { pending, error, run } = useRun(s);
  return (
    <>
      <Button size="sm" variant="secondary" iconStart="plus" onClick={() => setOpen(true)}>
        {s.newRole}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.newRole}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!v.name_en.trim() || !v.name_fr.trim()} onClick={() => run(() => createRole(slug, v, v.copy || null), () => setOpen(false))}>
              {s.create}
            </Button>
          </>
        }
      >
        <div className="form-2col">
          {error ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <AlertCard tone="error">{error}</AlertCard>
            </div>
          ) : null}
          <TextInput label={s.roleNameEn} value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} maxLength={60} />
          <TextInput label={s.roleNameFr} value={v.name_fr} onChange={(e) => setV({ ...v, name_fr: e.target.value })} maxLength={60} />
          <TextInput label={s.roleDescEn} optional value={v.description_en} onChange={(e) => setV({ ...v, description_en: e.target.value })} maxLength={300} />
          <TextInput label={s.roleDescFr} optional value={v.description_fr} onChange={(e) => setV({ ...v, description_fr: e.target.value })} maxLength={300} />
          <Select label={s.copyFrom} value={v.copy} onChange={(e) => setV({ ...v, copy: e.target.value })} options={[{ value: '', label: s.blankRole }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} />
        </div>
      </Modal>
    </>
  );
}

export function DeleteRoleButton({ slug, roleId, name, s }: { slug: string; roleId: string; name: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useRun(s);
  return (
    <>
      <IconButton icon="trash-2" size="sm" label={`${s.deleteRole}: ${name}`} onClick={() => setOpen(true)} />
      <ConfirmDialog
        open={open}
        title={`${s.deleteRole}: ${name}`}
        tone="danger"
        confirmLabel={s.delete}
        cancelLabel={s.cancel}
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => run(() => deleteRole(slug, roleId), () => setOpen(false))}
      >
        {error ?? s.confirmDelete}
      </ConfirmDialog>
    </>
  );
}
