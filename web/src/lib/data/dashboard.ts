import 'server-only';
import { cookies } from 'next/headers';
import type { Messages } from '@choirbook/shared/i18n';
import type { IconName } from '@choirbook/ui';
import type { PermArea } from '@choirbook/shared/permissions';
import { addDays, isoDaysFromNow, todayLocal } from '@/lib/format';
import type { ChoirContext } from '@/lib/session';
import { getCurrentTerm } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import type { Filters } from './filters';
import { dayEnd, dayStart, type Report } from './reports';
import { getTermAbsences } from './roster';

// What the dashboard adds on top of the shared report figures: the "needs
// attention" list, the next rehearsal, upcoming events with availability by
// section, and each staff member's widget layout.

export const WIDGETS = ['attendance', 'upcoming', 'membership', 'fees', 'forms', 'music', 'comms', 'tickets', 'volunteers'] as const;
export type WidgetId = (typeof WIDGETS)[number];

const WIDGET_AREAS: Record<WidgetId, PermArea[]> = {
  attendance: ['attendance'],
  upcoming: ['calendar'],
  membership: ['roster'],
  fees: ['fees'],
  forms: ['forms'],
  music: ['music'],
  comms: ['announcements', 'inbox'],
  tickets: ['tickets'],
  volunteers: ['volunteers'],
};

/** Role-aware starting order: the treasurer sees money first, the conductor attendance and music. */
const ROLE_DEFAULTS: Record<string, WidgetId[]> = {
  administrator: ['attendance', 'upcoming', 'fees', 'membership', 'music', 'forms', 'comms', 'tickets', 'volunteers'],
  conductor: ['attendance', 'music', 'upcoming', 'membership', 'comms', 'forms', 'tickets', 'volunteers', 'fees'],
  treasurer: ['fees', 'tickets', 'membership', 'forms', 'upcoming', 'attendance', 'music', 'comms', 'volunteers'],
  office: ['upcoming', 'forms', 'comms', 'membership', 'attendance', 'fees', 'tickets', 'volunteers', 'music'],
  section_leader: ['attendance', 'music', 'upcoming', 'membership', 'comms', 'forms', 'fees', 'tickets', 'volunteers'],
};
const ROLE_PRIORITY = ['administrator', 'conductor', 'treasurer', 'office', 'section_leader'];

export function allowedWidgets(ctx: ChoirContext): WidgetId[] {
  return WIDGETS.filter((w) => WIDGET_AREAS[w].some((a) => ctx.can(a)));
}

export function defaultOrder(ctx: ChoirContext): WidgetId[] {
  const key = ROLE_PRIORITY.find((k) => ctx.roles.some((r) => r.key === k));
  return key ? ROLE_DEFAULTS[key]! : [...WIDGETS];
}

export interface Layout {
  order: WidgetId[];
  hidden: WidgetId[];
  saved: boolean;
}

export const DEMO_LAYOUT_COOKIE = 'cb_demo_dashboard';

/** The staff member's saved layout, or their role's default, limited to what they can see. */
export async function getLayout(ctx: ChoirContext, userId: string): Promise<Layout> {
  let saved: { widgets: string[]; hidden: string[] } | null = null;
  if (ctx.org.is_demo) {
    try {
      const raw = (await cookies()).get(DEMO_LAYOUT_COOKIE)?.value;
      const v = raw ? (JSON.parse(raw) as { order?: unknown; hidden?: unknown }) : null;
      if (v && Array.isArray(v.order) && Array.isArray(v.hidden)) saved = { widgets: v.order.map(String), hidden: v.hidden.map(String) };
    } catch {
      saved = null;
    }
  } else {
    const supabase = await createClient();
    const { data } = await supabase.from('dashboard_layouts').select('widgets, hidden').eq('organization_id', ctx.org.id).eq('user_id', userId).maybeSingle();
    saved = data;
  }
  const allowed = allowedWidgets(ctx);
  const isWidget = (w: string): w is WidgetId => (allowed as string[]).includes(w);
  const order0 = (saved?.widgets ?? []).filter(isWidget);
  const order = [...order0, ...defaultOrder(ctx).filter((w) => isWidget(w) && !order0.includes(w))];
  return { order, hidden: (saved?.hidden ?? []).filter(isWidget), saved: Boolean(saved) };
}

export interface AttentionItem {
  id: string;
  tone: 'error' | 'warning' | 'info';
  icon: IconName;
  title: string;
  detail: string;
  href: string;
  action: string;
}

type AttentionStrings = Messages['dash'];

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

