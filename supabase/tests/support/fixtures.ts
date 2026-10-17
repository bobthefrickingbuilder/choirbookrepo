import type { PGlite } from '@electric-sql/pglite';

// Two fictional choirs, each with staff and choristers, and at least one row in
// nearly every table, so the tests can check who sees what.

export const ORG_A = '00000000-0000-4000-a000-000000000001';
export const ORG_B = '00000000-0000-4000-b000-000000000001';

/** Account ids (auth.users). */
export const U = {
  adminA: '10000000-0000-4000-a000-000000000001',
  conductorA: '10000000-0000-4000-a000-000000000002',
  sectionLeaderA: '10000000-0000-4000-a000-000000000003',
  treasurerA: '10000000-0000-4000-a000-000000000004',
  choristerA1: '10000000-0000-4000-a000-000000000011',
  choristerA2: '10000000-0000-4000-a000-000000000012',
  adminB: '10000000-0000-4000-b000-000000000001',
  choristerB1: '10000000-0000-4000-b000-000000000011',
  outsider: '10000000-0000-4000-c000-000000000001',
} as const;

/** Person ids (public.people), one per account per choir. */
export const P = {
  adminA: '20000000-0000-4000-a000-000000000001',
  conductorA: '20000000-0000-4000-a000-000000000002',
  sectionLeaderA: '20000000-0000-4000-a000-000000000003',
  treasurerA: '20000000-0000-4000-a000-000000000004',
  choristerA1: '20000000-0000-4000-a000-000000000011',
  choristerA2: '20000000-0000-4000-a000-000000000012',
  adminB: '20000000-0000-4000-b000-000000000001',
  choristerB1: '20000000-0000-4000-b000-000000000011',
} as const;

const people: { key: keyof typeof P; org: string; first: string; last: string; role?: string; dob?: string }[] = [
  { key: 'adminA', org: ORG_A, first: 'Claire', last: 'Dubois', role: 'administrator' },
  { key: 'conductorA', org: ORG_A, first: 'Anika', last: 'Rowe', role: 'conductor' },
  { key: 'sectionLeaderA', org: ORG_A, first: 'Jordan', last: 'Ellis', role: 'section_leader' },
  { key: 'treasurerA', org: ORG_A, first: 'Helen', last: 'Ng', role: 'treasurer' },
  { key: 'choristerA1', org: ORG_A, first: 'Ella', last: 'Martin', dob: '2007-05-02' },
  { key: 'choristerA2', org: ORG_A, first: 'Maya', last: 'Chen', dob: '2009-11-20' },
  { key: 'adminB', org: ORG_B, first: 'Ruth', last: 'Okonkwo', role: 'administrator' },
  { key: 'choristerB1', org: ORG_B, first: 'Sam', last: 'Brook', dob: '2004-01-15' },
];

const emailOf = (key: string) => `${key.toLowerCase()}@example.com`;

