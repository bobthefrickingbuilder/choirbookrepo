'use client';

import * as React from 'react';
import { Badge } from '../badges/Badge';
import { Button } from '../buttons/Button';
import { Checkbox } from '../forms/Checkbox';
import { TextInput } from '../forms/TextInput';
import { Icon } from '../icons/Icon';

export interface Signature {
  name: string;
  /** Localised display time of signing. */
  at: string;
}

export interface ConsentSignatureProps {
  title: React.ReactNode;
  /** The wording being agreed to. */
  children?: React.ReactNode;
  agreeLabel?: React.ReactNode;
  signed?: Signature | null;
  onSign?: (signature: Signature) => void;
  onClear?: () => void;
  locale?: string;
  required?: boolean;
  className?: string;
}

export function ConsentSignature({
  title,
  children,
  agreeLabel,
  signed,
  onSign,
  onClear,
  locale = 'en-CA',
  required = true,
  className = '',
}: ConsentSignatureProps) {
  const fr = locale.indexOf('fr') === 0;
  const L = fr
    ? {
        req: 'Obligatoire',
        agree: 'J’ai lu et j’accepte ce qui précède.',
        sig: 'Signature',
        hint: 'Tapez votre nom légal complet. Cela a la même valeur qu’une signature manuscrite.',
        ph: 'Votre nom complet',
        sign: 'Signer',
        date: 'Date',
        name: 'Signé par',
        errAgree: 'Cochez la case pour confirmer que vous acceptez.',
        errName: 'Tapez votre nom complet pour signer.',
        signedBy: (n: string, d: string) => 'Signé par ' + n + ' le ' + d,
        clear: 'Retirer la signature',
      }
    : {
        req: 'Required',
        agree: 'I have read and agree to the above.',
        sig: 'Signature',
        hint: 'Type your full legal name. This has the same effect as a handwritten signature.',
        ph: 'Your full name',
        sign: 'Sign',
        date: 'Date',
        name: 'Signed by',
        errAgree: 'Tick the box to confirm you agree.',
        errName: 'Type your full name to sign.',
        signedBy: (n: string, d: string) => 'Signed by ' + n + ' on ' + d,
        clear: 'Withdraw signature',
      };
  const [agree, setAgree] = React.useState(false);
  const [name, setName] = React.useState('');
  const [err, setErr] = React.useState<{ agree?: string | null; name?: string | null }>({});
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const submit = () => {
    const e = {
      agree: !agree ? L.errAgree : null,
      name: name.trim().length < 3 ? L.errName : null,
    };
    setErr(e);
    if (!e.agree && !e.name && onSign)
      onSign({
        name: name.trim(),
        at: new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(now),
      });
  };
  const hasErr = err.agree || err.name;
  return (
    <section className={'cb-consent' + (hasErr && !signed ? ' cb-consent--error' : '') + ' ' + className}>
      {' '}
      <div className="cb-consent__head">
        {' '}
        <h3 className="cb-consent__title">{title}</h3>
        {required ? (
          <Badge tone={signed ? 'success' : 'neutral'} icon={signed ? 'circle-check' : 'signature'}>
            {signed ? (fr ? 'Signé' : 'Signed') : L.req}
          </Badge>
        ) : null}
      </div>{' '}
      <div className="cb-consent__doc" tabIndex={0}>
        {children}
      </div>
      {signed ? (
        <>
          {' '}
          <div className="cb-sig">
            {' '}
            <div className="cb-sig__ink">{signed.name}</div>{' '}
            <div className="cb-sig__line">
              {' '}
              <span>
                {L.name} <b>{signed.name}</b>
              </span>{' '}
              <span
                style={{
                  marginLeft: 'auto',
                }}
              >
                {signed.at}
              </span>
            </div>
          </div>{' '}
          <div className="cb-consent__signed" role="status">
            {' '}
            <Icon name="check-check" size={18} strokeWidth={2.25} />{' '}
            <span>{L.signedBy(signed.name, signed.at)}</span>
          </div>
          {onClear ? (
            <div>
              {' '}
              <button
                type="button"
                className="cb-link"
                style={{
                  fontSize: 14,
                }}
                onClick={() => {
                  setAgree(false);
                  setName('');
                  onClear();
                }}
              >
                {L.clear}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {' '}
          <div>
            {' '}
            <Checkbox
              label={agreeLabel || L.agree}
              checked={agree}
              error={!!err.agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                setErr((x) => ({
                  ...x,
                  agree: null,
                }));
              }}
            />
            {err.agree ? (
              <p
                className="cb-errmsg"
                style={{
                  marginTop: 2,
                }}
              >
                {' '}
                <Icon name="circle-alert" size={16} strokeWidth={2} /> <span>{err.agree}</span>
              </p>
            ) : null}
          </div>{' '}
          <TextInput
            label={L.sig}
            hint={L.hint}
            placeholder={L.ph}
            value={name}
            error={err.name}
            autoComplete="name"
            onChange={(e) => {
              setName(e.target.value);
              setErr((x) => ({
                ...x,
                name: null,
              }));
            }}
            iconStart="signature"
          />{' '}
          <div className="cb-sig" aria-hidden="true">
            {' '}
            <div className={'cb-sig__ink' + (name ? '' : ' cb-sig__ink--empty')}>{name || L.ph}</div>{' '}
            <div className="cb-sig__line">
              {' '}
              <Icon name="x" size={14} strokeWidth={2.25} /> <span>{L.sig}</span>{' '}
              <span
                style={{
                  marginLeft: 'auto',
                }}
              >
                {L.date}
                {': '} <b>{dateStr}</b>
              </span>
            </div>
          </div>{' '}
          <div className="cb-consent__foot">
            {' '}
            <Button iconStart="pen-line" onClick={submit}>
              {L.sign}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
