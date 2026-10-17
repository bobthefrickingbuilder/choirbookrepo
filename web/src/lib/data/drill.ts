import 'server-only';
import type { Messages } from '@choirbook/shared/i18n';
import type { PermArea } from '@choirbook/shared/permissions';
import { addDays, daysBetween, todayLocal } from '@/lib/format';
import type { ChoirContext } from '@/lib/session';
import { getCurrentTerm } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import type { Filters } from './filters';
import { dayEnd, dayStart } from './reports';

// The lists behind the dashboard's numbers. Each chart and figure links here
// with its filters in the URL, and every list downloads as CSV.

export const DRILLS = ['attendance', 'absences', 'members', 'owing', 'forms', 'practice', 'availability', 'tickets', 'volunteers'] as const;
export type DrillKind = (typeof DRILLS)[number];

export const DRILL_AREA: Record<DrillKind, PermArea> = {
  attendance: 'attendance',
  absences: 'attendance',
  members: 'roster',
  owing: 'fees',
  forms: 'forms',
  practice: 'music',
  availability: 'calendar',
  tickets: 'tickets',
  volunteers: 'volunteers',
};

export type CellType = 'text' | 'number' | 'date' | 'datetime' | 'money';
export interface DrillColumn {
  key: string;
  label: string;
  type?: CellType;
}
export interface DrillRow {
  cells: Record<string, string | number | null>;
  href?: string;
}
export interface Drill {
  title: string;
  subtitle: string | null;
  columns: DrillColumn[];
  rows: DrillRow[];
}

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' && v.length < 100 ? v : undefined);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const id = (v: string | undefined) => (v && UUID.test(v) ? v : undefined);
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

