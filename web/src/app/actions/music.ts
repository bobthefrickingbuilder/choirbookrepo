'use server';

import { getMessages } from '@choirbook/shared/i18n';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Music library changes by staff with "music" edit. Files are uploaded from the
// browser straight to the private Storage buckets (the storage policies allow
// music editors only); these actions record and release them.

const optText = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const pieceSchema = z.object({
  title: z.string().trim().min(1, 'required').max(200),
  composer: optText(200),
  arranger: optText(200),
  voicing: optText(40),
  language: optText(60),
  duration: z.string().trim().regex(/^(\d{1,3}:[0-5]\d)?$/, 'invalid'),
  notes: optText(4000),
});
export type PieceInput = z.input<typeof pieceSchema>;

const toSeconds = (mmss: string) => {
  if (!mmss) return null;
  const [m, s] = mmss.split(':').map(Number) as [number, number];
  return m * 60 + s;
};

export async function savePiece(slug: string, id: string | null, input: PieceInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await staffContext(slug, 'music');
  if (!ctx || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  const parsed = pieceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const { duration, ...rest } = parsed.data;
  const row = { ...rest, duration_seconds: toSeconds(duration) };
  const supabase = await createClient();
  const res = id
    ? await supabase.from('pieces').update(row).eq('id', id).eq('organization_id', ctx.org.id).select('id').single()
    : await supabase.from('pieces').insert({ ...row, organization_id: ctx.org.id }).select('id').single();
  if (res.error || !res.data) return fail(dbError(res.error));
  revalidatePath(`/c/${slug}/music`, 'layout');
  return { ok: true, data: { id: res.data.id } };
}

export async function deletePiece(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'music');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const [{ data: scores }, { data: tracks }] = await Promise.all([
    supabase.from('score_files').select('storage_path').eq('piece_id', id),
    supabase.from('learning_tracks').select('storage_path').eq('piece_id', id),
  ]);
  const { error } = await supabase.from('pieces').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  const real = (paths: { storage_path: string }[] | null) => (paths ?? []).map((p) => p.storage_path).filter((p) => p.startsWith(`${ctx.org.id}/`));
  if (real(scores).length) await supabase.storage.from('scores').remove(real(scores));
  if (real(tracks).length) await supabase.storage.from('tracks').remove(real(tracks));
  revalidatePath(`/c/${slug}/music`, 'layout');
  return done;
}

const fileSchema = z.object({
  kind: z.enum(['score', 'track']),
  pieceId: uuid,
  path: z.string().max(400),
  size: z.number().int().min(0).max(25_000_000),
  label: z.string().trim().min(1).max(80),
  sectionId: z.union([z.literal(''), uuid]).transform((v) => v || null),
  voicePartId: z.union([z.literal(''), uuid]).transform((v) => v || null),
  trackKind: z.enum(['full', 'part', 'predominant']),
  duration: z.number().int().min(0).max(36000).nullable(),
  release: z.boolean(),
});
export type FileInput = z.input<typeof fileSchema>;

/** Records a file the browser has just uploaded to Storage. */
export async function registerFile(slug: string, input: FileInput): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'music');
  const parsed = fileSchema.safeParse(input);
  if (!ctx || !parsed.success) return fail('invalid');
  const f = parsed.data;
  // The path must sit in this choir's folder, under this piece.
  if (!f.path.startsWith(`${ctx.org.id}/${f.pieceId}/`)) return fail('not_allowed');
  const supabase = await createClient();
  const released_at = f.release ? new Date().toISOString() : null;
  const { error } =
    f.kind === 'score'
      ? await supabase.from('score_files').insert({
          organization_id: ctx.org.id,
          piece_id: f.pieceId,
          label: f.label,
          storage_path: f.path,
          size_bytes: f.size,
          section_id: f.sectionId,
          released_at,
        })
      : await supabase.from('learning_tracks').insert({
          organization_id: ctx.org.id,
          piece_id: f.pieceId,
          label: f.label,
          kind: f.trackKind,
          section_id: f.trackKind === 'full' ? null : f.sectionId,
          voice_part_id: f.trackKind === 'full' ? null : f.voicePartId,
          storage_path: f.path,
          size_bytes: f.size,
          duration_seconds: f.duration,
          released_at,
        });
  if (error) {
    await supabase.storage.from(f.kind === 'score' ? 'scores' : 'tracks').remove([f.path]);
    return fail(dbError(error));
  }
  revalidatePath(`/c/${slug}/music`, 'layout');
  return done;
}

