import { format, type Lang, type Messages } from '@choirbook/shared/i18n';
import { AttendanceBadge, Avatar, Badge, Button, Card, Icon, NextRehearsalCard, StatCard, VoicePartBadge } from '@choirbook/ui';
import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';
import { getDashboard, getLayout, type WidgetId } from '@/lib/data/dashboard';
import { filterQuery, type Filters } from '@/lib/data/filters';
import { getReport } from '@/lib/data/reports';
import { daysBetween, formatDate, formatTime, localParts, todayLocal } from '@/lib/format';
import { getUser, type ChoirContext } from '@/lib/session';
import { CustomizeDashboard } from './DashboardClient';
import { FilterBar } from './FilterBar';
import { NoWidgets, WIDGET_VIEWS } from './Widgets';

function startsIn(iso: string, t: Messages): string | undefined {
  const mins = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (mins <= 0) return undefined;
  if (mins <= 12 * 60) return format(t.dash.startsIn, { h: Math.floor(mins / 60), m: mins % 60 });
  const days = daysBetween(todayLocal(), localParts(iso).date);
  return days > 1 ? format(t.dash.startsInDays, { n: days }) : undefined;
}

function whenLabel(iso: string, t: Messages, lang: Lang) {
  const { date, time } = localParts(iso);
  const diff = daysBetween(todayLocal(), date);
  if (diff === 0) return time >= '17:00' ? t.member.tonight : t.member.today;
  if (diff === 1) return t.member.tomorrow;
  return formatDate(iso, lang, diff < 7 ? { weekday: 'long' } : { weekday: 'long', month: 'long', day: 'numeric' });
}

