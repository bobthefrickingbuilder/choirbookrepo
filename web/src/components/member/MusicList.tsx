'use client';

import { Badge, Card, EmptyState, Icon, SearchField } from '@choirbook/ui';
import Link from 'next/link';
import { useState } from 'react';

export interface MusicListItem {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  voicing: string | null;
  language: string | null;
  duration: string | null;
  tracks: string | null;
  due: string | null;
}

export function MusicList({
  slug,
  items,
  s,
}: {
  slug: string;
  items: MusicListItem[];
  s: { search: string; noMatch: string; arr: string };
}) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? items.filter((i) => [i.title, i.composer, i.arranger].some((x) => x?.toLowerCase().includes(needle)))
    : items;
  return (
    <div className="stack">
      <SearchField value={q} onChange={setQ} placeholder={s.search} label={s.search} />
      {shown.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon="music" size="sm">
            {s.noMatch}
          </EmptyState>
        </Card>
      ) : (
        <ul className="plain-list" style={{ gap: 12 }}>
          {shown.map((p) => (
            <li key={p.id}>
              <Link href={`/c/${slug}/music/${p.id}` as never} className="piece-card">
                <span className="piece-card__icon" aria-hidden="true">
                  <Icon name="file-music" size={22} />
                </span>
                <span className="piece-card__main">
                  <span className="piece-card__title">{p.title}</span>
                  {p.composer ? (
                    <span className="piece-card__by">
                      {p.composer}
                      {p.arranger ? `, ${s.arr} ${p.arranger}` : ''}
                    </span>
                  ) : null}
                  <span className="piece-card__meta">
                    {p.voicing ? <Badge tone="neutral">{p.voicing}</Badge> : null}
                    {p.duration ? <span>{p.duration}</span> : null}
                    {p.language ? <span>{p.language}</span> : null}
                    {p.tracks ? <span>{p.tracks}</span> : null}
                    {p.due ? (
                      <Badge tone="accent" icon="calendar-check">
                        {p.due}
                      </Badge>
                    ) : null}
                  </span>
                </span>
                <Icon name="chevron-right" size={18} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
