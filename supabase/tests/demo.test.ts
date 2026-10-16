import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { asUser, createDatabase, expectDenied, rows } from './support/db';
import { ORG_A, seed } from './support/fixtures';

const DEMO_ORG = 'd0000000-0000-4000-8000-000000000001';
const DEMO = {
  chorister: 'd0000000-0000-4000-8000-0000000000a1',
  admin: 'd0000000-0000-4000-8000-0000000000a2',
  sectionLeader: 'd0000000-0000-4000-8000-0000000000a3',
  treasurer: 'd0000000-0000-4000-8000-0000000000a4',
};

let db: PGlite;
let firstRun: { choristers: number; events: number; attendance: number };

const resetDemo = async () =>
  (await db.query<{ r: typeof firstRun }>(`select public.reset_demo('test-demo-password') as r`)).rows[0]!.r;

beforeAll(async () => {
  db = await createDatabase();
  await seed(db);
  firstRun = await resetDemo();
});

const count = (uid: string, sql: string, params: unknown[] = []) =>
  asUser(db, uid, async (tx) => (await rows<{ n: number }>(tx, sql, params))[0]?.n ?? 0);

describe('demo choir', () => {
  it('builds a full fictional youth choir', () => {
    expect(firstRun.choristers).toBe(69);
    expect(firstRun.events).toBeGreaterThan(30);
    expect(firstRun.attendance).toBeGreaterThan(300);
  });

  it('can be rebuilt again and again with the same accounts', async () => {
    const again = await resetDemo();
    expect(again.choristers).toBe(firstRun.choristers);
    const users = await db.query<{ n: number }>(`select count(*)::int as n from auth.users where id in (select user_id from public.demo_accounts())`);
    expect(users.rows[0]!.n).toBe(4);
  });

  it('links each demo account to its person in the demo choir', async () => {
    const r = await db.query<{ email: string; linked: number }>(
      `select d.email, (select count(*)::int from public.people p where p.user_id = d.user_id and p.organization_id = $1) as linked
       from public.demo_accounts() d`,
      [DEMO_ORG],
    );
    expect(r.rows.every((x) => x.linked === 1)).toBe(true);
  });

  it('has minors with guardian contacts and a tour form waiting for a guardian signature', async () => {
    const minors = await db.query<{ n: number }>(
      `select count(*)::int as n from public.people p where p.organization_id = $1 and p.date_of_birth > (current_date - interval '18 years')`,
      [DEMO_ORG],
    );
    expect(minors.rows[0]!.n).toBeGreaterThanOrEqual(4);
    const waiting = await db.query<{ n: number }>(
      `select count(*)::int as n from public.guardian_signatures where organization_id = $1 and used_at is null`,
      [DEMO_ORG],
    );
    expect(waiting.rows[0]!.n).toBe(1);
    const tooYoung = await db.query<{ n: number }>(
      `select count(*)::int as n from public.people where organization_id = $1 and date_of_birth > current_date - interval '15 years'`,
      [DEMO_ORG],
    );
    expect(tooYoung.rows[0]!.n).toBe(0);
  });

  it('gives the demo chorister a 19-year-old’s realistic history', async () => {
    const ella = await asUser(db, DEMO.chorister, (tx) =>
      rows<{ age: number }>(tx, `select date_part('year', age(date_of_birth))::int as age from public.people where user_id = auth.uid()`),
    );
    expect(ella[0]!.age).toBe(19);
    expect(await count(DEMO.chorister, `select count(*)::int as n from public.attendance`)).toBeGreaterThan(3);
    expect(await count(DEMO.chorister, `select count(*)::int as n from public.conversations`)).toBeGreaterThan(0);
    // Fee partly paid.
    const fee = await asUser(db, DEMO.chorister, (tx) =>
      rows<{ amount_cents: number; paid_cents: number }>(tx, `select amount_cents, paid_cents from public.fee_balances where name = 'Annual fee'`),
    );
    expect(fee[0]!.paid_cents).toBeGreaterThan(0);
    expect(fee[0]!.paid_cents).toBeLessThan(fee[0]!.amount_cents);
    // An availability request she has not answered.
    const unanswered = await count(
      DEMO.chorister,
      `select count(*)::int as n from public.events e where e.availability_requested
       and not exists (select 1 from public.availability_replies a where a.event_id = e.id)`,
    );
    expect(unanswered).toBeGreaterThan(0);
  });

  it('keeps demo visitors inside the demo choir', async () => {
    expect(await count(DEMO.admin, `select count(*)::int as n from public.people where organization_id = $1`, [ORG_A])).toBe(0);
    expect(await count(DEMO.admin, `select count(*)::int as n from public.people where organization_id = $1`, [DEMO_ORG])).toBeGreaterThan(70);
    expect(await count(DEMO.chorister, `select count(*)::int as n from public.care_notes`)).toBe(1); // only her own
  });

  it('shows the role previews only what each role allows', async () => {
    expect(await count(DEMO.treasurer, `select count(*)::int as n from public.payments`)).toBeGreaterThan(30);
    expect(await count(DEMO.treasurer, `select count(*)::int as n from public.care_notes`)).toBe(0);
    expect(await count(DEMO.sectionLeader, `select count(*)::int as n from public.payments`)).toBe(0);
    expect(await count(DEMO.sectionLeader, `select count(*)::int as n from public.attendance`)).toBeGreaterThan(300);
  });

  it('never sends email from the demo', async () => {
    const r = await db.query<{ status: string }>(
      `insert into public.email_queue (organization_id, to_email, template, subject) values ($1, 'x@example.com', 't', 's') returning status`,
      [DEMO_ORG],
    );
    expect(r.rows[0]!.status).toBe('suppressed');
  });

  it('only the server can reset the demo, and demo accounts cannot join a real choir', async () => {
    await expectDenied(db, DEMO.admin, (tx) => tx.query(`select public.reset_demo('x')`));
    await expect(
      db.query(`insert into public.people (organization_id, first_name, last_name, user_id) values ($1, 'X', 'Y', $2)`, [ORG_A, DEMO.admin]),
    ).rejects.toThrow(/Demo accounts cannot join/);
  });

  it('leaves the real choirs untouched', async () => {
    const r = await db.query<{ n: number }>(`select count(*)::int as n from public.people where organization_id = $1`, [ORG_A]);
    expect(r.rows[0]!.n).toBe(6);
  });
});
