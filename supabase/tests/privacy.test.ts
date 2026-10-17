import type { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { asUser, createDatabase, expectDenied, rows } from './support/db';
import { ORG_A, ORG_B, P, U, seed } from './support/fixtures';

// Phase 6: age rules, guardian copies and signatures, consents, the profanity
// filter, rate limits and account deletion.

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  await seed(db);
});

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const isoYearsAgo = (years: number, plusDays = 0) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() + plusDays);
  return d.toISOString().slice(0, 10);
};

/** Runs as the server (service role), rolled back afterwards. */
async function asServer<T>(fn: (tx: Parameters<Parameters<PGlite['transaction']>[0]>[0]) => Promise<T>): Promise<T> {
  let out: T | undefined;
  const stop = new Error('rollback');
  try {
    await db.transaction(async (tx) => {
      await tx.exec('set local role service_role');
      out = await fn(tx);
      throw stop;
    });
  } catch (e) {
    if (e !== stop) throw e;
  }
  return out as T;
}

describe('age rules', () => {
  it('computes minor status from the date of birth', async () => {
    const r = await asUser(db, U.adminA, (tx) =>
      rows<{ m17: boolean; m18: boolean; none: boolean; age: number }>(
        tx,
        `select public.is_minor($1) as m17, public.is_minor($2) as m18, public.is_minor(null) as none, public.age_years($2) as age`,
        [isoYearsAgo(18, 1), isoYearsAgo(18)],
      ),
    );
    expect(r[0]).toEqual({ m17: true, m18: false, none: false, age: 18 });
  });

  it('refuses choristers under 14, whether added or edited', async () => {
    const msg = await expectDenied(db, U.adminA, async (tx) => {
      await tx.query(
        `insert into public.people (id, organization_id, first_name, last_name, date_of_birth) values ('2a000000-0000-4000-a000-000000000001', $1, 'Young', 'Singer', $2)`,
        [ORG_A, isoYearsAgo(13)],
      );
      await tx.query(`insert into public.choristers (person_id, organization_id) values ('2a000000-0000-4000-a000-000000000001', $1)`, [ORG_A]);
    });
    expect(msg).toMatch(/at least 14/);
    expect(
      await expectDenied(db, U.adminA, (tx) => tx.query(`update public.people set date_of_birth = $2 where id = $1`, [P.choristerA2, isoYearsAgo(12)])),
    ).toMatch(/at least 14/);
    // 14 is fine, and so are staff with no chorister record.
    await asUser(db, U.adminA, (tx) => tx.query(`update public.people set date_of_birth = $2 where id = $1`, [P.choristerA2, isoYearsAgo(14)]));
    await asUser(db, U.adminA, (tx) => tx.query(`update public.people set date_of_birth = $2 where id = $1`, [P.treasurerA, isoYearsAgo(10)]));
  });

  it('on the 18th birthday guardian copies stop and the chorister is told', async () => {
    await asServer(async (tx) => {
      await tx.query(`update public.people set date_of_birth = $2 where id = $1`, [P.choristerA1, isoYearsAgo(18)]);
      await tx.query(`update public.people set date_of_birth = $2 where id = $1`, [P.choristerB1, isoYearsAgo(30)]);
      const n = (await tx.query<{ n: number }>(`select public.process_coming_of_age() as n`)).rows[0]!.n;
      expect(n).toBe(2);
      expect((await tx.query(`select 1 from public.guardian_links where receives_copies`)).rows).toHaveLength(0);
      const notes = (await tx.query<{ user_id: string; title: string }>(`select user_id, title from public.notifications where title like 'Happy 18th%'`)).rows;
      // Only the one who just turned 18; an adult who joined with a guardian on file is not congratulated.
      expect(notes).toEqual([{ user_id: U.choristerA1, title: 'Happy 18th birthday!' }]);
      expect((await tx.query<{ n: number }>(`select public.process_coming_of_age() as n`)).rows[0]!.n).toBe(0);
    });
  });

  it('only the server can run the birthday job', async () => {
    await expectDenied(db, U.adminA, (tx) => tx.query(`select public.process_coming_of_age()`));
  });
});

