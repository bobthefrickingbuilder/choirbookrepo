import Link from 'next/link';

// Small, dependency-free charts for the dashboard. They draw with the design
// tokens, so they follow the light and dark themes, and every chart comes with
// the same figures as a table (one tap away, and always there for screen readers).

export interface Point {
  label: string;
  sub?: string;
  value: number | null;
  href?: string;
}

function DataTable({ caption, head, rows, hidden }: { caption: string; head: [string, string]; rows: [string, string][]; hidden?: boolean }) {
  return (
    <table className={hidden ? 'cb-sr-only' : 'chart-table'}>
      <caption className={hidden ? undefined : 'cb-sr-only'}>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{head[0]}</th>
          <th scope="col">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b], i) => (
          <tr key={i}>
            <th scope="row">{a}</th>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A table toggle under a chart: visible on demand, always readable by screen readers. */
export function TableToggle({ label, caption, head, rows }: { label: string; caption: string; head: [string, string]; rows: [string, string][] }) {
  return (
    <details className="chart-details">
      <summary>{label}</summary>
      <DataTable caption={caption} head={head} rows={rows} />
    </details>
  );
}

/** A line over time (0–100 %), each point a link to the list behind it. */
export function LineChart({ caption, points, unit = '%', tableLabel, head }: { caption: string; points: Point[]; unit?: string; tableLabel: string; head: [string, string] }) {
  const W = 600;
  const H = 170;
  const pad = { l: 34, r: 12, t: 12, b: 22 };
  const xs = points.length > 1 ? (W - pad.l - pad.r) / (points.length - 1) : 0;
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const x = (i: number) => pad.l + (points.length > 1 ? i * xs : (W - pad.l - pad.r) / 2);
  const drawn = points.map((p, i) => ({ ...p, i })).filter((p) => p.value !== null) as (Point & { i: number; value: number })[];
  const path = drawn.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  return (
    <figure className="chart" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart__svg" role="img" aria-label={caption}>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="chart__grid" />
            <text x={pad.l - 6} y={y(g) + 4} className="chart__axis" textAnchor="end">
              {g}
            </text>
          </g>
        ))}
        {drawn.length > 1 ? <path d={`${path} L${x(drawn.at(-1)!.i)},${y(0)} L${x(drawn[0]!.i)},${y(0)} Z`} className="chart__area" /> : null}
        {drawn.length > 1 ? <path d={path} className="chart__line" /> : null}
        {drawn.map((p) => {
          const dot = (
            <>
              <circle cx={x(p.i)} cy={y(p.value)} r={11} className="chart__hit" />
              <circle cx={x(p.i)} cy={y(p.value)} r={4.5} className="chart__dot" />
              <title>{`${p.label}${p.sub ? ` · ${p.sub}` : ''}: ${p.value}${unit}`}</title>
            </>
          );
          return p.href ? (
            <a key={p.i} href={p.href} aria-label={`${p.label}${p.sub ? `, ${p.sub}` : ''}: ${p.value}${unit}`}>
              {dot}
            </a>
          ) : (
            <g key={p.i}>{dot}</g>
          );
        })}
        {points.length ? (
          <>
            <text x={x(0)} y={H - 4} className="chart__axis" textAnchor="start">
              {points[0]!.label}
            </text>
            {points.length > 1 ? (
              <text x={x(points.length - 1)} y={H - 4} className="chart__axis" textAnchor="end">
                {points.at(-1)!.label}
              </text>
            ) : null}
          </>
        ) : null}
      </svg>
      <TableToggle label={tableLabel} caption={caption} head={head} rows={points.map((p) => [`${p.label}${p.sub ? ` · ${p.sub}` : ''}`, p.value === null ? '—' : `${p.value}${unit}`])} />
    </figure>
  );
}

export interface Bar {
  label: string;
  value: number;
  display?: string;
  href?: string;
  tone?: 'accent' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 's' | 'a' | 't' | 'b';
  max?: number;
}

