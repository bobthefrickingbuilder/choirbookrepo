import 'server-only';
import type { FeeStatus, FormStatus } from '@choirbook/ui';
import { todayLocal } from '@/lib/format';
import type { ChoirContext } from '@/lib/session';
import { getCurrentTerm, type Term } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export type ChoristerStatus = 'auditioning' | 'active' | 'on_leave' | 'departed';
export type AccountState = 'active' | 'invited' | 'none';

export interface RosterRow {
  id: string;
  name: string;
  first: string;
  last: string;
  pronouns: string | null;
  email: string | null;
  phone: string | null;
  school: string | null;
  sectionId: string | null;
  sectionKey: string | null;
  partKey: string | null;
  status: ChoristerStatus;
  account: AccountState;
  guardian: string | null;
  guardianEmails: string[];
  joinedOn: string | null;
  absences: number | null;
  forms: FormStatus | null;
  formsMissing: number;
  fees: FeeStatus | null;
  owingCents: number;
}

export interface SectionInfo {
  id: string;
  key: string;
  name_en: string;
  name_fr: string;
  voice_parts: { id: string; key: string; name_en: string; name_fr: string }[];
}

export async function getSections(orgId: string): Promise<SectionInfo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sections')
    .select('id, key, name_en, name_fr, sort, voice_parts(id, key, name_en, name_fr, sort)')
    .eq('organization_id', orgId)
    .order('sort');
  return (data ?? []).map(({ sort: _s, voice_parts, ...s }) => ({
    ...s,
    voice_parts: [...voice_parts].sort((a, b) => a.sort - b.sort).map(({ sort: _p, ...p }) => p),
  }));
}

interface Balance {
  person_id: string | null;
  amount_cents: number | null;
  paid_cents: number | null;
  adjusted_cents: number | null;
  due_on: string | null;
}

export function feeStatusOf(balances: Balance[], today: string): { status: FeeStatus | null; owing: number } {
  if (!balances.length) return { status: null, owing: 0 };
  let owing = 0;
  let overdue = false;
  let paid = 0;
  let waived = true;
  for (const b of balances) {
    const amount = b.amount_cents ?? 0;
    const left = Math.max(0, amount - (b.paid_cents ?? 0) - (b.adjusted_cents ?? 0));
    owing += left;
    paid += b.paid_cents ?? 0;
    if (left > 0 && b.due_on && b.due_on < today) overdue = true;
    if ((b.adjusted_cents ?? 0) < amount) waived = false;
  }
  if (owing === 0) return { status: waived ? 'waived' : 'paid', owing };
  if (overdue) return { status: 'overdue', owing };
  return { status: paid > 0 ? 'partial' : 'due', owing };
}

interface OpenForm {
  id: string;
  due_on: string | null;
  section_ids: string[];
}
interface ResponseLite {
  form_id: string;
  person_id: string;
  status: 'in_progress' | 'submitted' | 'changes' | 'approved';
}

export function formStatusOf(forms: OpenForm[], responses: ResponseLite[], sectionId: string | null, today: string): { status: FormStatus | null; missing: number } {
  const mine = forms.filter((f) => !f.section_ids.length || (sectionId && f.section_ids.includes(sectionId)));
  if (!mine.length) return { status: null, missing: 0 };
  const statuses = mine.map((f) => ({ form: f, r: responses.find((r) => r.form_id === f.id)?.status }));
  const missing = statuses.filter((x) => x.r !== 'submitted' && x.r !== 'approved');
  if (missing.some((x) => x.form.due_on && x.form.due_on < today)) return { status: 'overdue', missing: missing.length };
  if (statuses.some((x) => x.r === 'changes')) return { status: 'changes', missing: missing.length };
  if (missing.some((x) => x.r === 'in_progress')) return { status: 'in_progress', missing: missing.length };
  if (missing.length) return { status: 'not_started', missing: missing.length };
  return { status: statuses.every((x) => x.r === 'approved') ? 'approved' : 'submitted', missing: 0 };
}