describe('guardian copies', () => {
  const queueFor = (tx: Parameters<Parameters<PGlite['transaction']>[0]>[0], person: string, template: string, payload: object) =>
    tx.query(
      `insert into public.email_queue (organization_id, to_email, to_person_id, template, subject, payload, digest_key)
       values ($1, 'kid@example.com', $2, $3, 'Winter concert', $4, 'digest:x')`,
      [ORG_A, person, template, JSON.stringify(payload)],
    );

  it('copies the kinds of email the choir chose to the guardians of minors only', async () => {
    await asServer(async (tx) => {
      await tx.query(`update public.organizations set settings = '{"guardian_copies":["announcements"]}' where id = $1`, [ORG_A]);
      await tx.query(`update public.people set date_of_birth = $2 where id = $1`, [P.choristerA1, isoYearsAgo(16)]);
      await queueFor(tx, P.choristerA1, 'digest_item', { kind: 'announcement' });
      await queueFor(tx, P.choristerA1, 'monthly_update', {});
      const copies = (await tx.query<{ to_email: string; subject: string; digest_key: string }>(
        `select to_email, subject, digest_key from public.email_queue where to_guardian_id is not null and template <> 'guardian_signature'`,
      )).rows;
      expect(copies).toEqual([{ to_email: 'parent.a@example.com', subject: 'Guardian copy: Winter concert', digest_key: expect.stringMatching(/^guardian:.*digest:x$/) }]);

      // An adult's email is never copied.
      await tx.query(`update public.people set date_of_birth = $2 where id = $1`, [P.choristerA1, isoYearsAgo(19)]);
      await queueFor(tx, P.choristerA1, 'digest_item', { kind: 'announcement' });
      expect((await tx.query(`select 1 from public.email_queue where to_guardian_id is not null and template = 'digest_item'`)).rows).toHaveLength(1);
    });
  });

  it('respects a guardian who should not get copies', async () => {
    await asServer(async (tx) => {
      await tx.query(`update public.organizations set settings = '{"guardian_copies":["announcements"]}' where id = $1`, [ORG_A]);
      await tx.query(`update public.people set date_of_birth = $2 where id = $1`, [P.choristerA1, isoYearsAgo(16)]);
      await tx.query(`update public.guardian_links set receives_copies = false where chorister_id = $1`, [P.choristerA1]);
      await queueFor(tx, P.choristerA1, 'digest_item', { kind: 'announcement' });
      expect((await tx.query(`select 1 from public.email_queue where to_guardian_id is not null and template = 'digest_item'`)).rows).toHaveLength(0);
    });
  });
});

