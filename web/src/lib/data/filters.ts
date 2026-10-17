import 'server-only';
import type { ChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { getSections, type SectionInfo } from './roster';
import { resolvePeriod, type Period } from './reports';

// The filters shared by the dashboard, Reports and the board report. They live
// in the URL (?period=term:<id>&section=B, or ?period=custom&from=…&to=…), so a
// view can be bookmarked or sent to a colleague.

export interface Filters {
  period: Period;
  section: SectionInfo | null;
  sections: SectionInfo[];
  /** Section leaders only see their own section(s); null means any section. */
  allowedSections: string[] | null;
}

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

/** The sections a staff member is limited to: set when every role they hold is a section-scoped section leader role. */
export async function sectionScope(ctx: ChoirContext): Promise<string[] | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('member_roles').select('section_id, roles!inner(key)').eq('person_id', ctx.personId);
  const rows = data ?? [];
  if (!rows.length || !rows.every((r) => r.roles.key === 'section_leader' && r.section_id)) return null;
  return [...new Set(rows.map((r) => r.section_id!))];
}

export async function readFilters(ctx: ChoirContext, search: Search, lang: 'en' | 'fr'): Promise<Filters> {
  const [sections, allowed, period] = await Promise.all([
    getSections(ctx.org.id),
    sectionScope(ctx),
    resolvePeriod(ctx, str(search.period), lang, { from: str(search.from), to: str(search.to) }),
  ]);
  const wanted = str(search.section)?.toUpperCase();
  let section = sections.find((s) => s.key === wanted) ?? null;
  if (allowed && (!section || !allowed.includes(section.id))) section = sections.find((s) => s.id === allowed[0]) ?? null;
  return { period, section, sections, allowedSections: allowed };
}

/** The query string for a set of filters, with optional extras (for links that keep the view). */
export function filterQuery(f: Pick<Filters, 'period' | 'section'>, extra: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams();
  q.set('period', f.period.key);
  if (f.period.key === 'custom') {
    q.set('from', f.period.from);
    q.set('to', f.period.to);
  }
  if (f.section) q.set('section', f.section.key);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  return q.toString();
}