export async function StaffDashboard({ ctx, t, lang, filters: f }: { ctx: ChoirContext; t: Messages; lang: Lang; filters: Filters }) {
  const d = t.dash;
  const slug = ctx.org.slug;
  const user = await getUser();
  const sectionId = f.section?.id ?? null;
  const reportP = getReport(ctx, f.period, sectionId);
  const [r, layout, dash] = await Promise.all([reportP, getLayout(ctx, user!.id), getDashboard(ctx, f, reportP, d, lang)]);

  const q = (extra: Record<string, string | undefined> = {}) => filterQuery(f, extra);
  const drill = (kind: string, extra: Record<string, string | undefined> = {}) => {
    // A link's own filters (a bar for the altos, "this term") win over the dashboard's.
    const params = new URLSearchParams(filterQuery(f));
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
    if (extra.period && extra.period !== 'custom') {
      params.delete('from');
      params.delete('to');
    }
    return `/c/${slug}/dashboard/${kind}?${params.toString()}`;
  };
  const csv = (widget: WidgetId) => `/c/${slug}/dashboard/export?${q({ widget })}`;

  const today = todayLocal();
  const term = dash.term;
  const week = term && term.starts_on <= today && term.ends_on >= today ? Math.floor(daysBetween(term.starts_on, today) / 7) + 1 : null;
  const overline = [formatDate(`${today}T12:00:00Z`, lang, { weekday: 'long', month: 'long', day: 'numeric' }), week ? format(d.weekOf, { n: week, term: term!.name }) : null].filter(Boolean).join(' · ');
  const next = dash.nextEvent;
  const isRehearsal = next && (next.type === 'rehearsal' || next.type === 'sectional');
  const expected = next ? next.called - next.absences.filter((a) => a.kind === 'absent').length : 0;

  const sectionLabel = f.section ? (lang === 'fr' ? f.section.name_fr : f.section.name_en) : d.allSections;
  const widgetNames = Object.fromEntries(layout.order.map((w) => [w, d[`w_${w}`]])) as Record<string, string>;
  const shown = layout.order.filter((w) => !layout.hidden.includes(w));
  const props = { r, dash, t, lang, slug, drill, csv };
  const att = r.attendance;

  return (
    <div className="page page--wide dash" data-print-report="">
      <header className="dash-head">
        <div className="dash-head__text">
          <p className="overline">{overline}</p>
          <h1 className="page__title">{d.title}</h1>
          <p className="page__lede" style={{ margin: 0 }}>
            {next ? format(d.nextLine, { title: next.title, when: `${whenLabel(next.starts_at, t, lang)} ${formatTime(next.starts_at, lang)}` }) : d.nothingNext}
          </p>
        </div>
        <div className="page__actions">
          {ctx.can('announcements', 'edit') ? (
            <Button variant="secondary" iconStart="megaphone" href={`/c/${slug}/communications/new`}>
              {d.sendAnnouncement}
            </Button>
          ) : null}
          {ctx.can('calendar', 'edit') ? (
            <Button variant="secondary" iconStart="plus" href={`/c/${slug}/calendar/new`}>
              {d.addEvent}
            </Button>
          ) : null}
          {ctx.can('reports') ? (
            <Button variant="secondary" iconStart="file-text" href={`/c/${slug}/reports/board?${q()}`}>
              {d.boardReport}
            </Button>
          ) : null}
          <CustomizeDashboard
            slug={slug}
            widgets={widgetNames}
            order={layout.order}
            hidden={layout.hidden}
            s={{ customize: d.customize, customizeTitle: d.customizeTitle, customizeHelp: d.customizeHelp, show: d.show, moveUp: d.moveUp, moveDown: d.moveDown, reset: d.reset, save: d.save, cancel: d.cancel, close: d.close, failed: t.staff.failed }}
          />
          <PrintButton label={d.savePdf} />
        </div>
      </header>

      <FilterBar ctx={ctx} f={f} t={t} lang={lang} choirSwitch />
      <p className="print-only">{format(d.showing, { period: f.period.label, section: sectionLabel })}</p>

      <section aria-label={d.summary} className="dash-summary">
        {ctx.can('roster') ? (
          <div className="dash-summary__stat">
            <Link href={drill('members') as never} className="dash-card-link">
              <StatCard icon="users" label={d.choristers} value={r.membership.active} delta={r.membership.newInPeriod ? format(d.newDelta, { n: r.membership.newInPeriod }) : undefined} trend="up" good context={d.newCtx} />
            </Link>
          </div>
        ) : null}
        {ctx.can('roster') && r.membership.bySection.length ? (
          <div className="dash-sections">
            <span className="dash-sections__head">
              <Icon name="mic-vocal" size={18} />
              {d.bySection}
            </span>
            <div className="dash-sections__grid">
              {r.membership.bySection.map((s) => (
                <Link key={s.key || 'none'} href={drill('members', { section: s.key || 'none' }) as never} className="dash-sections__item">
                  {s.key ? <VoicePartBadge part={s.key} size="lg" lang={lang} /> : <Icon name="user-plus" size={22} />}
                  <span>
                    <strong>{s.count}</strong>
                    <span className="muted small">{lang === 'fr' ? s.name_fr : s.name_en}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div role="img" aria-label={r.membership.bySection.map((s) => `${lang === 'fr' ? s.name_fr : s.name_en} ${s.count}`).join(', ')} className="dash-sections__bar">
              {r.membership.bySection.map((s) => (
                <span key={s.key || 'none'} style={{ flexGrow: s.count, background: s.key ? `var(--voice-${s.key.toLowerCase()})` : 'var(--border-strong)' }} />
              ))}
            </div>
          </div>
        ) : null}
        {ctx.can('attendance') ? (
          <div className="dash-summary__stat">
            <Link href={drill('attendance') as never} className="dash-card-link">
              <StatCard
                icon="user-check"
                label={d.attendanceRate}
                value={att.rate ?? '—'}
                unit={att.rate === null ? undefined : '%'}
                progress={att.rate === null ? null : att.rate / 100}
                delta={att.trend === null ? undefined : `${att.trend > 0 ? '+' : ''}${att.trend} pts`}
                trend={att.trend === null ? undefined : att.trend > 0 ? 'up' : att.trend < 0 ? 'down' : 'flat'}
                good={att.trend === null ? undefined : att.trend >= 0}
                context={att.rate === null ? d.noMarks : r.period.prev ? format(d.vsPrev, { label: r.period.prev.label }) : d.noTrend}
              />
            </Link>
          </div>
        ) : null}
      </section>

      <div className="dash-main">
        <div className="dash-main__left">
          {next ? (
            <NextRehearsalCard
              overline={isRehearsal ? d.nextRehearsal : d.nextEvent}
              when={whenLabel(next.starts_at, t, lang)}
              date={localParts(next.starts_at).date}
              start={localParts(next.starts_at).time}
              end={next.ends_at ? localParts(next.ends_at).time : undefined}
              callTime={next.call_at ? localParts(next.call_at).time : undefined}
              location={[next.title, next.location].filter(Boolean).join(' · ')}
              address={next.address ?? undefined}
              mapHref={next.map_url ?? undefined}
              bring={next.bring ?? undefined}
              countdown={startsIn(next.starts_at, t)}
              status={
                <Badge tone="neutral" icon="users" size="md">
                  {format(d.expected, { n: expected })}
                </Badge>
              }
              actions={
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ctx.can('attendance', 'edit') ? (
                    <Button size="sm" iconStart="clipboard-check" href={`/c/${slug}/attendance/${next.id}`}>
                      {t.nav.attendance}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" iconStart={ctx.can('calendar', 'edit') ? 'pencil' : 'calendar'} href={ctx.can('calendar', 'edit') ? `/c/${slug}/calendar/${next.id}/edit` : `/c/${slug}/calendar/${next.id}`}>
                    {ctx.can('calendar', 'edit') ? d.editEvent : t.dash.openEvent}
                  </Button>
                </div>
              }
              locale={lang === 'fr' ? 'fr-CA' : 'en-CA'}
            />
          ) : null}
          {next ? (
            <div className="dash-pair">
              <Card title={d.runningOrder} padded={false}>
                {next.dress_code ? (
                  <div className="dash-dress">
                    <Icon name="star" size={18} />
                    <div>
                      <div className="muted small">{d.dress}</div>
                      <div>{next.dress_code}</div>
                    </div>
                  </div>
                ) : null}
                {next.runningOrder.length ? (
                  <ol className="running-order">
                    {next.runningOrder.map((x, i) => (
                      <li key={i}>
                        <span className="running-order__time">{x.time}</span>
                        <span>
                          <span>{x.item}</span>
                          {x.who ? <span className="muted small"> {x.who}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted" style={{ padding: '12px 20px' }}>
                    {d.noRunningOrder}
                  </p>
                )}
              </Card>
              <Card
                title={d.reported}
                action={next.absences.length ? <Badge tone="neutral">{next.absences.length}</Badge> : undefined}
                padded={false}
              >
                {next.absences.length ? (
                  <ul className="dash-absences">
                    {next.absences.map((a) => (
                      <li key={a.id}>
                        <Avatar name={a.name} size={32} />
                        <div>
                          <span className="dash-absences__name">
                            {ctx.can('roster') ? (
                              <Link href={`/c/${slug}/roster/${a.id}` as never} className="cb-link">
                                {a.name}
                              </Link>
                            ) : (
                              a.name
                            )}
                            {a.part ? <VoicePartBadge part={a.part} lang={lang} /> : null}
                          </span>
                          <span>{a.reason}</span>
                          {a.kind === 'late' && a.arrivesAt ? <span className="muted small">{format(d.arrives, { time: a.arrivesAt.slice(0, 5) })}</span> : null}
                        </div>
                        <AttendanceBadge status={a.kind === 'late' ? 'late' : 'excused'} lang={lang} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted" style={{ padding: '12px 20px' }}>
                    {d.noneReported}
                  </p>
                )}
              </Card>
            </div>
          ) : null}
        </div>

        <aside className="dash-main__right" aria-labelledby="needs-attention">
          <Card
            title={<span id="needs-attention">{d.attention}</span>}
            action={dash.attention.length ? <Badge tone={dash.attention.some((a) => a.tone === 'error') ? 'error' : 'warning'}>{dash.attention.length}</Badge> : undefined}
            padded={false}
          >
            {dash.attention.length ? (
              <ul className="attention">
                {dash.attention.map((a) => (
                  <li key={a.id} className={`attention__item attention__item--${a.tone}`}>
                    <span className="attention__icon" aria-hidden="true">
                      <Icon name={a.icon} size={18} strokeWidth={2} />
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      <span>{a.detail}</span>
                      <Button size="sm" variant="secondary" iconStart="arrow-right" href={a.href} className="no-print">
                        {a.action}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="attention__clear">
                <Icon name="circle-check" size={28} />
                <strong>{d.allClear}</strong>
                <span className="muted">{d.allClearBody}</span>
              </div>
            )}
          </Card>
        </aside>
      </div>

      {shown.length ? (
        <div className="dash-grid">
          {shown.map((w) => {
            const View = WIDGET_VIEWS[w];
            return <View key={w} {...props} />;
          })}
        </div>
      ) : (
        <NoWidgets t={t} />
      )}
    </div>
  );
}
