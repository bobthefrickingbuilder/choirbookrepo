'use client';

import { format } from '@choirbook/shared/i18n';
import { readRosterCsv, toCsv, type ImportContext, type ImportIssue, type ImportResult } from '@choirbook/shared/import';
import { AlertCard, Badge, Button, Card, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { importRoster } from '@/app/actions/roster';
import type { StaffStrings } from '@/lib/staff';

export function RosterImport({ slug, context, s }: { slug: string; context: ImportContext; s: StaffStrings }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const issue = (i: ImportIssue) => (s as unknown as Record<string, string>)[`issue_${i}`] ?? i;
  const check = (csv: string) => {
    setText(csv);
    setDone(null);
    setResult(csv.trim() ? readRosterCsv(csv, context) : null);
  };
  const good = result?.rows.filter((r) => !r.errors.length) ?? [];
  const bad = result?.rows.filter((r) => r.errors.length) ?? [];

  const downloadReport = () => {
    if (!result) return;
    const csv = toCsv(
      [s.importLine, s.firstName, s.lastName, s.email, s.importProblems],
      result.rows
        .filter((r) => r.errors.length || r.warnings.length)
        .map((r) => [r.line, r.first_name, r.last_name, r.email, [...r.errors, ...r.warnings].map(issue).join('; ')]),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-problems.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirm = () =>
    start(async () => {
      const r = await importRoster(slug, text);
      if (!r.ok) return setError(r.error === 'missing_columns' ? s.importMissing : (s.errors[r.error] ?? s.failed));
      setError(null);
      setDone(format(s.importDone, { n: r.data.n }));
      setResult(null);
      setText('');
      router.refresh();
    });

  return (
    <div className="stack">
      <Card>
        <div className="stack">
          <p style={{ margin: 0 }}>{s.importIntro}</p>
          <p className="muted small" style={{ margin: 0 }}>
            <strong>{s.importColumns}:</strong> {s.importColumnsList}
          </p>
          <label className="file-pick">
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) check(await file.text());
              }}
            />
            <span className="cb-btn cb-btn--secondary cb-btn--md">{s.chooseFile}</span>
          </label>
          <TextInput label={s.orPaste} multiline rows={5} value={text} onChange={(e) => check(e.target.value)} spellCheck={false} />
        </div>
      </Card>

      {done ? <AlertCard tone="success">{done}</AlertCard> : null}
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}

      {result ? (
        <Card title={s.importPreview}>
          <div className="stack">
            {result.missingColumns.length ? <AlertCard tone="error">{s.importMissing}</AlertCard> : null}
            <p style={{ margin: 0 }}>{format(s.importSummary, { ok: good.length, bad: bad.length, blank: result.blankLines })}</p>
            {result.unmatchedColumns.length ? <p className="muted small">{format(s.importIgnored, { cols: result.unmatchedColumns.join(', ') })}</p> : null}
            <div className="table-scroll">
              <table className="simple-table">
                <thead>
                  <tr>
                    <th scope="col">{s.importLine}</th>
                    <th scope="col">{s.name}</th>
                    <th scope="col">{s.email}</th>
                    <th scope="col">{s.section}</th>
                    <th scope="col">{s.colGuardian}</th>
                    <th scope="col">{s.importProblems}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.line} className={r.errors.length ? 'is-error' : undefined}>
                      <td className="num">{r.line}</td>
                      <td>
                        {r.first_name} {r.last_name}
                      </td>
                      <td>{r.email ?? '—'}</td>
                      <td>{r.voice_part_key ?? r.section_key ?? '—'}</td>
                      <td>{r.guardian ? `${r.guardian.first_name} ${r.guardian.last_name}` : '—'}</td>
                      <td>
                        {r.errors.length || r.warnings.length ? (
                          <ul className="issue-list">
                            {r.errors.map((i) => (
                              <li key={i}>
                                <Badge tone="error" icon="circle-alert">
                                  {issue(i)}
                                </Badge>
                              </li>
                            ))}
                            {r.warnings.map((i) => (
                              <li key={i}>
                                <Badge tone="warning" icon="triangle-alert">
                                  {issue(i)}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <Badge tone="success" icon="check">
                            {s.importReady}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Button iconStart="upload" onClick={confirm} loading={pending} disabled={!good.length || result.missingColumns.length > 0}>
                {format(s.importConfirm, { n: good.length })}
              </Button>
              {bad.length || result.rows.some((r) => r.warnings.length) ? (
                <Button variant="secondary" iconStart="download" onClick={downloadReport}>
                  {s.importErrorReport}
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
