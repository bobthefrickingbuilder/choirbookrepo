'use client';

import * as React from 'react';
import { Badge } from '../badges/Badge';
import { Button } from '../buttons/Button';
import type { Lang } from '../../types';
import { Icon } from '../icons/Icon';

type Maybe = string | undefined;

const TX = {
  en: {
    unread: 'Unread',
    pinned: 'Pinned',
    more: 'Read more',
    less: 'Show less',
    ack: 'Acknowledge',
    ackBy: (d: Maybe) => 'Please acknowledge' + (d ? ' by ' + d : ''),
    acked: (d: Maybe) => 'Acknowledged' + (d ? ' · ' + d : ''),
  },
  fr: {
    unread: 'Non lu',
    pinned: 'Épinglé',
    more: 'Lire la suite',
    less: 'Réduire',
    ack: 'Confirmer la lecture',
    ackBy: (d: Maybe) => 'Confirmation demandée' + (d ? ' d’ici le ' + d : ''),
    acked: (d: Maybe) => 'Lecture confirmée' + (d ? ' · ' + d : ''),
  },
};

export interface AnnouncementAttachment {
  name: string;
  href?: string;
  size?: string;
}

export interface AnnouncementItemProps {
  title: React.ReactNode;
  author?: string;
  role?: string;
  date?: string;
  audience?: string[];
  body?: React.ReactNode;
  pinned?: boolean;
  unread?: boolean;
  requiresAck?: boolean;
  acknowledged?: boolean;
  acknowledgedAt?: string;
  ackDue?: string;
  onAcknowledge?: () => void;
  attachments?: AnnouncementAttachment[];
  href?: string;
  lang?: Lang;
  clamp?: boolean;
  className?: string;
}

export function AnnouncementItem({
  title,
  author,
  role,
  date,
  audience = [],
  body,
  pinned = false,
  unread = false,
  requiresAck = false,
  acknowledged = false,
  acknowledgedAt,
  ackDue,
  onAcknowledge,
  attachments = [],
  href,
  lang = 'en',
  clamp = true,
  className = '',
}: AnnouncementItemProps) {
  const t = TX[lang];
  const [open, setOpen] = React.useState(!clamp);
  return (
    <article className={'cb-ann' + (unread ? ' cb-ann--unread' : '') + ' ' + className}>
      {' '}
      <span className="cb-ann__dot" aria-hidden="true" />{' '}
      <div
        style={{
          minWidth: 0,
        }}
      >
        {' '}
        <div className="cb-ann__head">
          {' '}
          <h3 className="cb-ann__title">
            {unread ? (
              <span className="cb-sr-only">
                {t.unread}
                {': '}
              </span>
            ) : null}
            {href ? (
              <a
                href={href}
                className="cb-link cb-link--subtle"
                style={{
                  fontWeight: 'inherit',
                  textDecoration: 'none',
                }}
              >
                {title}
              </a>
            ) : (
              title
            )}
          </h3>
          {pinned ? (
            <Badge tone="neutral" icon="star">
              {t.pinned}
            </Badge>
          ) : null}
        </div>{' '}
        <div className="cb-ann__meta">
          {author ? (
            <span>
              {' '}
              <b>{author}</b>
              {role ? ', ' + role : ''}
            </span>
          ) : null}
          {date ? <span aria-hidden="true">·</span> : null}
          {date ? <time>{date}</time> : null}
          {audience.map((a) => (
            <Badge key={a} tone="neutral" icon="users">
              {a}
            </Badge>
          ))}
        </div>
        {body ? <div className={'cb-ann__body' + (open ? '' : ' cb-ann__body--clamp')}>{body}</div> : null}
        {body && clamp ? (
          <button
            type="button"
            className="cb-link"
            style={{
              marginTop: 4,
              fontSize: 14,
            }}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? t.less : t.more}
          </button>
        ) : null}
        {attachments.length ? (
          <div className="cb-ann__files">
            {attachments.map((f) => (
              <a key={f.name} className="cb-file" href={f.href || '#'}>
                {' '}
                <Icon name="paperclip" size={15} />
                {f.name}
                {f.size ? <small>{f.size}</small> : null}
              </a>
            ))}
          </div>
        ) : null}
        {requiresAck ? (
          acknowledged ? (
            <div className="cb-ann__ack cb-ann__ack--done" role="status">
              {' '}
              <Icon name="check-check" size={16} strokeWidth={2.25} />
              {t.acked(acknowledgedAt)}
            </div>
          ) : (
            <div className="cb-ann__ack">
              {' '}
              <Icon name="eye" size={16} />
              {t.ackBy(ackDue)}{' '}
              <Button size="sm" variant="secondary" iconStart="check" onClick={onAcknowledge}>
                {t.ack}
              </Button>
            </div>
          )
        ) : null}
      </div>
    </article>
  );
}
