import { Button } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AttendanceSheet, type SheetRow } from '@/components/staff/AttendanceSheet';
import { Forbidden } from '@/components/staff/Forbidden';
import { getSections } from '@/lib/data/roster';
import { formatRange } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { currentUserId, staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Take attendance' };

export default async function TakeAttendancePage({ params }: PageProps<'/c/[choir]/attendance/[eventId]'>) {
  const { choir, eventId } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(eventId).success) notFound();
  if (!ctx.can('attendance')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;

  const supabase = await createClient();
  const org = ctx.org.id;
  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).eq('organization_id', org).maybeSingle();
  if (!event) notFound();
  const canEdit = ctx.can('attendance', 'edit');

  const [{ data: choristers }, { data: reports }, sections, { data: myScope }] = await Promise.all([
    supabase
      .from('choristers')
      .select('person_id, section_id, people!inner(first_name, last_name, preferred_name, status), voice_parts(key)')
      .eq('organization_id', org)
      .neq('status', 'departed'),
    supabase.from('absence_reports').select('person_id, kind, reason, arrives_at').eq('event_id', eventId),
    getSections(org),
    supabase.from('member_roles').select('section_id').eq('person_id', ctx.personId).not('section_id', 'is', null),
  ]);
  const called = (choristers ?? []).filter((c) => !event.section_ids.length || (c.section_id && event.section_ids.includes(c.section_id)));

  // Absence reports from choristers and guardians are applied before anyone is marked.
  if (canEdit && reports?.length) {
    const me = await currentUserId();
    await supabase.from('attendance').upsert(
      reports
        .filter((r) => called.some((c) => c.person_id === r.person_id))
        .map((r) => ({
          organization_id: org,
          event_id: eventId,
          person_id: r.person_id,
          status: r.kind === 'late' ? ('late' as const) : ('excused' as const),
          note: r.reason.slice(0, 500),
          source: 'report',
          marked_by: me,
        })),
      { onConflict: 'event_id,person_id', ignoreDuplicates: true },
    );
  }
  const { data: marks } = await supabase.from('attendance').select('person_id, status, source').eq('event_id', eventId);

  const rows: SheetRow[] = called
    .map((c) => {
      const report = reports?.find((r) => r.person_id === c.person_id);
      const mark = marks?.find((m) => m.person_id === c.person_id);
      return {
        id: c.person_id,
        name: `${c.people.preferred_name || c.people.first_name} ${c.people.last_name}`,
        last: c.people.last_name,
        sectionId: c.section_id,
        part: c.voice_parts?.key ?? null,
        status: (mark?.status ?? 'unmarked') as SheetRow['status'],
        note: report ? `${report.kind === 'late' ? t.staff.reportedLate.replace('{reason}', report.reason) : t.staff.reported.replace('{reason}', report.reason)}` : mark?.source === 'qr' ? t.staff.fromQr : null,
      };
    })
    .sort((a, b) => a.last.localeCompare(b.last));

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <Link href={`/c/${choir}/attendance` as never} className="back-link">
        ← {t.staff.attendanceTitle}
      </Link>
      <div className="page__head">
        <div>
          <p className="overline overline--accent">{formatRange(event.starts_at, event.ends_at, lang)}</p>
          <h1 className="page__title">{event.title}</h1>
        </div>
        {canEdit ? (
          <div className="page__actions">
            <Button variant="secondary" iconStart="qr-code" href={`/c/${choir}/attendance/${eventId}/qr`}>
              {t.staff.qrCheckIn}
            </Button>
          </div>
        ) : null}
      </div>
      <AttendanceSheet
        slug={choir}
        eventId={eventId}
        lang={lang}
        rows={rows}
        sections={sections.filter((s) => called.some((c) => c.section_id === s.id)).map((s) => ({ id: s.id, key: s.key, name: lang === 'fr' ? s.name_fr : s.name_en }))}
        defaultSection={myScope?.[0]?.section_id ?? null}
        canEdit={canEdit}
        s={staffStrings(t)}
      />
    </div>
  );
}
