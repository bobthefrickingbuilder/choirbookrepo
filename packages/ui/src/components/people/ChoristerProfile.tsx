import * as React from 'react';
import type { Lang } from '../../types';
import { ATTENDANCE, AttendanceBadge, type AttendanceStatus } from '../badges/AttendanceBadge';
import { Badge, FeeStatusBadge, FormStatusBadge, type FeeStatus, type FormStatus } from '../badges/Badge';
import { VoicePartBadge } from '../badges/VoicePartBadge';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';
import { AlertCard } from '../cards/AlertCard';
import { Icon } from '../icons/Icon';
import { SideSheet } from '../overlays/SideSheet';
import { Avatar } from './Avatar';

const TX = {
  en: {
    label: 'Chorister profile',
    care: 'Medical & care',
    att: 'Attendance this term',
    recent: 'Last sessions, oldest first',
    guardians: 'Guardians',
    primary: 'Primary',
    forms: 'Forms & fees',
    contact: 'Chorister contact',
    msg: 'Message guardians',
    edit: 'Edit profile',
    call: 'Call',
    email: 'Email',
  },
  fr: {
    label: 'Profil du choriste',
    care: 'Santé et soins',
    att: 'Présence ce trimestre',
    recent: 'Dernières séances, de la plus ancienne',
    guardians: 'Tuteurs',
    primary: 'Principal',
    forms: 'Formulaires et frais',
    contact: 'Coordonnées du choriste',
    msg: 'Écrire aux tuteurs',
    edit: 'Modifier',
    call: 'Appeler',
    email: 'Courriel',
  },
};
type MarkedStatus = Exclude<AttendanceStatus, 'unmarked'>;
const COUNTED = ['present', 'late', 'absent', 'excused'] as const satisfies readonly MarkedStatus[];

export interface ProfileData {
  name: string;
  avatarSrc?: string | null;
  part?: string | null;
  ensemble?: string;
  pronouns?: string;
  year?: string;
  email?: string;
  phone?: string;
  /** Only pass to staff who need it; never shown to other members. */
  medical?: { label: string; detail?: React.ReactNode; severity?: 'high' | 'medium' }[];
  attendance?: Partial<Record<MarkedStatus, number>> & { rate?: number | null; recent?: AttendanceStatus[] };
  guardians?: { name: string; relation?: string; phone?: string; email?: string; primary?: boolean }[];
  forms?: { name: string; due?: string; status: FormStatus }[];
  fees?: { name: string; amount?: string; status: FeeStatus }[];
}

export interface ChoristerProfileProps {
  open?: boolean;
  onClose: () => void;
  inline?: boolean;
  chorister: ProfileData;
  lang?: Lang;
  onMessage?: () => void;
  onEdit?: () => void;
}