export async function seed(db: PGlite): Promise<void> {
  await db.exec(`
    insert into public.organizations (id, slug, name, short_name, kind) values
      ('${ORG_A}', 'river-youth', 'River Youth Choir', 'RYC', 'youth'),
      ('${ORG_B}', 'harbour-singers', 'Harbour Singers', 'HS', 'adult');
  `);

  // People first (invited, with email), then their accounts: the sign-up trigger links them.
  for (const p of people) {
    await db.query(
      `insert into public.people (id, organization_id, first_name, last_name, email, date_of_birth, status)
       values ($1, $2, $3, $4, $5, $6, 'invited')`,
      [P[p.key], p.org, p.first, p.last, emailOf(p.key), p.dob ?? null],
    );
  }
  for (const [key, id] of Object.entries(U)) {
    await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [id, emailOf(key)]);
  }
  for (const p of people.filter((x) => x.role)) {
    await db.query(
      `insert into public.member_roles (organization_id, person_id, role_id)
       select $1, $2, r.id from public.roles r where r.organization_id = $1 and r.key = $3`,
      [p.org, P[p.key], p.role],
    );
  }

  for (const org of [ORG_A, ORG_B]) {
    const o = org === ORG_A ? 'a' : 'b';
    const c1 = org === ORG_A ? P.choristerA1 : P.choristerB1;
    const admin = org === ORG_A ? U.adminA : U.adminB;
    await db.exec(`
      insert into public.seasons (id, organization_id, name, starts_on, ends_on, is_current)
        values ('30000000-0000-4000-${o}000-000000000001', '${org}', '2026–27', '2026-09-01', '2027-06-30', true);
      insert into public.terms (organization_id, season_id, name, starts_on, ends_on, absence_limit)
        values ('${org}', '30000000-0000-4000-${o}000-000000000001', 'Fall', '2026-09-01', '2026-12-31', 3);
      insert into public.sections (id, organization_id, key, name_en, name_fr, sort) values
        ('31000000-0000-4000-${o}000-00000000000a', '${org}', 'A', 'Altos', 'Altos', 2);
      insert into public.voice_parts (organization_id, section_id, key, name_en, name_fr)
        values ('${org}', '31000000-0000-4000-${o}000-00000000000a', 'A2', 'Alto 2', 'Alto 2');
      insert into public.choristers (person_id, organization_id, section_id)
        values ('${c1}', '${org}', '31000000-0000-4000-${o}000-00000000000a');
      insert into public.guardians (id, organization_id, first_name, last_name, email)
        values ('32000000-0000-4000-${o}000-000000000001', '${org}', 'Daniel', 'Parent', 'parent.${o}@example.com');
      insert into public.guardian_links (organization_id, guardian_id, chorister_id, is_primary)
        values ('${org}', '32000000-0000-4000-${o}000-000000000001', '${c1}', true);
      insert into public.care_notes (organization_id, person_id, label, severity)
        values ('${org}', '${c1}', 'Peanut allergy', 'high');
      insert into public.staff_notes (organization_id, person_id, author_id, body)
        values ('${org}', '${c1}', '${admin}', 'Strong sight-reader.');
      insert into public.events (id, organization_id, type, title, starts_at)
        values ('33000000-0000-4000-${o}000-000000000001', '${org}', 'rehearsal', 'Rehearsal', now() + interval '2 days'),
               ('33000000-0000-4000-${o}000-000000000002', '${org}', 'rehearsal', 'Past rehearsal', now() - interval '7 days');
      insert into public.attendance (organization_id, event_id, person_id, status)
        values ('${org}', '33000000-0000-4000-${o}000-000000000002', '${c1}', 'present');
      insert into public.absence_reports (organization_id, event_id, person_id, reason)
        values ('${org}', '33000000-0000-4000-${o}000-000000000001', '${c1}', 'Exam');
      insert into public.availability_replies (organization_id, event_id, person_id, answer)
        values ('${org}', '33000000-0000-4000-${o}000-000000000001', '${c1}', 'yes');
      insert into public.pieces (id, organization_id, title) values ('34000000-0000-4000-${o}000-000000000001', '${org}', 'Ubi Caritas');
      insert into public.score_files (organization_id, piece_id, storage_path, released_at)
        values ('${org}', '34000000-0000-4000-${o}000-000000000001', '${org}/ubi.pdf', now() - interval '1 day');
      insert into public.learning_tracks (organization_id, piece_id, label, storage_path, released_at)
        values ('${org}', '34000000-0000-4000-${o}000-000000000001', 'Alto', '${org}/ubi-alto.m4a', null);
      insert into public.practice_assignments (id, organization_id, piece_id, title, released_at)
        values ('35000000-0000-4000-${o}000-000000000001', '${org}', '34000000-0000-4000-${o}000-000000000001', 'Learn mm. 1–24', now() - interval '1 day');
      insert into public.practice_completions (organization_id, assignment_id, person_id)
        values ('${org}', '35000000-0000-4000-${o}000-000000000001', '${c1}');
      insert into public.practice_log (organization_id, person_id, minutes) values ('${org}', '${c1}', 20);
      insert into public.announcements (id, organization_id, title, body, published_at)
        values ('36000000-0000-4000-${o}000-000000000001', '${org}', 'Group photo', 'Wear the T-shirt.', now() - interval '1 hour');
      insert into public.announcement_recipients (organization_id, announcement_id, person_id)
        values ('${org}', '36000000-0000-4000-${o}000-000000000001', '${c1}');
      insert into public.conversations (id, organization_id, member_id, subject)
        values ('37000000-0000-4000-${o}000-000000000001', '${org}', '${c1}', 'Inhaler');
      insert into public.messages (organization_id, conversation_id, author_person_id, body)
        values ('${org}', '37000000-0000-4000-${o}000-000000000001', '${c1}', 'Can a chaperone keep a spare?');
      insert into public.monthly_updates (organization_id, month) values ('${org}', '2026-10-01');
      insert into public.forms (id, organization_id, title, status, guardian_signature_required)
        values ('38000000-0000-4000-${o}000-000000000001', '${org}', 'Tour permission', 'open', true);
      insert into public.form_responses (id, organization_id, form_id, person_id, status)
        values ('38100000-0000-4000-${o}000-000000000001', '${org}', '38000000-0000-4000-${o}000-000000000001', '${c1}', 'submitted');
      insert into public.guardian_signatures (organization_id, response_id, guardian_id, token_hash, expires_at)
        values ('${org}', '38100000-0000-4000-${o}000-000000000001', '32000000-0000-4000-${o}000-000000000001', 'hash-${o}', now() + interval '7 days');
      insert into public.consent_wording_versions (id, organization_id, kind, version, body_en, body_fr)
        values ('39000000-0000-4000-${o}000-000000000001', '${org}', 'photo_video', 2, 'I agree', 'J’accepte');
      insert into public.consents (organization_id, person_id, kind, granted, wording_version_id)
        values ('${org}', '${c1}', 'photo_video', true, '39000000-0000-4000-${o}000-000000000001');
      insert into public.fees (id, organization_id, name, amount_cents) values ('3a000000-0000-4000-${o}000-000000000001', '${org}', 'Annual fee', 39000);
      insert into public.fee_assignments (id, organization_id, fee_id, person_id, amount_cents)
        values ('3a100000-0000-4000-${o}000-000000000001', '${org}', '3a000000-0000-4000-${o}000-000000000001', '${c1}', 39000);
      insert into public.instalments (organization_id, assignment_id, due_on, amount_cents)
        values ('${org}', '3a100000-0000-4000-${o}000-000000000001', '2026-11-01', 19500);
      insert into public.payments (organization_id, assignment_id, person_id, amount_cents, method, status)
        values ('${org}', '3a100000-0000-4000-${o}000-000000000001', '${c1}', 19500, 'cash', 'succeeded');
      insert into public.fee_adjustments (organization_id, assignment_id, kind, amount_cents, status)
        values ('${org}', '3a100000-0000-4000-${o}000-000000000001', 'financial_aid', 5000, 'requested');
      insert into public.ticket_types (id, organization_id, event_id, name, price_cents)
        values ('3b000000-0000-4000-${o}000-000000000001', '${org}', '33000000-0000-4000-${o}000-000000000001', 'Adult', 2000);
      insert into public.seller_links (organization_id, event_id, person_id, code)
        values ('${org}', '33000000-0000-4000-${o}000-000000000001', '${c1}', 'seller${o}01');
      insert into public.ticket_orders (id, organization_id, event_id, buyer_name, buyer_email, total_cents, status)
        values ('3b100000-0000-4000-${o}000-000000000001', '${org}', '33000000-0000-4000-${o}000-000000000001', 'Pat Buyer', 'pat.${o}@example.com', 2000, 'paid');
      insert into public.tickets (organization_id, order_id, ticket_type_id)
        values ('${org}', '3b100000-0000-4000-${o}000-000000000001', '3b000000-0000-4000-${o}000-000000000001');
      insert into public.seating_charts (id, organization_id, event_id, published_at)
        values ('3c000000-0000-4000-${o}000-000000000001', '${org}', '33000000-0000-4000-${o}000-000000000001', now());
      insert into public.seating_positions (organization_id, chart_id, person_id, row_label, seat)
        values ('${org}', '3c000000-0000-4000-${o}000-000000000001', '${c1}', 'A', 1);
      insert into public.volunteer_jobs (id, organization_id, title) values ('3d000000-0000-4000-${o}000-000000000001', '${org}', 'Front of house');
      insert into public.volunteer_slots (id, organization_id, job_id, starts_at, ends_at, needed)
        values ('3d100000-0000-4000-${o}000-000000000001', '${org}', '3d000000-0000-4000-${o}000-000000000001', now() + interval '3 days', now() + interval '3 days 2 hours', 2);
      insert into public.volunteer_signups (organization_id, slot_id, person_id)
        values ('${org}', '3d100000-0000-4000-${o}000-000000000001', '${c1}');
      insert into public.chaperone_checks (organization_id, person_id, verified_on, expires_on)
        values ('${org}', '${c1}', '2025-01-01', '2028-01-01');
      insert into public.notifications (organization_id, user_id, category, title)
        values ('${org}', '${admin}', 'system', 'Welcome');
      insert into public.email_queue (organization_id, to_email, template, subject)
        values ('${org}', 'parent.${o}@example.com', 'announcement', 'Group photo');
      insert into public.feedback (organization_id, user_id, body) values ('${org}', '${admin}', 'Love it');
    `);
  }

  // A second chorister in choir A, with their own private rows.
  await db.exec(`
    insert into public.choristers (person_id, organization_id) values ('${P.choristerA2}', '${ORG_A}');
    insert into public.care_notes (organization_id, person_id, label) values ('${ORG_A}', '${P.choristerA2}', 'Asthma');
    insert into public.attendance (organization_id, event_id, person_id, status)
      values ('${ORG_A}', '33000000-0000-4000-a000-000000000002', '${P.choristerA2}', 'absent');
    insert into public.fee_assignments (organization_id, fee_id, person_id, amount_cents)
      values ('${ORG_A}', '3a000000-0000-4000-a000-000000000001', '${P.choristerA2}', 39000);
    insert into public.conversations (organization_id, member_id, subject)
      values ('${ORG_A}', '${P.choristerA2}', 'Private question');
    insert into public.notifications (organization_id, user_id, category, title)
      values ('${ORG_A}', '${U.choristerA2}', 'system', 'Hello');
  `);
}
