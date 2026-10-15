// Generates packages/shared/src/database.types.ts from the migrations, in the same
// shape as `supabase gen types typescript`, without needing Docker or a linked project.
// Run: npm run db:types:local
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDatabase } from '../tests/support/db.ts';

const out = join(import.meta.dirname, '..', '..', 'packages', 'shared', 'src', 'database.types.ts');
const db = await createDatabase();

type Col = { table_name: string; column_name: string; udt_name: string; data_type: string; is_nullable: string; column_default: string | null; is_identity: string; is_generated: string; is_updatable: string };

const enums = (await db.query<{ name: string; values: string[] }>(`
  select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder)::text[] as values
  from pg_type t join pg_enum e on e.enumtypid = t.oid
  where t.typnamespace = 'public'::regnamespace group by t.typname order by t.typname`)).rows;
const enumNames = new Set(enums.map((e) => e.name));

const columns = (await db.query<Col>(`
  select c.table_name, c.column_name, c.udt_name, c.data_type, c.is_nullable, c.column_default, c.is_identity, c.is_generated, c.is_updatable
  from information_schema.columns c where c.table_schema = 'public'
  order by c.table_name, c.ordinal_position`)).rows;

const relkinds = new Map((await db.query<{ name: string; kind: string }>(`
  select relname as name, relkind::text as kind from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r', 'v')`)).rows.map((r) => [r.name, r.kind]));

const fks = (await db.query<{ name: string; table: string; cols: string[]; ref_table: string; ref_cols: string[]; one: boolean }>(`
  select con.conname as name, cl.relname as table,
    array(select a.attname::text from unnest(con.conkey) k join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k) as cols,
    rcl.relname as ref_table,
    array(select a.attname::text from unnest(con.confkey) k join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k) as ref_cols,
    exists (select 1 from pg_index i where i.indrelid = con.conrelid and i.indisunique
            and (select array_agg(x order by x) from unnest(i.indkey::int2[]) x) = (select array_agg(x order by x) from unnest(con.conkey) x)) as one
  from pg_constraint con
  join pg_class cl on cl.oid = con.conrelid
  join pg_class rcl on rcl.oid = con.confrelid
  where con.contype = 'f' and cl.relnamespace = 'public'::regnamespace and rcl.relnamespace = 'public'::regnamespace
  order by cl.relname, con.conname`)).rows;

const fns = (await db.query<{ name: string; args: string; arg_names: string[] | null; arg_types: string[]; ret: string; set: boolean; table_cols: string | null }>(`
  select p.proname as name, pg_get_function_arguments(p.oid) as args, p.proargnames as arg_names,
    array(select format_type(t, null) from unnest(p.proargtypes) t) as arg_types,
    format_type(p.prorettype, null) as ret, p.proretset as set,
    pg_get_function_result(p.oid) as table_cols
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by p.proname`)).rows;

const scalar = (udt: string): string => {
  const base = udt.replace(/^_/, '');
  const arr = udt.startsWith('_');
  let t: string;
  if (enumNames.has(base)) t = `Database["public"]["Enums"]["${base}"]`;
  else if (['int2', 'int4', 'int8', 'float4', 'float8', 'numeric'].includes(base)) t = 'number';
  else if (base === 'bool') t = 'boolean';
  else if (['json', 'jsonb'].includes(base)) t = 'Json';
  else t = 'string';
  return arr ? `${t}[]` : t;
};
const pgTypeToTs = (t: string): string => {
  const map: Record<string, string> = { integer: 'number', bigint: 'number', smallint: 'number', numeric: 'number', boolean: 'boolean', jsonb: 'Json', json: 'Json', void: 'undefined' };
  if (t.endsWith('[]')) return `${pgTypeToTs(t.slice(0, -2))}[]`;
  if (enumNames.has(t.replace(/^public\./, ''))) return `Database["public"]["Enums"]["${t.replace(/^public\./, '')}"]`;
  return map[t] ?? 'string';
};

const byTable = new Map<string, Col[]>();
for (const c of columns) (byTable.get(c.table_name) ?? byTable.set(c.table_name, []).get(c.table_name)!).push(c);

