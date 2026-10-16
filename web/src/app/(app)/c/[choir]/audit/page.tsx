import { Badge, Card, EmptyState } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { formatDate, formatTime } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Audit log' };

const ACTIONS = ['view', 'insert', 'update', 'delete', 'export', 'permission_change'] as const;
const PAGE = 100;

export default async function AuditPage({ params, searchParams }: PageProps<'/c/[choir]/audit'>) {
  const { choir } = await params;
  const sp = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('audit')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const action = ACTIONS.find((a) => a === sp.action);
  const before = typeof sp.before === 'string' && /^\d+$/.test(sp.before) ? Number(sp.before) : null;
  const supabase = await createClient();
  let q = supabase
    .from('audit_log')
    .select('id, actor_id, action, entity, entity_id, changed_columns, details, created_at')
    .eq('organization_id', ctx.org.id)
    .order('id', { ascending: false })
    .limit(PAGE);
  if (action) q = q.eq('action', action);
  if (before) q = q.lt('id', before);
  const { data: rows } = await q;

  // Names: the actor's person record in this choir, and the person a row is about.
  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter((x): x is string => Boolean(x)))];
  const personIds = [...new Set((rows ?? []).filter((r) => ['people', 'choristers', 'care_notes', 'staff_notes'].includes(r.entity) && r.entity_id).map((r) => r.entity_id!))].filter((x) =>
    /^[0-9a-f-]{36}$/.test(x),
  );
  const [{ data: actors }, { data: subjects }] = await Promise.all([
    actorIds.length ? supabase.from('people').select('user_id, first_name, last_name').eq('organization_id', ctx.org.id).in('user_id', actorIds) : Promise.resolve({ data: [] }),
    personIds.length ? supabase.from('people').select('id, first_name, last_name').eq('organization_id', ctx.org.id).in('id', personIds) : Promise.resolve({ data: [] }),
  ]);
  const actorName = (id: string | null) => {
    const a = actors?.find((x) => x.user_id === id);
    return a ? `${a.first_name} ${a.last_name}` : t.staff.system;
  };
  const subject = (r: NonNullable<typeof rows>[number]) => {
    const p = subjects?.find((x) => x.id === r.entity_id);
    return p ? `${p.first_name} ${p.last_name}` : r.entity_id ? `${r.entity} ${r.entity_id.slice(0, 8)}` : r.entity;
  };
  const tone = (a: string) => (a === 'delete' ? 'error' : a === 'permission_change' ? 'warning' : a === 'export' ? 'info' : 'neutral');
  const last = rows?.[rows.length - 1]?.id;

  return (
    <div className="page page--wide">
      <Link href={`/c/${choir}/users` as never} className="back-link">
        ← {t.staff.usersTitle}
      </Link>
      <div>
        <h1 className="page__title">{t.staff.auditTitle}</h1>
        <p className="page__lede">{t.staff.auditSub}</p>
      </div>
      <nav className="chip-row" aria-label={t.staff.auditWhat}>
        <Link href={`/c/${choir}/audit` as never} className="chip-link" aria-current={!action ? 'true' : undefined}>
          {t.staff.auditFilterAll}
        </Link>
        {ACTIONS.map((a) => (
          <Link key={a} href={`/c/${choir}/audit?action=${a}` as never} className="chip-link" aria-current={action === a ? 'true' : undefined}>
            {t.staff[`audit_${a}`]}
          </Link>
        ))}
      </nav>
      <Card padded={false}>
        {rows?.length ? (
          <div className="table-scroll" style={{ border: 0 }}>
            <table className="simple-table">
              <thead>
                <tr>
                  <th scope="col">{t.staff.auditWhen}</th>
                  <th scope="col">{t.staff.auditWho}</th>
                  <th scope="col">{t.staff.auditWhat}</th>
                  <th scope="col">{t.staff.auditRecord}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(r.created_at, lang, { month: 'short', day: 'numeric' })}, {formatTime(r.created_at, lang)}
                    </td>
                    <td>{actorName(r.actor_id)}</td>
                    <td>
                      <Badge tone={tone(r.action)}>{t.staff[`audit_${r.action}` as 'audit_view']}</Badge>
                    </td>
                    <td>
                      {subject(r)}
                      {r.changed_columns?.length ? <div className="muted small">{r.changed_columns.join(', ')}</div> : null}
                      {r.action === 'export' && r.details && typeof r.details === 'object' && 'rows' in r.details ? <div className="muted small">{String((r.details as { rows: number }).rows)} rows</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="history" size="sm">
            {t.staff.noneYet}
          </EmptyState>
        )}
      </Card>
      {rows?.length === PAGE && last ? (
        <div>
          <Link className="cb-btn cb-btn--secondary cb-btn--md" href={`/c/${choir}/audit?${action ? `action=${action}&` : ''}before=${last}` as never}>
            {t.staff.olderEntries}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
