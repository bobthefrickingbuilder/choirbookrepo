import { Button } from '@choirbook/ui';

/** Horizontal bars, with the same figures as a table for screen readers. */
export function BarList({ caption, rows, unit = '%' }: { caption: string; rows: { label: string; value: number; display?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="bars" style={{ margin: 0 }}>
      <div aria-hidden="true">
        {rows.map((r) => (
          <div key={r.label} className="bars__row">
            <span className="bars__label">{r.label}</span>
            <span className="bars__track">
              <span className="bars__fill" style={{ width: `${unit === '%' ? Math.min(100, r.value) : (r.value / max) * 100}%` }} />
            </span>
            <span className="bars__value">{r.display ?? `${r.value}${unit}`}</span>
          </div>
        ))}
      </div>
      <table className="cb-sr-only">
        <caption>{caption}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.display ?? `${r.value}${unit}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function Kpi({ label, value, context }: { label: string; value: string; context?: string }) {
  return (
    <div className="kpi">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      {context ? <span className="muted small">{context}</span> : null}
    </div>
  );
}

export function CsvLink({ href, label }: { href: string; label: string }) {
  return (
    <Button size="sm" variant="ghost" iconStart="download" href={href} className="no-print">
      {label}
    </Button>
  );
}
