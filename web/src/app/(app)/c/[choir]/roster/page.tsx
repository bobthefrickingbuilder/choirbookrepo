import { format } from '@choirbook/shared/i18n';
import { Button } from '@choirbook/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChoristerForm } from '@/components/staff/ChoristerForm';
import { Forbidden } from '@/components/staff/Forbidden';
import { RosterTable } from '@/components/staff/RosterTable';
import { getRoster } from '@/lib/data/roster';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';

export const metadata: Metadata = { title: 'Roster' };

export default async function RosterPage({ params, searchParams }: PageProps<'/c/[choir]/roster'>) {
  const { choir } = await params;
  const { departed } = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  if (!ctx.can('roster')) return <Forbidden t={t} homeHref={`/c/${choir}`} />;

  const showDeparted = departed === '1';
  const { rows, sections, term } = await getRoster(ctx, { includeDeparted: showDeparted });
  const s = staffStrings(t);
  const active = rows.filter((r) => r.status === 'active').length;
  const unplaced = rows.filter((r) => !r.sectionKey && r.status !== 'departed').length;
  const canEdit = ctx.can('roster', 'edit');

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          {term ? <p className="overline overline--accent">{term.name}</p> : null}
          <h1 className="page__title">{t.staff.rosterTitle}</h1>
          <p className="page__lede">{format(t.staff.rosterSub, { active, unplaced })}</p>
        </div>
        <div className="page__actions">
          <Button variant="ghost" size="sm" iconStart={showDeparted ? 'eye-off' : 'eye'} href={`/c/${choir}/roster${showDeparted ? '' : '?departed=1'}`}>
            {t.staff.showArchived}
          </Button>
          <Button variant="secondary" iconStart="download" href={`/c/${choir}/roster/export`}>
            {t.staff.exportCsv}
          </Button>
          {canEdit ? (
            <>
              <Button variant="secondary" iconStart="upload" href={`/c/${choir}/roster/import`}>
                {t.staff.importCsv}
              </Button>
              <ChoristerForm slug={choir} lang={lang} sections={sections} s={s} trigger={{ label: t.staff.addChorister, icon: 'user-plus' }} />
            </>
          ) : null}
        </div>
      </div>
      <RosterTable
        slug={choir}
        lang={lang}
        rows={rows}
        limit={term?.absence_limit ?? null}
        can={{
          edit: canEdit,
          remind: ctx.can('forms', 'edit') || ctx.can('fees', 'edit') || ctx.can('announcements', 'edit') || canEdit,
          message: ctx.can('announcements', 'edit'),
          attendance: ctx.can('attendance'),
          forms: ctx.can('forms'),
          fees: ctx.can('fees'),
        }}
        s={s}
      />
    </div>
  );
}