const kindSchema = z.enum(['score', 'track', 'assignment']);
const tableFor = { score: 'score_files', track: 'learning_tracks', assignment: 'practice_assignments' } as const;

export async function setReleased(slug: string, kind: 'score' | 'track' | 'assignment', id: string, released: boolean): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'music');
  if (!ctx || !kindSchema.safeParse(kind).success || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase
    .from(tableFor[kind])
    .update({ released_at: released ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  if (released && kind === 'assignment') await notifyAssignment(ctx.org.id, slug, id);
  revalidatePath(`/c/${slug}/music`, 'layout');
  return done;
}

export async function deleteFile(slug: string, kind: 'score' | 'track', id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'music');
  if (!ctx || (kind !== 'score' && kind !== 'track') || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const table = kind === 'score' ? 'score_files' : 'learning_tracks';
  const { data } = await supabase.from(table).select('storage_path').eq('id', id).eq('organization_id', ctx.org.id).maybeSingle();
  const { error } = await supabase.from(table).delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  if (data?.storage_path.startsWith(`${ctx.org.id}/`)) await supabase.storage.from(kind === 'score' ? 'scores' : 'tracks').remove([data.storage_path]);
  revalidatePath(`/c/${slug}/music`, 'layout');
  return done;
}

const assignmentSchema = z.object({
  pieceId: uuid,
  title: z.string().trim().min(1, 'required').max(160),
  instructions: optText(2000),
  bars: optText(60),
  due_on: z.union([z.literal(''), z.iso.date()]).transform((v) => v || null),
  section_ids: z.array(uuid).max(20),
  release: z.boolean(),
});
export type AssignmentInput = z.input<typeof assignmentSchema>;

async function notifyAssignment(orgId: string, slug: string, id: string) {
  const supabase = await createClient();
  const { data: a } = await supabase.from('practice_assignments').select('title, piece_id, section_ids, pieces(title)').eq('id', id).single();
  if (!a) return;
  const { data: choristers } = await supabase.from('choristers').select('person_id, section_id').eq('organization_id', orgId).eq('status', 'active');
  const people = (choristers ?? []).filter((c) => !a.section_ids.length || (c.section_id && a.section_ids.includes(c.section_id))).map((c) => c.person_id);
  const en = getMessages('en').staff;
  const fr = getMessages('fr').staff;
  await supabase.rpc('notify_people', {
    org: orgId,
    people,
    category: 'music',
    title: en.newAssignment.replace('{piece}', a.pieces?.title ?? ''),
    body: a.title,
    link: `/c/${slug}/music/${a.piece_id}`,
    title_fr: fr.newAssignment.replace('{piece}', a.pieces?.title ?? ''),
  });
}

export async function saveAssignment(slug: string, id: string | null, input: AssignmentInput): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'music');
  if (!ctx || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const { pieceId, release, ...rest } = parsed.data;
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from('practice_assignments').update(rest).eq('id', id).eq('organization_id', ctx.org.id);
    if (error) return fail(dbError(error));
  } else {
    const { data, error } = await supabase
      .from('practice_assignments')
      .insert({
        ...rest,
        organization_id: ctx.org.id,
        piece_id: pieceId,
        released_at: release ? new Date().toISOString() : null,
        created_by: await currentUserId(),
      })
      .select('id')
      .single();
    if (error || !data) return fail(dbError(error));
    if (release) await notifyAssignment(ctx.org.id, slug, data.id);
  }
  revalidatePath(`/c/${slug}/music`, 'layout');
  return done;
}

export async function deleteAssignment(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'music');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('practice_assignments').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/music`, 'layout');
  return done;
}

/** Replaces a concert's set list with these pieces, in this order. */
export async function saveSetList(slug: string, eventId: string, pieceIds: string[]): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'music');
  const ids = z.array(uuid).max(60).safeParse(pieceIds);
  if (!ctx || !uuid.safeParse(eventId).success || !ids.success) return fail('not_allowed');
  const unique = [...new Set(ids.data)];
  const supabase = await createClient();
  const { error } = await supabase.from('set_list_items').delete().eq('event_id', eventId).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  if (unique.length) {
    const { error: e2 } = await supabase
      .from('set_list_items')
      .insert(unique.map((piece_id, position) => ({ organization_id: ctx.org.id, event_id: eventId, piece_id, position: position + 1 })));
    if (e2) return fail(dbError(e2));
  }
  revalidatePath(`/c/${slug}`, 'layout');
  return done;
}