describe('guardian signature links', () => {
  const token = 'guardian-test-token';
  const setLink = (tx: Parameters<Parameters<PGlite['transaction']>[0]>[0], expires = "now() + interval '7 days'") =>
    tx.query(`update public.guardian_signatures set token_hash = $1, expires_at = ${expires} where organization_id = $2`, [sha(token), ORG_A]);

  it('shows the guardian the form and records one signature, then stops working', async () => {
    await asServer(async (tx) => {
      await setLink(tx);
      const info = (await tx.query<{ j: Record<string, unknown> }>(`select public.guardian_link_lookup($1) as j`, [token])).rows[0]!.j;
      expect(info).toMatchObject({ state: 'valid', form: 'Tour permission', guardian: 'Daniel Parent', chorister: 'Ella Martin', choir: 'River Youth Choir' });
      expect((await tx.query<{ s: string }>(`select public.guardian_link_sign($1, 'D', null, null) as s`, [token])).rows[0]!.s).toBe('name');
      expect((await tx.query<{ s: string }>(`select public.guardian_link_sign($1, 'Daniel Parent', '203.0.113.9', 'Test browser') as s`, [token])).rows[0]!.s).toBe('signed');
      const sig = (await tx.query<{ signed_name: string; signed_ip: string; used_at: string }>(
        `select signed_name, host(signed_ip) as signed_ip, used_at from public.guardian_signatures where organization_id = $1`, [ORG_A],
      )).rows[0]!;
      expect(sig).toMatchObject({ signed_name: 'Daniel Parent', signed_ip: '203.0.113.9' });
      expect(sig.used_at).toBeTruthy();
      expect((await tx.query<{ s: string }>(`select public.guardian_link_sign($1, 'Someone Else', null, null) as s`, [token])).rows[0]!.s).toBe('used');
      expect((await tx.query<{ j: { state: string; answers?: unknown } }>(`select public.guardian_link_lookup($1) as j`, [token])).rows[0]!.j).toEqual(
        expect.objectContaining({ state: 'used', signed_name: 'Daniel Parent' }),
      );
      // The chorister hears about it in the app.
      expect((await tx.query(`select 1 from public.notifications where user_id = $1 and title like 'Guardian signed%'`, [U.choristerA1])).rows).toHaveLength(1);
    });
  });

  it('refuses expired and unknown links without revealing the form', async () => {
    await asServer(async (tx) => {
      await setLink(tx, "now() - interval '1 minute'");
      const info = (await tx.query<{ j: Record<string, unknown> }>(`select public.guardian_link_lookup($1) as j`, [token])).rows[0]!.j;
      expect(info.state).toBe('expired');
      expect(info).not.toHaveProperty('answers');
      expect((await tx.query<{ s: string }>(`select public.guardian_link_sign($1, 'Daniel Parent') as s`, [token])).rows[0]!.s).toBe('expired');
      expect((await tx.query<{ j: Record<string, unknown> }>(`select public.guardian_link_lookup('nope') as j`)).rows[0]!.j).toEqual({ state: 'unknown' });
    });
  });

  it('cannot be looked up or signed from the browser, and the demo-only link is refused outside the demo', async () => {
    await expectDenied(db, null, (tx) => tx.query(`select public.guardian_link_lookup('x')`));
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`select public.guardian_link_sign('x', 'Name Here')`));
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`select public.demo_guardian_link('38100000-0000-4000-a000-000000000001')`));
  });
});

describe('consents', () => {
  it('every new choir starts with version 1 of each consent wording', async () => {
    const kinds = await asUser(db, U.adminB, (tx) =>
      rows<{ kind: string }>(tx, `select kind from public.consent_wording_versions where organization_id = $1 and version = 1 order by kind::text`, [ORG_B]),
    );
    expect(kinds.map((k) => k.kind)).toEqual(['participation', 'code_of_conduct', 'photo_video', 'medical_info'].sort());
  });

  it('a member records and withdraws their own consent; the latest answer counts', async () => {
    await asUser(db, U.choristerA1, async (tx) => {
      const w = (await tx.query<{ id: string }>(`select id from public.consent_wording_versions where organization_id = $1 and kind = 'medical_info'`, [ORG_A])).rows[0]!;
      for (const granted of [true, false]) {
        await tx.query(
          `insert into public.consents (organization_id, person_id, kind, granted, wording_version_id, method, recorded_by, recorded_at)
           values ($1, $2, 'medical_info', $3, $4, 'self', $5, now() + make_interval(secs => $6))`,
          [ORG_A, P.choristerA1, granted, w.id, U.choristerA1, granted ? 0 : 1],
        );
      }
      const cur = await rows<{ granted: boolean; wording_version: number }>(tx, `select granted, wording_version from public.current_consents where kind = 'medical_info'`);
      expect(cur).toEqual([{ granted: false, wording_version: 1 }]);
      expect((await rows(tx, `select * from public.consents where kind = 'medical_info'`)).length).toBe(2);
    });
  });

  it('nobody records consent for someone else unless staff, and other choirs see nothing', async () => {
    await expectDenied(db, U.choristerA2, (tx) =>
      tx.query(
        `insert into public.consents (organization_id, person_id, kind, granted, wording_version_id, method, recorded_by)
         select $1, $2, 'photo_video', true, id, 'self', $3 from public.consent_wording_versions where organization_id = $1 limit 1`,
        [ORG_A, P.choristerA1, U.choristerA2],
      ),
    );
    expect(await asUser(db, U.choristerA2, (tx) => rows(tx, `select * from public.current_consents where person_id = $1`, [P.choristerA1]))).toEqual([]);
    expect(await asUser(db, U.adminB, (tx) => rows(tx, `select * from public.current_consents where organization_id = $1`, [ORG_A]))).toEqual([]);
  });
});