const lines: string[] = [];
const emitObject = (cols: Col[], mode: 'Row' | 'Insert' | 'Update') => {
  lines.push(`        ${mode}: {`);
  for (const c of cols) {
    const ts = scalar(c.udt_name) + (c.is_nullable === 'YES' ? ' | null' : '');
    const optional = mode === 'Update' || (mode === 'Insert' && (c.is_nullable === 'YES' || c.column_default !== null || c.is_identity === 'YES'));
    if (mode !== 'Row' && c.is_generated === 'ALWAYS') continue;
    lines.push(`          ${c.column_name}${optional ? '?' : ''}: ${ts}`);
  }
  lines.push('        }');
};
const emitRelationships = (table: string) => {
  const rels = fks.filter((f) => f.table === table);
  if (!rels.length) { lines.push('        Relationships: []'); return; }
  lines.push('        Relationships: [');
  for (const f of rels) {
    lines.push('          {');
    lines.push(`            foreignKeyName: "${f.name}"`);
    lines.push(`            columns: [${f.cols.map((c) => `"${c}"`).join(', ')}]`);
    lines.push(`            isOneToOne: ${f.one}`);
    lines.push(`            referencedRelation: "${f.ref_table}"`);
    lines.push(`            referencedColumns: [${f.ref_cols.map((c) => `"${c}"`).join(', ')}]`);
    lines.push('          },');
  }
  lines.push('        ]');
};

lines.push('// Generated from supabase/migrations by supabase/scripts/gen-types.mts. Do not edit by hand.');
lines.push('export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]');
lines.push('');
lines.push('export type Database = {');
lines.push('  public: {');
lines.push('    Tables: {');
for (const [table, cols] of byTable) {
  if (relkinds.get(table) !== 'r') continue;
  lines.push(`      ${table}: {`);
  emitObject(cols, 'Row'); emitObject(cols, 'Insert'); emitObject(cols, 'Update'); emitRelationships(table);
  lines.push('      }');
}
lines.push('    }');
lines.push('    Views: {');
for (const [table, cols] of byTable) {
  if (relkinds.get(table) !== 'v') continue;
  lines.push(`      ${table}: {`);
  lines.push('        Row: {');
  for (const c of cols) lines.push(`          ${c.column_name}: ${scalar(c.udt_name)} | null`);
  lines.push('        }');
  lines.push('        Relationships: []');
  lines.push('      }');
}
lines.push('    }');
lines.push('    Functions: {');
for (const f of fns) {
  if (f.ret === 'trigger') continue;
  const names = f.arg_names ?? [];
  const argList = f.arg_types.map((t, i) => {
    const hasDefault = new RegExp(`\\b${names[i]}\\b[^,]*DEFAULT`, 'i').test(f.args);
    return `${names[i] ?? `arg${i}`}${hasDefault ? '?' : ''}: ${pgTypeToTs(t)}`;
  });
  lines.push(`      ${f.name}: {`);
  lines.push(`        Args: ${argList.length ? `{ ${argList.join('; ')} }` : 'never'}`);
  const tableMatch = f.table_cols?.match(/^TABLE\((.*)\)$/);
  if (tableMatch?.[1]) {
    const cols = tableMatch[1].split(',').map((s) => s.trim().split(/\s+/)).map(([n, ...t]) => `${n}: ${pgTypeToTs(t.join(' '))}`);
    lines.push(`        Returns: { ${cols.join('; ')} }[]`);
  } else {
    lines.push(`        Returns: ${pgTypeToTs(f.ret)}${f.set ? '[]' : ''}`);
  }
  lines.push('      }');
}
lines.push('    }');
lines.push('    Enums: {');
for (const e of enums) lines.push(`      ${e.name}: ${e.values.map((v) => `"${v}"`).join(' | ')}`);
lines.push('    }');
lines.push('    CompositeTypes: { [_ in never]: never }');
lines.push('  }');
lines.push('}');
lines.push('');
lines.push('type PublicSchema = Database["public"]');
lines.push('export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]');
lines.push('export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]');
lines.push('export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]');
lines.push('export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]');
lines.push('export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]');
lines.push('');

writeFileSync(out, lines.join('\n'));
console.log(`Wrote ${out} (${byTable.size} tables and views, ${enums.length} enums, ${fns.length} functions)`);
