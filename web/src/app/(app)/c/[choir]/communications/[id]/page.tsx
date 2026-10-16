import { format } from '@choirbook/shared/i18n';
import { AlertCard, Badge, Card } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AnnouncementComposer, DeleteAnnouncementButton } from '@/components/staff/CommsParts';
import { Forbidden } from '@/components/staff/Forbidden';
import { getSections } from '@/lib/data/roster';
import { formatDate, formatTime, localParts, todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Announcement' };

export default async function AnnouncementPage({ params, searchParams }: PageProps<'/c/[choir]/communications/[id]'>) {
  const { choir, id } = await params;
  const { sent } = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(id).success) notFound();
  if (!ctx.can('announcements')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const [{ data: a }, sections] = await Promise.all([
    supabase.from('announcements').select('*, announcement_recipients(person_id, read_at, acknowledged_at)').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle(),
    getSections(ctx.org.id),
  ]);
  if (!a) notFound();
  const audience = (a.audience ?? {}) as { all?: boolean; section_ids?: string[]; person_ids?: string[] };
  const recipientIds = a.announcement_recipients.map((r) => r.person_id);
  const listIds = [...new Set([...recipientIds, ...(audience.person_ids ?? [])])];
  const { data: people } = listIds.length ? await supabase.from('member_directory').select('id, first_name, last_name').in('id', listIds) : { data: [] };
  const nameOf = (pid: string) => {
    const p = people?.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : '—';
  };
  const s = staffStrings(t);
  const isSent = Boolean(a.notified_at);
  const pub = a.publish_at ? localParts(a.publish_at) : null;
  const rows = [...a.announcement_recipients].sort((x, y) => Number(Boolean(x.read_at)) - Number(Boolean(y.read_at)) || nameOf(x.person_id).localeCompare(nameOf(y.person_id)));
  const read = rows.filter((r) => r.read_at).length;

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <Link href={`/c/${choir}/communications` as never} className="back-link">
        ← {t.staff.commsTitle}
      </Link>
      <div className="page__head">
        <div>
          <h1 className="page__title">{a.title}</h1>
          {a.published_at ? (
            <p className="page__lede">
              {format(isSent ? t.staff.stSent : t.staff.stScheduled, {
                date: `${formatDate(a.published_at, lang, { month: 'long', day: 'numeric' })}, ${formatTime(a.published_at, lang)}`,
              })}
            </p>
          ) : (
            <Badge tone="slate">{t.staff.stDraft}</Badge>
          )}
        </div>
        {ctx.can('announcements', 'edit') ? (
          <div className="page__actions">
            <DeleteAnnouncementButton slug={choir} id={a.id} s={s} />
          </div>
        ) : null}
      </div>
      {typeof sent === 'string' ? <AlertCard tone="success">{format(t.staff.sentTo, { n: Number(sent) || 0 })}</AlertCard> : null}

      <div className="profile-grid profile-grid--wide-left">
        <Card title={isSent ? t.staff.editAnnouncement : t.staff.editAnnouncement}>
          {ctx.can('announcements', 'edit') ? (
            <AnnouncementComposer
              slug={choir}
              id={a.id}
              sent={isSent}
              sections={sections.map((x) => ({ id: x.id, name: lang === 'fr' ? x.name_fr : x.name_en }))}
              people={(audience.person_ids ?? []).map((pid) => ({ id: pid, name: nameOf(pid) }))}
              s={s}
              initial={{
                title: a.title,
                body: a.body,
                audience: audience.all ? 'all' : audience.section_ids?.length ? 'sections' : audience.person_ids?.length ? 'people' : 'all',
                section_ids: audience.section_ids ?? [],
                person_ids: audience.person_ids ?? [],
                pinned: a.pinned,
                requires_ack: a.requires_ack,
                ack_due_on: a.ack_due_on ?? '',
                when: a.published_at ? (a.publish_at ? 'schedule' : 'now') : 'draft',
                publish_date: pub?.date ?? todayLocal(),
                publish_time: pub?.time ?? '09:00',
              }}
            />
          ) : (
            <p style={{ whiteSpace: 'pre-wrap' }}>{a.body}</p>
          )}
        </Card>
        <Card title={`${t.staff.readReceipts} · ${format(t.staff.readN, { read, total: rows.length })}`}>
          {rows.length ? (
            <ul className="plain-list">
              {rows.map((r) => (
                <li key={r.person_id} className="history-row">
                  <span>{nameOf(r.person_id)}</span>
                  {r.acknowledged_at ? (
                    <Badge tone="success" icon="check-check">
                      {t.staff.acknowledged}
                    </Badge>
                  ) : r.read_at ? (
                    <Badge tone="info" icon="check">
                      {t.staff.read}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{t.staff.unread}</Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t.staff.noneYet}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
