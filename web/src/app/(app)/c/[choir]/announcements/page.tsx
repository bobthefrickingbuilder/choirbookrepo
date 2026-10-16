import { Card, EmptyState } from '@choirbook/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AnnouncementsFeed } from '@/components/member/AnnouncementsFeed';
import { SummaryCard, type MonthlyContent } from '@/components/staff/CommsParts';
import { formatDate, formatMoney } from '@/lib/format';
import { staffStrings } from '@/lib/staff';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Announcements' };

export default async function AnnouncementsPage({ params }: PageProps<'/c/[choir]/announcements'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const [{ data }, { data: updates }] = await Promise.all([
    supabase
      .from('announcement_recipients')
      .select('read_at, acknowledged_at, announcements!inner(id, title, body, pinned, requires_ack, ack_due_on, published_at)')
      .eq('person_id', ctx.personId),
    // The member's latest monthly update, if one has been sent.
    supabase
      .from('monthly_update_deliveries')
      .select('content, sent_at, monthly_updates!inner(month, conductor_note, free_text)')
      .eq('person_id', ctx.personId)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(1),
  ]);
  const update = updates?.[0];
  const content = (update?.content ?? {}) as MonthlyContent;

  const items = (data ?? [])
    .filter((r) => r.announcements.published_at)
    .sort((a, b) => Number(b.announcements.pinned) - Number(a.announcements.pinned) || (b.announcements.published_at ?? '').localeCompare(a.announcements.published_at ?? ''))
    .map((r) => ({
      id: r.announcements.id,
      title: r.announcements.title,
      body: r.announcements.body,
      date: formatDate(r.announcements.published_at!, lang, { month: 'long', day: 'numeric' }),
      pinned: r.announcements.pinned,
      unread: !r.read_at,
      requiresAck: r.announcements.requires_ack,
      acknowledged: Boolean(r.acknowledged_at),
      acknowledgedAt: r.acknowledged_at ? formatDate(r.acknowledged_at, lang, { month: 'short', day: 'numeric' }) : undefined,
      ackDue: r.announcements.ack_due_on ? formatDate(`${r.announcements.ack_due_on}T12:00:00Z`, lang, { month: 'long', day: 'numeric' }) : undefined,
    }));

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <h1 className="page__title">{t.nav.announcements}</h1>
      {update ? (
        <Card title={`${t.staff.tabUpdates} · ${formatDate(`${update.monthly_updates.month}T12:00:00Z`, lang, { month: 'long', year: 'numeric' })}`}>
          <div className="stack" style={{ gap: 12 }}>
            {update.monthly_updates.conductor_note ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{update.monthly_updates.conductor_note}</p> : null}
            <SummaryCard
              content={content}
              s={staffStrings(t)}
              money={formatMoney(content.owing_cents ?? 0, lang)}
              dates={(content.coming_up ?? []).map((c) => formatDate(c.starts_at, lang, { month: 'short', day: 'numeric' }))}
            />
            {update.monthly_updates.free_text ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{update.monthly_updates.free_text}</p> : null}
          </div>
        </Card>
      ) : null}
      {items.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon="megaphone" size="sm">
            {t.member.noAnnouncements}
          </EmptyState>
        </Card>
      ) : (
        <Card padded={false}>
          <AnnouncementsFeed slug={choir} items={items} lang={lang} />
        </Card>
      )}
    </div>
  );
}
