'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Riser and seating charts per concert (staff with "seating" edit).

const rowsSchema = z
  .array(z.object({ label: z.string().trim().min(1).max(8), seats: z.number().int().min(1).max(40) }))
  .min(1)
  .max(12);

export interface Placement {
  personId: string;
  row: string;
  seat: number;
}

/** Saves the chart's rows and every placement in one go (the editor works on a local copy). */
export async function saveSeating(
  slug: string,
  eventId: string,
  input: { name: string; rows: { label: string; seats: number }[]; placements: Placement[]; publish: boolean },
): Promise<ActionResult<{ chartId: string }>> {
  const ctx = await staffContext(slug, 'seating');
  const rows = rowsSchema.safeParse(input.rows);
  const placements = z.array(z.object({ personId: uuid, row: z.string().max(8), seat: z.number().int().min(1).max(40) })).max(400).safeParse(input.placements);
  const name = z.string().trim().min(1).max(80).safeParse(input.name);
  if (!ctx || !uuid.safeParse(eventId).success || !rows.success || !placements.success || !name.success) return fail('invalid');
  if (new Set(rows.data.map((r) => r.label)).size !== rows.data.length) return fail('invalid');
  // Only seats that exist, each used once, each person once.
  const valid = placements.data.filter((p) => rows.data.some((r) => r.label === p.row && p.seat <= r.seats));
  const seen = new Set<string>();
  const people = new Set<string>();
  const clean = valid.filter((p) => {
    const k = `${p.row}:${p.seat}`;
    if (seen.has(k) || people.has(p.personId)) return false;
    seen.add(k);
    people.add(p.personId);
    return true;
  });

  const supabase = await createClient();
  const { data: existing } = await supabase.from('seating_charts').select('id, published_at').eq('event_id', eventId).eq('organization_id', ctx.org.id).maybeSingle();
  const published_at = input.publish ? (existing?.published_at ?? new Date().toISOString()) : null;
  const res = existing
    ? await supabase.from('seating_charts').update({ name: name.data, layout: { rows: rows.data }, published_at }).eq('id', existing.id).select('id').single()
    : await supabase.from('seating_charts').insert({ organization_id: ctx.org.id, event_id: eventId, name: name.data, layout: { rows: rows.data }, published_at }).select('id').single();
  if (res.error || !res.data) return fail(dbError(res.error));
  const chartId = res.data.id;
  const { error: delErr } = await supabase.from('seating_positions').delete().eq('chart_id', chartId);
  if (delErr) return fail(dbError(delErr));
  if (clean.length) {
    const { error } = await supabase
      .from('seating_positions')
      .insert(clean.map((p) => ({ organization_id: ctx.org.id, chart_id: chartId, person_id: p.personId, row_label: p.row, seat: p.seat })));
    if (error) return fail(dbError(error));
  }
  revalidatePath(`/c/${slug}/calendar/${eventId}`, 'layout');
  return { ok: true, data: { chartId } };
}

export async function deleteSeating(slug: string, eventId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'seating');
  if (!ctx || !uuid.safeParse(eventId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('seating_charts').delete().eq('event_id', eventId).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/calendar/${eventId}`, 'layout');
  return done;
}
