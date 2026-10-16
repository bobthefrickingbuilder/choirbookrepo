'use client';

import { Button, Card, Checkbox, TextInput } from '@choirbook/ui';
import { useEffect, useState } from 'react';

export interface BoardData {
  choir: string;
  periodLabel: string;
  asOf: string;
  preparedBy: string;
  kpis: { label: string; value: string; context?: string }[];
  membership: { label: string; count: number }[] | null;
  membershipFacts: { k: string; v: string }[];
  attendance: { label: string; pct: number }[] | null;
  attendanceFacts: { k: string; v: string }[];
  finance: { k: string; v: string }[] | null;
  forms: { label: string; pct: number; detail: string }[] | null;
  comms: { k: string; v: string }[] | null;
  upcoming: { when: string; title: string; concert: boolean }[];
}

type Section = 'membership' | 'attendance' | 'finance' | 'forms' | 'comms' | 'upcoming' | 'highlights' | 'decisions';

export function BoardReport({
  data,
  storageKey,
  s,
}: {
  data: BoardData;
  storageKey: string;
  s: Record<
    | 'boardTitle'
    | 'boardIntro'
    | 'meeting'
    | 'preparedBy'
    | 'include'
    | 'highlights'
    | 'highlightsHint'
    | 'decisions'
    | 'decisionsHint'
    | 'upcomingSection'
    | 'savePdf'
    | 'draftKept'
    | 'emailLater'
    | 'chartAlt'
    | 'clearAll'
    | Section,
    string
  >;
}) {
  const [on, setOn] = useState<Record<Section, boolean>>({ membership: true, attendance: true, finance: true, forms: true, comms: true, upcoming: true, highlights: true, decisions: true });
  const [meeting, setMeeting] = useState('');
  const [highlights, setHighlights] = useState('');
  const [decisions, setDecisions] = useState('');

  // The draft text stays on this device (a convenience, not a record).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as { meeting?: string; highlights?: string; decisions?: string } | null;
      if (saved) {
        // Restoring a saved draft once, after the page has loaded.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMeeting(saved.meeting ?? '');
        setHighlights(saved.highlights ?? '');
        setDecisions(saved.decisions ?? '');
      }
    } catch {
      /* storage unavailable */
    }
  }, [storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ meeting, highlights, decisions }));
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, meeting, highlights, decisions]);

  const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);
  const available: Section[] = (['membership', 'attendance', 'finance', 'forms', 'comms', 'upcoming', 'highlights', 'decisions'] as Section[]).filter(
    (k) => !(k === 'membership' && !data.membership) && !(k === 'attendance' && !data.attendance) && !(k === 'finance' && !data.finance) && !(k === 'forms' && !data.forms) && !(k === 'comms' && !data.comms),
  );
  const show = (k: Section) => available.includes(k) && on[k];

  return (
    <div className="board">
      <aside className="board__side no-print">
        <Card>
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              {s.boardIntro}
            </p>
            <TextInput label={s.meeting} type="date" value={meeting} onChange={(e) => setMeeting(e.target.value)} />
            <fieldset className="plain-fieldset">
              <legend className="cb-label">{s.include}</legend>
              <div className="stack" style={{ gap: 6, marginTop: 6 }}>
                {available.map((k) => (
                  <Checkbox key={k} label={s[k]} checked={on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} />
                ))}
              </div>
            </fieldset>
            <TextInput label={s.highlights} hint={s.highlightsHint} multiline rows={4} value={highlights} onChange={(e) => setHighlights(e.target.value)} maxLength={4000} />
            <TextInput label={s.decisions} hint={s.decisionsHint} multiline rows={3} value={decisions} onChange={(e) => setDecisions(e.target.value)} maxLength={4000} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button iconStart="printer" onClick={() => window.print()}>
                {s.savePdf}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setHighlights('');
                  setDecisions('');
                  setMeeting('');
                }}
              >
                {s.clearAll}
              </Button>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              {s.draftKept} {s.emailLater}
            </p>
          </div>
        </Card>
      </aside>

      <article className="board__doc" data-print-report="">
        <header className="board__head">
          <p className="overline overline--accent">{data.choir}</p>
          <h1>{s.boardTitle}</h1>
          <p className="muted">
            {data.periodLabel}
            {meeting ? ` · ${s.meeting}: ${new Date(`${meeting}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' })}` : ''}
          </p>
          <p className="muted small">
            {s.preparedBy}: {data.preparedBy} · {data.asOf}
          </p>
        </header>

        <div className="kpi-row">
          {data.kpis.map((k) => (
            <div key={k.label} className="kpi">
              <span className="muted small">{k.label}</span>
              <strong>{k.value}</strong>
              {k.context ? <span className="muted small">{k.context}</span> : null}
            </div>
          ))}
        </div>

        {show('highlights') && lines(highlights).length ? (
          <section>
            <h2>{s.highlights}</h2>
            <ul>
              {lines(highlights).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {show('membership') && data.membership ? (
          <section>
            <h2>{s.membership}</h2>
            <Bars rows={data.membership.map((m) => ({ label: m.label, pct: (m.count / Math.max(1, ...data.membership!.map((x) => x.count))) * 100, display: String(m.count) }))} caption={s.membership} />
            <Facts rows={data.membershipFacts} />
          </section>
        ) : null}

        {show('attendance') && data.attendance ? (
          <section>
            <h2>{s.attendance}</h2>
            <Bars rows={data.attendance.map((a) => ({ label: a.label, pct: a.pct, display: `${a.pct}%` }))} caption={s.attendance} />
            <Facts rows={data.attendanceFacts} />
          </section>
        ) : null}

        {show('finance') && data.finance ? (
          <section>
            <h2>{s.finance}</h2>
            <Facts rows={data.finance} />
          </section>
        ) : null}

        {show('forms') && data.forms ? (
          <section>
            <h2>{s.forms}</h2>
            <Bars rows={data.forms.map((f) => ({ label: f.label, pct: f.pct, display: f.detail }))} caption={s.forms} />
          </section>
        ) : null}

        {show('comms') && data.comms ? (
          <section>
            <h2>{s.comms}</h2>
            <Facts rows={data.comms} />
          </section>
        ) : null}

        {show('upcoming') && data.upcoming.length ? (
          <section>
            <h2>{s.upcomingSection}</h2>
            <ul className="plain-list">
              {data.upcoming.map((u, i) => (
                <li key={i} className="history-row">
                  <span style={{ fontWeight: u.concert ? 600 : 400 }}>{u.title}</span>
                  <span className="muted">{u.when}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {show('decisions') && lines(decisions).length ? (
          <section>
            <h2>{s.decisions}</h2>
            <ol>
              {lines(decisions).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          </section>
        ) : null}
      </article>
    </div>
  );
}

function Bars({ rows, caption }: { rows: { label: string; pct: number; display: string }[]; caption: string }) {
  return (
    <figure className="bars" style={{ margin: 0 }}>
      <div aria-hidden="true">
        {rows.map((r) => (
          <div key={r.label} className="bars__row">
            <span className="bars__label">{r.label}</span>
            <span className="bars__track">
              <span className="bars__fill" style={{ width: `${Math.min(100, r.pct)}%` }} />
            </span>
            <span className="bars__value">{r.display}</span>
          </div>
        ))}
      </div>
      <table className="cb-sr-only">
        <caption>{caption}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{r.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Facts({ rows }: { rows: { k: string; v: string }[] }) {
  return (
    <dl className="def-list" style={{ marginTop: 10 }}>
      {rows.map((r) => (
        <div key={r.k} style={{ display: 'contents' }}>
          <dt>{r.k}</dt>
          <dd>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}
