'use client';

import * as React from 'react';
import { Icon, type IconName } from '../icons/Icon';

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
  count?: number;
  /** Shows the count in the alert colour. */
  alert?: boolean;
  /** Read after the count by screen readers, e.g. "unread". */
  countLabel?: string;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export interface SidebarProps {
  sections?: NavSection[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  label?: string;
  className?: string;
}

export function Sidebar({
  sections = [],
  activeId,
  onNavigate,
  header,
  footer,
  label = 'Main',
  className = '',
}: SidebarProps) {
  return (
    <nav className={'cb-sidebar ' + className} aria-label={label}>
      {header ? (
        <div
          style={{
            padding: '14px 12px 0',
          }}
        >
          {header}
        </div>
      ) : null}{' '}
      <div className="cb-sidebar__sections">
        {sections.map((s, i) => (
          <div className="cb-sidebar__section" key={s.label || i}>
            {s.label ? <div className="cb-sidebar__label">{s.label}</div> : null}
            {s.items.map((it) => (
              <a
                key={it.id}
                href={it.href || '#' + it.id}
                className="cb-navitem"
                aria-current={it.id === activeId ? 'page' : undefined}
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate(it.id);
                  }
                }}
              >
                {it.icon ? <Icon name={it.icon} size={18} /> : null}{' '}
                <span className="cb-navitem__label">{it.label}</span>
                {it.count ? (
                  <span className={'cb-navitem__count' + (it.alert ? ' cb-navitem__count--alert' : '')}>
                    {it.count} <span className="cb-sr-only"> {it.countLabel || ''}</span>
                  </span>
                ) : null}
              </a>
            ))}
          </div>
        ))}
      </div>
      {footer ? <div className="cb-sidebar__foot">{footer}</div> : null}
    </nav>
  );
}
