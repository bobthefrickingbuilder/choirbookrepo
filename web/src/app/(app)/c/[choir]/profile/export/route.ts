import { NextResponse, type NextRequest } from 'next/server';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// "Download my data": everything this choir's Choirbook holds about the member,
// as JSON or as one CSV with a section per table. Runs as the member, so it
// contains exactly what they are allowed to see. The download is logged.

// Table names, in the same order as the queries below.
const PERSON_TABLES = [
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
  ['seating_positions', 'person_id'],
  ['guardian_links', 'chorister_id'],
] as const;

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(request: NextRequest, { params }: RouteContext<'/c/[choir]/profile/export'>) {
  const { choir } = await params;
  const ctx = await getChoirContext(choir);
  if (!ctx) return new NextResponse('Not found', { status: 404 });
  const supabase = await createClient();

  const me = ctx.personId;
  const results = await Promise.all([
    supabase.from('people').select('*').eq('id', me),
    supabase.from('choristers').select('*').eq('person_id', me),
    supabase.from('care_notes').select('*').eq('person_id', me),
    supabase.from('attendance').select('*').eq('person_id', me),
    supabase.from('absence_reports').select('*').eq('person_id', me),
    supabase.from('availability_replies').select('*').eq('person_id', me),
    supabase.from('practice_completions').select('*').eq('person_id', me),
    supabase.from('practice_log').select('*').eq('person_id', me),
    supabase.from('form_responses').select('*').eq('person_id', me),
    supabase.from('consents').select('*').eq('person_id', me),
    supabase.from('fee_assignments').select('*').eq('person_id', me),
    supabase.from('payments').select('*').eq('person_id', me),
    supabase.from('conversations').select('*').eq('member_id', me),
    supabase.from('announcement_recipients').select('*').eq('person_id', me),
    supabase.from('volunteer_signups').select('*').eq('person_id', me),
    supabase.from('seller_links').select('*').eq('person_id', me),
    supabase.from('seating_positions').select('*').eq('person_id', me),
    supabase.from('guardian_links').select('*').eq('chorister_id', me),
  ]);
  const data: Record<string, unknown[]> = Object.fromEntries(PERSON_TABLES.map(([table], i) => [table, results[i]?.data ?? []]));
  const convIds = (results[12]?.data ?? []).map((c) => (c as { id: string }).id);
  if (convIds.length) {
    const { data: msgs } = await supabase.from('messages').select('*').in('conversation_id', convIds);
    data.messages = msgs ?? [];
  }
  const { data: profile } = await supabase.from('profiles').select('*').maybeSingle();
  data.profiles = profile ? [profile] : [];
  await supabase.rpc('log_event', { org: ctx.org.id, action: 'export', entity: 'own_data', entity_id: ctx.personId });

  const stamp = new Date().toISOString().slice(0, 10);
  const base = `choirbook-${ctx.org.slug}-my-data-${stamp}`;
  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const parts: string[] = [];
    for (const [table, rows] of Object.entries(data)) {
      if (!rows.length) continue;
      const cols = Object.keys(rows[0] as object);
      parts.push(`# ${table}`, cols.join(','), ...rows.map((r) => cols.map((c) => csvCell((r as Record<string, unknown>)[c])).join(',')), '');
    }
    return new NextResponse('﻿' + parts.join('\r\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${base}.csv"` },
    });
  }
  return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), choir: ctx.org.name, data }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${base}.json"` },
  });
}
