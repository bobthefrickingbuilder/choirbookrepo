import { describe, expect, it } from 'vitest';
import { createDatabase } from './support/db';

describe('migrations', () => {
  it('apply cleanly on an empty database', async () => {
    const db = await createDatabase();
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from pg_tables where schemaname = 'public'`,
    );
    expect(rows[0]?.n).toBeGreaterThan(40);
  });
});
