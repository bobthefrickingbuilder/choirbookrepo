import { format, type Lang, type Messages } from '@choirbook/shared/i18n';
import type { Tables } from '@choirbook/shared/database.types';
import { AlertCard, Card } from '@choirbook/ui';
import { formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

/** Availability answers for an event, by section, with balance warnings. */
export async function AvailabilitySummary({ orgId, event, lang, t }: { orgId: string; event: Tables<'events'>; lang: Lang; t: Messages }) {
  const supabase = await createClient();
  const [{ data: sections }, { data: choristers }, { data: replies }] = await Promise.all([
    supabase.from('sections').select('id, key, name_en, name_fr, sort').eq('organization_id', orgId).order('sort'),
    supabase.from('choristers').select('person_id, section_id').eq('organization_id', orgId).eq('status', 'active'),
    supabase.from('availability_replies').select('person_id, answer').eq('event_id', event.id),
  ]);
  const called = (choristers ?? []).filter((c) => !event.section_ids.length || (c.section_id && event.section_ids.includes(c.section_id)));
  const rows = (sections ?? [])
    .map((sec) => {
      const members = called.filter((c) => c.section_id === sec.id);
      const answer = (a: string) => members.filter((m) => replies?.some((r) => r.person_id === m.person_id && r.answer === a)).length;
      const yes = answer('yes');
      const no = answer('no');
      const maybe = answer('maybe');
      return { sec, total: members.length, yes, no, maybe, none: members.length - yes - no - maybe };
    })
    .filter((r) => r.total > 0);
  if (!event.availability_requested && !(replies?.length)) return null;
  const name = (s: { name_en: string; name_fr: string }) => (lang === 'fr' ? s.name_fr : s.name_en);
  const warnings = event.availability_requested ? rows.filter((r) => r.total >= 2 && r.yes < Math.ceil(r.total / 2) && r.none < r.total) : [];

  return (
    <Card title={t.staff.availability}>
      <div className="stack" style={{ gap: 12 }}>
        {event.availability_due_at ? (
          <p className="muted" style={{ margin: 0 }}>
            {t.staff.availabilityDue}: {formatDate(event.availability_due_at, lang, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        ) : null}
        {warnings.map((w) => (
          <AlertCard key={w.sec.id} tone="warning">
            {format(t.staff.balanceWarn, { n: w.yes, section: name(w.sec).toLowerCase() })}
          </AlertCard>
        ))}
        <div className="table-scroll">
          <table className="simple-table">
            <caption className="cb-sr-only">{t.staff.availability}</caption>
            <thead>
              <tr>
                <th scope="col">{t.staff.section}</th>
                <th scope="col" className="num">{t.member.yes}</th>
                <th scope="col" className="num">{t.member.maybe}</th>
                <th scope="col" className="num">{t.member.no}</th>
                <th scope="col" className="num">{t.staff.noReply}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sec.id}>
                  <th scope="row">{name(r.sec)}</th>
                  <td className="num">{r.yes}</td>
                  <td className="num">{r.maybe}</td>
                  <td className="num">{r.no}</td>
                  <td className="num">{r.none}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
