import { format } from '@choirbook/shared/i18n';
import { Card, EmptyState, Icon } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarkAllRead } from '@/components/member/SmallActions';
import { formatDate, formatTime } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage({ params }: PageProps<'/c/[choir]/notifications'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, link, read_at, created_at')
    .eq('organization_id', ctx.org.id)
    .order('created_at', { ascending: false })
    .limit(100);
  const unread = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page__head">
        <div>
          <h1 className="page__title">{t.nav.notifications}</h1>
          {unread ? <p className="page__lede">{format(t.member.newCount, { n: unread })}</p> : null}
        </div>
        {unread ? <MarkAllRead slug={choir} label={t.member.markAllRead} /> : null}
      </div>
      <Card padded={false}>
        {!data?.length ? (
          <EmptyState icon="bell" size="sm">
            {t.member.noNotifications}
          </EmptyState>
        ) : (
          <ul className="plain-list">
            {data.map((n) => {
              const inner = (
                <>
                  <Icon name={n.read_at ? 'bell' : 'circle-dot'} size={18} />
                  <span className="conv-row__main">
                    <strong>{n.title}</strong>
                    {n.body ? <span className="muted">{n.body}</span> : null}
                  </span>
                  <span className="muted">
                    {formatDate(n.created_at, lang, { month: 'short', day: 'numeric' })}, {formatTime(n.created_at, lang)}
                  </span>
                </>
              );
              return (
                <li key={n.id} className={n.read_at ? undefined : 'is-unread'}>
                  {n.link ? (
                    <Link href={n.link.replace(/^\/c\/[^/]+/, `/c/${choir}`) as never} className="conv-row">
                      {inner}
                    </Link>
                  ) : (
                    <div className="conv-row">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
