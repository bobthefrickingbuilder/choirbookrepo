import { format } from '@choirbook/shared/i18n';
import { Badge, Card } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MonthlyUpdateEditor, SummaryCard, type MonthlyContent } from '@/components/staff/CommsParts';
import { Forbidden } from '@/components/staff/Forbidden';
import { formatDate, formatMoney } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Monthly update' };

export default async function MonthlyUpdatePage({ params, searchParams }: PageProps<'/c/[choir]/communications/updates/[id]'>) {
  const { choir, id } = await params;
  const { person } = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(id).success) notFound();
  if (!ctx.can('monthly_updates')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const [{ data: u }, { data: deliveries }] = await Promise.all([
    supabase.from('monthly_updates').select('*').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle(),
    supabase.from('monthly_update_deliveries').select('person_id, content, opened_at').eq('update_id', id),
  ]);
  if (!u) notFound();
  const ids = (deliveries ?? []).map((d) => d.person_id);
  const { data: people } = ids.length ? await supabase.from('member_directory').select('id, first_name, last_name').in('id', ids) : { data: [] };
  const sorted = [...(deliveries ?? [])].sort((a, b) => {
    const pa = people?.find((p) => p.id === a.person_id);
    const pb = people?.find((p) => p.id === b.person_id);
    return (pa?.last_name ?? '').localeCompare(pb?.last_name ?? '');
  });
  const picked = sorted.find((d) => d.person_id === person) ?? sorted[0];
  const pickedName = (() => {
    const p = people?.find((x) => x.id === picked?.person_id);
    return p ? `${p.first_name} ${p.last_name}` : '';
  })();
  const content = (picked?.content ?? {}) as MonthlyContent;
  const s = staffStrings(t);
  const monthName = formatDate(`${u.month}T12:00:00Z`, lang, { month: 'long', year: 'numeric' });

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <Link href={`/c/${choir}/communications?tab=updates` as never} className="back-link">
        ← {t.staff.tabUpdates}
      </Link>
      <div className="page__head">
        <h1 className="page__title">{monthName}</h1>
        <Badge tone={u.status === 'sent' ? 'success' : u.status === 'review' ? 'info' : 'slate'} size="md">
          {t.staff[`upStatus_${u.status}` as 'upStatus_draft']}
        </Badge>
      </div>
      <div className="profile-grid">
        <Card>
          <MonthlyUpdateEditor
            slug={choir}
            id={u.id}
            status={u.status as 'draft' | 'review' | 'scheduled' | 'sent'}
            initial={{ conductor_note: u.conductor_note ?? '', free_text: u.free_text ?? '' }}
            deliveries={deliveries?.length ?? 0}
            s={s}
          />
        </Card>
        {picked ? (
          <Card title={format(t.staff.previewFor, { name: pickedName })}>
            <div className="stack" style={{ gap: 12 }}>
              <p style={{ margin: 0 }}>
                <strong>{content.first_name}</strong>, {monthName}
              </p>
              {u.conductor_note ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{u.conductor_note}</p> : null}
              <SummaryCard
                content={content}
                s={s}
                money={formatMoney(content.owing_cents ?? 0, lang)}
                dates={(content.coming_up ?? []).map((c) => formatDate(c.starts_at, lang, { month: 'short', day: 'numeric' }))}
              />
              {u.free_text ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{u.free_text}</p> : null}
              <details className="history">
                <summary>{t.staff.preview}</summary>
                <ul className="plain-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {sorted.map((d) => {
                    const p = people?.find((x) => x.id === d.person_id);
                    return (
                      <li key={d.person_id}>
                        <Link href={`/c/${choir}/communications/updates/${u.id}?person=${d.person_id}` as never} className="event-pick" style={{ minHeight: 40 }}>
                          {p ? `${p.first_name} ${p.last_name}` : '—'}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
