import 'server-only';
import type { Tables } from '@choirbook/shared/database.types';
import { cache } from 'react';
import type { ChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// Data for a member's own pages. Every query runs as the member, so the
// database's row-level security decides what comes back.

export type EventRow = Tables<'events'>;

export interface MemberProfile {
  personId: string;
  sectionId: string | null;
  sectionKey: string | null;
  partKey: string | null;
  joinedOn: string | null;
  dateOfBirth: string | null;
}

export const getMemberProfile = cache(async (ctx: ChoirContext): Promise<MemberProfile> => {
  const supabase = await createClient();
  const [{ data: person }, { data: ch }] = await Promise.all([
    supabase.from('people').select('date_of_birth').eq('id', ctx.personId).single(),
    supabase
      .from('choristers')
      .select('section_id, joined_on, sections(key), voice_parts(key)')
      .eq('person_id', ctx.personId)
      .maybeSingle(),
  ]);
  return {
    personId: ctx.personId,
    sectionId: ch?.section_id ?? null,
    sectionKey: ch?.sections?.key ?? null,
    partKey: ch?.voice_parts?.key ?? null,
    joinedOn: ch?.joined_on ?? null,
    dateOfBirth: person?.date_of_birth ?? null,
  };
});

/** Does this event call the member's section (or the whole choir)? */
export const callsMe = (e: Pick<EventRow, 'section_ids'>, sectionId: string | null) =>
  e.section_ids.length === 0 || (sectionId !== null && e.section_ids.includes(sectionId));

/** Upcoming events for the member, soonest first. */
export async function getUpcomingEvents(ctx: ChoirContext, sectionId: string | null, limit = 50): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organization_id', ctx.org.id)
    .gte('starts_at', new Date(Date.now() - 3 * 3600_000).toISOString())
    .order('starts_at')
    .limit(limit);
  if (error) throw new Error(error.message);
  return data.filter((e) => callsMe(e, sectionId));
}

export async function getSeasonEvents(ctx: ChoirContext): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('events').select('*').eq('organization_id', ctx.org.id).order('starts_at');
  if (error) throw new Error(error.message);
  return data;
}

export async function getMyAbsenceReports(ctx: ChoirContext) {
  const supabase = await createClient();
  const { data } = await supabase.from('absence_reports').select('*').eq('person_id', ctx.personId);
  return data ?? [];
}

export async function getMyAvailability(ctx: ChoirContext) {
  const supabase = await createClient();
  const { data } = await supabase.from('availability_replies').select('*').eq('person_id', ctx.personId);
  return data ?? [];
}

/** Open forms the member still has to complete. */
export async function getOutstandingForms(ctx: ChoirContext) {
  const supabase = await createClient();
  const [{ data: forms }, { data: responses }] = await Promise.all([
    supabase.from('forms').select('id, title, due_on, kind, guardian_signature_required').eq('organization_id', ctx.org.id).eq('status', 'open'),
    supabase.from('form_responses').select('form_id, status').eq('person_id', ctx.personId),
  ]);
  const done = new Map((responses ?? []).map((r) => [r.form_id, r.status]));
  return (forms ?? [])
    .filter((f) => {
      const s = done.get(f.id);
      return !s || s === 'in_progress' || s === 'changes';
    })
    .sort((a, b) => (a.due_on ?? '9999').localeCompare(b.due_on ?? '9999'));
}

/** Fees with something left to pay. */
export async function getFeeBalances(ctx: ChoirContext) {
  const supabase = await createClient();
  const { data } = await supabase.from('fee_balances').select('*').eq('person_id', ctx.personId);
  return (data ?? []).map((f) => ({
    ...f,
    balance: Math.max(0, (f.amount_cents ?? 0) - (f.paid_cents ?? 0) - (f.adjusted_cents ?? 0)),
  }));
}

export async function getMyAssignments(ctx: ChoirContext, sectionId: string | null) {
  const supabase = await createClient();
  const [{ data: list }, { data: done }] = await Promise.all([
    supabase
      .from('practice_assignments')
      .select('*, pieces(id, title, composer)')
      .eq('organization_id', ctx.org.id)
      .not('released_at', 'is', null)
      .order('due_on'),
    supabase.from('practice_completions').select('assignment_id, completed_at').eq('person_id', ctx.personId),
  ]);
  const doneIds = new Set((done ?? []).map((d) => d.assignment_id));
  return (list ?? [])
    .filter((a) => a.section_ids.length === 0 || (sectionId !== null && a.section_ids.includes(sectionId)))
    .map((a) => ({ ...a, done: doneIds.has(a.id) }));
}

export async function getUnreadAnnouncements(ctx: ChoirContext) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('announcement_recipients')
    .select('read_at, announcements!inner(id, title, body, published_at, pinned)')
    .eq('person_id', ctx.personId)
    .is('read_at', null)
    .order('announcement_id');
  return (data ?? [])
    .map((r) => r.announcements)
    .filter((a) => a.published_at && a.published_at <= new Date().toISOString())
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
}
