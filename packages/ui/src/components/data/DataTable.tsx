'use client';

import * as React from 'react';
import { Chip } from '../badges/Chip';
import { Button } from '../buttons/Button';
import { Checkbox } from '../forms/Checkbox';
import { SearchField } from '../forms/SearchField';
import type { Lang } from '../../types';
import { Icon } from '../icons/Icon';

const TX = {
  en: {
    sel: (n: number) => n + ' selected',
    clear: 'Clear selection',
    all: 'Select all rows',
    row: 'Select',
    showing: (a: number, b: number) => 'Showing ' + a + ' of ' + b,
    none: 'No matches',
    reset: 'Clear filters',
    search: 'Search',
  },
  fr: {
    sel: (n: number) => n + ' sélectionné' + (n > 1 ? 's' : ''),
    clear: 'Désélectionner',
    all: 'Tout sélectionner',
    row: 'Sélectionner',
    showing: (a: number, b: number) => a + ' sur ' + b,
    none: 'Aucun résultat',
    reset: 'Effacer les filtres',
    search: 'Rechercher',
  },
};

type RowId = string | number;
type SortDir = 'asc' | 'desc';

export interface DataColumn<R> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'right';
  width?: number | string;
  sortable?: boolean;
  sortValue?: (row: R) => string | number;
  render?: (row: R) => React.ReactNode;
}

export interface DataFilter<R> {
  id: string;
  label?: string;
  options: { value: string; label: React.ReactNode; count?: number }[];
  match: (row: R, value: string) => boolean;
}

export interface DataTableProps<R> {
  columns?: DataColumn<R>[];
  rows?: R[];
  getRowId?: (row: R) => RowId;
  rowLabel?: (row: R) => string;
  selectable?: boolean;
  selectedIds?: RowId[];
  onSelectionChange?: (ids: RowId[]) => void;
  defaultSort?: { key: string; dir: SortDir } | null;
  searchable?: boolean;
  searchKeys?: string[];
  searchPlaceholder?: string;
  filters?: DataFilter<R>[];
  tools?: React.ReactNode;
  bulkActions?: React.ReactNode | ((ids: RowId[]) => React.ReactNode);
  empty?: React.ReactNode;
  /** Read by screen readers; describes what the table lists. */
  caption?: string;
  compact?: boolean;
  footer?: React.ReactNode;
  onRowClick?: (row: R) => void;
  lang?: Lang;
  className?: string;
}

const field = (row: unknown, key: string): unknown =>
  row !== null && typeof row === 'object' ? (row as Record<string, unknown>)[key] : undefined;

