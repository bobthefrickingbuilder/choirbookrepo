import type { Messages } from '@choirbook/shared/i18n';
import { Button, Card, EmptyState } from '@choirbook/ui';
import { notFound } from 'next/navigation';
import { areaForSegment, hrefFor, type AreaId } from '@/lib/nav';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';

const title = (id: AreaId, t: Messages): string =>
  ({
    home: t.nav.home,
    roster: t.nav.roster,
    calendar: t.nav.calendar,
    attendance: t.nav.attendance,
    music: t.nav.music,
    comms: t.nav.comms,
    messages: t.nav.messages,
    tickets: t.nav.tickets,
    forms: t.nav.formsFees,
    volunteers: t.nav.volunteers,
    users: t.nav.users,
    reports: t.nav.reports,
    settings: t.nav.settings,
    profile: t.nav.profile,
    notifications: t.nav.notifications,
  })[id];

// Each area gets its real screen in Phases 3–5. Until then, a clear placeholder.
export default async function AreaPage({ params }: PageProps<'/c/[choir]/[area]'>) {
  const { choir, area } = await params;
  const id = areaForSegment(area);
  const [ctx, { t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !id) notFound();

  return (
    <div className="page">
      <h1 className="page__title">{title(id, t)}</h1>
      <Card padded={false}>
        <EmptyState
          icon="layout-grid"
          title={t.common.comingSoon}
          actions={
            <Button variant="secondary" iconStart="arrow-left" href={hrefFor(choir, 'home')}>
              {t.common.backHome}
            </Button>
          }
        >
          {t.common.comingSoonBody}
        </EmptyState>
      </Card>
    </div>
  );
}
