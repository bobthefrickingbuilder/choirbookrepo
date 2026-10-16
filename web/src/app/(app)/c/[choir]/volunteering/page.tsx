import { format } from '@choirbook/shared/i18n';
import { Card, EmptyState } from '@choirbook/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VolunteerToggle } from '@/components/member/SmallActions';
import { formatDate, formatTime } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Volunteering' };

export default async function VolunteeringPage({ params }: PageProps<'/c/[choir]/volunteering'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [{ data: jobs }, { data: mine }, { data: fill }] = await Promise.all([
    supabase
      .from('volunteer_jobs')
      .select('id, title, description, events(title, starts_at), volunteer_slots(id, starts_at, ends_at, needed)')
      .eq('organization_id', ctx.org.id),
    supabase.from('volunteer_signups').select('slot_id').eq('person_id', ctx.personId),
    supabase.rpc('volunteer_slot_fill', { org: ctx.org.id }),
  ]);
  const signed = new Set((mine ?? []).map((m) => m.slot_id));
  const taken = new Map((fill ?? []).map((f) => [f.slot_id, f.taken]));
  const upcoming = (jobs ?? [])
    .map((j) => ({ ...j, volunteer_slots: j.volunteer_slots.filter((s) => s.ends_at > nowIso).sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
    .filter((j) => j.volunteer_slots.length > 0);

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div>
        <h1 className="page__title">{t.member.volunteerTitle}</h1>
        <p className="page__lede">{t.member.volunteerIntro}</p>
      </div>
      {upcoming.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon="user-check" size="sm">
            {t.member.noJobs}
          </EmptyState>
        </Card>
      ) : (
        upcoming.map((j) => (
          <Card key={j.id} title={j.title} action={j.events ? <span className="muted">{j.events.title}</span> : undefined}>
            <div className="stack">
              {j.description ? <p>{j.description}</p> : null}
              <ul className="plain-list" style={{ gap: 12 }}>
                {j.volunteer_slots.map((s) => {
                  const n = taken.get(s.id) ?? 0;
                  const left = Math.max(0, s.needed - n);
                  return (
                    <li key={s.id} className="row-between" style={{ alignItems: 'flex-start' }}>
                      <span>
                        <strong>{formatDate(s.starts_at, lang, { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
                        <br />
                        <span className="muted">
                          {formatTime(s.starts_at, lang)}–{formatTime(s.ends_at, lang)} · {format(t.member.slotsLeft, { n: left, total: s.needed })}
                        </span>
                      </span>
                      <VolunteerToggle
                        slug={choir}
                        slotId={s.id}
                        signedUp={signed.has(s.id)}
                        full={left === 0}
                        s={{ signUp: t.member.signUp, signedUp: t.member.signedUp, withdraw: t.member.withdraw, full: t.member.slotFull, failed: t.member.genericFail }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