export function ChoristerProfile({
  open = true,
  onClose,
  inline = false,
  chorister,
  lang = 'en',
  onMessage,
  onEdit,
}: ChoristerProfileProps) {
  const t = TX[lang];
  const c = chorister;
  const a = c.attendance || {};
  const header = (
    <div className="cb-profile__id">
      {' '}
      <Avatar name={c.name || ''} src={c.avatarSrc} size={56} />{' '}
      <div
        style={{
          minWidth: 0,
        }}
      >
        {' '}
        <h2 className="cb-profile__name">{c.name}</h2>{' '}
        <div className="cb-profile__tags">
          {c.part ? <VoicePartBadge part={c.part} variant="pill" lang={lang} /> : null}
          {c.ensemble ? <span>{c.ensemble}</span> : null}
          {c.pronouns ? <span>{c.pronouns}</span> : null}
          {c.year ? <span>{c.year}</span> : null}
        </div>
      </div>
    </div>
  );
  const footer = (
    <>
      {' '}
      <Button variant="primary" iconStart="mail" onClick={onMessage}>
        {t.msg}
      </Button>{' '}
      <Button variant="ghost" iconStart="pencil" onClick={onEdit}>
        {t.edit}
      </Button>
    </>
  );
  return (
    <SideSheet
      open={open}
      onClose={onClose}
      inline={inline}
      label={t.label + ': ' + (c.name || '')}
      header={header}
      footer={footer}
    >
      {c.medical && c.medical.length ? (
        <div className="cb-psec">
          {' '}
          <h3 className="cb-psec__title">{t.care}</h3>{' '}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {c.medical.map((m) => (
              <AlertCard
                key={m.label}
                tone={m.severity === 'high' ? 'error' : 'warning'}
                icon="heart-pulse"
                title={m.label}
              >
                {m.detail}
              </AlertCard>
            ))}
          </div>
        </div>
      ) : null}
      {c.attendance ? (
        <div className="cb-psec">
          {' '}
          <h3 className="cb-psec__title">{t.att}</h3>{' '}
          <div className="cb-att-summary">
            {' '}
            <div className="cb-att-rate">
              {a.rate} <small>%</small>
            </div>{' '}
            <div className="cb-att-counts">
              {COUNTED.map((s) =>
                a[s] != null ? (
                  <AttendanceBadge key={s} status={s} lang={lang}>
                    {ATTENDANCE[s][lang] + ' ' + a[s]}
                  </AttendanceBadge>
                ) : null,
              )}
            </div>
          </div>
          {a.recent ? (
            <div className="cb-att-strip" role="list" aria-label={t.recent}>
              {a.recent.map((s, i) => (
                <span
                  key={i}
                  role="listitem"
                  className={'cb-att-strip__cell cb-att-strip__cell--' + s}
                  title={ATTENDANCE[s][lang]}
                >
                  {' '}
                  <Icon name={ATTENDANCE[s].icon} size={14} strokeWidth={2.5} label={ATTENDANCE[s][lang]} />
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {c.guardians && c.guardians.length ? (
        <div className="cb-psec">
          {' '}
          <h3 className="cb-psec__title">{t.guardians}</h3>{' '}
          <ul className="cb-plist">
            {c.guardians.map((g) => (
              <li key={g.name} className="cb-plist__row">
                {' '}
                <Avatar name={g.name} size={32} />{' '}
                <div className="cb-plist__main">
                  {' '}
                  <div className="cb-plist__t">
                    {g.name} {g.primary ? <Badge tone="neutral">{t.primary}</Badge> : null}
                  </div>{' '}
                  <div className="cb-plist__s">
                    {g.relation}
                    {g.phone ? ' · ' + g.phone : ''}
                  </div>
                </div>
                {g.phone ? <IconButton icon="phone" label={t.call + ' ' + g.name} size="sm" /> : null}
                {g.email ? <IconButton icon="mail" label={t.email + ' ' + g.name} size="sm" /> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {(c.forms && c.forms.length) || (c.fees && c.fees.length) ? (
        <div className="cb-psec">
          {' '}
          <h3 className="cb-psec__title">{t.forms}</h3>{' '}
          <ul className="cb-plist">
            {(c.forms || []).map((f) => (
              <li key={f.name} className="cb-plist__row">
                {' '}
                <Icon
                  name="file-text"
                  size={18}
                  style={{
                    color: 'var(--text-3)',
                  }}
                />{' '}
                <div className="cb-plist__main">
                  {' '}
                  <div className="cb-plist__t">{f.name}</div>
                  {f.due ? <div className="cb-plist__s">{f.due}</div> : null}
                </div>{' '}
                <FormStatusBadge status={f.status} lang={lang} />
              </li>
            ))}
            {(c.fees || []).map((f) => (
              <li key={f.name} className="cb-plist__row">
                {' '}
                <Icon
                  name="receipt"
                  size={18}
                  style={{
                    color: 'var(--text-3)',
                  }}
                />{' '}
                <div className="cb-plist__main">
                  {' '}
                  <div className="cb-plist__t">{f.name}</div>
                  {f.amount ? <div className="cb-plist__s cb-tabular">{f.amount}</div> : null}
                </div>{' '}
                <FeeStatusBadge status={f.status} lang={lang} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {c.email || c.phone ? (
        <div className="cb-psec">
          {' '}
          <h3 className="cb-psec__title">{t.contact}</h3>{' '}
          <div
            className="cb-plist__s"
            style={{
              fontSize: 14,
              color: 'var(--text-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {c.email ? (
              <span>
                {' '}
                <Icon
                  name="mail"
                  size={15}
                  style={{
                    verticalAlign: '-2px',
                    marginRight: 6,
                  }}
                />
                {c.email}
              </span>
            ) : null}
            {c.phone ? (
              <span className="cb-tabular">
                {' '}
                <Icon
                  name="phone"
                  size={15}
                  style={{
                    verticalAlign: '-2px',
                    marginRight: 6,
                  }}
                />
                {c.phone}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </SideSheet>
  );
}
