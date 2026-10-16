import { format } from '@choirbook/shared/i18n';
import { ageOn } from '@choirbook/shared/rules/age';
import {
  AlertCard,
  AttendanceBadge,
  Avatar,
  Badge,
  Button,
  Card,
  FeeStatusBadge,
  FormStatusBadge,
  Icon,
  VoicePartBadge,
  type AttendanceStatus,
} from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChoristerForm } from '@/components/staff/ChoristerForm';
import { Forbidden } from '@/components/staff/Forbidden';
import {
  CareNoteForm,
  DeleteNoteButton,
  GuardianEditor,
  ProfileActions,
  StaffNoteForm,
  SuspendedBadge,
} from '@/components/staff/ProfileParts';
import { feeStatusOf, formStatusOf, getSections } from '@/lib/data/roster';
import { formatDate, formatMoney, todayLocal } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { getCurrentTerm, staffStrings, uuid } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Chorister profile' };

export default async function ChoristerProfilePage({ params }: PageProps<'/c/[choir]/roster/[personId]'>) {
  const { choir, personId } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !uuid.safeParse(personId).success) notFound();
  if (!ctx.can('roster')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;

  const supabase = await createClient();
  const org = ctx.org.id;
  const today = todayLocal();
  const { data: person } = await supabase
    .from('people')
    .select('*, choristers(section_id, voice_part_id, status, joined_on, departed_on, school, sections(key, name_en, name_fr), voice_parts(key))')
    .eq('id', personId)
    .eq('organization_id', org)
    .maybeSingle();
  if (!person) notFound();
  // One chorister row per person (the generated types cannot tell from the composite key).
  const ch = Array.isArray(person.choristers) ? (person.choristers[0] ?? null) : person.choristers;

  const [guardians, care, notes, attendance, forms, responses, balances, sections, term, consents] = await Promise.all([
    supabase.from('guardian_links').select('relationship, is_primary, receives_copies, is_emergency_contact, guardians!inner(*)').eq('chorister_id', personId),
    ctx.can('care') ? supabase.from('care_notes').select('*').eq('person_id', personId).order('severity').order('created_at') : Promise.resolve({ data: null }),
    ctx.can('staff_notes') ? supabase.from('staff_notes').select('*').eq('person_id', personId).order('created_at', { ascending: false }) : Promise.resolve({ data: null }),
    ctx.can('attendance')
      ? supabase.from('attendance').select('status, note, source, events!inner(id, title, starts_at, type, counts_for_attendance)').eq('person_id', personId).order('events(starts_at)', { ascending: false }).limit(60)
      : Promise.resolve({ data: null }),
    ctx.can('forms') ? supabase.from('forms').select('id, title, due_on, section_ids').eq('organization_id', org).eq('status', 'open') : Promise.resolve({ data: null }),
    ctx.can('forms') ? supabase.from('form_responses').select('form_id, person_id, status').eq('person_id', personId) : Promise.resolve({ data: null }),
    ctx.can('fees') ? supabase.from('fee_balances').select('*').eq('person_id', personId) : Promise.resolve({ data: null }),
    getSections(org),
    getCurrentTerm(org, today),
    supabase.from('consents').select('kind, granted, recorded_at').eq('person_id', personId).order('recorded_at', { ascending: false }),
  ]);

  // Opening a member record is recorded in the audit log.
  await supabase.rpc('log_event', { org, action: 'view', entity: 'people', entity_id: personId });

  // Names of the staff who wrote notes.
  const authorIds = [...new Set((notes.data ?? []).map((n) => n.author_id).filter((x): x is string => Boolean(x)))];
  const { data: authors } = authorIds.length
    ? await supabase.from('people').select('user_id, first_name, last_name').eq('organization_id', org).in('user_id', authorIds)
    : { data: [] };
  const authorName = (id: string | null) => {
    const a = authors?.find((x) => x.user_id === id);
    return a ? `${a.first_name} ${a.last_name}` : '—';
  };

  const s = staffStrings(t);
  const name = `${person.preferred_name || person.first_name} ${person.last_name}`;
  const departed = ch?.status === 'departed' || person.status === 'archived';
  const account = person.user_id ? 'active' : person.email ? 'invited' : 'none';
  const termRows = (attendance.data ?? []).filter(
    (a) => term && a.events.counts_for_attendance && a.events.starts_at.slice(0, 10) >= term.starts_on && a.events.starts_at.slice(0, 10) <= term.ends_on,
  );
  const count = (st: AttendanceStatus) => termRows.filter((a) => a.status === st).length;
  const absences = count('absent');
  const rate = termRows.length ? Math.round(((count('present') + count('late')) / termRows.length) * 100) : null;
  const limit = term?.absence_limit ?? null;
  const fee = balances.data ? feeStatusOf(balances.data, today) : null;
  const form = forms.data && responses.data ? formStatusOf(forms.data, responses.data, ch?.section_id ?? null, today) : null;
  const years = ch?.joined_on ? Number(today.slice(0, 4)) - Number(ch.joined_on.slice(0, 4)) + (today.slice(5) >= '09-01' ? 1 : 0) : 0;
  const latestConsent = new Map<string, boolean>();
  for (const c of consents.data ?? []) if (!latestConsent.has(c.kind)) latestConsent.set(c.kind, c.granted);
  const consentLabel = {
    participation: t.staff.consent_participation,
    code_of_conduct: t.staff.consent_code_of_conduct,
    photo_video: t.staff.consent_photo_video,
    medical_info: t.staff.consent_medical_info,
  };

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <Link href={`/c/${choir}/roster` as never} className="back-link">
        ← {t.staff.rosterTitle}
      </Link>
      <header className="profile-head">
        <Avatar name={name} size={64} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="page__title">{name}</h1>
          <div className="member-head__meta">
            {ch?.voice_parts?.key || ch?.sections?.key ? (
              <VoicePartBadge part={ch.voice_parts?.key ?? ch.sections?.key ?? undefined} variant="pill" lang={lang} />
            ) : (
              <Badge tone="info" icon="user-plus">
                {t.staff.unplaced}
              </Badge>
            )}
            {person.pronouns ? <span>{person.pronouns}</span> : null}
            <span>{years > 0 ? format(t.staff.yearsN, { n: years }) : t.staff.newThisSeason}</span>
            {person.date_of_birth ? <span>{format(t.staff.ageN, { n: ageOn(person.date_of_birth, today) })}</span> : null}
            {departed ? <Badge tone="neutral">{ch?.departed_on ? format(t.staff.archivedOn, { date: formatDate(ch.departed_on, lang, { dateStyle: 'medium' }) }) : t.staff.stDeparted}</Badge> : null}
            {person.messaging_suspended_at ? <SuspendedBadge s={s} /> : null}
          </div>
        </div>
        {ctx.can('roster', 'edit') ? (
          <ChoristerForm
            slug={choir}
            lang={lang}
            sections={sections}
            s={s}
            personId={personId}
            trigger={{ label: t.staff.editDetails, icon: 'pencil', variant: 'secondary' }}
            initial={{
              first_name: person.first_name,
              last_name: person.last_name,
              preferred_name: person.preferred_name ?? '',
              email: person.email ?? '',
              phone: person.phone ?? '',
              date_of_birth: person.date_of_birth ?? '',
              pronouns: person.pronouns ?? '',
              lang: person.lang,
              section_id: ch?.section_id ?? '',
              voice_part_id: ch?.voice_part_id ?? '',
              status: ch?.status ?? 'active',
              school: ch?.school ?? '',
              joined_on: ch?.joined_on ?? '',
            }}
          />
        ) : null}
      </header>

      <div className="profile-grid">
        <div className="stack">
          <Card title={t.staff.contact}>
            <dl className="def-list">
              <dt>{t.staff.email}</dt>
              <dd>{person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : '—'}</dd>
              <dt>{t.staff.phone}</dt>
              <dd>{person.phone ? <a href={`tel:${person.phone}`}>{person.phone}</a> : '—'}</dd>
              <dt>{t.staff.dob}</dt>
              <dd>{person.date_of_birth ? formatDate(`${person.date_of_birth}T12:00:00`, lang, { dateStyle: 'long' }) : '—'}</dd>
              <dt>{t.staff.school}</dt>
              <dd>{ch?.school ?? '—'}</dd>
              <dt>{t.staff.language}</dt>
              <dd>{person.lang === 'fr' ? 'Français' : 'English'}</dd>
              <dt>{t.staff.colAccount}</dt>
              <dd>{{ active: t.staff.accSignedUp, invited: t.staff.accInvited, none: t.staff.accNoEmail }[account]}</dd>
            </dl>
            <div style={{ marginTop: 14 }}>
              <ProfileActions
                slug={choir}
                orgId={org}
                personId={personId}
                departed={departed}
                canEdit={ctx.can('roster', 'edit')}
                canInvite={ctx.can('roster', 'edit') || ctx.can('users', 'edit')}
                canModerate={ctx.can('moderation', 'edit')}
                account={account}
                suspended={Boolean(person.messaging_suspended_at)}
                s={s}
              />
            </div>
          </Card>

          <Card title={t.staff.guardians} action={ctx.can('roster', 'edit') ? <GuardianEditor slug={choir} choristerId={personId} s={s} /> : undefined}>
            {guardians.data?.length ? (
              <ul className="plain-list">
                {guardians.data
                  .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
                  .map((g) => (
                    <li key={g.guardians.id} className="person-row">
                      <Avatar name={`${g.guardians.first_name} ${g.guardians.last_name}`} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="person-row__name">
                          {g.guardians.first_name} {g.guardians.last_name}
                          {g.is_primary ? <Badge tone="neutral">{t.staff.primary}</Badge> : null}
                        </div>
                        <div className="muted small">{[g.relationship, g.guardians.phone, g.guardians.email].filter(Boolean).join(' · ')}</div>
                      </div>
                      {g.guardians.phone ? (
                        <a className="icon-link" href={`tel:${g.guardians.phone}`} aria-label={`${t.staff.phone} ${g.guardians.first_name}`}>
                          <Icon name="phone" size={18} />
                        </a>
                      ) : null}
                      {g.guardians.email ? (
                        <a className="icon-link" href={`mailto:${g.guardians.email}`} aria-label={`${t.staff.email} ${g.guardians.first_name}`}>
                          <Icon name="mail" size={18} />
                        </a>
                      ) : null}
                      {ctx.can('roster', 'edit') ? (
                        <GuardianEditor
                          slug={choir}
                          choristerId={personId}
                          s={s}
                          initial={{
                            id: g.guardians.id,
                            first_name: g.guardians.first_name,
                            last_name: g.guardians.last_name,
                            email: g.guardians.email ?? '',
                            phone: g.guardians.phone ?? '',
                            lang: g.guardians.lang,
                            relationship: g.relationship ?? '',
                            is_primary: g.is_primary,
                            receives_copies: g.receives_copies,
                            is_emergency_contact: g.is_emergency_contact,
                          }}
                        />
                      ) : null}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="muted">{t.staff.noGuardians}</p>
            )}
          </Card>

          {care.data ? (
            <Card title={t.staff.careNotes} action={ctx.can('care', 'edit') ? <CareNoteForm slug={choir} personId={personId} s={s} /> : undefined}>
              {care.data.length ? (
                <ul className="plain-list">
                  {care.data.map((n) => (
                    <li key={n.id} className="person-row">
                      <div style={{ flex: 1 }}>
                        <div className="person-row__name">
                          {n.label}
                          {n.severity === 'high' ? (
                            <Badge tone="error" icon="heart-pulse">
                              {t.staff.careHigh}
                            </Badge>
                          ) : null}
                        </div>
                        {n.detail ? <div className="muted small">{n.detail}</div> : null}
                      </div>
                      {ctx.can('care', 'edit') ? <DeleteNoteButton slug={choir} id={n.id} kind="care" s={s} /> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t.staff.noneYet}</p>
              )}
            </Card>
          ) : null}

          {consents.data?.length ? (
            <Card title={t.staff.consents}>
              <ul className="plain-list">
                {[...latestConsent].map(([kind, granted]) => (
                  <li key={kind} className="row-between" style={{ padding: '8px 0' }}>
                    <span>{consentLabel[kind as keyof typeof consentLabel]}</span>
                    <Badge tone={granted ? 'success' : 'neutral'} icon={granted ? 'check' : 'minus'}>
                      {granted ? t.staff.yes : t.staff.no}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="stack">
          {attendance.data ? (
            <Card title={`${t.staff.attendanceTerm}${term ? ` · ${term.name}` : ''}`}>
              {termRows.length ? (
                <div className="stack" style={{ gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                    <span className="big-number">
                      {rate}
                      <small>%</small>
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(['present', 'late', 'excused', 'absent'] as const)
                        .filter((st) => count(st))
                        .map((st) => (
                          <AttendanceBadge key={st} status={st} lang={lang}>
                            {`${t.staff[st]} ${count(st)}`}
                          </AttendanceBadge>
                        ))}
                    </div>
                  </div>
                  {limit !== null && absences >= limit ? (
                    <AlertCard tone="error" title={t.staff.atLimitTitle}>
                      {format(t.staff.atLimitBody, { n: absences, limit })}
                    </AlertCard>
                  ) : null}
                </div>
              ) : (
                <p className="muted">{t.staff.noAttendance}</p>
              )}
              {attendance.data.length ? (
                <details className="history">
                  <summary>{t.staff.attendanceHistory}</summary>
                  <ul className="plain-list">
                    {attendance.data.map((a) => (
                      <li key={a.events.id} className="history-row">
                        <span>
                          <strong>{a.events.title}</strong>
                          <span className="muted small"> · {formatDate(a.events.starts_at, lang, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {a.note ? <span className="muted small"> · {a.note}</span> : null}
                        </span>
                        <AttendanceBadge status={a.status} lang={lang} />
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </Card>
          ) : null}

          {form || fee ? (
            <Card title={t.staff.formsAndFees}>
              <ul className="plain-list">
                {form && forms.data ? (
                  <li className="person-row">
                    <span className="icon-disc">
                      <Icon name="file-text" size={18} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="person-row__name">{t.staff.colForms}</div>
                      <div className="muted small">
                        {forms.data
                          .filter((f) => !f.section_ids.length || (ch?.section_id && f.section_ids.includes(ch.section_id)))
                          .map((f) => `${f.title}: ${responses.data?.find((r) => r.form_id === f.id)?.status ?? '—'}`)
                          .join(' · ')}
                      </div>
                    </div>
                    {form.status ? <FormStatusBadge status={form.status} lang={lang} /> : null}
                  </li>
                ) : null}
                {fee && balances.data
                  ? balances.data.map((b) => (
                      <li key={b.assignment_id} className="person-row">
                        <div style={{ flex: 1 }}>
                          <div className="person-row__name">{b.name}</div>
                          <div className="muted small">
                            {formatMoney(b.paid_cents ?? 0, lang)} / {formatMoney(b.amount_cents ?? 0, lang)}
                            {b.adjusted_cents ? ` · −${formatMoney(b.adjusted_cents, lang)}` : ''}
                          </div>
                        </div>
                        {feeStatusOf([b], today).status ? <FeeStatusBadge status={feeStatusOf([b], today).status!} lang={lang} /> : null}
                      </li>
                    ))
                  : null}
              </ul>
              <div style={{ marginTop: 10 }}>
                <Button size="sm" variant="ghost" iconEnd="arrow-right" href={`/c/${choir}/forms-fees?person=${personId}`}>
                  {t.nav.formsFees}
                </Button>
              </div>
            </Card>
          ) : null}

          {notes.data ? (
            <Card
              title={t.staff.staffNotes}
              action={
                <Badge tone="slate" icon="lock">
                  {t.staff.staffOnly}
                </Badge>
              }
            >
              <div className="stack" style={{ gap: 10 }}>
                {notes.data.length ? (
                  notes.data.map((n) => (
                    <div key={n.id} className="note">
                      <div className="row-between">
                        <span className="muted small">
                          {authorName(n.author_id)} · {formatDate(n.created_at, lang, { dateStyle: 'medium' })}
                        </span>
                        {ctx.can('staff_notes', 'edit') ? <DeleteNoteButton slug={choir} id={n.id} kind="staff" s={s} /> : null}
                      </div>
                      <p>{n.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="muted">{t.staff.noNotes}</p>
                )}
                {ctx.can('staff_notes', 'edit') ? <StaffNoteForm slug={choir} personId={personId} s={s} /> : null}
              </div>
            </Card>
          ) : null}
          <p className="muted small">
            {t.staff.viewLogged}
          </p>
        </div>
      </div>
    </div>
  );
}