describe('profanity filter', () => {
  const send = (tx: Parameters<Parameters<PGlite['transaction']>[0]>[0], author: string, body: string) =>
    tx.query<{ held_for_review: boolean }>(
      `insert into public.messages (organization_id, conversation_id, author_person_id, body)
       values ($1, '37000000-0000-4000-a000-000000000001', $2, $3) returning held_for_review`,
      [ORG_A, author, body],
    );

  it('holds members’ messages with EN or FR profanity, including disguised spellings', async () => {
    await asUser(db, U.choristerA1, async (tx) => {
      expect((await send(tx, P.choristerA1, 'See you Thursday!')).rows[0]!.held_for_review).toBe(false);
      expect((await send(tx, P.choristerA1, 'This is sh1t')).rows[0]!.held_for_review).toBe(true);
      expect((await send(tx, P.choristerA1, 'Tabarnak, encore?')).rows[0]!.held_for_review).toBe(true);
      expect((await send(tx, P.choristerA1, 'Quelle MERDE')).rows[0]!.held_for_review).toBe(true);
      // Whole words only: "Scunthorpe" and "class" are fine.
      expect((await send(tx, P.choristerA1, 'Our tour stops in Scunthorpe, first class')).rows[0]!.held_for_review).toBe(false);
    });
  });

  it('each choir can add words, allow words, or turn the filter off; staff messages are not held', async () => {
    await asServer(async (tx) => {
      await tx.query(`update public.organizations set settings = '{"moderation":{"extra_words":["kazoo"],"allowed_words":["merde"]}}' where id = $1`, [ORG_A]);
      expect((await tx.query<{ v: boolean }>(`select public.contains_profanity($1, 'Bring a KAZOO') as v`, [ORG_A])).rows[0]!.v).toBe(true);
      expect((await tx.query<{ v: boolean }>(`select public.contains_profanity($1, 'merde alors') as v`, [ORG_A])).rows[0]!.v).toBe(false);
      expect((await tx.query<{ v: boolean }>(`select public.contains_profanity($1, 'Bring a kazoo') as v`, [ORG_B])).rows[0]!.v).toBe(false);
      await tx.query(`update public.organizations set settings = '{"moderation":{"filter":false}}' where id = $1`, [ORG_A]);
      expect((await tx.query<{ v: boolean }>(`select public.contains_profanity($1, 'shit') as v`, [ORG_A])).rows[0]!.v).toBe(false);
    });
    await asUser(db, U.adminA, async (tx) => {
      expect((await send(tx, P.adminA, 'Oh shit, I forgot the folders')).rows[0]!.held_for_review).toBe(false);
    });
  });

  it('the built-in word list is not readable', async () => {
    await expectDenied(db, U.adminA, (tx) => tx.query(`select * from app.profanity_words`));
    const sizes = await asUser(db, U.adminA, (tx) => rows<{ lang: string; words: number }>(tx, `select * from public.profanity_list_size()`));
    expect(sizes.map((s) => s.lang)).toEqual(['en', 'fr']);
    expect(sizes.every((s) => s.words > 10)).toBe(true);
  });
});

describe('rate limits', () => {
  it('allows hits up to the limit inside the window, for the server only', async () => {
    await asServer(async (tx) => {
      const hit = async () => (await tx.query<{ ok: boolean }>(`select public.rate_limit_hit('signin:ip:203.0.113.1', 3, 900) as ok`)).rows[0]!.ok;
      expect([await hit(), await hit(), await hit(), await hit()]).toEqual([true, true, true, false]);
      expect((await tx.query<{ ok: boolean }>(`select public.rate_limit_hit('signin:ip:203.0.113.2', 3, 900) as ok`)).rows[0]!.ok).toBe(true);
      await tx.exec('reset role');
      await tx.query(`update app.rate_limits set window_start = now() - interval '16 minutes'`);
      await tx.exec('set local role service_role');
      expect(await hit()).toBe(true);
    });
    await expectDenied(db, null, (tx) => tx.query(`select public.rate_limit_hit('x', 1, 60)`));
    await expectDenied(db, U.adminA, (tx) => tx.query(`select public.rate_limit_hit('x', 1, 60)`));
  });
});

