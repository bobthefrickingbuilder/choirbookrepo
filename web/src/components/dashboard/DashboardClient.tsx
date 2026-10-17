'use client';

import { AlertCard, Button, Checkbox, IconButton, Modal, Select, TextInput } from '@choirbook/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { resetLayout, saveLayout } from '@/app/actions/dashboard';

export interface FilterStrings {
  filters: string;
  choir: string;
  period: string;
  from: string;
  to: string;
  apply: string;
  section: string;
  allSections: string;
  sectionOnly: string;
}

/**
 * Period, dates and section, kept in the URL so a view can be shared.
 * Changing a choice reloads the page with the new filters.
 */
export function DashboardFilters({
  s,
  period,
  from,
  to,
  section,
  periods,
  sections,
  locked,
  choirs,
  choirSlug,
}: {
  s: FilterStrings;
  period: string;
  from: string;
  to: string;
  section: string;
  periods: { value: string; label: string }[];
  sections: { value: string; label: string }[];
  locked: boolean;
  choirs: { slug: string; name: string }[];
  choirSlug: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ period, from, to, section });
  const go = (next: typeof v) => {
    setV(next);
    if (next.period === 'custom' && (!next.from || !next.to)) return;
    const q = new URLSearchParams();
    q.set('period', next.period);
    if (next.period === 'custom') {
      q.set('from', next.from);
      q.set('to', next.to);
    }
    if (next.section) q.set('section', next.section);
    start(() => router.push(`${path}?${q.toString()}` as never));
  };
  return (
    <form
      className="dash-filters no-print"
      aria-label={s.filters}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        go(v);
      }}
    >
      {choirs.length > 1 ? (
        <Select
          label={s.choir}
          size="sm"
          value={choirSlug}
          onChange={(e) => start(() => router.push(`${path.replace(`/c/${choirSlug}`, `/c/${e.target.value}`)}` as never))}
          options={choirs.map((c) => ({ value: c.slug, label: c.name }))}
        />
      ) : null}
      <Select label={s.period} size="sm" value={v.period} onChange={(e) => go({ ...v, period: e.target.value })} options={periods} />
      {v.period === 'custom' ? (
        <>
          <TextInput label={s.from} size="sm" type="date" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} />
          <TextInput label={s.to} size="sm" type="date" value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} />
          <Button type="submit" size="sm" variant="secondary" disabled={!v.from || !v.to} loading={pending}>
            {s.apply}
          </Button>
        </>
      ) : null}
      <Select
        label={s.section}
        size="sm"
        value={v.section}
        disabled={locked && sections.length < 2}
        hint={locked ? s.sectionOnly : undefined}
        onChange={(e) => go({ ...v, section: e.target.value })}
        options={locked ? sections : [{ value: '', label: s.allSections }, ...sections]}
      />
    </form>
  );
}

export interface CustomizeStrings {
  customize: string;
  customizeTitle: string;
  customizeHelp: string;
  show: string;
  moveUp: string;
  moveDown: string;
  reset: string;
  save: string;
  cancel: string;
  close: string;
  failed: string;
}

/** Show, hide and reorder widgets. Up and down buttons keep it usable by keyboard and on a tablet. */
export function CustomizeDashboard({ slug, widgets, order, hidden, s }: { slug: string; widgets: Record<string, string>; order: string[]; hidden: string[]; s: CustomizeStrings }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(order);
  const [off, setOff] = useState(new Set(hidden));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fill = (tpl: string, w: string) => tpl.replace('{widget}', widgets[w] ?? w);
  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    const [w] = next.splice(i, 1);
    next.splice(i + d, 0, w!);
    setList(next);
  };
  const run = (fn: () => Promise<{ ok: boolean }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(s.failed);
      setError(null);
      setOpen(false);
      router.refresh();
    });
  return (
    <>
      <Button
        variant="secondary"
        iconStart="sliders-horizontal"
        onClick={() => {
          setList(order);
          setOff(new Set(hidden));
          setOpen(true);
        }}
      >
        {s.customize}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.customizeTitle}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" style={{ marginRight: 'auto' }} onClick={() => run(() => resetLayout(slug))} disabled={pending}>
              {s.reset}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} onClick={() => run(() => saveLayout(slug, { order: list, hidden: [...off] }))}>
              {s.save}
            </Button>
          </>
        }
      >
        <p className="muted" style={{ marginTop: 0 }}>
          {s.customizeHelp}
        </p>
        {error ? <AlertCard tone="error">{error}</AlertCard> : null}
        <ol className="widget-order">
          {list.map((w, i) => (
            <li key={w}>
              <Checkbox
                label={widgets[w] ?? w}
                aria-label={fill(s.show, w)}
                checked={!off.has(w)}
                onChange={(e) => {
                  const next = new Set(off);
                  if (e.target.checked) next.delete(w);
                  else next.add(w);
                  setOff(next);
                }}
              />
              <span className="widget-order__moves">
                <IconButton icon="arrow-up" size="sm" label={fill(s.moveUp, w)} disabled={i === 0} onClick={() => move(i, -1)} />
                <IconButton icon="arrow-down" size="sm" label={fill(s.moveDown, w)} disabled={i === list.length - 1} onClick={() => move(i, 1)} />
              </span>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  );
}
