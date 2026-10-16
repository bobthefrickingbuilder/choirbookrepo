import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { asUser, createDatabase, expectDenied, rows, type Tx } from './support/db';
import { ORG_A, ORG_B, P, U, seed } from './support/fixtures';

// The server-side helpers behind the staff tools (Phase 4).

let db: PGlite;
const NOW_EVENT = '33000000-0000-4000-a000-0000000000f1';
const ANN = '36000000-0000-4000-a000-0000000000f1';

beforeAll(async () => {
  db = await createDatabase();
  await seed(db);
  await db.exec(`
    insert into public.events (id, organization_id, type, title, starts_at, ends_at)
      values ('${NOW_EVENT}', '${ORG_A}', 'rehearsal', 'Tonight', now() - interval '5 minutes', now() + interval '2 hours');
    insert into public.announcements (id, organization_id, title, body, audience)
      values ('${ANN}', '${ORG_A}', 'Altos only', 'Sectional moved.', '{"section_ids": ["31000000-0000-4000-a000-00000000000a"]}');
  `);
});

/** Switch who is signed in, inside one transaction (to pass a value from staff to member). */
const signIn = (tx: Tx, uid: string) =>
  tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);

describe('QR check-in', () => {
  it('only attendance staff can get the door code', async () => {
    const code = await asUser(db, U.sectionLeaderA, async (tx) => (await rows<{ code: string }>(tx, `select code from public.checkin_code($1)`, [NOW_EVENT]))[0]!.code);
    expect(code).toMatch(/^[0-9A-F]{8}$/);
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`select * from public.checkin_code($1)`, [NOW_EVENT]));
    await expectDenied(db, U.adminB, (tx) => tx.query(`select * from public.checkin_code($1)`, [NOW_EVENT]));
  });

  it('nobody can read the secret behind the codes', async () => {
    await asUser(db, U.adminA, async (tx) => {
      await tx.query(`select * from public.checkin_code($1)`, [NOW_EVENT]);
      expect(await rows(tx, `select * from public.event_checkin_keys`)).toEqual([]);
    });
  });

  it('a chorister with the current code is checked in once; a wrong code does nothing', async () => {
    await asUser(db, U.adminA, async (tx) => {
      const code = (await rows<{ code: string }>(tx, `select code from public.checkin_code($1)`, [NOW_EVENT]))[0]!.code;
      await signIn(tx, U.choristerA1);
      const check = async (c: string) => (await rows<{ r: string }>(tx, `select public.qr_check_in($1, $2) as r`, [NOW_EVENT, c]))[0]!.r;
      expect(await check('00000000')).toBe('invalid');
      expect(await check(code.toLowerCase())).toBe('present');
      expect(await check(code)).toBe('already');
      await signIn(tx, U.adminA);
      const marked = await rows<{ status: string; source: string }>(tx, `select status, source from public.attendance where event_id = $1 and person_id = $2`, [NOW_EVENT, P.choristerA1]);
      expect(marked).toEqual([{ status: 'present', source: 'qr' }]);
    });
  });

  it('refuses outside the event and for other choirs', async () => {
    await asUser(db, U.adminA, async (tx) => {
      const future = '33000000-0000-4000-a000-000000000001';
      const code = (await rows<{ code: string }>(tx, `select code from public.checkin_code($1)`, [future]))[0]!.code;
      await signIn(tx, U.choristerA1);
      expect((await rows<{ r: string }>(tx, `select public.qr_check_in($1, $2) as r`, [future, code]))[0]!.r).toBe('closed');
      await signIn(tx, U.choristerB1);
      expect((await rows<{ r: string }>(tx, `select public.qr_check_in($1, $2) as r`, [future, code]))[0]!.r).toBe('invalid');
    });
  });
});