/** Absences that count against the limit (unexcused) per person, in a term. */
export async function getTermAbsences(orgId: string, term: Term | null): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!term) return counts;
  const supabase = await createClient();
  const { data } = await supabase
    .from('attendance')
    .select('person_id, events!inner(starts_at, counts_for_attendance)')
    .eq('organization_id', orgId)
    .eq('status', 'absent')
    .eq('events.counts_for_attendance', true)
    .gte('events.starts_at', `${term.starts_on}T00:00:00`)
    .lte('events.starts_at', `${term.ends_on}T23:59:59`);
  for (const a of data ?? []) counts.set(a.person_id, (counts.get(a.person_id) ?? 0) + 1);
  return counts;
}

export async function getRoster(ctx: ChoirContext, opts: { includeDeparted?: boolean } = {}) {
  const supabase = await createClient();
  const today = todayLocal();
  const org = ctx.org.id;

  const choristersQuery = supabase
    .from('choristers')
    .select(
      'person_id, section_id, voice_part_id, status, joined_on, school, people!inner(id, first_name, last_name, preferred_name, pronouns, email, phone, user_id, status), sections(key), voice_parts(key)',
    )
    .eq('organization_id', org);
  if (!opts.includeDeparted) choristersQuery.neq('status', 'departed');

  const [choristersRes, guardiansRes, sections, term] = await Promise.all([
    choristersQuery,
    supabase.from('guardian_links').select('chorister_id, is_primary, guardians!inner(first_name, last_name, email)').eq('organization_id', org),
    getSections(org),
    getCurrentTerm(org, today),
  ]);

  const [balancesRes, formsRes, responsesRes, absences] = await Promise.all([
    ctx.can('fees') ? supabase.from('fee_balances').select('person_id, amount_cents, paid_cents, adjusted_cents, due_on').eq('organization_id', org) : Promise.resolve({ data: null }),
    ctx.can('forms') ? supabase.from('forms').select('id, due_on, section_ids').eq('organization_id', org).eq('status', 'open') : Promise.resolve({ data: null }),
    ctx.can('forms') ? supabase.from('form_responses').select('form_id, person_id, status').eq('organization_id', org) : Promise.resolve({ data: null }),
    ctx.can('attendance') ? getTermAbsences(org, term) : Promise.resolve(null),
  ]);

  const guardiansBy = new Map<string, { name: string; email: string | null; primary: boolean }[]>();
  for (const g of guardiansRes.data ?? []) {
    const list = guardiansBy.get(g.chorister_id) ?? [];
    list.push({ name: `${g.guardians.first_name} ${g.guardians.last_name}`, email: g.guardians.email, primary: g.is_primary });
    guardiansBy.set(g.chorister_id, list);
  }

  const rows: RosterRow[] = (choristersRes.data ?? []).map((c) => {
    const p = c.people;
    const guardians = (guardiansBy.get(c.person_id) ?? []).sort((a, b) => Number(b.primary) - Number(a.primary));
    const fee = balancesRes.data ? feeStatusOf(balancesRes.data.filter((b) => b.person_id === c.person_id), today) : { status: null, owing: 0 };
    const form = formsRes.data && responsesRes.data
      ? formStatusOf(formsRes.data, responsesRes.data.filter((r) => r.person_id === c.person_id), c.section_id, today)
      : { status: null, missing: 0 };
    return {
      id: c.person_id,
      name: `${p.preferred_name || p.first_name} ${p.last_name}`,
      first: p.preferred_name || p.first_name,
      last: p.last_name,
      pronouns: p.pronouns,
      email: p.email,
      phone: p.phone,
      school: c.school,
      sectionId: c.section_id,
      sectionKey: c.sections?.key ?? null,
      partKey: c.voice_parts?.key ?? null,
      status: c.status,
      account: p.user_id ? 'active' : p.email ? 'invited' : 'none',
      guardian: guardians[0]?.name ?? null,
      guardianEmails: guardians.map((g) => g.email).filter((e): e is string => Boolean(e)),
      joinedOn: c.joined_on,
      absences: absences ? (absences.get(c.person_id) ?? 0) : null,
      forms: form.status,
      formsMissing: form.missing,
      fees: fee.status,
      owingCents: fee.owing,
    };
  });
  rows.sort((a, b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first));
  return { rows, sections, term };
}