/** Horizontal bars; a bar with a link opens the list behind it. */
export function Bars({ caption, rows, unit = '%' }: { caption: string; rows: Bar[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.max ?? r.value));
  return (
    <figure className="bars" style={{ margin: 0 }}>
      <figcaption className="cb-sr-only">{caption}</figcaption>
      <ul className="bars__list">
        {rows.map((r) => {
          const scale = r.max ?? (unit === '%' ? 100 : max);
          const body = (
            <>
              <span className="bars__label">{r.label}</span>
              <span className="bars__track" aria-hidden="true">
                <span className={`bars__fill bars__fill--${r.tone ?? 'accent'}`} style={{ width: `${Math.min(100, (r.value / Math.max(1, scale)) * 100)}%` }} />
              </span>
              <span className="bars__value">{r.display ?? `${r.value}${unit}`}</span>
            </>
          );
          return (
            <li key={r.label}>
              {r.href ? (
                <Link href={r.href as never} className="bars__row bars__row--link">
                  {body}
                </Link>
              ) : (
                <div className="bars__row">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/** One bar split into parts (for example present, late, excused, absent). */
export function Stacked({ caption, parts }: { caption: string; parts: { label: string; value: number; tone: Bar['tone']; href?: string }[] }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <figure className="stacked" style={{ margin: 0 }}>
      <div className="stacked__bar" role="img" aria-label={`${caption}: ${parts.map((p) => `${p.label} ${p.value}`).join(', ')}`}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span key={p.label} className={`stacked__part bars__fill--${p.tone}`} style={{ flexGrow: p.value }} />
          ))}
      </div>
      <ul className="stacked__legend">
        {parts.map((p) => {
          const body = (
            <>
              <span className={`stacked__key bars__fill--${p.tone}`} aria-hidden="true" />
              <span>{p.label}</span>
              <strong>{p.value}</strong>
              <span className="muted">{pct(p.value)} %</span>
            </>
          );
          return <li key={p.label}>{p.href ? <Link href={p.href as never}>{body}</Link> : body}</li>;
        })}
      </ul>
    </figure>
  );
}

/** Thin columns over time (for example tickets sold per day). */
export function Columns({ caption, points, tableLabel, head }: { caption: string; points: { label: string; value: number }[]; tableLabel: string; head: [string, string] }) {
  const W = 600;
  const H = 110;
  const max = Math.max(1, ...points.map((p) => p.value));
  const w = points.length ? (W - 8) / points.length : 0;
  return (
    <figure className="chart" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart__svg chart__svg--short" role="img" aria-label={caption}>
        <line x1={0} x2={W} y1={H - 16} y2={H - 16} className="chart__grid" />
        {points.map((p, i) => {
          const h = (p.value / max) * (H - 26);
          return (
            <rect key={p.label} x={4 + i * w + w * 0.15} width={Math.max(2, w * 0.7)} y={H - 16 - h} height={h} rx={2} className="chart__col">
              <title>{`${p.label}: ${p.value}`}</title>
            </rect>
          );
        })}
        {points.length ? (
          <>
            <text x={4} y={H - 3} className="chart__axis">
              {points[0]!.label}
            </text>
            <text x={W - 4} y={H - 3} className="chart__axis" textAnchor="end">
              {points.at(-1)!.label}
            </text>
          </>
        ) : null}
      </svg>
      <TableToggle label={tableLabel} caption={caption} head={head} rows={points.map((p) => [p.label, String(p.value)])} />
    </figure>
  );
}

/** Progress toward a target, as a labelled meter. */
export function Meter({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="meter">
      <div className="meter__head">
        <span>{label}</span>
        <strong>{pct} %</strong>
      </div>
      <div className="bars__track" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={display} aria-label={label}>
        <span className="bars__fill bars__fill--success" style={{ width: `${pct}%` }} />
      </div>
      <span className="muted small">{display}</span>
    </div>
  );
}
