import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { asUser, createDatabase, expectDenied, rows } from './support/db';
import { ORG_A, ORG_B, U, seed } from './support/fixtures';

// The staff dashboard (Phase 5): the attendance view and saved layouts.

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  await seed(db);
});

const count = (uid: string, sql: string, params: unknown[] = []) =>
  asUser(db, uid, async (tx) => (await rows<{ n: number }>(tx, sql, params))[0]!.n);

describe('attendance_facts', () => {
  it('follows the attendance rules: staff with attendance see marks, the treasurer and other choirs do not', async () => {
    const all = await count(U.adminA, `select count(*)::int as n from public.attendance_facts where organization_id = $1`, [ORG_A]);
    const raw = await count(U.adminA, `select count(*)::int as n from public.attendance where organization_id = $1`, [ORG_A]);
    expect(all).toBeGreaterThan(0);
    expect(all).toBe(raw);
    expect(await count(U.sectionLeaderA, `select count(*)::int as n from public.attendance_facts`)).toBe(all);
    expect(await count(U.treasurerA, `select count(*)::int as n from public.attendance_facts`)).toBe(0);
    expect(await count(U.adminB, `select count(*)::int as n from public.attendance_facts where organization_id = $1`, [ORG_A])).toBe(0);
  });

  it('carries the event date and the chorister section', async () => {
    const r = await asUser(db, U.adminA, (tx) => rows<{ starts_at: string | null; section_id: string | null }>(tx, `select starts_at, section_id from public.attendance_facts limit 5`));
    expect(r.every((x) => x.starts_at)).toBe(true);
    expect(r.some((x) => x.section_id)).toBe(true);
  });
});

describe('dashboard_layouts', () => {
  it('each staff member keeps their own layout', async () => {
    // Each asUser runs in a transaction that is rolled back, so write and read in one.
    await asUser(db, U.adminA, async (tx) => {
      await tx.query(`insert into public.dashboard_layouts (organization_id, user_id, widgets, hidden) values ($1, $2, '{fees,attendance}', '{tickets}')`, [ORG_A, U.adminA]);
      expect(await rows(tx, `select widgets, hidden from public.dashboard_layouts`)).toEqual([{ widgets: ['fees', 'attendance'], hidden: ['tickets'] }]);
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: U.conductorA, role: 'authenticated' })]);
      expect(await rows(tx, `select * from public.dashboard_layouts`)).toEqual([]);
    });
  });

  it('nobody can write a layout for someone else, and choristers cannot save one', async () => {
    await expectDenied(db, U.conductorA, (tx) => tx.query(`insert into public.dashboard_layouts (organization_id, user_id) values ($1, $2)`, [ORG_A, U.adminA]));
    await expectDenied(db, U.choristerA1, (tx) => tx.query(`insert into public.dashboard_layouts (organization_id, user_id) values ($1, $2)`, [ORG_A, U.choristerA1]));
    await expectDenied(db, U.adminB, (tx) => tx.query(`insert into public.dashboard_layouts (organization_id, user_id) values ($1, $2)`, [ORG_A, U.adminB]));
    expect(await count(U.adminB, `select count(*)::int as n from public.dashboard_layouts where organization_id = $1`, [ORG_B])).toBe(0);
  });
});
