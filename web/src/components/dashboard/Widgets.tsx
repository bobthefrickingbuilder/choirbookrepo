import { format, type Lang, type Messages } from '@choirbook/shared/i18n';
import { Badge, Button, Card, EmptyState } from '@choirbook/ui';
import Link from 'next/link';
import type { getDashboard, WidgetId } from '@/lib/data/dashboard';
import type { Report } from '@/lib/data/reports';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { Bars, Columns, LineChart, Meter, Stacked, type Bar } from './Charts';

type Dash = Awaited<ReturnType<typeof getDashboard>>;

export interface WidgetProps {
  r: Report;
  dash: Dash;
  t: Messages;
  lang: Lang;
  slug: string;
  /** Link to a list behind a number, keeping the dashboard's filters. */
  drill: (kind: string, extra?: Record<string, string | undefined>) => string;
  csv: (widget: WidgetId) => string;
}

const VOICE = new Set(['s', 'a', 't', 'b']);
const toneFor = (key: string | null | undefined): Bar['tone'] => {
  const k = (key ?? '').toLowerCase();
  return VOICE.has(k) ? (k as Bar['tone']) : 'accent';
};
const name = (x: { name_en: string; name_fr: string }, lang: Lang) => (lang === 'fr' ? x.name_fr : x.name_en);
const shortDate = (iso: string, lang: Lang) => formatDate(iso.length === 10 ? `${iso}T12:00:00Z` : iso, lang, { month: 'short', day: 'numeric' });

function Frame({ id, title, csv, t, children }: { id: WidgetId; title: string; csv?: string; t: Messages; children: React.ReactNode }) {
  return (
    <section className="dash-widget" data-widget={id} aria-labelledby={`w-${id}`}>
      <Card
        title={<span id={`w-${id}`}>{title}</span>}
        action={
          csv ? (
            <Button size="sm" variant="ghost" iconStart="download" href={csv} className="no-print" aria-label={format(t.dash.widgetCsv, { widget: title })}>
              CSV
            </Button>
          ) : undefined
        }
      >
        {children}
      </Card>
    </section>
  );
}

function Fig({ label, value, href, sub }: { label: string; value: string; href?: string; sub?: string }) {
  const body = (
    <>
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      {sub ? <span className="muted small">{sub}</span> : null}
    </>
  );
  return href ? (
    <Link href={href as never} className="kpi kpi--link">
      {body}
    </Link>
  ) : (
    <div className="kpi">{body}</div>
  );
}

export function AttendanceWidget({ r, t, lang, drill, csv }: WidgetProps) {
  const d = t.dash;
  const a = r.attendance;
  const trend =
    a.trend === null || !r.period.prev
      ? null
      : a.trend > 0
        ? format(d.trendUp, { n: a.trend, label: r.period.prev.label })
        : a.trend < 0
          ? format(d.trendDown, { n: -a.trend, label: r.period.prev.label })
          : format(d.trendSame, { label: r.period.prev.label });
  return (
    <Frame id="attendance" title={d.w_attendance} csv={csv('attendance')} t={t}>
      {a.rate === null ? (
        <p className="muted">{d.noMarks}</p>
      ) : (
        <div className="stack" style={{ gap: 18 }}>
          <div className="kpi-row" style={{ marginBottom: 0 }}>
            <Fig label={d.attendanceRate} value={`${a.rate} %`} sub={trend ?? d.noTrend} href={drill('attendance')} />
            <Fig label={d.absent} value={String(a.split.absent)} href={drill('attendance', { status: 'absent' })} />
            {a.limit ? <Fig label={d.atLimit} value={String(a.atLimit)} sub={`${d.colLimit}: ${a.limit}`} href={drill('absences', { period: 'term' })} /> : null}
          </div>
          <div>
            <h3 className="dash-sub">{d.rateByEvent}</h3>
            <LineChart
              caption={d.rateByEvent}
              tableLabel={d.viewTable}
              head={[d.colEvent, d.attendanceRate]}
              points={a.byEvent.map((e) => ({ label: shortDate(e.date, lang), sub: e.title, value: e.rate, href: drill('attendance', { event: e.id }) }))}
            />
          </div>
          {a.bySection.length > 1 ? (
            <div>
              <h3 className="dash-sub">{d.rateBySection}</h3>
              <Bars caption={d.rateBySection} rows={a.bySection.map((s) => ({ label: name(s, lang), value: s.rate ?? 0, tone: toneFor(s.key), href: drill('attendance', { section: s.key }) }))} />
            </div>
          ) : null}
          <div>
            <h3 className="dash-sub">{d.split}</h3>
            <Stacked
              caption={d.split}
              parts={[
                { label: d.present, value: a.split.present, tone: 'success', href: drill('attendance', { status: 'present' }) },
                { label: d.late, value: a.split.late, tone: 'warning', href: drill('attendance', { status: 'late' }) },
                { label: d.excused, value: a.split.excused, tone: 'info', href: drill('attendance', { status: 'excused' }) },
                { label: d.absent, value: a.split.absent, tone: 'error', href: drill('attendance', { status: 'absent' }) },
              ]}
            />
          </div>
        </div>
      )}
    </Frame>
  );
}

