import type { Messages } from '@choirbook/shared/i18n';
import type { NavSection } from '@choirbook/ui';
import type { ChoirContext } from './session';

/** Every area of the app, with its URL segment under /c/[choir]. '' is the home page. */
export const AREAS = {
  home: '',
  roster: 'roster',
  calendar: 'calendar',
  attendance: 'attendance',
  music: 'music',
  comms: 'communications',
  messages: 'messages',
  tickets: 'tickets',
  forms: 'forms-fees',
  volunteers: 'volunteers',
  users: 'users',
  reports: 'reports',
  settings: 'settings',
  profile: 'profile',
  notifications: 'notifications',
  announcements: 'announcements',
  absences: 'absences',
  volunteering: 'volunteering',
  audit: 'audit',
} as const;
export type AreaId = keyof typeof AREAS;

export const areaForSegment = (segment: string): AreaId | undefined =>
  (Object.keys(AREAS) as AreaId[]).find((id) => AREAS[id] === segment);

export const hrefFor = (slug: string, id: AreaId) => (AREAS[id] ? `/c/${slug}/${AREAS[id]}` : `/c/${slug}`);

/** Navigation for a member, shaped by what their roles allow. */
export function buildNav(ctx: ChoirContext, t: Messages): { sections: NavSection[]; bottom: NavSection['items'] } {
  const slug = ctx.org.slug;
  const item = (id: AreaId, label: string, icon: NavSection['items'][number]['icon']) => ({ id, label, icon, href: hrefFor(slug, id) });

  const member = [
    item('home', t.nav.home, 'house'),
    item('music', t.nav.music, 'music'),
    item('calendar', t.nav.calendar, 'calendar'),
    item('messages', t.nav.messages, 'message-square'),
    item('profile', t.nav.profile, 'user-round'),
  ];

  if (!ctx.isStaff) {
    // Phones show the five essentials in the bottom bar; larger screens list everything.
    const sidebar = [
      item('home', t.nav.home, 'house'),
      item('music', t.nav.music, 'music'),
      item('calendar', t.nav.calendar, 'calendar'),
      item('messages', t.nav.messages, 'message-square'),
      item('announcements', t.nav.announcements, 'megaphone'),
      item('absences', t.nav.attendance, 'clipboard-check'),
      item('forms', t.nav.formsFees, 'clipboard-list'),
      item('tickets', t.nav.tickets, 'ticket'),
      item('volunteering', t.nav.volunteers, 'user-check'),
      item('profile', t.nav.profile, 'user-round'),
    ];
    return { sections: [{ items: sidebar }], bottom: member };
  }

  const choir = [
    ctx.can('roster') && item('roster', t.nav.roster, 'users'),
    item('calendar', t.nav.calendar, 'calendar'),
    ctx.can('attendance') && item('attendance', t.nav.attendance, 'clipboard-check'),
    item('music', t.nav.music, 'music'),
  ];
  const office = [
    (ctx.can('announcements') || ctx.can('inbox')) && item('comms', t.nav.comms, 'megaphone'),
    ctx.can('tickets') && item('tickets', t.nav.tickets, 'ticket'),
    (ctx.can('forms') || ctx.can('fees')) && item('forms', t.nav.formsFees, 'clipboard-list'),
    ctx.can('volunteers') && item('volunteers', t.nav.volunteers, 'user-check'),
  ];
  const admin = [
    ctx.can('users') && item('users', t.nav.users, 'shield-check'),
    ctx.can('reports') && item('reports', t.nav.reports, 'gauge'),
    ctx.can('settings') && item('settings', t.nav.settings, 'settings'),
    ctx.can('audit') && item('audit', t.staff.auditTitle, 'history'),
  ];
  const keep = <T,>(xs: (T | false)[]) => xs.filter((x): x is T => Boolean(x));

  const sections: NavSection[] = [
    { items: [item('home', t.nav.dashboard, 'house')] },
    { label: t.nav.secChoir, items: keep(choir) },
    { label: t.nav.secOffice, items: keep(office) },
    { label: t.nav.secAdmin, items: keep(admin) },
  ].filter((s) => s.items.length > 0);

  return { sections, bottom: member };
}