export async function getDrill(ctx: ChoirContext, kind: DrillKind, f: Filters, search: Search, t: Messages, lang: 'en' | 'fr'): Promise<Drill> {
  const d = t.dash;
  const supabase = await createClient();
  const org = ctx.org.id;
  const slug = ctx.org.slug;
  const today = todayLocal();
  const wantsNone = str(search.section) === 'none' && !f.allowedSections;
  const sectionId = wantsNone ? null : (f.section?.id ?? null);
  const sectionName = new Map(f.sections.map((s) => [s.id, lang === 'fr' ? s.name_fr : s.name_en]));
  const profile = (personId: string) => (ctx.can('roster') ? `/c/${slug}/roster/${personId}` : undefined);

  const { data: choristerRows } = await supabase
    .from('choristers')
    .select('person_id, section_id, status, joined_on, departed_on, voice_parts(key, name_en, name_fr), people!inner(first_name, last_name, preferred_name)')
    .eq('organization_id', org);
  const all = (choristerRows ?? []).filter((c) => (wantsNone ? !c.section_id : !sectionId || c.section_id === sectionId));
  const byId = new Map(all.map((c) => [c.person_id, c]));
  const nameOf = (c: (typeof all)[number]) => `${c.people.preferred_name || c.people.first_name} ${c.people.last_name}`;
  const secOf = (c: (typeof all)[number] | undefined) => (c?.section_id ? (sectionName.get(c.section_id) ?? '') : d.unplacedName);
  const partOf = (c: (typeof all)[number] | undefined) => {
    const v = one(c?.voice_parts);
    return v ? (lang === 'fr' ? v.name_fr : v.name_en) : '';
  };
  const active = all.filter((c) => c.status === 'active' || c.status === 'on_leave');
  const sub = (...bits: (string | null | undefined)[]) => bits.filter(Boolean).join(' · ') || null;
  const secLabel = wantsNone ? d.unplacedName : f.section ? (lang === 'fr' ? f.section.name_fr : f.section.name_en) : d.allSections;

  switch (kind) {
    case 'attendance': {
      const event = id(str(search.event));
      const status = (['present', 'late', 'excused', 'absent'] as const).find((s) => s === str(search.status));
      let q = supabase
        .from('attendance_facts')
        .select('event_id, person_id, status, starts_at, title, section_id')
        .eq('organization_id', org)
        .eq('counts_for_attendance', true)
        .is('cancelled_at', null)
        .neq('event_type', 'deadline')
        .gte('starts_at', dayStart(f.period.from))
        .lte('starts_at', dayEnd(f.period.to))
        .order('starts_at', { ascending: false });
      if (event) q = q.eq('event_id', event);
      if (status) q = q.eq('status', status);
      if (sectionId) q = q.eq('section_id', sectionId);
      const { data } = await q;
      const rows = (data ?? []).filter((m) => byId.has(m.person_id!));
      const label = { present: d.present, late: d.late, excused: d.excused, absent: d.absent };
      return {
        title: d.d_attendance,
        subtitle: sub(event ? rows[0]?.title : f.period.label, secLabel, status ? label[status] : null),
        columns: [
          { key: 'name', label: d.colName },
          { key: 'section', label: d.colSection },
          { key: 'event', label: d.colEvent },
          { key: 'date', label: d.colDate, type: 'datetime' },
          { key: 'status', label: d.colStatus },
        ],
        rows: rows
          .map((m) => {
            const c = byId.get(m.person_id!)!;
            return { cells: { name: nameOf(c), section: secOf(c), event: m.title, date: m.starts_at, status: m.status ? label[m.status] : '' }, href: profile(c.person_id) };
          })
          .sort((a, b) => String(b.cells.date).localeCompare(String(a.cells.date)) || String(a.cells.name).localeCompare(String(b.cells.name))),
      };
    }

    case 'absences': {
      const term = await getCurrentTerm(org, today);
      const { data } = term
        ? await supabase
            .from('attendance_facts')
            .select('person_id, status')
            .eq('organization_id', org)
            .eq('counts_for_attendance', true)
            .is('cancelled_at', null)
            .neq('event_type', 'deadline')
            .in('status', ['absent', 'late', 'excused'])
            .gte('starts_at', dayStart(term.starts_on))
            .lte('starts_at', dayEnd(term.ends_on))
        : { data: [] };
      const counts = new Map<string, { absent: number; late: number; excused: number }>();
      for (const m of data ?? []) {
        const x = counts.get(m.person_id!) ?? { absent: 0, late: 0, excused: 0 };
        x[m.status as 'absent' | 'late' | 'excused'] += 1;
        counts.set(m.person_id!, x);
      }
      return {
        title: d.d_absences,
        subtitle: sub(term?.name, secLabel),
        columns: [
          { key: 'name', label: d.colName },
          { key: 'section', label: d.colSection },
          { key: 'absent', label: d.colAbsent, type: 'number' },
          { key: 'late', label: d.colLate, type: 'number' },
          { key: 'excused', label: d.colExcused, type: 'number' },
          { key: 'limit', label: d.colLimit, type: 'number' },
        ],
        rows: active
          .map((c) => ({ c, x: counts.get(c.person_id) ?? { absent: 0, late: 0, excused: 0 } }))
          .filter(({ x }) => x.absent + x.late + x.excused > 0)
          .sort((a, b) => b.x.absent - a.x.absent || b.x.late - a.x.late || nameOf(a.c).localeCompare(nameOf(b.c)))
          .map(({ c, x }) => ({ cells: { name: nameOf(c), section: secOf(c), ...x, limit: term?.absence_limit ?? null }, href: profile(c.person_id) })),
      };
    }

    case 'members': {
      const part = str(search.part);
      const status = (['active', 'auditioning', 'on_leave', 'departed'] as const).find((s) => s === str(search.status));
      const isNew = str(search.new) === '1';
      const left = str(search.departed) === '1';
      const rows = all.filter((c) => {
        if (part && one(c.voice_parts)?.key !== part) return false;
        if (isNew) return Boolean(c.joined_on && c.joined_on >= f.period.from && c.joined_on <= f.period.to);
        if (left) return Boolean(c.departed_on && c.departed_on >= f.period.from && c.departed_on <= f.period.to);
        if (status) return c.status === status;
        return c.status === 'active' || c.status === 'on_leave';
      });
      const st = { active: d.stActive, on_leave: d.stOnLeave, auditioning: d.stAuditioning, departed: d.stDeparted };
      return {
        title: d.d_members,
        subtitle: sub(secLabel, part ? partOf(rows[0]) : null, isNew ? `${d.newMembers} · ${f.period.label}` : left ? `${d.departed} · ${f.period.label}` : status ? st[status] : null),
        columns: [
          { key: 'name', label: d.colName },
          { key: 'section', label: d.colSection },
          { key: 'part', label: d.colPart },
          { key: 'status', label: d.colStatus },
          { key: 'joined', label: d.colJoined, type: 'date' },
        ],
        rows: rows
          .sort((a, b) => a.people.last_name.localeCompare(b.people.last_name))
          .map((c) => ({ cells: { name: nameOf(c), section: secOf(c), part: partOf(c), status: st[c.status], joined: c.joined_on }, href: profile(c.person_id) })),
      };
    }

    case 'owing': {
      const age = (['notDue', 'd30', 'd60', 'd60plus'] as const).find((a) => a === str(search.age));
      const { data } = await supabase.from('fee_balances').select('name, due_on, person_id, amount_cents, paid_cents, adjusted_cents').eq('organization_id', org);
      const bucket = (due: string | null) => {
        if (!due || due >= today) return 'notDue';
        const late = daysBetween(due, today);
        return late <= 30 ? 'd30' : late <= 60 ? 'd60' : 'd60plus';
      };
      const rows = (data ?? [])
        .map((b) => ({ b, owe: Math.max(0, (b.amount_cents ?? 0) - (b.paid_cents ?? 0) - (b.adjusted_cents ?? 0)) }))
        .filter(({ b, owe }) => owe > 0 && b.person_id && byId.has(b.person_id) && (!age || bucket(b.due_on) === age));
      const ageLabel = { notDue: d.notDue, d30: d.d30, d60: d.d60, d60plus: d.d60plus };
      return {
        title: d.d_owing,
        subtitle: sub(secLabel, age ? ageLabel[age] : null),
        columns: [
          { key: 'name', label: d.colName },
          { key: 'section', label: d.colSection },
          { key: 'fee', label: d.colFee },
          { key: 'owing', label: d.colOwing, type: 'money' },
          { key: 'due', label: d.colDue, type: 'date' },
          { key: 'late', label: d.colDaysLate, type: 'number' },
        ],
        rows: rows
          .sort((a, b) => (a.b.due_on ?? '9').localeCompare(b.b.due_on ?? '9') || b.owe - a.owe)
          .map(({ b, owe }) => {
            const c = byId.get(b.person_id!)!;
            return {
              cells: { name: nameOf(c), section: secOf(c), fee: b.name, owing: owe, due: b.due_on, late: b.due_on && b.due_on < today ? daysBetween(b.due_on, today) : null },
              href: profile(c.person_id),
            };
          }),
      };
    }

    case 'forms': {
      const form = id(str(search.form));
      const missingOnly = str(search.status) === 'missing';
      const { data: f1 } = form ? await supabase.from('forms').select('id, title, section_ids').eq('id', form).eq('organization_id', org).maybeSingle() : { data: null };
      if (!f1) return { title: d.d_forms, subtitle: null, columns: [], rows: [] };
      const { data: resp } = await supabase.from('form_responses').select('person_id, status, submitted_at').eq('form_id', f1.id);
      const byPerson = new Map((resp ?? []).map((r) => [r.person_id, r]));
      const st = { in_progress: d.inProgress, submitted: d.submitted, changes: d.changes, approved: d.approved };
      const rows = active
        .filter((c) => !f1.section_ids.length || (c.section_id && f1.section_ids.includes(c.section_id)))
        .map((c) => ({ c, r: byPerson.get(c.person_id) }))
        .filter(({ r }) => !missingOnly || !r || (r.status !== 'submitted' && r.status !== 'approved'));
      return {
        title: d.d_forms,
        subtitle: sub(f1.title, secLabel),
        columns: [
          { key: 'name', label: d.colName },
          { key: 'section', label: d.colSection },
          { key: 'status', label: d.colStatus },
          { key: 'date', label: d.colDate, type: 'datetime' },
        ],
        rows: rows
          .sort((a, b) => Number(Boolean(a.r?.submitted_at)) - Number(Boolean(b.r?.submitted_at)) || nameOf(a.c).localeCompare(nameOf(b.c)))
          .map(({ c, r }) => ({ cells: { name: nameOf(c), section: secOf(c), status: r ? st[r.status] : d.notStarted, date: r?.submitted_at ?? null }, href: profile(c.person_id) })),
      };
    }

    case 'practice': {
      const assignment = id(str(search.assignment));
      const notDoneOnly = str(search.status) === 'missing';
      const { data: a } = assignment
        ? await supabase.from('practice_assignments').select('id, title, section_ids, due_on').eq('id', assignment).eq('organization_id', org).maybeSingle()
        : { data: null };
      if (!a) return { title: d.d_practice, subtitle: null, columns: [], rows: [] };
      const { data: comp } = await supabase.from('practice_completions').select('person_id, completed_at').eq('assignment_id', a.id);
      const done = new Map((comp ?? []).map((x) => [x.person_id, x.completed_at]));
      const rows = active
        .filter((c) => !a.section_ids.length || (c.section_id && a.section_ids.includes(c.section_id)))
        .filter((c) => !notDoneOnly || !done.has(c.person_id));
      return {
        title: d.d_practice,
        subtitle: sub(a.title, secLabel),
        columns: [
          { key: 'name', label: d.colName },
          { key: 'section', label: d.colSection },
          { key: 'status', label: d.colStatus },
          { key: 'date', label: d.colDate, type: 'datetime' },
        ],
        rows: rows
          .sort((x, y) => Number(done.has(x.person_id)) - Number(done.has(y.person_id)) || nameOf(x).localeCompare(nameOf(y)))
          .map((c) => ({ cells: { name: nameOf(c), section: secOf(c), status: done.has(c.person_id) ? d.done : d.notDone, date: done.get(c.person_id) ?? null }, href: profile(c.person_id) })),
      };
    }

    case 'availability': {
      const event = id(str(search.event));
      const answer = (['yes', 'no', 'maybe', 'none'] as const).find((x) => x === str(search.answer));
      const { data: e } = event ? await supabase.from('events').select('id, title, starts_at, section_ids').eq('id', event).eq('organization_id', org).maybeSingle() : { data: null };
      if (!e) return { title: d.d_availability, subtitle: null, columns: [], rows: [] };
      const { data: replies } = await supabase.from('availability_replies').select('person_id, answer, comment').eq('event_id', e.id);
      const byPerson = new Map((replies ?? []).map((r) => [r.person_id, r]));
      const label = { yes: d.yes, no: d.no, maybe: d.maybe };
      const rows = active
        .filter((c) => c.status === 'active' && (!e.section_ids.length || (c.section_id && e.section_ids.includes(c.section_id))))
        .map((c) => ({ c, r: byPerson.get(c.person_id) }))
        .filter(({ r }) => !answer || (answer === 'none' ? !r : r?.answer === answer));
      return {
        title: d.d_availability,
        subtitle: sub(e.title, secLabel),
        columns: [
          { key: 'name', label: d.colName },
          { key: 'section', label: d.colSection },
          { key: 'answer', label: d.colAnswer },
          { key: 'comment', label: d.colComment },
        ],
        rows: rows
          .sort((a, b) => secOf(a.c).localeCompare(secOf(b.c)) || nameOf(a.c).localeCompare(nameOf(b.c)))
          .map(({ c, r }) => ({ cells: { name: nameOf(c), section: secOf(c), answer: r ? label[r.answer] : d.noReply, comment: r?.comment ?? '' }, href: profile(c.person_id) })),
      };
    }

    case 'tickets': {
      const event = id(str(search.event));
      const { data: e } = event ? await supabase.from('events').select('id, title').eq('id', event).eq('organization_id', org).maybeSingle() : { data: null };
      if (!e) return { title: d.d_tickets, subtitle: null, columns: [], rows: [] };
      const { data } = await supabase
        .from('ticket_orders')
        .select('id, buyer_name, total_cents, created_at, seller_links(person_id), tickets(voided_at)')
        .eq('event_id', e.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });
      const names = new Map((choristerRows ?? []).map((c) => [c.person_id, nameOf(c)]));
      return {
        title: d.d_tickets,
        subtitle: e.title,
        columns: [
          { key: 'buyer', label: d.colBuyer },
          { key: 'tickets', label: d.colTickets, type: 'number' },
          { key: 'total', label: d.colTotal, type: 'money' },
          { key: 'seller', label: d.colSeller },
          { key: 'date', label: d.colDate, type: 'datetime' },
        ],
        rows: (data ?? []).map((o) => ({
          cells: {
            buyer: o.buyer_name,
            tickets: o.tickets.filter((k) => !k.voided_at).length,
            total: o.total_cents,
            seller: names.get(one(o.seller_links)?.person_id ?? '') ?? '',
            date: o.created_at,
          },
        })),
      };
    }

    case 'volunteers': {
      const event = id(str(search.event));
      let q = supabase
        .from('volunteer_slots')
        .select('id, starts_at, ends_at, needed, volunteer_jobs!inner(title, event_id, events(title)), volunteer_signups(person_id)')
        .eq('organization_id', org)
        .gte('starts_at', dayStart(f.period.from))
        .lte('starts_at', dayEnd(f.period.to > addDays(today, 90) ? f.period.to : addDays(today, 90)))
        .order('starts_at');
      if (event) q = q.eq('volunteer_jobs.event_id', event);
      const { data } = await q;
      const names = new Map((choristerRows ?? []).map((c) => [c.person_id, nameOf(c)]));
      return {
        title: d.d_volunteers,
        subtitle: one(one(data?.[0]?.volunteer_jobs)?.events)?.title ?? null,
        columns: [
          { key: 'job', label: d.colJob },
          { key: 'shift', label: d.colShift, type: 'datetime' },
          { key: 'needed', label: d.colNeeded, type: 'number' },
          { key: 'filled', label: d.colFilled, type: 'number' },
          { key: 'names', label: d.colName },
        ],
        rows: (data ?? []).map((s) => ({
          cells: {
            job: one(s.volunteer_jobs)?.title ?? '',
            shift: s.starts_at,
            needed: s.needed,
            filled: s.volunteer_signups.length,
            names: s.volunteer_signups.map((x) => names.get(x.person_id) ?? '—').join(', '),
          },
        })),
      };
    }
  }
}
