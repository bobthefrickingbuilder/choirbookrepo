import { format, type Messages } from '@choirbook/shared/i18n';
import { Avatar, Badge, Button, Card, EmptyState, Icon } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DismissReportsButton, HideMessageButton, NewMonthlyUpdate } from '@/components/staff/CommsParts';
import { Forbidden } from '@/components/staff/Forbidden';
import { formatDate, formatTime, isoDaysFromNow, todayLocal } from '@/lib/format';
import { categoryLabel } from '@/lib/labels';
import { getT } from '@/lib/prefs';
import { getChoirContext, type ChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';
import { HeldMessageActions } from '@/components/staff/PrivacySettings';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Communications' };

type Tab = 'announcements' | 'inbox' | 'updates' | 'moderation' | 'email';

export default async function CommsPage({ params, searchParams }: PageProps<'/c/[choir]/communications'>) {
  const { choir } = await params;
  const sp = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const tabs = (
    [
      ['announcements', t.staff.tabAnnouncements, ctx.can('announcements')],
      ['inbox', t.staff.tabInbox, ctx.can('inbox')],
      ['updates', t.staff.tabUpdates, ctx.can('monthly_updates')],
      ['moderation', t.staff.tabModeration, ctx.can('moderation')],
      ['email', t.staff.tabEmail, ctx.can('announcements')],
    ] as [Tab, string, boolean][]
  ).filter((x) => x[2]);
  if (!tabs.length) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const tab: Tab = tabs.find((x) => x[0] === sp.tab)?.[0] ?? tabs[0]![0];

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">{t.staff.commsTitle}</h1>
          <p className="page__lede">{t.staff.commsSub}</p>
        </div>
        {tab === 'announcements' && ctx.can('announcements', 'edit') ? (
          <div className="page__actions">
            <Button iconStart="megaphone" href={`/c/${choir}/communications/new`}>
              {t.staff.newAnnouncement}
            </Button>
          </div>
        ) : null}
      </div>
      <nav className="tabs" aria-label={t.staff.commsTitle}>
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/c/${choir}/communications?tab=${id}` as never} className="tabs__tab" aria-current={id === tab ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'announcements' ? <Announcements ctx={ctx} slug={choir} lang={lang} t={t} /> : null}
      {tab === 'inbox' ? <Inbox ctx={ctx} slug={choir} lang={lang} t={t} filter={typeof sp.f === 'string' ? sp.f : 'open'} /> : null}
      {tab === 'updates' ? <Updates ctx={ctx} slug={choir} lang={lang} t={t} /> : null}
      {tab === 'moderation' ? <Moderation ctx={ctx} slug={choir} lang={lang} t={t} /> : null}
      {tab === 'email' ? <EmailLog ctx={ctx} lang={lang} t={t} /> : null}
    </div>
  );
}

type Props = { ctx: ChoirContext; slug: string; lang: 'en' | 'fr'; t: Messages };

async function EmailBudget({ ctx, t }: { ctx: ChoirContext; t: Messages }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('email_budget_today', { org: ctx.org.id }).maybeSingle();
  return (
    <Card title={t.staff.emailBudget}>
      <p style={{ margin: 0 }}>
        {format(t.staff.emailBudgetBody, { left: data?.remaining_today ?? 100, cap: 100, queued: data?.queued_for_choir ?? 0 })}
      </p>
      <div className="qr-bar" style={{ width: '100%', marginTop: 10 }} aria-hidden>
        <span style={{ width: `${(data?.remaining_today ?? 100)}%` }} />
      </div>
      {ctx.org.is_demo ? <p className="muted small">{t.staff.emailDemo}</p> : null}
    </Card>
  );
}

async function Announcements({ ctx, slug, lang, t }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('announcements')
    .select('id, title, pinned, requires_ack, publish_at, published_at, notified_at, created_at, announcement_recipients(read_at, acknowledged_at)')
    .eq('organization_id', ctx.org.id)
    .order('created_at', { ascending: false })
    .limit(60);
  const now = isoDaysFromNow(0);
  return (
    <div className="profile-grid profile-grid--wide-left">
      <Card padded={false}>
        {data?.length ? (
          <ul className="plain-list">
            {data.map((a) => {
              const total = a.announcement_recipients.length;
              const read = a.announcement_recipients.filter((r) => r.read_at).length;
              const acks = a.announcement_recipients.filter((r) => r.acknowledged_at).length;
              const state = !a.published_at ? 'draft' : a.published_at > now ? 'scheduled' : 'sent';
              return (
                <li key={a.id}>
                  <Link href={`/c/${slug}/communications/${a.id}` as never} className="event-pick" style={{ padding: '12px 16px' }}>
                    <Icon name={a.pinned ? 'pin' : 'megaphone'} size={20} />
                    <span className="event-pick__main">
                      <strong>{a.title}</strong>
                      <span className="muted small">
                        {state === 'draft'
                          ? t.staff.stDraft
                          : format(state === 'scheduled' ? t.staff.stScheduled : t.staff.stSent, {
                              date: `${formatDate(a.published_at!, lang, { month: 'short', day: 'numeric' })}, ${formatTime(a.published_at!, lang)}`,
                            })}
                      </span>
                    </span>
                    {state === 'sent' ? (
                      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Badge tone={read === total ? 'success' : 'neutral'}>{format(t.staff.readN, { read, total })}</Badge>
                        {a.requires_ack ? <Badge tone="info">{format(t.staff.ackN, { n: acks })}</Badge> : null}
                      </span>
                    ) : (
                      <Badge tone={state === 'draft' ? 'slate' : 'warning'} icon={state === 'draft' ? 'pen-line' : 'clock'}>
                        {state === 'draft' ? t.staff.stDraft : t.staff.schedule}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon="megaphone" size="sm">
            {t.staff.noneYet}
          </EmptyState>
        )}
      </Card>
      <EmailBudget ctx={ctx} t={t} />
    </div>
  );
}

async function Inbox({ ctx, slug, lang, t, filter }: Props & { filter: string }) {
  const supabase = await createClient();
  let q = supabase
    .from('conversations')
    .select('id, subject, category, status, assigned_to, member_id, last_message_at, created_at, first_staff_reply_at')
    .eq('organization_id', ctx.org.id)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (filter === 'resolved') q = q.eq('status', 'resolved');
  else q = q.eq('status', 'open');
  if (filter === 'mine') q = q.eq('assigned_to', ctx.personId);
  if (filter === 'unassigned') q = q.is('assigned_to', null);
  const [{ data: convs }, { data: recent }] = await Promise.all([
    q,
    supabase.from('conversations').select('created_at, first_staff_reply_at').eq('organization_id', ctx.org.id).not('first_staff_reply_at', 'is', null).order('created_at', { ascending: false }).limit(50),
  ]);
  const ids = [...new Set((convs ?? []).flatMap((c) => [c.member_id, c.assigned_to]).filter((x): x is string => Boolean(x)))];
  const { data: people } = ids.length ? await supabase.from('member_directory').select('id, first_name, last_name').in('id', ids) : { data: [] };
  const name = (id: string | null) => {
    const p = people?.find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : '—';
  };
  const hours = (recent ?? []).map((c) => (Date.parse(c.first_staff_reply_at!) - Date.parse(c.created_at)) / 3_600_000).sort((a, b) => a - b);
  const median = hours.length ? Math.round(hours[Math.floor(hours.length / 2)]! * 10) / 10 : null;
  const cutoff = isoDaysFromNow(-2);
  const filters: [string, string][] = [
    ['open', t.staff.filterOpen],
    ['mine', t.staff.filterMine],
    ['unassigned', t.staff.filterUnassigned],
    ['resolved', t.staff.filterResolved],
  ];

  return (
    <div className="stack">
      <div className="row-between">
        <div className="chip-row">
          {filters.map(([id, label]) => (
            <Link key={id} href={`/c/${slug}/communications?tab=inbox&f=${id}` as never} className="chip-link" aria-current={filter === id ? 'true' : undefined}>
              {label}
            </Link>
          ))}
        </div>
        {median !== null ? <span className="muted">{format(t.staff.medianReply, { hours: median })}</span> : null}
      </div>
      <Card padded={false}>
        {convs?.length ? (
          <ul className="plain-list">
            {convs.map((c) => {
              const waiting = c.status === 'open' && !c.first_staff_reply_at && c.created_at < cutoff;
              return (
                <li key={c.id}>
                  <Link href={`/c/${slug}/messages/${c.id}` as never} className="event-pick" style={{ padding: '12px 16px' }}>
                    <Avatar name={name(c.member_id)} size={32} />
                    <span className="event-pick__main">
                      <strong>{c.subject}</strong>
                      <span className="muted small">
                        {name(c.member_id)} · {categoryLabel(c.category, t)} · {formatDate(c.last_message_at, lang, { month: 'short', day: 'numeric' })}
                        {c.assigned_to ? ` · ${t.staff.assignTo}: ${name(c.assigned_to)}` : ''}
                      </span>
                    </span>
                    {waiting ? (
                      <Badge tone="error" icon="clock">
                        {t.staff.waitingOver48}
                      </Badge>
                    ) : !c.first_staff_reply_at ? (
                      <Badge tone="warning">{t.staff.noReplyYet}</Badge>
                    ) : (
                      <Badge tone={c.status === 'open' ? 'info' : 'neutral'}>{c.status === 'open' ? t.member.statusOpen : t.member.statusResolved}</Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon="inbox" size="sm">
            {t.staff.noneYet}
          </EmptyState>
        )}
      </Card>
    </div>
  );
}

async function Updates({ ctx, slug, lang, t }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('monthly_updates')
    .select('id, month, status, sent_at, monthly_update_deliveries(count)')
    .eq('organization_id', ctx.org.id)
    .order('month', { ascending: false });
  const today = todayLocal();
  return (
    <div className="stack">
      <p className="page__lede" style={{ margin: 0 }}>
        {t.staff.updatesIntro}
      </p>
      {ctx.can('monthly_updates', 'edit') ? <NewMonthlyUpdate slug={slug} defaultMonth={today.slice(0, 7)} s={staffStrings(t)} /> : null}
      <Card padded={false}>
        {data?.length ? (
          <ul className="plain-list">
            {data.map((u) => (
              <li key={u.id}>
                <Link href={`/c/${slug}/communications/updates/${u.id}` as never} className="event-pick" style={{ padding: '12px 16px' }}>
                  <Icon name="calendar-days" size={20} />
                  <span className="event-pick__main">
                    <strong>{formatDate(`${u.month}T12:00:00Z`, lang, { month: 'long', year: 'numeric' })}</strong>
                  </span>
                  <Badge tone={u.status === 'sent' ? 'success' : u.status === 'review' ? 'info' : 'slate'}>
                    {t.staff[`upStatus_${u.status}` as 'upStatus_draft']}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="calendar-days" size="sm">
            {t.staff.noneYet}
          </EmptyState>
        )}
      </Card>
    </div>
  );
}

async function Moderation({ ctx, slug, lang, t }: Props) {
  const supabase = await createClient();
  const [{ data: reports }, { data: suspended }, { data: held }] = await Promise.all([
    supabase
      .from('message_reports')
      .select('id, reason, created_at, reporter_person_id, message_id, messages!inner(id, body, author_person_id, hidden_at, conversation_id)')
      .eq('organization_id', ctx.org.id)
      .eq('status', 'open')
      .order('created_at'),
    supabase.from('people').select('id, first_name, last_name').eq('organization_id', ctx.org.id).not('messaging_suspended_at', 'is', null),
    supabase
      .from('messages')
      .select('id, body, created_at, author_person_id, conversation_id, conversations(subject)')
      .eq('organization_id', ctx.org.id)
      .eq('held_for_review', true)
      .is('hidden_at', null)
      .order('created_at')
      .limit(50),
  ]);
  const ids = [
    ...new Set(
      [...(reports ?? []).flatMap((r) => [r.reporter_person_id, r.messages.author_person_id]), ...(held ?? []).map((m) => m.author_person_id)].filter((x): x is string => Boolean(x)),
    ),
  ];
  const { data: people } = ids.length ? await supabase.from('member_directory').select('id, first_name, last_name').in('id', ids) : { data: [] };
  const name = (id: string | null) => {
    const p = people?.find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : '—';
  };
  const s = staffStrings(t);
  const canEdit = ctx.can('moderation', 'edit');
  return (
    <div className="profile-grid profile-grid--wide-left">
      <Card title={t.privacy.heldTitle} className="span-all">
        <p className="muted" style={{ marginTop: 0 }}>
          {t.privacy.heldIntro}
        </p>
        {held?.length ? (
          <ul className="plain-list" aria-label={t.privacy.heldTitle}>
            {held.map((m) => (
              <li key={m.id} className="note" style={{ marginBottom: 10 }}>
                <div className="muted small">
                  {format(t.privacy.heldBy, {
                    name: name(m.author_person_id),
                    date: formatDate(m.created_at, lang, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                    subject: (Array.isArray(m.conversations) ? m.conversations[0]?.subject : m.conversations?.subject) ?? '',
                  })}
                </div>
                <p>{m.body}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <Button size="sm" variant="ghost" iconStart="message-square" href={`/c/${slug}/messages/${m.conversation_id}`}>
                    {t.staff.openThread}
                  </Button>
                  {canEdit ? <HeldMessageActions slug={slug} messageId={m.id} s={{ release: t.privacy.release, hide: t.privacy.hide, failed: s.failed }} /> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t.privacy.heldNone}</p>
        )}
      </Card>
      <Card title={t.staff.reportsQueue}>
        {reports?.length ? (
          <ul className="plain-list">
            {reports.map((r) => (
              <li key={r.id} className="note" style={{ marginBottom: 10 }}>
                <div className="muted small">
                  {name(r.messages.author_person_id)} · {formatDate(r.created_at, lang, { month: 'short', day: 'numeric' })}
                </div>
                <p>{r.messages.body}</p>
                <p className="muted small">{format(t.staff.reportedBy, { name: name(r.reporter_person_id), reason: r.reason })}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <Button size="sm" variant="ghost" iconStart="message-square" href={`/c/${slug}/messages/${r.messages.conversation_id}`}>
                    {t.staff.openThread}
                  </Button>
                  {canEdit ? (
                    <>
                      <HideMessageButton slug={slug} id={r.messages.id} hidden={Boolean(r.messages.hidden_at)} s={s} />
                      <DismissReportsButton slug={slug} messageId={r.messages.id} s={s} />
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t.staff.reportsNone}</p>
        )}
      </Card>
      <Card title={t.staff.suspendedMembers}>
        {suspended?.length ? (
          <ul className="plain-list">
            {suspended.map((p) => (
              <li key={p.id}>
                <Link href={`/c/${slug}/roster/${p.id}` as never} className="event-pick">
                  <Avatar name={`${p.first_name} ${p.last_name}`} size={28} />
                  <span className="event-pick__main">
                    <strong>
                      {p.first_name} {p.last_name}
                    </strong>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t.staff.noneYet}</p>
        )}
      </Card>
    </div>
  );
}

async function EmailLog({ ctx, lang, t }: Omit<Props, 'slug'>) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('email_queue')
    .select('id, to_email, subject, status, created_at, sent_at')
    .eq('organization_id', ctx.org.id)
    .order('created_at', { ascending: false })
    .limit(100);
  return (
    <div className="stack">
      <EmailBudget ctx={ctx} t={t} />
      <Card title={t.staff.emailLog} padded={false}>
        <div className="table-scroll" style={{ border: 0 }}>
          <table className="simple-table">
            <thead>
              <tr>
                <th scope="col">{t.staff.date}</th>
                <th scope="col">{t.staff.emailTo}</th>
                <th scope="col">{t.staff.emailSubject}</th>
                <th scope="col">{t.staff.status}</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(e.created_at, lang, { month: 'short', day: 'numeric' })}, {formatTime(e.created_at, lang)}
                  </td>
                  <td>{e.to_email}</td>
                  <td>{e.subject}</td>
                  <td>
                    <Badge tone={e.status === 'sent' ? 'success' : e.status === 'failed' ? 'error' : 'neutral'}>{t.staff[`emailStatus_${e.status}` as 'emailStatus_sent']}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