describe('announcements and notifications', () => {
  it('publishing reaches the chosen section and staff, notifies them and queues digests', async () => {
    await asUser(db, U.adminA, async (tx) => {
      const n = (await rows<{ n: number }>(tx, `select public.publish_announcement($1) as n`, [ANN]))[0]!.n;
      const people = (await rows<{ person_id: string }>(tx, `select person_id from public.announcement_recipients where announcement_id = $1`, [ANN])).map((r) => r.person_id);
      expect(people).toContain(P.choristerA1); // an alto
      expect(people).not.toContain(P.choristerA2); // no section
      expect(people).toContain(P.adminA);
      expect(n).toBe(people.length);
      const digests = await rows(tx, `select id from public.email_queue where template = 'digest_item' and to_person_id = $1`, [P.choristerA1]);
      expect(digests).toHaveLength(1);
      await signIn(tx, U.choristerA1);
      const mine = await rows<{ title: string }>(tx, `select title from public.notifications where category = 'announcements'`);
      expect(mine.map((r) => r.title)).toContain('Altos only');
    });
  });

  it('only announcement editors can publish, and only once', async () => {
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`select public.publish_announcement($1)`, [ANN]));
    await expectDenied(db, U.treasurerA, (tx) => tx.query(`select public.publish_announcement($1)`, [ANN]));
    await asUser(db, U.adminA, async (tx) => {
      await tx.query(`select public.publish_announcement($1)`, [ANN]);
      await expect(tx.query(`select public.publish_announcement($1)`, [ANN])).rejects.toThrow(/already gone out/);
    });
  });

  it('staff can notify their own members in their language; members cannot', async () => {
    await asUser(db, U.adminA, async (tx) => {
      await tx.exec(`reset role`);
      await tx.query(`update public.people set lang = 'fr' where id = $1`, [P.choristerA1]);
      await tx.exec(`set local role authenticated`);
      const n = (await rows<{ n: number }>(tx, `select public.notify_people($1, $2, 'schedule', 'Cancelled', null, '/c/x', 'Annulé') as n`, [ORG_A, [P.choristerA1, P.choristerB1]]))[0]!.n;
      expect(n).toBe(1); // Sam is in another choir
      await signIn(tx, U.choristerA1);
      expect((await rows<{ title: string }>(tx, `select title from public.notifications where category = 'schedule'`))[0]!.title).toBe('Annulé');
    });
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`select public.notify_people($1, $2, 'system', 'Hi')`, [ORG_A, [P.choristerA2]]));
  });
});

describe('moderation and guardian links', () => {
  it('moderators can pause a member’s messaging, which stops them posting', async () => {
    await asUser(db, U.adminA, async (tx) => {
      await tx.query(`select public.set_messaging_suspended($1, true)`, [P.choristerA1]);
      await signIn(tx, U.choristerA1);
      await expect(
        tx.query(`insert into public.messages (organization_id, conversation_id, author_person_id, body) values ($1, '37000000-0000-4000-a000-000000000001', $2, 'Hello?')`, [ORG_A, P.choristerA1]),
      ).rejects.toThrow(/Messaging is paused/);
    });
    await expectDenied(db, U.treasurerA, (tx) => tx.query(`select public.set_messaging_suspended($1, true)`, [P.choristerA1]));
    await expectDenied(db, U.adminB, (tx) => tx.query(`select public.set_messaging_suspended($1, true)`, [P.choristerA1]));
  });

  it('forms staff can resend a guardian link; other staff cannot', async () => {
    await expectDenied(db, U.treasurerA, (tx) => tx.query(`select public.request_guardian_signatures('38100000-0000-4000-a000-000000000001')`));
    // Ella is an adult in the fixtures, so nothing goes out, but the call is allowed.
    const n = await asUser(db, U.adminA, async (tx) => (await rows<{ n: number }>(tx, `select public.request_guardian_signatures('38100000-0000-4000-a000-000000000001') as n`))[0]!.n);
    expect(n).toBe(0);
  });
});

describe('monthly updates', () => {
  it('generates one personal summary per chorister, which only they and staff see', async () => {
    const id = (await db.query<{ id: string }>(`select id from public.monthly_updates where organization_id = $1`, [ORG_A])).rows[0]!.id;
    await asUser(db, U.adminA, async (tx) => {
      const n = (await rows<{ n: number }>(tx, `select public.generate_monthly_update($1) as n`, [id]))[0]!.n;
      expect(n).toBe(2);
      const ella = (await rows<{ content: { owing_cents: number; forms_due: string[] } }>(tx, `select content from public.monthly_update_deliveries where person_id = $1`, [P.choristerA1]))[0]!.content;
      expect(ella.owing_cents).toBe(19500);
      expect((await rows<{ n: number }>(tx, `select public.send_monthly_update($1) as n`, [id]))[0]!.n).toBe(2);
      await signIn(tx, U.choristerA1);
      expect(await rows(tx, `select person_id from public.monthly_update_deliveries`)).toEqual([{ person_id: P.choristerA1 }]);
      expect(await rows(tx, `select id from public.monthly_updates`)).toHaveLength(1);
    });
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`select public.generate_monthly_update($1)`, [id]));
  });
});
