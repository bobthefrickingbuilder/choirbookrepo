'use client';

import { AlertCard, Button, Select, TextInput } from '@choirbook/ui';
import { useState, useTransition } from 'react';
import { startPurchase } from '@/app/actions/tickets';

export interface BuyType {
  id: string;
  name: string;
  price: string;
  cents: number;
  left: number | null;
  open: boolean;
}

export function BuyForm({
  eventId,
  sellerCode,
  types,
  locale,
  s,
}: {
  eventId: string;
  sellerCode: string | null;
  types: BuyType[];
  locale: string;
  s: Record<'buyName' | 'buyEmail' | 'buyQty' | 'buyTotal' | 'buyFree' | 'buyPay' | 'buyGet' | 'buyClosed' | 'buySoldOut' | 'buyPaymentsOff' | 'buyPrivacy' | 'failed' | 'required' | 'badEmail', string>;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const total = types.reduce((n, x) => n + x.cents * (qty[x.id] ?? 0), 0);
  const count = Object.values(qty).reduce((n, q) => n + q, 0);
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(total / 100);
  const errors: Record<string, string> = {
    closed: s.buyClosed,
    sold_out: s.buySoldOut,
    payments_off: s.buyPaymentsOff,
    required: s.required,
    bad_email: s.badEmail,
  };

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await startPurchase(eventId, sellerCode, { name, email, items: qty });
          if (r.ok) window.location.assign(r.url);
          else setError(errors[r.error] ?? s.failed);
        });
      }}
    >
      {error ? <AlertCard tone="error">{error}</AlertCard> : null}
      <ul className="buy-lines">
        {types.map((x) => {
          const max = Math.min(10, x.left ?? 10);
          return (
            <li key={x.id}>
              <span>
                <strong>{x.name}</strong>
                <span className="muted"> · {x.cents ? x.price : s.buyFree}</span>
              </span>
              {x.open && max > 0 ? (
                <div style={{ width: 96 }}>
                  <Select
                    label={`${s.buyQty}: ${x.name}`}
                    size="sm"
                    value={String(qty[x.id] ?? 0)}
                    onChange={(e) => setQty({ ...qty, [x.id]: Number(e.target.value) })}
                    options={Array.from({ length: max + 1 }, (_, i) => String(i))}
                  />
                </div>
              ) : (
                <span className="muted small">{x.open ? s.buySoldOut : s.buyClosed}</span>
              )}
            </li>
          );
        })}
      </ul>
      <TextInput label={s.buyName} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={160} required />
      <TextInput label={s.buyEmail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <p className="muted small" style={{ margin: 0 }}>
        {s.buyPrivacy}
      </p>
      <div className="row-between">
        <strong>
          {s.buyTotal}: {total ? money : s.buyFree}
        </strong>
        <Button type="submit" size="lg" iconStart="ticket" loading={pending} disabled={!count || !name.trim() || !email.trim()}>
          {total ? s.buyPay : s.buyGet}
        </Button>
      </div>
    </form>
  );
}