export function DataTable<R>({
  columns = [],
  rows = [],
  getRowId = (r) => field(r, 'id') as RowId,
  rowLabel = (r) => String(getRowId(r)),
  selectable = false,
  selectedIds,
  onSelectionChange,
  defaultSort,
  searchable = false,
  searchKeys,
  searchPlaceholder,
  filters = [],
  tools,
  bulkActions,
  empty,
  caption,
  compact = false,
  footer,
  onRowClick,
  lang = 'en',
  className = '',
}: DataTableProps<R>) {
  const t = TX[lang];
  const [sort, setSort] = React.useState<{ key: string; dir: SortDir } | null>(defaultSort || null);
  const [q, setQ] = React.useState('');
  const [active, setActive] = React.useState<Record<string, string | null>>({});
  const [innerSel, setInnerSel] = React.useState<RowId[]>([]);
  const sel = selectedIds || innerSel;
  const setSel = (ids: RowId[]) => {
    setInnerSel(ids);
    if (onSelectionChange) onSelectionChange(ids);
  };
  let view = rows;
  if (q) {
    const keys = searchKeys || columns.map((c) => c.key);
    const s = q.toLowerCase();
    view = view.filter((r) =>
      keys.some(
        (k) =>
          String(field(r, k) ?? '')
            .toLowerCase()
            .indexOf(s) > -1,
      ),
    );
  }
  filters.forEach((f) => {
    const v = active[f.id];
    if (v != null) view = view.filter((r) => f.match(r, v));
  });
  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    const get = col && col.sortValue ? col.sortValue : (r: R) => field(r, sort.key);
    view = view.slice().sort((a, b) => {
      const x = get(a),
        y = get(b);
      const c =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), lang);
      return sort.dir === 'asc' ? c : -c;
    });
  }
  const ids = view.map(getRowId);
  const allSel = ids.length > 0 && ids.every((id) => sel.indexOf(id) > -1);
  const someSel = !allSel && ids.some((id) => sel.indexOf(id) > -1);
  const toggleSort = (key: string) =>
    setSort((s) =>
      !s || s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null,
    );
  const anyFilter = q || Object.keys(active).some((k) => active[k] != null);
  return (
    <div className={'cb-table' + (compact ? ' cb-table--compact' : '') + ' ' + className}>
      {sel.length ? (
        <div className="cb-table__bulk" role="region" aria-label={t.sel(sel.length)}>
          {' '}
          <span>{t.sel(sel.length)}</span>{' '}
          <div className="cb-table__bulk-actions">
            {typeof bulkActions === 'function' ? bulkActions(sel) : bulkActions}
          </div>{' '}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSel([])}
            style={{
              marginLeft: 'auto',
            }}
          >
            {t.clear}
          </Button>
        </div>
      ) : searchable || filters.length || tools ? (
        <div className="cb-table__toolbar">
          {searchable ? (
            <div className="cb-table__search">
              {' '}
              <SearchField
                size="sm"
                value={q}
                onChange={setQ}
                placeholder={searchPlaceholder || t.search}
                label={searchPlaceholder || t.search}
              />
            </div>
          ) : null}
          {filters.map((f) => (
            <div key={f.id} className="cb-table__filters" role="group" aria-label={f.label}>
              {f.label ? <span className="cb-table__filters-label">{f.label}</span> : null}
              {f.options.map((o) => (
                <Chip
                  key={o.value}
                  selected={active[f.id] === o.value}
                  count={o.count}
                  onClick={() =>
                    setActive((a) => ({
                      ...a,
                      [f.id]: a[f.id] === o.value ? null : o.value,
                    }))
                  }
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          ))}
          {tools ? <div className="cb-table__tools">{tools}</div> : null}
        </div>
      ) : null}{' '}
      <div className="cb-table__scroll">
        {' '}
        <table className="cb-table__t">
          {caption ? <caption className="cb-sr-only">{caption}</caption> : null}{' '}
          <thead>
            {' '}
            <tr>
              {selectable ? (
                <th className="is-check">
                  {' '}
                  <Checkbox
                    aria-label={t.all}
                    checked={allSel}
                    indeterminate={someSel}
                    onChange={() =>
                      setSel(
                        allSel
                          ? sel.filter((id) => ids.indexOf(id) < 0)
                          : Array.from(new Set(sel.concat(ids))),
                      )
                    }
                  />
                </th>
              ) : null}
              {columns.map((c) => {
                const sorted = sort && sort.key === c.key ? sort.dir : null;
                return (
                  <th
                    key={c.key}
                    className={c.align === 'right' ? 'is-num' : undefined}
                    style={{
                      width: c.width,
                    }}
                    aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                    scope="col"
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        className="cb-th-btn"
                        onClick={() => toggleSort(c.key)}
                        data-sorted={sorted || undefined}
                      >
                        {c.header}{' '}
                        <Icon
                          name={
                            sorted === 'asc' ? 'arrow-up' : sorted === 'desc' ? 'arrow-down' : 'arrow-up-down'
                          }
                          size={14}
                          strokeWidth={2}
                        />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>{' '}
          <tbody>
            {view.map((r) => {
              const id = getRowId(r);
              const on = sel.indexOf(id) > -1;
              return (
                <tr
                  key={id}
                  aria-selected={selectable ? on : undefined}
                  className={onRowClick ? 'is-clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                >
                  {selectable ? (
                    <td className="is-check" onClick={(e) => e.stopPropagation()}>
                      {' '}
                      <Checkbox
                        aria-label={t.row + ' ' + rowLabel(r)}
                        checked={on}
                        onChange={() => setSel(on ? sel.filter((x) => x !== id) : sel.concat([id]))}
                      />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === 'right' ? 'is-num' : undefined}>
                      {c.render ? c.render(r) : String(field(r, c.key) ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!view.length ? (
          <div className="cb-table__empty">
            {empty || (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--text-2)',
                }}
              >
                {' '}
                <Icon name="search" size={22} /> <span>{t.none}</span>
                {anyFilter ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQ('');
                      setActive({});
                    }}
                  >
                    {t.reset}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>{' '}
      <div className="cb-table__foot">
        {' '}
        <span>{t.showing(view.length, rows.length)}</span>
        {footer}
      </div>
    </div>
  );
}
