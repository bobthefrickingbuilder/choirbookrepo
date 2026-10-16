import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { PERM_AREAS } from '../../packages/shared/src/permissions';
import { asUser, createDatabase, expectDenied, rows } from './support/db';
import { ORG_A, ORG_B, P, U, seed } from './support/fixtures';

let db: PGlite;
let orgTables: string[];
let allTables: string[];

beforeAll(async () => {
  db = await createDatabase();
  await seed(db);
  allTables = (
    await db.query<{ t: string }>(`select tablename as t from pg_tables where schemaname = 'public' order by 1`)
  ).rows.map((r) => r.t);
  orgTables = (
    await db.query<{ t: string }>(
      `select c.table_name as t from information_schema.columns c
       join pg_tables p on p.tablename = c.table_name and p.schemaname = 'public'
       where c.table_schema = 'public' and c.column_name = 'organization_id' order by 1`,
    )
  ).rows.map((r) => r.t);
});

const count = async (uid: string | null, table: string, where = 'true', params: unknown[] = []) =>
  asUser(db, uid, async (tx) => (await rows<{ n: number }>(tx, `select count(*)::int as n from public.${table} where ${where}`, params))[0]?.n ?? 0);

describe('every table is protected', () => {
  it('has row-level security turned on for every table', async () => {
    const { rows: off } = await db.query<{ t: string }>(
      `select relname as t from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    expect(off.map((r) => r.t)).toEqual([]);
  });

  it('has at least one policy on every table', async () => {
    const { rows: bare } = await db.query<{ t: string }>(
      `select c.relname as t from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
         and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)`,
    );
    expect(bare.map((r) => r.t)).toEqual([]);
  });

  it('gives signed-out visitors no access to any table', async () => {
    for (const table of allTables) {
      const msg = await expectDenied(db, null, (tx) => tx.query(`select 1 from public.${table} limit 1`));
      expect(msg, table).toMatch(/permission denied/);
    }
  });

  it('shows a signed-in user who belongs to no choir nothing at all', async () => {
    for (const table of orgTables) {
      expect(await count(U.outsider, table), table).toBe(0);
    }
  });
});

describe('choirs are isolated from each other', () => {
  it('an administrator of one choir sees no rows of another choir in any table', async () => {
    const leaks: string[] = [];
    for (const table of orgTables) {
      const n = await count(U.adminA, table, 'organization_id = $1', [ORG_B]);
      if (n > 0) leaks.push(`${table} (${n})`);
    }
    expect(leaks).toEqual([]);
  });

  it('…while still seeing their own choir (the check above is not trivially empty)', async () => {
    for (const table of ['people', 'choristers', 'care_notes', 'staff_notes', 'payments', 'form_responses', 'messages', 'audit_log']) {
      expect(await count(U.adminA, table, 'organization_id = $1', [ORG_A]), table).toBeGreaterThan(0);
    }
    // And choir B's administrator really does have rows in those tables.
    for (const table of ['people', 'care_notes', 'staff_notes', 'payments']) {
      expect(await count(U.adminB, table, 'organization_id = $1', [ORG_B]), table).toBeGreaterThan(0);
    }
  });

  it('a chorister of one choir sees nothing of another choir', async () => {
    for (const table of orgTables) {
      expect(await count(U.choristerB1, table, 'organization_id = $1', [ORG_A]), table).toBe(0);
    }
  });

  it('staff cannot write into another choir', async () => {
    await expectDenied(db, U.adminA, (tx) =>
      tx.query(`insert into public.events (organization_id, type, title, starts_at) values ($1, 'rehearsal', 'Hijack', now())`, [ORG_B]),
    );
    await expectDenied(db, U.adminA, (tx) =>
      tx.query(`insert into public.people (organization_id, first_name, last_name) values ($1, 'X', 'Y')`, [ORG_B]),
    );
    const updated = await asUser(db, U.adminA, async (tx) =>
      (await tx.query(`update public.organizations set name = 'Taken over' where id = $1`, [ORG_B])).affectedRows,
    );
    expect(updated).toBe(0);
  });

  it('staff cannot attach a person from another choir to their own records', async () => {
    const msg = await expectDenied(db, U.adminA, (tx) =>
      tx.query(
        `insert into public.attendance (organization_id, event_id, person_id, status)
         values ($1, '33000000-0000-4000-a000-000000000001', $2, 'present')`,
        [ORG_A, P.choristerB1],
      ),
    );
    expect(msg).toMatch(/foreign key/);
  });
});

describe('a chorister sees their own data and not other choristers’', () => {
  const personal: [table: string, column: string][] = [
    ['people', 'id'],
    ['choristers', 'person_id'],
    ['care_notes', 'person_id'],
    ['attendance', 'person_id'],
    ['absence_reports', 'person_id'],
    ['availability_replies', 'person_id'],
    ['practice_completions', 'person_id'],
    ['practice_log', 'person_id'],
    ['form_responses', 'person_id'],
    ['consents', 'person_id'],
    ['fee_assignments', 'person_id'],
    ['payments', 'person_id'],
    ['conversations', 'member_id'],
    ['announcement_recipients', 'person_id'],
    ['volunteer_signups', 'person_id'],
    ['seller_links', 'person_id'],
    ['chaperone_checks', 'person_id'],
    ['guardian_links', 'chorister_id'],
  ];

  it.each(personal)('%s: own rows visible', async (table, column) => {
    expect(await count(U.choristerA1, table, `${column} = $1`, [P.choristerA1])).toBeGreaterThan(0);
  });

  it.each(personal)('%s: another chorister’s rows hidden', async (table, column) => {
    expect(await count(U.choristerA1, table, `${column} <> $1`, [P.choristerA1])).toBe(0);
  });

  it('cannot read staff-only notes, even about themselves', async () => {
    expect(await count(U.choristerA1, 'staff_notes')).toBe(0);
  });

  it('cannot read other people’s notifications', async () => {
    expect(await count(U.choristerA1, 'notifications')).toBe(0);
    expect(await count(U.choristerA2, 'notifications')).toBe(1);
  });

  it('cannot read the audit log, the email queue, monthly update drafts or ticket buyers', async () => {
    for (const t of ['audit_log', 'email_queue', 'monthly_updates', 'ticket_orders', 'message_reports']) {
      expect(await count(U.choristerA1, t), t).toBe(0);
    }
  });

  it('sees choir-wide content: events, released music, published announcements addressed to them', async () => {
    expect(await count(U.choristerA1, 'events')).toBe(2);
    expect(await count(U.choristerA1, 'score_files')).toBe(1);
    expect(await count(U.choristerA1, 'learning_tracks')).toBe(0); // not released yet
    expect(await count(U.choristerA1, 'announcements')).toBe(1);
    expect(await count(U.choristerA2, 'announcements')).toBe(0); // not a recipient
  });

  it('sees only guardians linked to them', async () => {
    expect(await count(U.choristerA1, 'guardians')).toBe(1);
    expect(await count(U.choristerA2, 'guardians')).toBe(0);
  });

  it('cannot read a guardian link’s secret token', async () => {
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`select token_hash from public.guardian_signatures`));
    expect(await count(U.choristerA1, 'guardian_signatures')).toBe(1);
  });
});

describe('a chorister cannot give themselves powers', () => {
  it('cannot give themselves a role', async () => {
    await expectDenied(db, U.choristerA1, (tx) =>
      tx.query(
        `insert into public.member_roles (organization_id, person_id, role_id)
         select $1, $2, id from public.roles where organization_id = $1 and key = 'administrator'`,
        [ORG_A, P.choristerA1],
      ),
    );
  });

  it('cannot change role permissions', async () => {
    const n = await asUser(db, U.choristerA1, async (tx) =>
      (await tx.query(`update public.role_permissions set level = 'edit' where organization_id = $1`, [ORG_A])).affectedRows,
    );
    expect(n).toBe(0);
  });

  it('cannot reactivate, rename or re-date themselves', async () => {
    for (const change of [`status = 'archived'`, `first_name = 'Someone'`, `date_of_birth = '2000-01-01'`, `email = 'new@example.com'`]) {
      const msg = await expectDenied(db, U.choristerA1, (tx) =>
        tx.query(`update public.people set ${change} where id = $1`, [P.choristerA1]),
      );
      expect(msg, change).toMatch(/choir office/);
    }
  });

  it('can update their own pronouns, phone and privacy choice', async () => {
    const n = await asUser(db, U.choristerA1, async (tx) =>
      (await tx.query(`update public.people set pronouns = 'she/her', phone = '613-555-0100', contact_visibility = 'choir' where id = $1`, [P.choristerA1])).affectedRows,
    );
    expect(n).toBe(1);
  });

  it('cannot mark attendance, add events, or record a cash payment', async () => {
    await expectDenied(db, U.choristerA1, (tx) =>
      tx.query(`insert into public.attendance (organization_id, event_id, person_id, status) values ($1, '33000000-0000-4000-a000-000000000001', $2, 'present')`, [ORG_A, P.choristerA1]),
    );
    await expectDenied(db, U.choristerA1, (tx) =>
      tx.query(`insert into public.events (organization_id, type, title, starts_at) values ($1, 'concert', 'Mine', now())`, [ORG_A]),
    );
    await expectDenied(db, U.choristerA1, (tx) =>
      tx.query(`insert into public.payments (organization_id, person_id, amount_cents, method, status) values ($1, $2, 39000, 'cash', 'succeeded')`, [ORG_A, P.choristerA1]),
    );
  });

  it('cannot approve their own form or approve their own financial aid', async () => {
    const msg = await expectDenied(db, U.choristerA1, (tx) =>
      tx.query(`update public.form_responses set status = 'approved' where person_id = $1`, [P.choristerA1]),
    );
    expect(msg).toMatch(/already been submitted|choir office/);
    // The row is not even updatable for them, so nothing changes.
    const changed = await asUser(db, U.choristerA1, async (tx) =>
      (await tx.query(`update public.fee_adjustments set status = 'approved' where organization_id = $1`, [ORG_A])).affectedRows,
    );
    expect(changed).toBe(0);
    // And asking for aid already marked approved is refused.
    await expectDenied(db, U.choristerA1, (tx) =>
      tx.query(
        `insert into public.fee_adjustments (organization_id, assignment_id, kind, amount_cents, status, requested_by)
         values ($1, '3a100000-0000-4000-a000-000000000001', 'financial_aid', 39000, 'approved', $2)`,
        [ORG_A, U.choristerA1],
      ),
    );
  });

  it('can report their own absence but not someone else’s', async () => {
    await asUser(db, U.choristerA1, (tx) =>
      tx.query(`delete from public.absence_reports where person_id = $1`, [P.choristerA1]).then(() =>
        tx.query(
          `insert into public.absence_reports (organization_id, event_id, person_id, reason, reported_by) values ($1, '33000000-0000-4000-a000-000000000001', $2, 'Sick', $3)`,
          [ORG_A, P.choristerA1, U.choristerA1],
        ),
      ),
    );
    await expectDenied(db, U.choristerA1, (tx) =>
      tx.query(
        `insert into public.absence_reports (organization_id, event_id, person_id, reason, reported_by) values ($1, '33000000-0000-4000-a000-000000000001', $2, 'Sick', $3)`,
        [ORG_A, P.choristerA2, U.choristerA1],
      ),
    );
  });

  it('cannot read another chorister’s conversation or post into it', async () => {
    expect(await count(U.choristerA1, 'conversations', 'member_id = $1', [P.choristerA2])).toBe(0);
    const conv = (await db.query<{ id: string }>(`select id from public.conversations where member_id = $1`, [P.choristerA2])).rows[0]!.id;
    await expectDenied(db, U.choristerA1, (tx) =>
      tx.query(`insert into public.messages (organization_id, conversation_id, author_person_id, body) values ($1, $2, $3, 'hi')`, [ORG_A, conv, P.choristerA1]),
    );
  });
});

describe('staff roles get what their role allows', () => {
  it('a section leader can take attendance but cannot see fees or care notes', async () => {
    const n = await asUser(db, U.sectionLeaderA, async (tx) =>
      (await tx.query(
        `insert into public.attendance (organization_id, event_id, person_id, status) values ($1, '33000000-0000-4000-a000-000000000001', $2, 'late')`,
        [ORG_A, P.choristerA1],
      )).affectedRows,
    );
    expect(n).toBe(1);
    expect(await count(U.sectionLeaderA, 'payments')).toBe(0);
    expect(await count(U.sectionLeaderA, 'fee_assignments')).toBe(0);
    expect(await count(U.sectionLeaderA, 'care_notes')).toBe(0);
    expect(await count(U.sectionLeaderA, 'staff_notes')).toBe(0);
  });

  it('a treasurer sees every payment but no care or staff notes', async () => {
    expect(await count(U.treasurerA, 'payments')).toBe(1);
    expect(await count(U.treasurerA, 'fee_assignments')).toBe(2);
    expect(await count(U.treasurerA, 'care_notes')).toBe(0);
    expect(await count(U.treasurerA, 'staff_notes')).toBe(0);
  });

  it('a conductor cannot see fees or change who has which role', async () => {
    expect(await count(U.conductorA, 'payments')).toBe(0);
    await expectDenied(db, U.conductorA, (tx) =>
      tx.query(
        `insert into public.member_roles (organization_id, person_id, role_id)
         select $1, $2, id from public.roles where organization_id = $1 and key = 'administrator'`,
        [ORG_A, P.conductorA],
      ),
    );
  });

  it('an administrator sees everyone, including care and staff notes', async () => {
    expect(await count(U.adminA, 'care_notes')).toBe(2);
    expect(await count(U.adminA, 'staff_notes')).toBe(1);
  });
});

describe('roles and permissions stay safe', () => {
  it('the administrator role cannot be weakened', async () => {
    const msg = await expectDenied(db, U.adminA, (tx) =>
      tx.query(
        `update public.role_permissions set level = 'none'
         where role_id = (select id from public.roles where organization_id = $1 and key = 'administrator')`,
        [ORG_A],
      ),
    );
    expect(msg).toMatch(/administrator role/);
  });

  it('a choir cannot remove its last administrator', async () => {
    const msg = await expectDenied(db, U.adminA, (tx) =>
      tx.query(
        `delete from public.member_roles where person_id = $1
         and role_id = (select id from public.roles where organization_id = $2 and key = 'administrator')`,
        [P.adminA, ORG_A],
      ),
    );
    expect(msg).toMatch(/at least one administrator/);
  });

  it('administrators can create a custom role and edit its permissions', async () => {
    await asUser(db, U.adminA, async (tx) => {
      const role = (await tx.query<{ id: string }>(
        `insert into public.roles (organization_id, name_en, name_fr) values ($1, 'Librarian', 'Bibliothécaire') returning id`,
        [ORG_A],
      )).rows[0]!;
      const r = await tx.query(
        `insert into public.role_permissions (organization_id, role_id, area, level) values ($1, $2, 'music', 'edit')`,
        [ORG_A, role.id],
      );
      expect(r.affectedRows).toBe(1);
    });
  });

  it('staff cannot link a person record to someone else’s account', async () => {
    const msg = await expectDenied(db, U.adminA, (tx) =>
      tx.query(`insert into public.people (organization_id, first_name, last_name, user_id) values ($1, 'X', 'Y', $2)`, [ORG_A, U.choristerB1]),
    );
    expect(msg).toMatch(/linked automatically/);
  });

  it('every permission area in the app matches the database', async () => {
    const { rows: r } = await db.query<{ v: string }>(`select unnest(enum_range(null::app.perm_area))::text as v`);
    expect(r.map((x) => x.v)).toEqual([...PERM_AREAS]);
  });
});

describe('accounts and the member directory', () => {
  it('links an invited person to their account only once their email is confirmed', async () => {
    await db.transaction(async (tx) => {
      await tx.query(`insert into public.people (id, organization_id, first_name, last_name, email) values ('20000000-0000-4000-a000-0000000000ff', $1, 'New', 'Member', 'new.member@example.com')`, [ORG_A]);
      await tx.query(`insert into auth.users (id, email) values ('10000000-0000-4000-a000-0000000000ff', 'new.member@example.com')`);
      let p = (await tx.query<{ user_id: string | null; status: string }>(`select user_id, status from public.people where id = '20000000-0000-4000-a000-0000000000ff'`)).rows[0]!;
      expect(p.user_id).toBeNull();
      await tx.query(`update auth.users set email_confirmed_at = now() where id = '10000000-0000-4000-a000-0000000000ff'`);
      p = (await tx.query<{ user_id: string | null; status: string }>(`select user_id, status from public.people where id = '20000000-0000-4000-a000-0000000000ff'`)).rows[0]!;
      expect(p).toEqual({ user_id: '10000000-0000-4000-a000-0000000000ff', status: 'active' });
      await tx.rollback();
    });
  });

  it('only the server can link an existing account to a new choir', async () => {
    await expectDenied(db, U.adminA, (tx) => tx.query(`select public.link_existing_account($1)`, [P.choristerA2]));
    await db.transaction(async (tx) => {
      // Sam (choir B) is added to choir A's roster with the same email…
      await tx.query(
        `insert into public.people (id, organization_id, first_name, last_name, email) values ('20000000-0000-4000-a000-0000000000ee', $1, 'Sam', 'Brook', 'choristerb1@example.com')`,
        [ORG_A],
      );
      await tx.exec(`set local role service_role`);
      const r = await tx.query<{ linked: boolean }>(`select public.link_existing_account('20000000-0000-4000-a000-0000000000ee') as linked`);
      expect(r.rows[0]!.linked).toBe(true);
      await tx.exec(`reset role`);
      const p = (await tx.query<{ user_id: string }>(`select user_id from public.people where id = '20000000-0000-4000-a000-0000000000ee'`)).rows[0]!;
      expect(p.user_id).toBe(U.choristerB1);
      await tx.rollback();
    });
  });

  it('members see each other’s names but not contact details unless shared', async () => {
    const dir = await asUser(db, U.choristerA2, (tx) =>
      rows<{ id: string; email: string | null; phone: string | null }>(tx, `select id, email, phone from public.member_directory where id = $1`, [P.choristerA1]),
    );
    expect(dir).toHaveLength(1);
    expect(dir[0]!.email).toBeNull();
  });

  it('the directory shows nothing of other choirs', async () => {
    const n = await asUser(db, U.choristerA1, async (tx) => (await rows(tx, `select 1 from public.member_directory where organization_id = $1`, [ORG_B])).length);
    expect(n).toBe(0);
  });
});

describe('guardian signature requests', () => {
  const FORM = '38000000-0000-4000-a000-000000000001';
  beforeAll(async () => {
    // Maya (choir A, 16) submits the tour form; her mother is on file.
    await db.exec(`
      insert into public.guardians (id, organization_id, first_name, last_name, email)
        values ('32000000-0000-4000-a000-0000000000a2', '${ORG_A}', 'Mei', 'Chen', 'mei.chen@example.com');
      insert into public.guardian_links (organization_id, guardian_id, chorister_id, is_primary)
        values ('${ORG_A}', '32000000-0000-4000-a000-0000000000a2', '${P.choristerA2}', true);
      insert into public.form_responses (id, organization_id, form_id, person_id, status)
        values ('38100000-0000-4000-a000-0000000000a2', '${ORG_A}', '${FORM}', '${P.choristerA2}', 'submitted');
    `);
  });

  it('sends each guardian of a minor a single-use link, storing only its hash', async () => {
    const sent = await asUser(db, U.choristerA2, async (tx) =>
      (await rows<{ n: number }>(tx, `select public.request_guardian_signatures('38100000-0000-4000-a000-0000000000a2') as n`))[0]!.n,
    );
    expect(sent).toBe(1);
    // asUser rolled back; run it for real as the member to check what was stored.
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: U.choristerA2 })]);
      await tx.exec('set local role authenticated');
      await tx.query(`select public.request_guardian_signatures('38100000-0000-4000-a000-0000000000a2')`);
      await tx.exec('reset role');
      const sig = (await tx.query<{ token_hash: string }>(`select token_hash from public.guardian_signatures where response_id = '38100000-0000-4000-a000-0000000000a2'`)).rows[0]!;
      const mail = (await tx.query<{ payload: { token: string } }>(`select payload from public.email_queue where template = 'guardian_signature' order by created_at desc limit 1`)).rows[0]!;
      const hash = (await tx.query<{ h: string }>(`select encode(extensions.digest($1, 'sha256'), 'hex') as h`, [mail.payload.token])).rows[0]!.h;
      expect(sig.token_hash).toBe(hash);
      expect(sig.token_hash).not.toBe(mail.payload.token);
      await tx.rollback();
    });
  });

  it('refuses for someone else’s form, and does nothing for adults', async () => {
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`select public.request_guardian_signatures('38100000-0000-4000-a000-0000000000a2')`));
    const adult = await asUser(db, U.choristerA1, async (tx) =>
      (await rows<{ n: number }>(tx, `select public.request_guardian_signatures('38100000-0000-4000-a000-000000000001') as n`))[0]!.n,
    );
    expect(adult).toBe(0);
  });

  it('staff can see the email queue but not the link inside it', async () => {
    await expectDenied(db, U.adminA, (tx) => tx.query(`select payload from public.email_queue`));
    expect(await count(U.adminA, 'email_queue')).toBeGreaterThan(0);
  });
});

describe('audit, email and demo rules', () => {
  it('records which columns changed on a member record, without the values', async () => {
    await asUser(db, U.adminA, async (tx) => {
      await tx.query(`update public.people set phone = '613-555-0199' where id = $1`, [P.choristerA2]);
      const log = await rows<{ action: string; changed_columns: string[]; actor_id: string }>(
        tx,
        `select action, changed_columns, actor_id from public.audit_log where entity = 'people' and entity_id = $1 order by id desc limit 1`,
        [P.choristerA2],
      );
      expect(log[0]).toEqual({ action: 'update', changed_columns: ['phone'], actor_id: U.adminA });
    });
  });

  it('lets staff log a profile view, and not outsiders', async () => {
    await asUser(db, U.adminA, (tx) => tx.query(`select public.log_event($1, 'view', 'people', $2)`, [ORG_A, P.choristerA1]));
    await expectDenied(db, U.adminB, (tx) => tx.query(`select public.log_event($1, 'view', 'people', $2)`, [ORG_A, P.choristerA1]));
  });

  it('nobody can edit or delete audit entries from the browser', async () => {
    await expectDenied(db, U.adminA, (tx) => tx.query(`delete from public.audit_log`));
    await expectDenied(db, U.adminA, (tx) => tx.query(`update public.audit_log set action = 'view'`));
  });

  it('shows the email budget to staff only', async () => {
    const staff = await asUser(db, U.adminA, (tx) => rows(tx, `select * from public.email_budget_today($1)`, [ORG_A]));
    expect(staff).toHaveLength(1);
    const chorister = await asUser(db, U.choristerA1, (tx) => rows(tx, `select * from public.email_budget_today($1)`, [ORG_A]));
    expect(chorister).toHaveLength(0);
  });

  it('never sends email from a demo choir', async () => {
    await db.transaction(async (tx) => {
      await tx.query(`update public.organizations set is_demo = true where id = $1`, [ORG_B]);
      const r = await tx.query<{ status: string }>(
        `insert into public.email_queue (organization_id, to_email, template, subject) values ($1, 'x@example.com', 't', 's') returning status`,
        [ORG_B],
      );
      expect(r.rows[0]!.status).toBe('suppressed');
      await tx.rollback();
    });
  });

  it('feedback is readable by Choirbook admins and the sender only', async () => {
    expect(await count(U.adminA, 'feedback')).toBe(1); // their own
    expect(await count(U.choristerA1, 'feedback')).toBe(0);
  });
});
