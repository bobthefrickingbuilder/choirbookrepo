import 'server-only';
import { isMinor } from '@choirbook/shared/rules/age';
import type { ChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const CONSENT_KINDS = ['participation', 'code_of_conduct', 'photo_video', 'medical_info'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];
/** Needed to take part in the choir; members can give these but only the office can record a withdrawal. */
export const REQUIRED_CONSENTS: readonly ConsentKind[] = ['participation', 'code_of_conduct'];

export const GUARDIAN_COPY_KINDS = ['announcements', 'monthly_update', 'schedule', 'fees', 'tours'] as const;
export type GuardianCopyKind = (typeof GUARDIAN_COPY_KINDS)[number];

export interface ConsentRow {
  kind: ConsentKind;
  required: boolean;
  wording: { id: string; version: number; en: string; fr: string } | null;
  answer: { granted: boolean; at: string; version: number; method: string } | null;
  /** True when there is no answer, or the answer was given against older wording. */
  needsAnswer: boolean;
}

/** The member's consents in this choir: latest wording and their latest answer for each. */
export async function getMyConsents(ctx: ChoirContext): Promise<ConsentRow[]> {
  const supabase = await createClient();
  const [{ data: wording }, { data: answers }] = await Promise.all([
    supabase.from('consent_wording_versions').select('id, kind, version, body_en, body_fr').eq('organization_id', ctx.org.id).order('version', { ascending: false }),
    supabase.from('current_consents').select('kind, granted, recorded_at, wording_version, method').eq('person_id', ctx.personId),
  ]);
  return CONSENT_KINDS.map((kind) => {
    const w = wording?.find((x) => x.kind === kind);
    const a = answers?.find((x) => x.kind === kind);
    const answer = a ? { granted: Boolean(a.granted), at: a.recorded_at ?? '', version: a.wording_version ?? 0, method: a.method ?? 'self' } : null;
    return {
      kind,
      required: REQUIRED_CONSENTS.includes(kind),
      wording: w ? { id: w.id, version: w.version, en: w.body_en, fr: w.body_fr } : null,
      answer,
      needsAnswer: Boolean(w) && (!answer || answer.version < (w?.version ?? 0)),
    };
  });
}

/** Required consents the member still has to give (none for staff without a chorister record). */
export async function missingRequiredConsents(ctx: ChoirContext): Promise<ConsentKind[]> {
  if (!ctx.isChorister) return [];
  const rows = await getMyConsents(ctx);
  return rows.filter((r) => r.required && r.wording && (r.needsAnswer || r.answer?.granted === false)).map((r) => r.kind);
}

/** The member's guardians, shown on their profile while they are under 18. */
export async function getMyGuardians(ctx: ChoirContext) {
  const supabase = await createClient();
  const { data: me } = await supabase.from('people').select('date_of_birth').eq('id', ctx.personId).single();
  if (!isMinor(me?.date_of_birth)) return null;
  const { data } = await supabase
    .from('guardian_links')
    .select('relationship, receives_copies, is_emergency_contact, guardians(first_name, last_name, email, phone)')
    .eq('chorister_id', ctx.personId);
  return (data ?? []).map((g) => {
    const guardian = Array.isArray(g.guardians) ? g.guardians[0] : g.guardians;
    return {
      name: guardian ? `${guardian.first_name} ${guardian.last_name}` : '',
      email: guardian?.email ?? null,
      phone: guardian?.phone ?? null,
      relationship: g.relationship,
      copies: g.receives_copies,
      emergency: g.is_emergency_contact,
    };
  });
}
