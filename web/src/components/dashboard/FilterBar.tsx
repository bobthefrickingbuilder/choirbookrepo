import type { Lang, Messages } from '@choirbook/shared/i18n';
import type { Filters } from '@/lib/data/filters';
import { getPeriodOptions } from '@/lib/data/reports';
import { getMemberships, type ChoirContext } from '@/lib/session';
import { DashboardFilters } from './DashboardClient';

/** The period, dates and section picker shared by the dashboard and Reports. */
export async function FilterBar({ ctx, f, t, lang, choirSwitch = false }: { ctx: ChoirContext; f: Filters; t: Messages; lang: Lang; choirSwitch?: boolean }) {
  const d = t.dash;
  const [options, memberships] = await Promise.all([getPeriodOptions(ctx.org.id), choirSwitch ? getMemberships() : Promise.resolve([])]);
  const periods = [
    { value: 'term', label: d.thisTerm },
    { value: 'season', label: d.thisSeason },
    { value: 'month', label: d.thisMonth },
    { value: 'last30', label: d.last30 },
    ...options.map((o) => ({ value: o.value, label: o.value.startsWith('term:') ? `${o.label} (${o.group})` : o.label })),
    { value: 'custom', label: d.custom },
  ];
  return (
    <DashboardFilters
      s={{ filters: d.filters, choir: d.choir, period: d.period, from: d.from, to: d.to, apply: d.apply, section: d.section, allSections: d.allSections, sectionOnly: d.sectionOnly }}
      period={f.period.key}
      from={f.period.from}
      to={f.period.to}
      section={f.section?.key ?? ''}
      periods={periods}
      sections={f.sections.filter((s) => !f.allowedSections || f.allowedSections.includes(s.id)).map((s) => ({ value: s.key, label: lang === 'fr' ? s.name_fr : s.name_en }))}
      locked={Boolean(f.allowedSections)}
      choirs={memberships.map((m) => ({ slug: m.org.slug, name: m.org.name }))}
      choirSlug={ctx.org.slug}
    />
  );
}
