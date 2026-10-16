import { PERM_AREAS } from '@choirbook/shared/permissions';
import { Avatar, Badge, Card } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { AddStaffForm, DeleteRoleButton, InviteButton, NewRoleForm, PermissionCell, RolesEditor } from '@/components/staff/UserParts';
import { getSections } from '@/lib/data/roster';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Users & permissions' };

export default async function UsersPage({ params }: PageProps<'/c/[choir]/users'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('users')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const org = ctx.org.id;
  const [{ data: roles }, { data: grants }, { data: perms }, sections] = await Promise.all([
    supabase.from('roles').select('id, key, name_en, name_fr, description_en, description_fr, locked, created_at').eq('organization_id', org).order('created_at'),
    supabase.from('member_roles').select('person_id, role_id, section_id, people!inner(id, first_name, last_name, preferred_name, email, user_id, status)').eq('organization_id', org),
    supabase.from('role_permissions').select('role_id, area, level').eq('organization_id', org),
    getSections(org),
  ]);
  const s = staffStrings(t);
  const canEdit = ctx.can('users', 'edit');
  const roleName = (r: { name_en: string; name_fr: string }) => (lang === 'fr' ? r.name_fr : r.name_en);
  const roleOptions = (roles ?? []).map((r) => ({ id: r.id, key: r.key, name: roleName(r), locked: r.locked }));
  const sectionOptions = sections.map((x) => ({ id: x.id, name: lang === 'fr' ? x.name_fr : x.name_en }));

  // One row per staff member, with all their roles.
  const staff = new Map<string, { person: NonNullable<typeof grants>[number]['people']; roles: { roleId: string; sectionId: string | null }[] }>();
  for (const g of grants ?? []) {
    const e = staff.get(g.person_id) ?? { person: g.people, roles: [] };
    e.roles.push({ roleId: g.role_id, sectionId: g.section_id });
    staff.set(g.person_id, e);
  }
  const rows = [...staff.entries()].sort((a, b) => a[1].person.last_name.localeCompare(b[1].person.last_name));
  const levelOf = (roleId: string, area: string) => perms?.find((p) => p.role_id === roleId && p.area === area)?.level ?? 'none';
  const secName = (id: string | null) => sectionOptions.find((x) => x.id === id)?.name;

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">{t.staff.usersTitle}</h1>
          <p className="page__lede">{t.staff.usersSub}</p>
        </div>
        {canEdit ? (
          <div className="page__actions">
            <Link className="cb-btn cb-btn--ghost cb-btn--md" href={`/c/${choir}/audit` as never}>
              {t.staff.auditTitle}
            </Link>
            <AddStaffForm slug={choir} orgId={org} roles={roleOptions} isDemo={ctx.org.is_demo} s={s} />
          </div>
        ) : null}
      </div>

      <Card title={t.staff.staffList} padded={false}>
        <ul className="plain-list">
          {rows.map(([pid, { person, roles: mine }]) => {
            const name = `${person.preferred_name || person.first_name} ${person.last_name}`;
            return (
              <li key={pid} className="person-row" style={{ padding: '10px 16px' }}>
                <Avatar name={name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="person-row__name">
                    {name}
                    {mine.map((m) => {
                      const r = roles?.find((x) => x.id === m.roleId);
                      return r ? (
                        <Badge key={m.roleId} tone={r.key === 'administrator' ? 'accent' : 'neutral'} icon="shield-check">
                          {roleName(r)}
                          {m.sectionId ? ` · ${secName(m.sectionId) ?? ''}` : ''}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <div className="muted small">
                    {person.email ?? '—'} · {person.user_id ? t.staff.accSignedUp : t.staff.accInvited}
                  </div>
                </div>
                {canEdit && !person.user_id && person.email ? <InviteButton orgId={org} personId={pid} s={s} /> : null}
                {canEdit ? <RolesEditor slug={choir} personId={pid} name={name} roles={roleOptions} current={mine} sections={sectionOptions} s={s} /> : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={t.staff.rolesTitle} action={canEdit ? <NewRoleForm slug={choir} roles={roleOptions} s={s} /> : undefined}>
        <p className="muted" style={{ marginTop: 0 }}>
          {t.staff.rolesIntro}
        </p>
        <div className="table-scroll">
          <table className="simple-table perm-table">
            <caption className="cb-sr-only">{t.staff.rolesTitle}</caption>
            <thead>
              <tr>
                <th scope="col">{t.staff.accessArea}</th>
                {(roles ?? []).map((r) => (
                  <th key={r.id} scope="col">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {roleName(r)}
                      {canEdit && !r.key ? <DeleteRoleButton slug={choir} roleId={r.id} name={roleName(r)} s={s} /> : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_AREAS.map((area) => (
                <tr key={area}>
                  <th scope="row">{t.staff[`area_${area}`]}</th>
                  {(roles ?? []).map((r) => (
                    <td key={r.id}>
                      <PermissionCell
                        slug={choir}
                        roleId={r.id}
                        area={area}
                        level={levelOf(r.id, area)}
                        locked={r.locked || !canEdit}
                        label={`${roleName(r)}: ${t.staff[`area_${area}`]}`}
                        s={s}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
