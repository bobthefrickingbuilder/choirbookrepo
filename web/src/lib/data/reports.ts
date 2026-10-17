import 'server-only';
import { addDays, daysBetween, todayLocal, zonedInstant } from '@/lib/format';
import type { ChoirContext } from '@/lib/session';
import { getCurrentTerm } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

// Figures for the dashboard, Reports and the board report, for a period and
// optionally one section. All three read from here, so the same filters always
// give the same numbers. Every query runs as the signed-in staff member, so
// each part only fills in when their role can see that area.

export interface DateRange {
  from: string;
  to: string;
}
export interface Period extends DateRange {
  /** The value kept in the URL: month, term, season, last30, custom, term:<id> or season:<id>. */
  key: string;
  label: string;
  /** The period before, for trends: the previous term or season, or the same length just before. */
  prev: (DateRange & { label: string }) | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const fmtDay = (d: string, lang: 'en' | 'fr') =>
  new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));

/** The same number of days, just before. */
function before(r: DateRange, lang: 'en' | 'fr'): Period['prev'] {
  const len = daysBetween(r.from, r.to);
  const to = addDays(r.from, -1);
  const from = addDays(to, -len);
  return { from, to, label: `${fmtDay(from, lang)} – ${fmtDay(to, lang)}` };
}

export interface PeriodOption {
  value: string;
  label: string;
  group: string;
}

/** Every season and term of the choir, newest first, for the period picker. */
export async function getPeriodOptions(orgId: string): Promise<PeriodOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('seasons').select('id, name, starts_on, terms(id, name, starts_on)').eq('organization_id', orgId).order('starts_on', { ascending: false });
  return (data ?? []).flatMap((s) => [
    { value: `season:${s.id}`, label: s.name, group: s.name },
    ...[...s.terms].sort((a, b) => a.starts_on.localeCompare(b.starts_on)).map((t) => ({ value: `term:${t.id}`, label: t.name, group: s.name })),
  ]);
}

export async function resolvePeriod(ctx: ChoirContext, wanted: string | undefined, lang: 'en' | 'fr', custom: Partial<DateRange> = {}): Promise<Period> {
  // The current term is the default view.
  const key = wanted || 'term';
  const today = todayLocal();
  const supabase = await createClient();
  const org = ctx.org.id;
  const cap = (d: string) => (d < today ? d : today);

  if (key === 'month') {
    const from = `${today.slice(0, 7)}-01`;
    const label = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${from}T12:00:00Z`));
    const prevTo = addDays(from, -1);
    const prevLabel = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${prevTo}T12:00:00Z`));
    return { key, from, to: today, label, prev: { from: `${prevTo.slice(0, 7)}-01`, to: prevTo, label: prevLabel } };
  }
  if (key === 'last30') {
    const r = { from: addDays(today, -29), to: today };
    return { key, ...r, label: lang === 'fr' ? '30 derniers jours' : 'Last 30 days', prev: before(r, lang) };
  }
  if (key === 'custom' && custom.from && custom.to && DAY.test(custom.from) && DAY.test(custom.to)) {
    let { from, to } = custom as DateRange;
    if (from > to) [from, to] = [to, from];
    // At most three years at a time keeps every page quick.
    if (daysBetween(from, to) > 3 * 366) from = addDays(to, -3 * 366);
    return { key, from, to, label: `${fmtDay(from, lang)} – ${fmtDay(to, lang)}`, prev: before({ from, to }, lang) };
  }

  const termId = key.startsWith('term:') && UUID.test(key.slice(5)) ? key.slice(5) : null;
  if (key === 'term' || termId) {
    const [{ data: terms }, currentTerm] = await Promise.all([
      supabase.from('terms').select('id, name, starts_on, ends_on').eq('organization_id', org).order('starts_on'),
      termId ? Promise.resolve(null) : getCurrentTerm(org, today),
    ]);
    const list = terms ?? [];
    const current = termId ? list.find((t) => t.id === termId) : currentTerm;
    if (current) {
      const i = list.findIndex((t) => t.id === current.id);
      const p = i > 0 ? list[i - 1]! : null;
      return {
        key: termId ? `term:${current.id}` : 'term',
        from: current.starts_on,
        to: cap(current.ends_on),
        label: current.name,
        prev: p ? { from: p.starts_on, to: p.ends_on, label: p.name } : null,
      };
    }
  }

  const seasonId = key.startsWith('season:') && UUID.test(key.slice(7)) ? key.slice(7) : null;
  const { data: seasons } = await supabase.from('seasons').select('id, name, starts_on, ends_on, is_current').eq('organization_id', org).order('starts_on');
  const list = seasons ?? [];
  const season = (seasonId ? list.find((s) => s.id === seasonId) : null) ?? list.find((s) => s.is_current);
  if (season) {
    const i = list.findIndex((s) => s.id === season.id);
    const p = i > 0 ? list[i - 1]! : null;
    return {
      key: seasonId ? `season:${season.id}` : 'season',
      from: season.starts_on,
      to: cap(season.ends_on),
      label: season.name,
      prev: p ? { from: p.starts_on, to: p.ends_on, label: p.name } : null,
    };
  }
  const r = { from: addDays(today, -365), to: today };
  return { key: 'season', ...r, label: lang === 'fr' ? 'Cette année' : 'This year', prev: before(r, lang) };
}

