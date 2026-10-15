import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const here = import.meta.dirname;
const migrationsDir = join(here, '..', '..', 'migrations');

export type Tx = Transaction;

/** A fresh in-memory database with the Supabase stand-in and every migration applied. */
export async function createDatabase(): Promise<PGlite> {
  const db = new PGlite({ extensions: { citext, pgcrypto } });
  await db.exec(readFileSync(join(here, 'supabase-stub.sql'), 'utf8'));
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
  return db;
}

/**
 * Runs `fn` as a signed-in user (or as a signed-out visitor when uid is null),
 * the same way Supabase does: role "authenticated" plus JWT claims. Everything is
 * rolled back afterwards, so tests never affect each other.
 */
export async function asUser<T>(db: PGlite, uid: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  let result: T | undefined;
  const rollback = new Error('rollback');
  try {
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
        uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : '',
      ]);
      await tx.exec(uid ? 'set local role authenticated' : 'set local role anon');
      result = await fn(tx);
      throw rollback;
    });
  } catch (err) {
    if (err !== rollback) throw err;
  }
  return result as T;
}

/** Like asUser, but expects the work to fail with a database error. Returns the error message. */
export async function expectDenied(db: PGlite, uid: string | null, fn: (tx: Tx) => Promise<unknown>): Promise<string> {
  try {
    await asUser(db, uid, fn);
  } catch (err) {
    return (err as Error).message;
  }
  throw new Error('Expected the database to refuse, but it allowed it');
}

/** Rows visible to the caller, from a simple query. */
export async function rows<R = Record<string, unknown>>(tx: Tx, sql: string, params: unknown[] = []): Promise<R[]> {
  return (await tx.query<R>(sql, params)).rows;
}
