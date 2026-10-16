import { Badge, Card, EmptyState, Icon } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NewConversation } from '@/components/member/NewConversation';
import { formatDate } from '@/lib/format';
import { categoryLabel } from '@/lib/labels';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage({ params }: PageProps<'/c/[choir]/messages'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, subject, category, status, last_message_at')
    .eq('member_id', ctx.personId)
    .order('last_message_at', { ascending: false });

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page__head">
        <div>
          <h1 className="page__title">{t.member.messagesTitle}</h1>
          <p className="page__lede">{t.member.messagesIntro}</p>
        </div>
        <NewConversation
          slug={choir}
          s={{
            newMessage: t.member.newMessage,
            subject: t.member.subject,
            category: t.member.category,
            catAbsence: t.member.catAbsence,
            catMusic: t.member.catMusic,
            catFees: t.member.catFees,
            catGeneral: t.member.catGeneral,
            message: t.member.message,
            send: t.member.send,
            cancel: t.common.cancel,
            required: t.validation.required,
            failed: t.member.genericFail,
            paused: t.member.messagingPaused,
          }}
        />
      </div>
      <Card padded={false}>
        {!convs?.length ? (
          <EmptyState icon="message-square" size="sm">
            {t.member.noConversations}
          </EmptyState>
        ) : (
          <ul className="plain-list">
            {convs.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${choir}/messages/${c.id}` as never} className="conv-row">
                  <Icon name="message-square" size={18} />
                  <span className="conv-row__main">
                    <strong>{c.subject}</strong>
                    <span className="muted">
                      {categoryLabel(c.category, t)} · {formatDate(c.last_message_at, lang, { month: 'short', day: 'numeric' })}
                    </span>
                  </span>
                  <Badge tone={c.status === 'open' ? 'info' : 'neutral'}>{c.status === 'open' ? t.member.statusOpen : t.member.statusResolved}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
