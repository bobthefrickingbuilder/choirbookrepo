import { Avatar, Badge, Button, Card } from '@choirbook/ui';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ReplyBox } from '@/components/member/ReplyBox';
import { ReportMessage } from '@/components/member/ReportMessage';
import { HideMessageButton, InboxControls } from '@/components/staff/CommsParts';
import { staffStrings } from '@/lib/staff';
import { formatDate, formatTime } from '@/lib/format';
import { categoryLabel } from '@/lib/labels';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export default async function ConversationPage({ params }: PageProps<'/c/[choir]/messages/[id]'>) {
  const { choir, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const [{ data: conv }, { data: messages }] = await Promise.all([
    supabase.from('conversations').select('id, subject, category, status, member_id, assigned_to').eq('id', id).maybeSingle(),
    supabase.from('messages').select('id, author_person_id, body, created_at, held_for_review, hidden_at').eq('conversation_id', id).order('created_at'),
  ]);
  if (!conv) notFound();
  // Inbox staff looking at someone else's conversation get the office controls.
  const asOffice = ctx.can('inbox') && conv.member_id !== ctx.personId;
  const { data: staffPeople } = asOffice
    ? await supabase.from('member_directory').select('id, first_name, last_name').eq('organization_id', ctx.org.id).eq('is_staff', true)
    : { data: [] };
  const s = staffStrings(t);

  // Names come from the member directory, which shows other members' names only.
  const authorIds = [...new Set((messages ?? []).map((m) => m.author_person_id).filter((x): x is string => Boolean(x)))];
  const { data: people } = authorIds.length
    ? await supabase.from('member_directory').select('id, first_name, last_name, is_staff').in('id', authorIds)
    : { data: [] };
  const nameOf = (pid: string | null) => {
    if (pid === ctx.personId) return t.member.you;
    const p = people?.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : t.member.office;
  };

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <Button variant="ghost" size="sm" iconStart="arrow-left" href={asOffice ? `/c/${choir}/communications?tab=inbox` : `/c/${choir}/messages`}>
        {asOffice ? t.staff.inboxTitle : t.member.messagesTitle}
      </Button>
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="page__title">{conv.subject}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone="neutral">{categoryLabel(conv.category, t)}</Badge>
          <Badge tone={conv.status === 'open' ? 'info' : 'neutral'}>{conv.status === 'open' ? t.member.statusOpen : t.member.statusResolved}</Badge>
        </div>
      </div>
      {asOffice ? (
        <Card>
          <InboxControls
            slug={choir}
            id={conv.id}
            status={conv.status}
            assignedTo={conv.assigned_to}
            category={conv.category}
            staff={(staffPeople ?? []).map((p) => ({ id: p.id!, name: `${p.first_name} ${p.last_name}` }))}
            canEdit={ctx.can('inbox', 'edit')}
            categories={(['general', 'absence', 'music', 'fees'] as const).map((c) => ({ value: c, label: categoryLabel(c, t) }))}
            s={s}
          />
        </Card>
      ) : null}
      <Card>
        <ol className="thread">
          {(messages ?? []).map((m) => {
            const mine = m.author_person_id === ctx.personId;
            return (
              <li key={m.id} className={'msg' + (mine ? ' msg--mine' : '')}>
                <Avatar name={mine ? ctx.displayName : nameOf(m.author_person_id)} size={32} />
                <div className="msg__bubble">
                  <div className="msg__meta">
                    <strong>{nameOf(m.author_person_id)}</strong>
                    <span className="muted">
                      {formatDate(m.created_at, lang, { month: 'short', day: 'numeric' })}, {formatTime(m.created_at, lang)}
                    </span>
                  </div>
                  <p className="msg__body">{m.body}</p>
                  {m.hidden_at ? <Badge tone="slate" icon="eye-off">{t.staff.hiddenMessage}</Badge> : null}
                  {asOffice && ctx.can('moderation', 'edit') && !mine ? <HideMessageButton slug={choir} id={m.id} hidden={Boolean(m.hidden_at)} s={s} /> : null}
                  {m.held_for_review ? <Badge tone="warning">{t.member.heldForReview}</Badge> : null}
                  {!mine && !asOffice ? (
                    <ReportMessage
                      slug={choir}
                      messageId={m.id}
                      s={{
                        report: t.member.reportMessage,
                        title: t.member.reportTitle,
                        intro: t.member.reportIntro,
                        reason: t.member.reportReason,
                        send: t.member.reportSend,
                        done: t.member.reported,
                        cancel: t.common.close,
                        failed: t.member.genericFail,
                      }}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
      <ReplyBox slug={choir} conversationId={conv.id} s={{ reply: t.member.reply, send: t.member.send, failed: t.member.genericFail, paused: t.member.messagingPaused }} />
    </div>
  );
}
