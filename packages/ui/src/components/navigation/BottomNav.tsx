'use client';

import * as React from 'react';
import { Icon } from '../icons/Icon';
import type { NavItem } from './Sidebar';

export interface BottomNavProps {
  items?: NavItem[];
  activeId?: string;
  /** When set, links call this instead of navigating (for client-side routing). */
  onNavigate?: (id: string) => void;
  fixed?: boolean;
  label?: string;
  className?: string;
}

export function BottomNav({
  items = [],
  activeId,
  onNavigate,
  fixed = true,
  label = 'Main',
  className = '',
}: BottomNavProps) {
  return (
    <nav
      className={'cb-bottomnav' + (fixed ? ' cb-bottomnav--fixed' : '') + ' ' + className}
      aria-label={label}
    >
      {items.map((it) => (
        <a
          key={it.id}
          href={it.href || '#' + it.id}
          className="cb-bottomnav__item"
          aria-current={it.id === activeId ? 'page' : undefined}
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate(it.id);
            }
          }}
        >
          {' '}
          <span className="cb-bottomnav__icon">
            {' '}
            <Icon name={it.icon} size={22} strokeWidth={it.id === activeId ? 2 : 1.75} />
            {it.count ? (
              <span className="cb-bottomnav__dot" aria-hidden="true">
                {it.count}
              </span>
            ) : null}
          </span>{' '}
          <span>
            {it.label}
            {it.count ? (
              <span className="cb-sr-only">
                {', '}
                {it.count} {it.countLabel || 'new'}
              </span>
            ) : null}
          </span>
        </a>
      ))}
    </nav>
  );
}