/** `report` may still be loading: the dashboard's own queries start alongside it. */
export async function getDashboard(ctx: ChoirContext, f: Filters, report: Report | Promise<Report>, s: AttentionStrings, lang: 'en' | 'fr') {
  const supabase = await createClient();
  const org = ctx.org.id;
  const slug = ctx.org.slug;
  const today = todayLocal();
  const sectionId = f.section?.id ?? null;
  const sectionName = (x: { name_en: string; name_fr: string }) => (lang === 'fr' ? x.name_fr : x.name_en);

  const termP = getCurrentTerm(org, today);
  const [choristersRes, eventsRes, term, termAbsences, convRes, checksRes, guardianFormsRes] = await Promise.all([
    supabase
      .from('choristers')
      .select('person_id, section_id, status, voice_parts(key), people!inner(first_name, last_name, preferred_name, date_of_birth), guardian_links(guardian_id)')
      .eq('organization_id', org)
      .in('status', ['active', 'on_leave']),
    ctx.can('calendar')
      ? supabase
          .from('events')
          .select('id, title, type, starts_at, ends_at, call_at, location, address, map_url, dress_code, bring, running_order, section_ids, availability_requested')
          .eq('organization_id', org)
          .is('cancelled_at', null)
          .neq('type', 'deadline')
          .gte('starts_at', isoDaysFromNow(-3 / 24))
          .order('starts_at')
          .limit(12)
      : Promise.resolve({ data: null }),
    termP,
    termP.then((t) => (ctx.can('attendance') && t?.absence_limit ? getTermAbsences(org, t) : null)),
    ctx.can('inbox')
      ? supabase.from('conversations').select('id, member_id, created_at').eq('organization_id', org).eq('status', 'open').is('first_staff_reply_at', null).lt('created_at', isoDaysFromNow(-2))
      : Promise.resolve({ data: null }),
    ctx.can('volunteers') ? supabase.from('chaperone_checks').select('person_id, expires_on, people!inner(first_name, last_name, preferred_name)').eq('organization_id', org) : Promise.resolve({ data: null }),
    ctx.can('forms')
      ? supabase.from('forms').select('id, title, section_ids, form_responses(id, person_id, status, guardian_signatures(used_at, revoked_at))').eq('organization_id', org).eq('status', 'open').eq('guardian_signature_required', true)
      : Promise.resolve({ data: null }),
  ]);

  const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));
  const members = (choristersRes.data ?? []).filter((c) => !sectionId || c.section_id === sectionId);
  const memberIds = new Set(members.map((c) => c.person_id));
  const nameOf = (p: { first_name: string; last_name: string; preferred_name: string | null }) => `${p.preferred_name || p.first_name} ${p.last_name}`;
  const byId = new Map(members.map((c) => [c.person_id, c]));
  const calledFor = (e: { section_ids: string[] }) => members.filter((c) => !e.section_ids.length || (c.section_id && e.section_ids.includes(c.section_id)));
  const events = (eventsRes.data ?? []).filter((e) => !sectionId || !e.section_ids.length || e.section_ids.includes(sectionId));

  // Next full rehearsal (else a sectional, else any event), with reported absences.
  const next = events.find((e) => e.type === 'rehearsal') ?? events.find((e) => e.type === 'sectional') ?? events[0] ?? null;
  const five = events.slice(0, 5);
  const [reportsRes, repliesRes, r] = await Promise.all([
    next ? supabase.from('absence_reports').select('person_id, kind, reason, arrives_at, created_at').eq('event_id', next.id) : Promise.resolve({ data: [] }),
    five.length ? supabase.from('availability_replies').select('event_id, person_id, answer').in('event_id', five.map((e) => e.id)) : Promise.resolve({ data: [] }),
    report,
  ]);
  const reports = (reportsRes.data ?? []).filter((a) => memberIds.has(a.person_id));
  const nextEvent = next
    ? {
        ...next,
        runningOrder: Array.isArray(next.running_order) ? (next.running_order as { time?: string; item?: string; who?: string }[]) : [],
        called: calledFor(next).length,
        absences: reports.map((a) => {
          const c = byId.get(a.person_id)!;
          return { id: a.person_id, name: nameOf(c.people), part: one(c.voice_parts)?.key ?? null, kind: a.kind, reason: a.reason, arrivesAt: a.arrives_at, at: a.created_at };
        }),
      }
    : null;

  // Upcoming: the next five events with availability by section and balance warnings.
  const replies = repliesRes.data ?? [];
  const sections = f.sections.filter((x) => !sectionId || x.id === sectionId);
  const upcoming = five.map((e) => {
    const called = calledFor(e);
    const bySection = sections
      .filter((x) => !e.section_ids.length || e.section_ids.includes(x.id))
      .map((x) => {
        const inS = called.filter((c) => c.section_id === x.id);
        const ids = new Set(inS.map((c) => c.person_id));
        const rs = replies.filter((a) => a.event_id === e.id && ids.has(a.person_id));
        const yes = rs.filter((a) => a.answer === 'yes').length;
        return {
          id: x.id,
          key: x.key,
          name: sectionName(x),
          total: inS.length,
          yes,
          maybe: rs.filter((a) => a.answer === 'maybe').length,
          no: rs.filter((a) => a.answer === 'no').length,
          // A section is thin when fewer than 2, or under 40 %, of its singers have said yes.
          low: e.availability_requested && inS.length > 0 && (yes < 2 || yes < inS.length * 0.4),
        };
      })
      .filter((x) => x.total > 0);
    return { id: e.id, title: e.title, type: e.type, starts_at: e.starts_at, requested: e.availability_requested, bySection };
  });

  // Needs attention
  const items: AttentionItem[] = [];
  const href = (path: string) => `/c/${slug}${path}`;

  if (term?.absence_limit && termAbsences) {
    const counts = termAbsences;
    const lim = term.absence_limit;
    const at = members.filter((c) => (counts.get(c.person_id) ?? 0) >= lim);
    const near = members.filter((c) => (counts.get(c.person_id) ?? 0) === lim - 1 && lim > 1);
    if (at.length === 1 && ctx.can('roster')) {
      const c = at[0]!;
      items.push({ id: 'limit', tone: 'error', icon: 'circle-alert', title: fill(s.attLimitOne, { name: nameOf(c.people) }), detail: fill(s.attLimitOneBody, { n: counts.get(c.person_id) ?? 0, limit: lim, term: term.name }), href: href(`/roster/${c.person_id}`), action: s.viewProfile });
    } else if (at.length) {
      items.push({ id: 'limit', tone: 'error', icon: 'circle-alert', title: fill(s.attLimitMany, { n: at.length }), detail: fill(s.attLimitManyBody, { names: at.slice(0, 4).map((c) => nameOf(c.people)).join(', '), limit: lim, term: term.name }), href: href(`/dashboard/absences?period=term${sectionId ? `&section=${f.section!.key}` : ''}`), action: s.seeList });
    }
    if (near.length) {
      items.push({ id: 'near', tone: 'warning', icon: 'clock', title: fill(s.attNear, { n: near.length }), detail: fill(s.attNearBody, { names: near.slice(0, 4).map((c) => nameOf(c.people)).join(', '), left: 1 }), href: href(`/dashboard/absences?period=term${sectionId ? `&section=${f.section!.key}` : ''}`), action: s.seeList });
    }
  }

  if (ctx.can('fees') && r.finance.overdueCount > 0) {
    items.push({ id: 'fees', tone: 'warning', icon: 'receipt', title: fill(s.feesOverdue, { n: r.finance.overdueCount }), detail: fill(s.feesOverdueBody, { amount: money(r.finance.overdueCents, lang) }), href: href(`/dashboard/owing${sectionId ? `?section=${f.section!.key}` : ''}`), action: s.reviewFees });
  }

  if (ctx.can('forms')) {
    const soon = addDays(today, 7);
    const late = r.forms.rows.filter((x) => x.status === 'open' && x.total > x.done && x.due && x.due <= soon);
    const missing = late.reduce((n, x) => n + x.total - x.done, 0);
    if (missing) {
      const one1 = late.length === 1 ? late[0]! : null;
      items.push({
        id: 'forms',
        tone: late.some((x) => x.due! < today) ? 'warning' : 'info',
        icon: 'clipboard-list',
        title: fill(s.formsMissing, { n: missing }),
        detail: late.map((x) => `${x.title} (${x.total - x.done})`).join(' · '),
        href: one1 ? href(`/forms-fees/forms/${one1.id}`) : href('/forms-fees?tab=forms'),
        action: s.reviewForms,
      });
    }
    let pending = 0;
    let firstForm: string | null = null;
    const minorCut = addDays(today, -Math.round(18 * 365.25));
    for (const form of guardianFormsRes.data ?? []) {
      for (const resp of form.form_responses) {
        const c = byId.get(resp.person_id);
        if (!c || !c.people.date_of_birth || c.people.date_of_birth <= minorCut) continue;
        if (resp.status !== 'submitted' && resp.status !== 'approved') continue;
        if (resp.guardian_signatures.some((g) => g.used_at && !g.revoked_at)) continue;
        pending += 1;
        firstForm ??= form.id;
      }
    }
    if (pending) {
      items.push({ id: 'guardians', tone: 'warning', icon: 'signature', title: fill(s.guardianPending, { n: pending }), detail: s.guardianPendingBody, href: href(`/forms-fees/forms/${firstForm}`), action: s.reviewForms });
    }
  }

  if (ctx.can('inbox')) {
    const waiting = (convRes.data ?? []).filter((c) => !sectionId || memberIds.has(c.member_id));
    if (waiting.length) {
      items.push({ id: 'inbox', tone: 'warning', icon: 'mail', title: fill(s.inboxWaiting, { n: waiting.length }), detail: s.inboxWaitingBody, href: href('/communications?tab=inbox'), action: s.openInbox });
    }
  }

  for (const e of upcoming) {
    if (e.starts_at > dayEnd(addDays(today, 7))) break;
    const thin = e.bySection.filter((x) => x.low);
    if (thin.length) {
      items.push({
        id: `avail-${e.id}`,
        tone: 'warning',
        icon: 'users',
        title: fill(s.lowAvail, { title: e.title }),
        detail: thin.map((x) => fill(s.lowAvailPart, { n: x.yes, section: x.name.toLowerCase() })).join(' · '),
        href: href(`/calendar/${e.id}`),
        action: s.openEvent,
      });
    }
  }

  if (ctx.can('music')) {
    const soon = addDays(today, 7);
    for (const a of r.practice.filter((x) => x.due && x.due >= today && x.due <= soon && x.total > 0 && x.pct < 50)) {
      items.push({ id: `practice-${a.id}`, tone: 'info', icon: 'music', title: fill(s.practiceLow, { title: a.title }), detail: fill(s.practiceLowBody, { done: a.done, total: a.total, pct: a.pct }), href: href(`/music/manage/${a.pieceId}`), action: s.openPiece });
    }
  }

  if (ctx.can('volunteers')) {
    const latest = new Map<string, { name: string; expires: string }>();
    for (const c of checksRes.data ?? []) {
      const prev = latest.get(c.person_id);
      if (!prev || c.expires_on > prev.expires) latest.set(c.person_id, { name: nameOf(c.people), expires: c.expires_on });
    }
    const soon = addDays(today, 30);
    const expiring = [...latest.values()].filter((x) => x.expires <= soon);
    if (expiring.length) {
      items.push({
        id: 'checks',
        tone: expiring.some((x) => x.expires < today) ? 'error' : 'warning',
        icon: 'shield-check',
        title: fill(s.checksExpiring, { n: expiring.length }),
        detail: expiring.slice(0, 4).map((x) => x.name).join(', '),
        href: href('/volunteers'),
        action: s.reviewChecks,
      });
    }
  }

  if (ctx.can('roster')) {
    const minorCut = addDays(today, -Math.round(18 * 365.25));
    const alone = (choristersRes.data ?? []).filter(
      (c) => c.status === 'active' && c.people.date_of_birth && c.people.date_of_birth > minorCut && !c.guardian_links.length && (!sectionId || c.section_id === sectionId),
    );
    if (alone.length) {
      const names = alone.slice(0, 3).map((c) => `${c.people.preferred_name || c.people.first_name} ${c.people.last_name}`);
      items.push({
        id: 'no-guardian',
        tone: 'warning',
        icon: 'user-plus',
        title: fill(s.minorsNoGuardian, { n: alone.length }),
        detail: fill(s.minorsNoGuardianBody, { names: names.join(', ') + (alone.length > 3 ? '…' : '') }),
        href: href(alone.length === 1 ? `/roster/${alone[0]!.person_id}` : '/roster'),
        action: s.addGuardian,
      });
    }
  }

  if (ctx.can('roster') && !sectionId && r.membership.unplaced > 0) {
    items.push({ id: 'unplaced', tone: 'info', icon: 'user-plus', title: fill(s.unplaced, { n: r.membership.unplaced }), detail: s.unplacedBody, href: href('/dashboard/members?section=none'), action: s.placeSingers });
  }

  const rank = { error: 0, warning: 1, info: 2 };
  items.sort((a, b) => rank[a.tone] - rank[b.tone]);

  return { nextEvent, upcoming, attention: items, term, from: dayStart(f.period.from) };
}

function money(cents: number, lang: 'en' | 'fr') {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}