/** Start and end of a local (Toronto) day, as instants for timestamp columns. */
export const dayStart = (d: string) => zonedInstant(d, '00:00').toISOString();
export const dayEnd = (d: string) => new Date(zonedInstant(addDays(d, 1), '00:00').getTime() - 1).toISOString();

/** Embedded rows over composite keys come back as an object or a one-item list. */
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

type Mark = { status: 'present' | 'late' | 'excused' | 'absent' | null };
const rateOf = (m: Mark[]) => (m.length ? Math.round((m.filter((a) => a.status === 'present' || a.status === 'late').length / m.length) * 100) : null);

export async function getReport(ctx: ChoirContext, p: Period, sectionId: string | null = null) {
  const supabase = await createClient();
  const org = ctx.org.id;
  const today = todayLocal();
  const monthFrom = `${today.slice(0, 7)}-01`;
  const monthTo = addDays(`${addDays(monthFrom, 32).slice(0, 7)}-01`, -1);

  const facts = (r: DateRange) => {
    const q = supabase
      .from('attendance_facts')
      .select('event_id, person_id, status, starts_at, title, section_id')
      .eq('organization_id', org)
      .eq('counts_for_attendance', true)
      .is('cancelled_at', null)
      .neq('event_type', 'deadline')
      .gte('starts_at', dayStart(r.from))
      .lte('starts_at', dayEnd(r.to))
      .order('starts_at');
    return sectionId ? q.eq('section_id', sectionId) : q;
  };

  const [
    sections,
    choristers,
    attendance,
    prevAttendance,
    balances,
    payments,
    adjustments,
    instalments,
    forms,
    responses,
    concerts,
    ticketTypes,
    orders,
    assignments,
    completions,
    signups,
    slots,
    slotFill,
    announcements,
    conversations,
    term,
    upcoming,
  ] = await Promise.all([
    supabase.from('sections').select('id, key, name_en, name_fr, sort').eq('organization_id', org).order('sort'),
    supabase
      .from('choristers')
      .select('person_id, section_id, status, joined_on, departed_on, voice_parts(key, name_en, name_fr, sort), people!inner(first_name, last_name, preferred_name, date_of_birth)')
      .eq('organization_id', org),
    facts(p),
    p.prev ? facts(p.prev) : Promise.resolve({ data: null }),
    supabase.from('fee_balances').select('fee_id, name, due_on, person_id, amount_cents, paid_cents, adjusted_cents').eq('organization_id', org),
    supabase.from('payments').select('person_id, amount_cents, refunded_cents, method, status, received_at').eq('organization_id', org).in('status', ['succeeded', 'partially_refunded']),
    supabase.from('fee_adjustments').select('amount_cents, kind, fee_assignments!inner(person_id)').eq('organization_id', org).eq('status', 'approved'),
    supabase.from('instalments').select('amount_cents, due_on, fee_assignments!inner(person_id)').eq('organization_id', org).gte('due_on', monthFrom).lte('due_on', monthTo),
    supabase.from('forms').select('id, title, status, due_on, section_ids').eq('organization_id', org).neq('status', 'draft'),
    supabase.from('form_responses').select('form_id, person_id, status').eq('organization_id', org),
    supabase.from('events').select('id, title, starts_at').eq('organization_id', org).eq('type', 'concert').order('starts_at'),
    supabase.from('ticket_types').select('event_id, capacity').eq('organization_id', org),
    supabase.from('ticket_orders').select('event_id, total_cents, status, created_at, seller_links(person_id), tickets(id, voided_at)').eq('organization_id', org).eq('status', 'paid'),
    supabase.from('practice_assignments').select('id, title, due_on, section_ids, released_at, piece_id, pieces(title)').eq('organization_id', org).not('released_at', 'is', null).order('due_on'),
    supabase.from('practice_completions').select('assignment_id, person_id').eq('organization_id', org),
    supabase.from('volunteer_signups').select('person_id, hours_logged, volunteer_slots!inner(starts_at)').eq('organization_id', org),
    supabase
      .from('volunteer_slots')
      .select('id, needed, starts_at, volunteer_jobs!inner(title, event_id, events(title, starts_at))')
      .eq('organization_id', org)
      .gte('starts_at', dayStart(p.from))
      .lte('starts_at', dayEnd(p.to > addDays(today, 90) ? p.to : addDays(today, 90))),
    supabase.rpc('volunteer_slot_fill', { org }),
    supabase
      .from('announcements')
      .select('id, published_at, announcement_recipients(person_id, read_at)')
      .eq('organization_id', org)
      .gte('published_at', dayStart(p.from))
      .lte('published_at', dayEnd(p.to)),
    supabase.from('conversations').select('member_id, status, created_at, first_staff_reply_at').eq('organization_id', org).gte('created_at', dayStart(p.from)).lte('created_at', dayEnd(p.to)),
    getCurrentTerm(org, today),
    supabase
      .from('events')
      .select('id, title, starts_at, type')
      .eq('organization_id', org)
      .is('cancelled_at', null)
      .neq('type', 'rehearsal')
      .gte('starts_at', dayStart(today))
      .lte('starts_at', dayEnd(addDays(today, 90)))
      .order('starts_at')
      .limit(8),
  ]);

  const secs = (sections.data ?? []).filter((s) => !sectionId || s.id === sectionId);
  const inSection = (sid: string | null) => !sectionId || sid === sectionId;
  const everyone = choristers.data ?? [];
  const all = everyone.filter((c) => inSection(c.section_id));
  const people = new Set(all.map((c) => c.person_id));
  const mine = (personId: string | null) => !sectionId || (personId !== null && people.has(personId));
  const active = all.filter((c) => c.status === 'active' || c.status === 'on_leave');
  const name = (c: (typeof all)[number]) => `${c.people.preferred_name || c.people.first_name} ${c.people.last_name}`;

  // Membership
  const parts = new Map<string, { key: string; name_en: string; name_fr: string; sort: number; count: number }>();
  for (const c of active) {
    const v = one(c.voice_parts);
    if (!v) continue;
    const x = parts.get(v.key) ?? { ...v, count: 0 };
    x.count += 1;
    parts.set(v.key, x);
  }
  const membership = {
    active: active.length,
    auditioning: all.filter((c) => c.status === 'auditioning').length,
    onLeave: all.filter((c) => c.status === 'on_leave').length,
    unplaced: sectionId ? 0 : active.filter((c) => !c.section_id).length,
    bySection: [
      ...secs.map((s) => ({ id: s.id, key: s.key, name_en: s.name_en, name_fr: s.name_fr, count: active.filter((c) => c.section_id === s.id).length })),
      ...(sectionId ? [] : [{ id: '', key: '', name_en: 'Awaiting placement', name_fr: 'À placer', count: active.filter((c) => !c.section_id).length }]),
    ].filter((x) => x.count > 0),
    byPart: [...parts.values()].sort((a, b) => a.sort - b.sort).map(({ sort: _s, ...x }) => x),
    newInPeriod: all.filter((c) => c.joined_on && c.joined_on >= p.from && c.joined_on <= p.to).length,
    departedInPeriod: all.filter((c) => c.departed_on && c.departed_on >= p.from && c.departed_on <= p.to).length,
    minors: active.filter((c) => c.people.date_of_birth && c.people.date_of_birth > addDays(today, -Math.round(18 * 365.25))).length,
  };

  // Attendance (events that count, not cancelled)
  const marks = attendance.data ?? [];
  const eventIds = [...new Set(marks.map((m) => m.event_id!))];
  const byEvent = eventIds.map((id) => {
    const m = marks.filter((a) => a.event_id === id);
    const here = m.filter((a) => a.status === 'present' || a.status === 'late').length;
    return { id, title: m[0]!.title ?? '', date: m[0]!.starts_at!, marked: m.length, here, absent: m.filter((a) => a.status === 'absent').length, rate: rateOf(m) };
  });
  const split = { present: 0, late: 0, excused: 0, absent: 0 };
  for (const a of marks) if (a.status) split[a.status] += 1;
  const bySectionAtt = secs
    .map((s) => ({ id: s.id, key: s.key, name_en: s.name_en, name_fr: s.name_fr, rate: rateOf(marks.filter((a) => a.section_id === s.id)) }))
    .filter((x) => x.rate !== null);
  const perPerson = active
    .map((c) => {
      const m = marks.filter((a) => a.person_id === c.person_id);
      const here = m.filter((a) => a.status === 'present' || a.status === 'late').length;
      return {
        id: c.person_id,
        name: name(c),
        section: one(c.voice_parts)?.key ?? '',
        marked: m.length,
        here,
        absent: m.filter((a) => a.status === 'absent').length,
        excused: m.filter((a) => a.status === 'excused').length,
        late: m.filter((a) => a.status === 'late').length,
        rate: rateOf(m),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const limit = term?.absence_limit ?? null;
  const rate = rateOf(marks);
  const prevRate = prevAttendance.data ? rateOf(prevAttendance.data) : null;
  const attendanceReport = {
    rate,
    prevRate,
    trend: rate !== null && prevRate !== null ? rate - prevRate : null,
    split,
    byEvent,
    bySection: bySectionAtt,
    perPerson,
    atLimit: limit === null ? 0 : perPerson.filter((x) => x.absent >= limit).length,
    limit,
  };

  // Fees
  const bal = (balances.data ?? []).filter((b) => mine(b.person_id));
  const feeNames = [...new Map(bal.map((b) => [b.fee_id, { id: b.fee_id!, name: b.name!, due: b.due_on }])).values()];
  const left = (b: (typeof bal)[number]) => Math.max(0, (b.amount_cents ?? 0) - (b.paid_cents ?? 0) - (b.adjusted_cents ?? 0));
  const pays = (payments.data ?? []).filter((x) => mine(x.person_id));
  const methods = { card: 0, cash: 0, cheque: 0, etransfer: 0 } as Record<string, number>;
  for (const x of pays) methods[x.method] = (methods[x.method] ?? 0) + x.amount_cents - x.refunded_cents;
  const aging = { notDue: 0, d30: 0, d60: 0, d60plus: 0 };
  for (const b of bal) {
    const owe = left(b);
    if (!owe) continue;
    if (!b.due_on || b.due_on >= today) aging.notDue += owe;
    else {
      const late = daysBetween(b.due_on, today);
      if (late <= 30) aging.d30 += owe;
      else if (late <= 60) aging.d60 += owe;
      else aging.d60plus += owe;
    }
  }
  const adj = (adjustments.data ?? []).filter((a) => mine(one(a.fee_assignments)?.person_id ?? null));
  const inst = (instalments.data ?? []).filter((a) => mine(one(a.fee_assignments)?.person_id ?? null));
  const finance = {
    billed: bal.reduce((n, b) => n + (b.amount_cents ?? 0), 0),
    collected: bal.reduce((n, b) => n + (b.paid_cents ?? 0), 0),
    adjusted: bal.reduce((n, b) => n + (b.adjusted_cents ?? 0), 0),
    outstanding: bal.reduce((n, b) => n + left(b), 0),
    overdueCount: new Set(bal.filter((b) => left(b) > 0 && b.due_on && b.due_on < today).map((b) => b.person_id)).size,
    overdueCents: aging.d30 + aging.d60 + aging.d60plus,
    paidUpCount: new Set(bal.map((b) => b.person_id)).size - new Set(bal.filter((b) => left(b) > 0).map((b) => b.person_id)).size,
    payers: new Set(bal.map((b) => b.person_id)).size,
    collectedInPeriod: pays.filter((x) => x.received_at && x.received_at >= dayStart(p.from) && x.received_at <= dayEnd(p.to)).reduce((n, x) => n + x.amount_cents - x.refunded_cents, 0),
    methods,
    aging,
    waivers: {
      count: adj.length,
      cents: adj.reduce((n, a) => n + a.amount_cents, 0),
      byKind: adj.reduce<Record<string, number>>((m, a) => ({ ...m, [a.kind]: (m[a.kind] ?? 0) + a.amount_cents }), {}),
    },
    instalmentsThisMonth: { count: inst.length, cents: inst.reduce((n, a) => n + a.amount_cents, 0) },
    fees: feeNames.map((f) => {
      const rows = bal.filter((b) => b.fee_id === f.id);
      return { ...f, billed: rows.reduce((n, b) => n + (b.amount_cents ?? 0), 0), collected: rows.reduce((n, b) => n + (b.paid_cents ?? 0), 0), outstanding: rows.reduce((n, b) => n + left(b), 0) };
    }),
  };

  // Forms
  const resp = (responses.data ?? []).filter((r) => mine(r.person_id));
  const formRows = (forms.data ?? [])
    .filter((f) => !sectionId || !f.section_ids.length || f.section_ids.includes(sectionId))
    .map((f) => {
      const who = active.filter((c) => !f.section_ids.length || (c.section_id && f.section_ids.includes(c.section_id)));
      const ids = new Set(who.map((c) => c.person_id));
      const doneN = resp.filter((r) => r.form_id === f.id && ids.has(r.person_id) && (r.status === 'submitted' || r.status === 'approved')).length;
      const total = who.length;
      return { id: f.id, title: f.title, status: f.status, due: f.due_on, total, done: Math.min(doneN, total), pct: total ? Math.round((Math.min(doneN, total) / total) * 100) : 0 };
    });
  const sumTotal = formRows.reduce((n, f) => n + f.total, 0);
  const formsReport = {
    rows: formRows,
    pct: sumTotal ? Math.round((formRows.reduce((n, f) => n + f.done, 0) / sumTotal) * 100) : null,
    missing: formRows.filter((f) => f.status === 'open').reduce((n, f) => n + f.total - f.done, 0),
  };

  // Tickets (sales are for the whole choir; top sellers follow the section filter)
  const ord = orders.data ?? [];
  const live = (o: (typeof ord)[number]) => o.tickets.filter((k) => !k.voided_at).length;
  const capacityOf = (eventId: string) => {
    const types = (ticketTypes.data ?? []).filter((x) => x.event_id === eventId);
    return types.length && types.every((x) => x.capacity !== null) ? types.reduce((n, x) => n + (x.capacity ?? 0), 0) : null;
  };
  const ticketsReport = (concerts.data ?? [])
    .map((c) => {
      const o = ord.filter((x) => x.event_id === c.id);
      return { id: c.id, title: c.title, date: c.starts_at, orders: o.length, tickets: o.reduce((n, x) => n + live(x), 0), revenue: o.reduce((n, x) => n + x.total_cents, 0), capacity: capacityOf(c.id) };
    })
    .filter((x) => x.orders > 0 || x.date >= dayStart(p.from));
  const salesByDay = new Map<string, number>();
  for (const o of ord) {
    if (o.created_at < dayStart(p.from) || o.created_at > dayEnd(p.to)) continue;
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date(o.created_at));
    salesByDay.set(d, (salesByDay.get(d) ?? 0) + live(o));
  }
  const sellerTotals = new Map<string, number>();
  for (const o of ord) {
    const pid = one(o.seller_links)?.person_id;
    if (pid && mine(pid)) sellerTotals.set(pid, (sellerTotals.get(pid) ?? 0) + live(o));
  }
  const names = new Map(everyone.map((c) => [c.person_id, name(c)]));
  const ticketSales = {
    byDay: [...salesByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, tickets]) => ({ date, tickets })),
    topSellers: [...sellerTotals.entries()]
      .map(([id, tickets]) => ({ id, name: names.get(id) ?? '—', tickets }))
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 5),
  };

  // Practice
  const comp = (completions.data ?? []).filter((x) => mine(x.person_id));
  const practice = (assignments.data ?? [])
    .filter((a) => !sectionId || !a.section_ids.length || a.section_ids.includes(sectionId))
    .map((a) => {
      const who = active.filter((c) => !a.section_ids.length || (c.section_id && a.section_ids.includes(c.section_id)));
      const ids = new Set(who.map((c) => c.person_id));
      const doneIds = new Set(comp.filter((x) => x.assignment_id === a.id && ids.has(x.person_id)).map((x) => x.person_id));
      const bySection = secs
        .filter((s) => !a.section_ids.length || a.section_ids.includes(s.id))
        .map((s) => {
          const inS = who.filter((c) => c.section_id === s.id);
          const d = inS.filter((c) => doneIds.has(c.person_id)).length;
          return { id: s.id, key: s.key, name_en: s.name_en, name_fr: s.name_fr, total: inS.length, done: d, pct: inS.length ? Math.round((d / inS.length) * 100) : null };
        })
        .filter((x) => x.total > 0);
      return {
        id: a.id,
        title: a.title,
        pieceId: a.piece_id,
        piece: one(a.pieces)?.title ?? '',
        due: a.due_on,
        total: who.length,
        done: doneIds.size,
        pct: who.length ? Math.round((doneIds.size / who.length) * 100) : 0,
        bySection,
      };
    });

  // Volunteers
  const vol = (signups.data ?? []).filter((x) => mine(x.person_id) && x.volunteer_slots.starts_at >= dayStart(p.from) && x.volunteer_slots.starts_at <= dayEnd(p.to));
  const hoursBy = new Map<string, { shifts: number; hours: number }>();
  for (const x of vol) {
    const h = hoursBy.get(x.person_id) ?? { shifts: 0, hours: 0 };
    h.shifts += 1;
    h.hours += Number(x.hours_logged ?? 0);
    hoursBy.set(x.person_id, h);
  }
  const taken = new Map((slotFill.data ?? []).map((x) => [x.slot_id, x.taken]));
  const byEventVol = new Map<string, { id: string | null; title: string; date: string; needed: number; filled: number }>();
  for (const s of slots.data ?? []) {
    const job = one(s.volunteer_jobs);
    const ev = one(job?.events);
    const k = job?.event_id ?? `job:${job?.title}`;
    const x = byEventVol.get(k) ?? { id: job?.event_id ?? null, title: ev?.title ?? job?.title ?? '', date: ev?.starts_at ?? s.starts_at, needed: 0, filled: 0 };
    x.needed += s.needed;
    x.filled += Math.min(s.needed, taken.get(s.id) ?? 0);
    byEventVol.set(k, x);
  }
  const volunteers = {
    shifts: vol.length,
    hours: [...hoursBy.values()].reduce((n, h) => n + h.hours, 0),
    rows: [...hoursBy.entries()].map(([id, h]) => ({ id, name: names.get(id) ?? '—', ...h })).sort((a, b) => b.hours - a.hours || b.shifts - a.shifts),
    byEvent: [...byEventVol.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };

  // Communications
  const anns = announcements.data ?? [];
  const recips = anns.flatMap((a) => a.announcement_recipients).filter((r) => mine(r.person_id));
  const convs = (conversations.data ?? []).filter((c) => mine(c.member_id));
  const replyHours = convs
    .filter((c) => c.first_staff_reply_at)
    .map((c) => (Date.parse(c.first_staff_reply_at!) - Date.parse(c.created_at)) / 3_600_000)
    .sort((a, b) => a - b);
  const comms = {
    announcements: anns.length,
    readRate: recips.length ? Math.round((recips.filter((r) => r.read_at).length / recips.length) * 100) : null,
    conversations: convs.length,
    open: convs.filter((c) => c.status === 'open').length,
    unanswered: convs.filter((c) => c.status === 'open' && !c.first_staff_reply_at).length,
    medianReplyHours: replyHours.length ? Math.round(replyHours[Math.floor(replyHours.length / 2)]! * 10) / 10 : null,
  };

  return {
    period: p,
    sectionId,
    membership,
    attendance: attendanceReport,
    finance,
    forms: formsReport,
    tickets: ticketsReport,
    ticketSales,
    practice,
    volunteers,
    comms,
    upcoming: upcoming.data ?? [],
  };
}
export type Report = Awaited<ReturnType<typeof getReport>>;