export function UpcomingWidget({ dash, t, lang, slug, drill, csv }: WidgetProps) {
  const d = t.dash;
  return (
    <Frame id="upcoming" title={d.w_upcoming} csv={csv('upcoming')} t={t}>
      {!dash.upcoming.length ? (
        <p className="muted">{d.noUpcoming}</p>
      ) : (
        <>
          <ul className="dash-events">
            {dash.upcoming.map((e) => (
              <li key={e.id}>
                <div className="dash-events__head">
                  <Link href={`/c/${slug}/calendar/${e.id}` as never} className="cb-link">
                    <strong>{e.title}</strong>
                  </Link>
                  <span className="muted small">
                    {formatDate(e.starts_at, lang, { weekday: 'short', month: 'short', day: 'numeric' })} · {formatTime(e.starts_at, lang)}
                  </span>
                </div>
                {e.requested ? (
                  <ul className="avail-chips" aria-label={d.availLegend}>
                    {e.bySection.map((x) => (
                      <li key={x.id}>
                        <Link
                          href={drill('availability', { event: e.id, section: x.key }) as never}
                          className={`avail-chip avail-chip--${toneFor(x.key)}${x.low ? ' avail-chip--low' : ''}`}
                          aria-label={`${x.name}: ${x.yes} / ${x.total}`}
                        >
                          <span>{x.key}</span>
                          <strong>{format(d.yesOf, { yes: x.yes, total: x.total })}</strong>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="muted small">{d.availNotAsked}</span>
                )}
                {e.bySection
                  .filter((x) => x.low)
                  .map((x) => (
                    <Badge key={x.id} tone="warning" icon="triangle-alert">
                      {format(d.lowAvailPart, { n: x.yes, section: x.name.toLowerCase() })}
                    </Badge>
                  ))}
              </li>
            ))}
          </ul>
          <p className="muted small" style={{ marginBottom: 0 }}>
            {d.availLegend}
          </p>
        </>
      )}
    </Frame>
  );
}

export function MembershipWidget({ r, t, lang, drill, csv }: WidgetProps) {
  const d = t.dash;
  const m = r.membership;
  return (
    <Frame id="membership" title={d.w_membership} csv={csv('membership')} t={t}>
      <div className="stack" style={{ gap: 18 }}>
        <div className="kpi-row" style={{ marginBottom: 0 }}>
          <Fig label={d.active} value={String(m.active)} href={drill('members')} />
          <Fig label={d.newMembers} value={String(m.newInPeriod)} href={drill('members', { new: '1' })} />
          <Fig label={d.departed} value={String(m.departedInPeriod)} href={drill('members', { departed: '1' })} />
        </div>
        <div>
          <h3 className="dash-sub">{d.bySection}</h3>
          <Bars
            caption={d.bySection}
            unit=""
            rows={m.bySection.map((s) => ({ label: s.key ? name(s, lang) : lang === 'fr' ? s.name_fr : s.name_en, value: s.count, display: String(s.count), tone: s.key ? toneFor(s.key) : 'muted', href: drill('members', { section: s.key || 'none' }) }))}
          />
        </div>
        {m.byPart.length ? (
          <div>
            <h3 className="dash-sub">{d.byPart}</h3>
            <Bars caption={d.byPart} unit="" rows={m.byPart.map((p) => ({ label: name(p, lang), value: p.count, display: String(p.count), tone: toneFor(p.key[0]), href: drill('members', { part: p.key }) }))} />
          </div>
        ) : null}
        <div>
          <h3 className="dash-sub">{d.pipeline}</h3>
          <Stacked
            caption={d.pipeline}
            parts={[
              { label: d.auditioning, value: m.auditioning, tone: 'info', href: drill('members', { status: 'auditioning' }) },
              { label: d.active, value: m.active - m.onLeave, tone: 'success', href: drill('members', { status: 'active' }) },
              { label: d.onLeave, value: m.onLeave, tone: 'warning', href: drill('members', { status: 'on_leave' }) },
            ]}
          />
        </div>
      </div>
    </Frame>
  );
}

export function FeesWidget({ r, t, lang, drill, csv }: WidgetProps) {
  const d = t.dash;
  const f = r.finance;
  const money = (c: number) => formatMoney(c, lang);
  if (!f.billed) {
    return (
      <Frame id="fees" title={d.w_fees} t={t}>
        <p className="muted">{d.noFees}</p>
      </Frame>
    );
  }
  return (
    <Frame id="fees" title={d.w_fees} csv={csv('fees')} t={t}>
      <div className="stack" style={{ gap: 18 }}>
        <Meter label={d.w_fees} value={f.collected} max={f.billed} display={format(d.collectedOf, { collected: money(f.collected), billed: money(f.billed) })} />
        <div className="kpi-row" style={{ marginBottom: 0 }}>
          <Fig label={d.outstanding} value={money(f.outstanding)} href={drill('owing')} />
          <Fig label={d.waivers} value={money(f.waivers.cents)} sub={String(f.waivers.count)} />
          <Fig label={d.instalmentsMonth} value={money(f.instalmentsThisMonth.cents)} sub={String(f.instalmentsThisMonth.count)} />
        </div>
        <div>
          <h3 className="dash-sub">{d.byAge}</h3>
          <Bars
            caption={d.byAge}
            unit=""
            rows={(
              [
                ['notDue', d.notDue, 'muted'],
                ['d30', d.d30, 'warning'],
                ['d60', d.d60, 'warning'],
                ['d60plus', d.d60plus, 'error'],
              ] as const
            ).map(([k, label, tone]) => ({ label, value: f.aging[k], display: money(f.aging[k]), tone, href: drill('owing', { age: k }) }))}
          />
        </div>
      </div>
    </Frame>
  );
}

export function FormsWidget({ r, t, drill, csv }: WidgetProps) {
  const d = t.dash;
  const rows = r.forms.rows.filter((f) => f.status === 'open');
  return (
    <Frame id="forms" title={d.w_forms} csv={csv('forms')} t={t}>
      {!rows.length ? (
        <p className="muted">{d.noForms}</p>
      ) : (
        <Bars
          caption={d.w_forms}
          rows={rows.map((f) => ({
            label: f.title,
            value: f.pct,
            display: `${f.done}/${f.total}`,
            tone: f.pct >= 90 ? 'success' : f.due && f.pct < 100 ? 'warning' : 'accent',
            href: drill('forms', { form: f.id, status: 'missing' }),
          }))}
        />
      )}
    </Frame>
  );
}

export function MusicWidget({ r, t, lang, drill, csv }: WidgetProps) {
  const d = t.dash;
  const rows = [...r.practice].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999')).slice(0, 6);
  return (
    <Frame id="music" title={d.w_music} csv={csv('music')} t={t}>
      {!rows.length ? (
        <p className="muted">{d.noPractice}</p>
      ) : (
        <ul className="dash-practice">
          {rows.map((a) => (
            <li key={a.id}>
              <div className="dash-events__head">
                <Link href={drill('practice', { assignment: a.id, status: 'missing' }) as never} className="cb-link">
                  <strong>{a.title}</strong>
                </Link>
                <span className="muted small">
                  {a.piece}
                  {a.due ? ` · ${format(d.due, { date: shortDate(a.due, lang) })}` : ''} · {a.done}/{a.total}
                </span>
              </div>
              <Bars
                caption={`${a.title}: ${d.readiness}`}
                rows={a.bySection.map((s) => ({
                  label: name(s, lang),
                  value: s.pct ?? 0,
                  display: `${s.done}/${s.total}`,
                  tone: toneFor(s.key),
                  href: drill('practice', { assignment: a.id, section: s.key, status: 'missing' }),
                }))}
              />
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}

export function CommsWidget({ r, t, slug, csv }: WidgetProps) {
  const d = t.dash;
  const c = r.comms;
  const base = `/c/${slug}/communications`;
  return (
    <Frame id="comms" title={d.w_comms} csv={csv('comms')} t={t}>
      <div className="kpi-row" style={{ marginBottom: 0 }}>
        <Fig label={d.readRate} value={c.readRate === null ? '—' : `${c.readRate} %`} sub={String(c.announcements)} href={base} />
        <Fig label={d.conversations} value={String(c.conversations)} href={`${base}?tab=inbox`} />
        <Fig label={d.unanswered} value={String(c.unanswered)} href={`${base}?tab=inbox`} />
        <Fig label={d.medianReply} value={c.medianReplyHours === null ? '—' : format(d.hours, { n: c.medianReplyHours })} />
      </div>
    </Frame>
  );
}

export function TicketsWidget({ r, t, lang, drill, csv }: WidgetProps) {
  const d = t.dash;
  const rows = r.tickets.filter((x) => x.orders > 0 || x.capacity);
  if (!rows.length && !r.ticketSales.byDay.length) {
    return (
      <Frame id="tickets" title={d.w_tickets} t={t}>
        <p className="muted">{d.noSales}</p>
      </Frame>
    );
  }
  return (
    <Frame id="tickets" title={d.w_tickets} csv={csv('tickets')} t={t}>
      <div className="stack" style={{ gap: 18 }}>
        <Bars
          caption={d.w_tickets}
          unit=""
          rows={rows.map((x) => ({
            label: x.title,
            value: x.tickets,
            max: x.capacity ?? undefined,
            display: x.capacity ? format(d.soldOf, { sold: x.tickets, capacity: x.capacity }) : format(d.sold, { n: x.tickets }),
            tone: 'accent',
            href: drill('tickets', { event: x.id }),
          }))}
        />
        {r.ticketSales.byDay.length ? (
          <div>
            <h3 className="dash-sub">{d.salesByDay}</h3>
            <Columns caption={d.salesByDay} tableLabel={d.viewTable} head={[d.colDate, d.colTickets]} points={r.ticketSales.byDay.map((x) => ({ label: shortDate(x.date, lang), value: x.tickets }))} />
          </div>
        ) : null}
        {r.ticketSales.topSellers.length ? (
          <div>
            <h3 className="dash-sub">{d.topSellers}</h3>
            <ol className="dash-sellers">
              {r.ticketSales.topSellers.map((x) => (
                <li key={x.id}>
                  <span>{x.name}</span>
                  <strong>{x.tickets}</strong>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </Frame>
  );
}

export function VolunteersWidget({ r, t, lang, drill, csv }: WidgetProps) {
  const d = t.dash;
  const rows = r.volunteers.byEvent;
  return (
    <Frame id="volunteers" title={d.w_volunteers} csv={csv('volunteers')} t={t}>
      {!rows.length ? (
        <p className="muted">{d.noShifts}</p>
      ) : (
        <Bars
          caption={d.w_volunteers}
          unit=""
          rows={rows.map((x) => ({
            label: `${x.title} · ${shortDate(x.date, lang)}`,
            value: x.filled,
            max: x.needed,
            display: format(d.filled, { filled: x.filled, needed: x.needed }),
            tone: x.filled >= x.needed ? 'success' : 'warning',
            href: x.id ? drill('volunteers', { event: x.id }) : drill('volunteers'),
          }))}
        />
      )}
    </Frame>
  );
}

export const WIDGET_VIEWS: Record<WidgetId, (p: WidgetProps) => React.ReactNode> = {
  attendance: AttendanceWidget,
  upcoming: UpcomingWidget,
  membership: MembershipWidget,
  fees: FeesWidget,
  forms: FormsWidget,
  music: MusicWidget,
  comms: CommsWidget,
  tickets: TicketsWidget,
  volunteers: VolunteersWidget,
};

export function NoWidgets({ t }: { t: Messages }) {
  return (
    <Card padded={false}>
      <EmptyState icon="layout-grid" title={t.dash.customizeTitle}>
        {t.dash.customizeHelp}
      </EmptyState>
    </Card>
  );
}
