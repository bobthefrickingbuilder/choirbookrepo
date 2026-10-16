import { format, type Messages } from '@choirbook/shared/i18n';
import { Badge, Card, EmptyState, Icon, VoicePartBadge } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { getTermAbsences } from '@/lib/data/roster';
import { formatDate, formatTime, isoDaysFromNow, localParts, todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { getCurrentTerm } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Attendance' };

type Ev = { id: string; title: string; starts_at: string; type: string; section_ids: string[] };

export default async function AttendancePage({ params }: PageProps<'/c/[choir]/attendance'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('attendance')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;

  const supabase = await createClient();
  const org = ctx.org.id;
  const today = todayLocal();
  const from = isoDaysFromNow(-35);
  const to = isoDaysFromNow(8);
  const [{ data: events }, { data: choristers }, term] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, starts_at, type, section_ids')
      .eq('organization_id', org)
      .eq('counts_for_attendance', true)
      .is('cancelled_at', null)
      .neq('type', 'deadline')
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at', { ascending: false }),
    supabase.from('choristers').select('person_id, section_id, people!inner(first_name, last_name, preferred_name), voice_parts(key)').eq('organization_id', org).neq('status', 'departed'),
    getCurrentTerm(org, today),
  ]);
  const ids = (events ?? []).map((e) => e.id);
  const [{ data: marks }, absences] = await Promise.all([
    ids.length ? supabase.from('attendance').select('event_id').in('event_id', ids) : Promise.resolve({ data: [] as { event_id: string }[] }),
    getTermAbsences(org, term),
  ]);
  const markedBy = new Map<string, number>();
  for (const m of marks ?? []) markedBy.set(m.event_id, (markedBy.get(m.event_id) ?? 0) + 1);
  const expected = (e: Ev) => (choristers ?? []).filter((c) => !e.section_ids.length || (c.section_id && e.section_ids.includes(c.section_id))).length;

  const groups: { label: string; items: Ev[] }[] = [
    { label: t.staff.todayEvents, items: (events ?? []).filter((e) => localParts(e.starts_at).date === today).reverse() },
    { label: t.staff.upcomingEvents, items: (events ?? []).filter((e) => localParts(e.starts_at).date > today).reverse() },
    { label: t.staff.recentEvents, items: (events ?? []).filter((e) => localParts(e.starts_at).date < today) },
  ].filter((g) => g.items.length);

  const limit = term?.absence_limit ?? null;
  const near = limit === null ? [] : (choristers ?? [])
    .map((c) => ({ c, n: absences.get(c.person_id) ?? 0 }))
    .filter((x) => x.n >= Math.max(1, limit - 1))
    .sort((a, b) => b.n - a.n);

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <div className="page__head">
        <div>
          {term ? <p className="overline overline--accent">{term.name}</p> : null}
          <h1 className="page__title">{t.staff.attendanceTitle}</h1>
          <p className="page__lede">{t.staff.attendanceSub}</p>
        </div>
      </div>
      <div className="profile-grid">
        <div className="stack">
          {groups.length ? (
            groups.map((g) => (
              <Card key={g.label} title={g.label}>
                <ul className="plain-list">
                  {g.items.map((e) => (
                    <EventPick key={e.id} e={e} slug={choir} lang={lang} t={t} marked={markedBy.get(e.id) ?? 0} total={expected(e)} />
                  ))}
                </ul>
              </Card>
            ))
          ) : (
            <Card padded={false}>
              <EmptyState icon="calendar" size="sm">
                {t.staff.noneYet}
              </EmptyState>
            </Card>
          )}
        </div>
        <Card title={t.staff.atLimitList} action={limit !== null ? <Badge tone="neutral">{format(t.staff.limitN, { n: limit })}</Badge> : undefined}>
          {limit === null ? (
            <p className="muted">{t.staff.noLimit}</p>
          ) : near.length ? (
            <ul className="plain-list">
              {near.map(({ c, n }) => (
                <li key={c.person_id}>
                  <Link href={`/c/${choir}/roster/${c.person_id}` as never} className="event-pick">
                    {c.voice_parts?.key ? <VoicePartBadge part={c.voice_parts.key} lang={lang} /> : null}
                    <span className="event-pick__main">
                      <strong>
                        {c.people.preferred_name || c.people.first_name} {c.people.last_name}
                      </strong>
                    </span>
                    <Badge tone={n >= limit ? 'error' : 'warning'} icon="triangle-alert">
                      {format(t.staff.absencesOf, { n, limit })}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t.staff.atLimitNone}</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function EventPick({ e, slug, lang, t, marked, total }: { e: Ev; slug: string; lang: 'en' | 'fr'; t: Messages; marked: number; total: number }) {
  const complete = total > 0 && marked >= total;
  return (
    <li>
      <Link href={`/c/${slug}/attendance/${e.id}` as never} className="event-pick">
        <Icon name={e.type === 'concert' ? 'mic-vocal' : 'music'} size={20} />
        <span className="event-pick__main">
          <strong>{e.title}</strong>
          <span className="muted small">
            {formatDate(e.starts_at, lang, { weekday: 'short', month: 'short', day: 'numeric' })} · {formatTime(e.starts_at, lang)}
          </span>
        </span>
        <Badge tone={complete ? 'success' : marked ? 'warning' : 'neutral'} icon={complete ? 'check' : 'clipboard-check'}>
          {format(t.staff.markedN, { marked, total })}
        </Badge>
      </Link>
    </li>
  );
}