describe('account deletion', () => {
  it('a member asks, the emailed link confirms, and everything but payments is erased', async () => {
    await asServer(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: U.choristerA1, role: 'authenticated' })]);
      await tx.exec('set local role authenticated');
      expect((await tx.query<{ s: string }>(`select public.request_account_deletion() as s`)).rows[0]!.s).toBe('sent');
      expect((await tx.query<{ s: string }>(`select public.request_account_deletion() as s`)).rows[0]!.s).toBe('too_soon');
      expect((await tx.query(`select id from public.account_deletions`)).rows).toHaveLength(1);
      await tx.exec('reset role');
      await tx.exec('set local role service_role');
      const mail = (await tx.query<{ to_email: string; payload: { token: string } }>(`select to_email, payload from public.email_queue where template = 'account_deletion'`)).rows[0]!;
      expect(mail.to_email).toBe('choristera1@example.com');
      const token = mail.payload.token;
      expect((await tx.query<{ s: string }>(`select public.account_deletion_state($1) as s`, [token])).rows[0]!.s).toBe('valid');

      const done = (await tx.query<{ j: { state: string } }>(`select public.complete_account_deletion($1) as j`, [token])).rows[0]!.j;
      expect(done.state).toBe('deleted');
      await tx.exec('reset role');
      expect((await tx.query(`select 1 from auth.users where id = $1`, [U.choristerA1])).rows).toHaveLength(0);
      const person = (await tx.query<Record<string, unknown>>(`select first_name, email, date_of_birth, user_id, status from public.people where id = $1`, [P.choristerA1])).rows[0];
      expect(person).toEqual({ first_name: 'Deleted', email: null, date_of_birth: null, user_id: null, status: 'archived' });
      for (const table of ['care_notes', 'staff_notes', 'consents', 'form_responses', 'practice_log', 'availability_replies']) {
        expect((await tx.query(`select 1 from public.${table} where person_id = $1`, [P.choristerA1])).rows, table).toHaveLength(0);
      }
      expect((await tx.query(`select 1 from public.conversations where member_id = $1`, [P.choristerA1])).rows).toHaveLength(0);
      expect((await tx.query(`select 1 from public.guardians where organization_id = $1`, [ORG_A])).rows).toHaveLength(0);
      // Kept: payment records (tax law) and anonymous attendance.
      expect((await tx.query(`select 1 from public.payments where person_id = $1`, [P.choristerA1])).rows).toHaveLength(1);
      expect((await tx.query(`select 1 from public.attendance where person_id = $1`, [P.choristerA1])).rows).toHaveLength(1);
      expect((await tx.query(`select 1 from public.audit_log where entity = 'account' and action = 'delete'`)).rows).toHaveLength(1);
      // The link works once.
      expect((await tx.query<{ j: { state: string } }>(`select public.complete_account_deletion($1) as j`, [token])).rows[0]!.j.state).toBe('used');
    });
  });

  it('the last administrator and demo accounts cannot delete themselves; links expire', async () => {
    expect(await asUser(db, U.adminB, (tx) => rows<{ s: string }>(tx, `select public.request_account_deletion() as s`))).toEqual([{ s: 'last_admin' }]);
    await asServer(async (tx) => {
      await tx.query(
        `insert into public.account_deletions (user_id, token_hash, expires_at) values ($1, $2, now() - interval '1 minute')`,
        [U.choristerA2, sha('old-token')],
      );
      expect((await tx.query<{ j: { state: string } }>(`select public.complete_account_deletion('old-token') as j`)).rows[0]!.j.state).toBe('expired');
      await tx.exec('reset role');
      expect((await tx.query(`select 1 from auth.users where id = $1`, [U.choristerA2])).rows).toHaveLength(1);
    });
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`select public.complete_account_deletion('x')`));
  });
});
