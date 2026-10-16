import { format } from '@choirbook/shared/i18n';
import { Badge, Card, EmptyState } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden } from '@/components/staff/Forbidden';
import { CheckForm, DeleteCheckButton, JobForm, SignupRow, SlotActions, SlotForm } from '@/components/staff/VolunteerParts';
import { daysBetween, formatDate, formatTime, isoDaysFromNow, localParts, todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Volunteers' };

export default async function VolunteersPage({ params }: PageProps<'/c/[choir]/volunteers'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('volunteers')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const supabase = await createClient();
  const org = ctx.org.id;
  const [{ data: jobs }, { data: events }, { data: people }, { data: checks }] = await Promise.all([
    supabase
      .from('volunteer_jobs')
      .select('id, title, description, event_id, requires_police_check, events(title, starts_at), volunteer_slots(id, starts_at, ends_at, needed, volunteer_signups(person_id, hours_logged))')
      .eq('organization_id', org)
      .order('created_at'),
    supabase.from('events').select('id, title, starts_at').eq('organization_id', org).gte('starts_at', isoDaysFromNow(-1)).neq('type', 'rehearsal').order('starts_at').limit(40),
    supabase.from('people').select('id, first_name, last_name, preferred_name').eq('organization_id', org).eq('status', 'active').order('last_name'),
    supabase.from('chaperone_checks').select('id, person_id, check_type, verified_on, expires_on').eq('organization_id', org).order('expires_on'),
  ]);
  const s = staffStrings(t);
  const canEdit = ctx.can('volunteers', 'edit');
  const list = (people ?? []).map((p) => ({ id: p.id, name: `${p.preferred_name || p.first_name} ${p.last_name}` }));
  const nameOf = (id: string) => list.find((p) => p.id === id)?.name ?? '—';
  const today = todayLocal();
  const hours = (jobs ?? []).flatMap((j) => j.volunteer_slots.flatMap((sl) => sl.volunteer_signups.map((x) => Number(x.hours_logged ?? 0)))).reduce((a, b) => a + b, 0);
  // Latest check per person.
  const latest = new Map<string, NonNullable<typeof checks>[number]>();
  for (const c of checks ?? []) if (!latest.has(c.person_id) || latest.get(c.person_id)!.expires_on < c.expires_on) latest.set(c.person_id, c);

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">{t.staff.volunteersTitle}</h1>
          <p className="page__lede">{t.staff.volunteersSub}</p>
          <p className="muted">{format(t.staff.volunteerHours, { n: hours })}</p>
        </div>
        {canEdit ? (
          <div className="page__actions">
            <JobForm slug={choir} events={(events ?? []).map((e) => ({ id: e.id, title: e.title }))} s={s} />
          </div>
        ) : null}
      </div>

      <div className="profile-grid profile-grid--wide-left">
        <div className="stack">
          {jobs?.length ? (
            jobs.map((j) => (
              <Card
                key={j.id}
                title={
                  <span>
                    {j.title}
                    {j.events ? <span className="muted small"> · {j.events.title}</span> : null}
                  </span>
                }
                action={
                  canEdit ? (
                    <span style={{ display: 'flex', gap: 6 }}>
                      <SlotForm slug={choir} jobId={j.id} defaultDate={j.events ? localParts(j.events.starts_at).date : today} s={s} />
                      <JobForm
                        slug={choir}
                        id={j.id}
                        events={(events ?? []).map((e) => ({ id: e.id, title: e.title }))}
                        s={s}
                        initial={{ title: j.title, description: j.description ?? '', event_id: j.event_id ?? '', requires_police_check: j.requires_police_check }}
                      />
                    </span>
                  ) : undefined
                }
              >
                {j.description ? <p className="muted" style={{ marginTop: 0 }}>{j.description}</p> : null}
                {j.requires_police_check ? (
                  <Badge tone="info" icon="shield-check">
                    {t.staff.needsPoliceCheck}
                  </Badge>
                ) : null}
                {j.volunteer_slots.length ? (
                  <div className="stack" style={{ gap: 14, marginTop: 10 }}>
                    {[...j.volunteer_slots]
                      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                      .map((sl) => {
                        const taken = sl.volunteer_signups.length;
                        const signed = new Set(sl.volunteer_signups.map((x) => x.person_id));
                        return (
                          <div key={sl.id} className="note">
                            <div className="row-between">
                              <strong>
                                {formatDate(sl.starts_at, lang, { weekday: 'short', month: 'short', day: 'numeric' })} · {formatTime(sl.starts_at, lang)}–{formatTime(sl.ends_at, lang)}
                              </strong>
                              <Badge tone={taken >= sl.needed ? 'success' : 'warning'}>{format(t.staff.filledOf, { taken, needed: sl.needed })}</Badge>
                            </div>
                            {sl.volunteer_signups.length ? (
                              <ul className="plain-list">
                                {sl.volunteer_signups.map((x) =>
                                  canEdit ? (
                                    <SignupRow key={x.person_id} slug={choir} slotId={sl.id} personId={x.person_id} name={nameOf(x.person_id)} hours={x.hours_logged === null ? null : Number(x.hours_logged)} s={s} />
                                  ) : (
                                    <li key={x.person_id} className="history-row">
                                      {nameOf(x.person_id)}
                                    </li>
                                  ),
                                )}
                              </ul>
                            ) : null}
                            {canEdit ? <SlotActions slug={choir} slotId={sl.id} full={taken >= sl.needed} people={list.filter((p) => !signed.has(p.id))} s={s} /> : null}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="muted">{t.staff.noneYet}</p>
                )}
              </Card>
            ))
          ) : (
            <Card padded={false}>
              <EmptyState icon="user-check" size="sm">
                {t.staff.noneYet}
              </EmptyState>
            </Card>
          )}
        </div>

        <Card title={t.staff.checks} action={canEdit ? <CheckForm slug={choir} people={list} today={today} s={s} /> : undefined}>
          <p className="muted small" style={{ marginTop: 0 }}>
            {t.staff.checksIntro}
          </p>
          {latest.size ? (
            <ul className="plain-list">
              {[...latest.values()].map((c) => {
                const days = daysBetween(today, c.expires_on);
                return (
                  <li key={c.id} className="person-row">
                    <div style={{ flex: 1 }}>
                      <div className="person-row__name">
                        <Link className="cb-link" href={`/c/${choir}/roster/${c.person_id}` as never}>
                          {nameOf(c.person_id)}
                        </Link>
                      </div>
                      <div className="muted small">
                        {c.check_type} · {t.staff.expiresOn} {formatDate(`${c.expires_on}T12:00:00Z`, lang, { dateStyle: 'medium' })}
                      </div>
                    </div>
                    <Badge tone={days < 0 ? 'error' : days <= 60 ? 'warning' : 'success'} icon={days <= 60 ? 'triangle-alert' : 'shield-check'}>
                      {days < 0 ? t.staff.expired : days <= 60 ? format(t.staff.expiresSoon, { n: days }) : t.staff.valid}
                    </Badge>
                    {canEdit ? <DeleteCheckButton slug={choir} id={c.id} s={s} /> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">{t.staff.noneYet}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
