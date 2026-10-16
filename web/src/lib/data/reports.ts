import 'server-only';
import { addDays, todayLocal } from '@/lib/format';
import type { ChoirContext } from '@/lib/session';
import { getCurrentTerm } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Figures for Reports and the board report, for a period. Every query runs as
// the signed-in staff member, so each part only fills in when their role can
// see that area (the rest comes back empty).

export type PeriodKey = 'month' | 'term' | 'season' | 'last30';
export interface Period {
  key: PeriodKey;
  from: string;
  to: string;
  label: string;
}

export async function resolvePeriod(ctx: ChoirContext, key: string | undefined, lang: 'en' | 'fr'): Promise<Period> {
  const today = todayLocal();
  const supabase = await createClient();
  const k = (['month', 'term', 'season', 'last30'] as const).find((x) => x === key) ?? 'term';
  if (k === 'month') {
    const from = `${today.slice(0, 7)}-01`;
    const label = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${from}T12:00:00Z`));
    return { key: k, from, to: today, label };
  }
  if (k === 'last30') return { key: k, from: addDays(today, -30), to: today, label: lang === 'fr' ? '30 derniers jours' : 'Last 30 days' };
  if (k === 'term') {
    const term = await getCurrentTerm(ctx.org.id, today);
    if (term) return { key: k, from: term.starts_on, to: term.ends_on < today ? term.ends_on : today, label: term.name };
  }
  const { data: season } = await supabase.from('seasons').select('name, starts_on, ends_on').eq('organization_id', ctx.org.id).eq('is_current', true).maybeSingle();
  return season
    ? { key: 'season', from: season.starts_on, to: season.ends_on < today ? season.ends_on : today, label: season.name }
    : { key: 'season', from: addDays(today, -365), to: today, label: lang === 'fr' ? 'Cette année' : 'This year' };
}

const iso = (d: string, end = false) => `${d}T${end ? '23:59:59' : '00:00:00'}`;

export async function getReport(ctx: ChoirContext, p: Period) {
  const supabase = await createClient();
  const org = ctx.org.id;
  const [sections, choristers, events, attendance, balances, payments, forms, responses, concerts, orders, assignments, completions, signups, announcements, conversations, term] =
    await Promise.all([
      supabase.from('sections').select('id, key, name_en, name_fr, sort').eq('organization_id', org).order('sort'),
      supabase.from('choristers').select('person_id, section_id, status, joined_on, departed_on, voice_parts(key), people!inner(first_name, last_name, preferred_name, date_of_birth)').eq('organization_id', org),
      supabase
        .from('events')
        .select('id, title, starts_at, type, section_ids, cancelled_at, counts_for_attendance')
        .eq('organization_id', org)
        .gte('starts_at', iso(p.from))
        .lte('starts_at', iso(p.to, true))
        .order('starts_at'),
      supabase.from('attendance').select('event_id, person_id, status, events!inner(starts_at)').eq('organization_id', org).gte('events.starts_at', iso(p.from)).lte('events.starts_at', iso(p.to, true)),
      supabase.from('fee_balances').select('fee_id, name, due_on, person_id, amount_cents, paid_cents, adjusted_cents').eq('organization_id', org),
      supabase.from('payments').select('amount_cents, refunded_cents, method, status, received_at').eq('organization_id', org).in('status', ['succeeded', 'partially_refunded']),
      supabase.from('forms').select('id, title, status, due_on, section_ids').eq('organization_id', org).neq('status', 'draft'),
      supabase.from('form_responses').select('form_id, status').eq('organization_id', org),
      supabase.from('events').select('id, title, starts_at').eq('organization_id', org).eq('type', 'concert').order('starts_at'),
      supabase.from('ticket_orders').select('event_id, total_cents, status, tickets(id, voided_at)').eq('organization_id', org).eq('status', 'paid'),
      supabase.from('practice_assignments').select('id, title, due_on, section_ids, released_at, pieces(title)').eq('organization_id', org).not('released_at', 'is', null).order('due_on'),
      supabase.from('practice_completions').select('assignment_id').eq('organization_id', org),
      supabase.from('volunteer_signups').select('person_id, hours_logged, volunteer_slots!inner(starts_at)').eq('organization_id', org),
      supabase
        .from('announcements')
        .select('id, published_at, announcement_recipients(read_at)')
        .eq('organization_id', org)
        .gte('published_at', iso(p.from))
        .lte('published_at', iso(p.to, true)),
      supabase.from('conversations').select('created_at, first_staff_reply_at').eq('organization_id', org).gte('created_at', iso(p.from)).lte('created_at', iso(p.to, true)),
      getCurrentTerm(org, todayLocal()),
    ]);

  const secs = sections.data ?? [];
  const all = choristers.data ?? [];
  const active = all.filter((c) => c.status === 'active' || c.status === 'on_leave');
  const name = (c: (typeof all)[number]) => `${c.people.preferred_name || c.people.first_name} ${c.people.last_name}`;

  // Membership
  const membership = {
    active: active.length,
    auditioning: all.filter((c) => c.status === 'auditioning').length,
    bySection: [
      ...secs.map((s) => ({ key: s.key, name_en: s.name_en, name_fr: s.name_fr, count: active.filter((c) => c.section_id === s.id).length })),
      { key: '', name_en: 'Awaiting placement', name_fr: 'À placer', count: active.filter((c) => !c.section_id).length },
    ].filter((x) => x.count > 0),
    newInPeriod: all.filter((c) => c.joined_on && c.joined_on >= p.from && c.joined_on <= p.to).length,
    departedInPeriod: all.filter((c) => c.departed_on && c.departed_on >= p.from && c.departed_on <= p.to).length,
    minors: active.filter((c) => c.people.date_of_birth && c.people.date_of_birth > addDays(todayLocal(), -18 * 365.25)).length,
  };

  // Attendance
  const marks = attendance.data ?? [];
  const countable = (events.data ?? []).filter((e) => e.counts_for_attendance && !e.cancelled_at && e.type !== 'deadline');
  const byEvent = countable
    .map((e) => {
      const m = marks.filter((a) => a.event_id === e.id);
      const here = m.filter((a) => a.status === 'present' || a.status === 'late').length;
      return { id: e.id, title: e.title, date: e.starts_at, marked: m.length, here, rate: m.length ? Math.round((here / m.length) * 100) : null };
    })
    .filter((e) => e.marked > 0);
  const split = { present: 0, late: 0, excused: 0, absent: 0 };
  for (const a of marks) split[a.status] += 1;
  const totalMarks = marks.length;
  const sectionOf = new Map(all.map((c) => [c.person_id, c.section_id]));
  const bySectionAtt = secs
    .map((s) => {
      const m = marks.filter((a) => sectionOf.get(a.person_id) === s.id);
      const here = m.filter((a) => a.status === 'present' || a.status === 'late').length;
      return { key: s.key, name_en: s.name_en, name_fr: s.name_fr, rate: m.length ? Math.round((here / m.length) * 100) : null };
    })
    .filter((x) => x.rate !== null);
  const perPerson = active
    .map((c) => {
      const m = marks.filter((a) => a.person_id === c.person_id);
      const here = m.filter((a) => a.status === 'present' || a.status === 'late').length;
      return { id: c.person_id, name: name(c), section: c.voice_parts?.key ?? '', marked: m.length, here, absent: m.filter((a) => a.status === 'absent').length, excused: m.filter((a) => a.status === 'excused').length, late: m.filter((a) => a.status === 'late').length, rate: m.length ? Math.round((here / m.length) * 100) : null };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const limit = term?.absence_limit ?? null;
  const attendanceReport = {
    rate: totalMarks ? Math.round(((split.present + split.late) / totalMarks) * 100) : null,
    split,
    byEvent,
    bySection: bySectionAtt,
    perPerson,
    atLimit: limit === null ? 0 : perPerson.filter((x) => x.absent >= limit).length,
    limit,
  };

  // Fees
  const bal = balances.data ?? [];
  const feeNames = [...new Map(bal.map((b) => [b.fee_id, { id: b.fee_id!, name: b.name!, due: b.due_on }])).values()];
  const left = (b: (typeof bal)[number]) => Math.max(0, (b.amount_cents ?? 0) - (b.paid_cents ?? 0) - (b.adjusted_cents ?? 0));
  const today = todayLocal();
  const pays = payments.data ?? [];
  const methods = { card: 0, cash: 0, cheque: 0, etransfer: 0 } as Record<string, number>;
  for (const x of pays) methods[x.method] = (methods[x.method] ?? 0) + x.amount_cents - x.refunded_cents;
  const finance = {
    billed: bal.reduce((n, b) => n + (b.amount_cents ?? 0), 0),
    collected: bal.reduce((n, b) => n + (b.paid_cents ?? 0), 0),
    adjusted: bal.reduce((n, b) => n + (b.adjusted_cents ?? 0), 0),
    outstanding: bal.reduce((n, b) => n + left(b), 0),
    overdueCount: new Set(bal.filter((b) => left(b) > 0 && b.due_on && b.due_on < today).map((b) => b.person_id)).size,
    paidUpCount: new Set(bal.map((b) => b.person_id)).size - new Set(bal.filter((b) => left(b) > 0).map((b) => b.person_id)).size,
    payers: new Set(bal.map((b) => b.person_id)).size,
    collectedInPeriod: pays.filter((x) => x.received_at && x.received_at >= iso(p.from) && x.received_at <= iso(p.to, true)).reduce((n, x) => n + x.amount_cents - x.refunded_cents, 0),
    methods,
    fees: feeNames.map((f) => {
      const rows = bal.filter((b) => b.fee_id === f.id);
      return { ...f, billed: rows.reduce((n, b) => n + (b.amount_cents ?? 0), 0), collected: rows.reduce((n, b) => n + (b.paid_cents ?? 0), 0), outstanding: rows.reduce((n, b) => n + left(b), 0) };
    }),
  };

  // Forms
  const resp = responses.data ?? [];
  const formRows = (forms.data ?? []).map((f) => {
    const total = active.filter((c) => !f.section_ids.length || (c.section_id && f.section_ids.includes(c.section_id))).length;
    const doneN = resp.filter((r) => r.form_id === f.id && (r.status === 'submitted' || r.status === 'approved')).length;
    return { id: f.id, title: f.title, status: f.status, due: f.due_on, total, done: Math.min(doneN, total), pct: total ? Math.round((Math.min(doneN, total) / total) * 100) : 0 };
  });
  const formsReport = {
    rows: formRows,
    pct: formRows.reduce((n, f) => n + f.total, 0) ? Math.round((formRows.reduce((n, f) => n + f.done, 0) / formRows.reduce((n, f) => n + f.total, 0)) * 100) : null,
    missing: formRows.filter((f) => f.status === 'open').reduce((n, f) => n + f.total - f.done, 0),
  };

  // Tickets
  const ord = orders.data ?? [];
  const ticketsReport = (concerts.data ?? [])
    .map((c) => {
      const o = ord.filter((x) => x.event_id === c.id);
      return { id: c.id, title: c.title, date: c.starts_at, orders: o.length, tickets: o.reduce((n, x) => n + x.tickets.filter((k) => !k.voided_at).length, 0), revenue: o.reduce((n, x) => n + x.total_cents, 0) };
    })
    .filter((x) => x.orders > 0 || x.date >= iso(p.from));

  // Practice
  const comp = completions.data ?? [];
  const practice = (assignments.data ?? []).map((a) => {
    const total = active.filter((c) => !a.section_ids.length || (c.section_id && a.section_ids.includes(c.section_id))).length;
    const doneN = comp.filter((x) => x.assignment_id === a.id).length;
    return { id: a.id, title: a.title, piece: a.pieces?.title ?? '', due: a.due_on, total, done: doneN, pct: total ? Math.round((Math.min(doneN, total) / total) * 100) : 0 };
  });

  // Volunteers
  const vol = (signups.data ?? []).filter((x) => x.volunteer_slots.starts_at >= iso(p.from) && x.volunteer_slots.starts_at <= iso(p.to, true));
  const hoursBy = new Map<string, { shifts: number; hours: number }>();
  for (const x of vol) {
    const h = hoursBy.get(x.person_id) ?? { shifts: 0, hours: 0 };
    h.shifts += 1;
    h.hours += Number(x.hours_logged ?? 0);
    hoursBy.set(x.person_id, h);
  }
  const people = new Map(all.map((c) => [c.person_id, name(c)]));
  const volunteers = {
    shifts: vol.length,
    hours: [...hoursBy.values()].reduce((n, h) => n + h.hours, 0),
    rows: [...hoursBy.entries()].map(([id, h]) => ({ id, name: people.get(id) ?? '—', ...h })).sort((a, b) => b.hours - a.hours || b.shifts - a.shifts),
  };

  // Communications
  const anns = announcements.data ?? [];
  const recips = anns.flatMap((a) => a.announcement_recipients);
  const convs = conversations.data ?? [];
  const replyHours = convs.filter((c) => c.first_staff_reply_at).map((c) => (Date.parse(c.first_staff_reply_at!) - Date.parse(c.created_at)) / 3_600_000).sort((a, b) => a - b);
  const comms = {
    announcements: anns.length,
    readRate: recips.length ? Math.round((recips.filter((r) => r.read_at).length / recips.length) * 100) : null,
    conversations: convs.length,
    medianReplyHours: replyHours.length ? Math.round(replyHours[Math.floor(replyHours.length / 2)]! * 10) / 10 : null,
  };

  const upcoming = await supabase
    .from('events')
    .select('id, title, starts_at, type')
    .eq('organization_id', org)
    .is('cancelled_at', null)
    .neq('type', 'rehearsal')
    .gte('starts_at', iso(today))
    .lte('starts_at', iso(addDays(today, 90), true))
    .order('starts_at')
    .limit(8);

  return { period: p, membership, attendance: attendanceReport, finance, forms: formsReport, tickets: ticketsReport, practice, volunteers, comms, upcoming: upcoming.data ?? [] };
}
export type Report = Awaited<ReturnType<typeof getReport>>;
