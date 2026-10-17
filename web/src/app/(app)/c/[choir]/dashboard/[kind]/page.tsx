import { format } from '@choirbook/shared/i18n';
import { Button, Card, EmptyState } from '@choirbook/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/PrintButton';
import { Forbidden } from '@/components/staff/Forbidden';
import { DRILL_AREA, DRILLS, getDrill, type CellType, type DrillKind } from '@/lib/data/drill';
import { filterQuery, readFilters } from '@/lib/data/filters';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';

export const metadata: Metadata = { title: 'Dashboard' };

// The list behind a dashboard number: who was absent, who still owes, who has
// not handed in a form… Filters arrive in the URL from the chart that was clicked.
export default async function DrillPage({ params, searchParams }: PageProps<'/c/[choir]/dashboard/[kind]'>) {
  const { choir, kind } = await params;
  const search = await searchParams;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx || !(DRILLS as readonly string[]).includes(kind)) notFound();
  const k = kind as DrillKind;
  if (!ctx.can('dashboard') || !ctx.can(DRILL_AREA[k])) return <Forbidden t={t} homeHref={`/c/${choir}`} />;
  const f = await readFilters(ctx, search, lang);
  const drill = await getDrill(ctx, k, f, search, t, lang);
  const d = t.dash;

  const back = `/c/${choir}?${filterQuery(f)}`;
  const csvParams = new URLSearchParams();
  for (const [key, v] of Object.entries(search)) if (typeof v === 'string') csvParams.set(key, v);
  const show = (v: string | number | null, type: CellType = 'text') => {
    if (v === null || v === '') return '—';
    if (type === 'money') return formatMoney(Number(v), lang);
    if (type === 'date') return formatDate(`${v}T12:00:00Z`, lang, { month: 'short', day: 'numeric', year: 'numeric' });
    if (type === 'datetime') return `${formatDate(String(v), lang, { month: 'short', day: 'numeric', year: 'numeric' })} · ${formatTime(String(v), lang)}`;
    return String(v);
  };

  return (
    <div className="page page--wide" data-print-report="">
      <Link href={back as never} className="back-link">
        ← {d.backToDashboard}
      </Link>
      <div className="page__head">
        <div>
          <p className="overline overline--accent">{k === 'absences' || k === 'forms' || k === 'practice' || k === 'availability' || k === 'tickets' ? null : f.period.label}</p>
          <h1 className="page__title">{drill.title}</h1>
          {drill.subtitle ? <p className="page__lede">{drill.subtitle}</p> : null}
        </div>
        <div className="page__actions">
          {drill.rows.length ? (
            <Button variant="secondary" iconStart="download" href={`/c/${choir}/dashboard/${k}/csv?${csvParams.toString()}`}>
              {d.downloadCsv}
            </Button>
          ) : null}
          <PrintButton label={d.savePdf} />
        </div>
      </div>
      <Card padded={false}>
        {drill.rows.length ? (
          <div className="table-scroll">
            <table className="simple-table">
              <caption className="cb-sr-only">{[drill.title, drill.subtitle].filter(Boolean).join(' · ')}</caption>
              <thead>
                <tr>
                  {drill.columns.map((c) => (
                    <th key={c.key} scope="col" className={c.type === 'number' || c.type === 'money' ? 'num' : undefined}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drill.rows.map((row, i) => (
                  <tr key={i}>
                    {drill.columns.map((c, j) => {
                      const v = show(row.cells[c.key] ?? null, c.type);
                      const cell = j === 0 && row.href ? (
                        <Link href={row.href as never} className="cb-link">
                          {v}
                        </Link>
                      ) : (
                        v
                      );
                      return j === 0 ? (
                        <th key={c.key} scope="row">
                          {cell}
                        </th>
                      ) : (
                        <td key={c.key} className={c.type === 'number' || c.type === 'money' ? 'num' : undefined}>
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="list" title={d.noRows} />
        )}
      </Card>
      {drill.rows.length ? <p className="muted small">{format(d.rowsCount, { n: drill.rows.length })}</p> : null}
    </div>
  );
}
