'use client';

import jsQR from 'jsqr';
import { AlertCard, Button, ConfirmDialog, IconButton, Modal, Select, TextInput } from '@choirbook/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { deleteTicketType, issueComps, refundOrder, saveTicketType, scanTicket, voidTicket, type ScanResult } from '@/app/actions/tickets';
import type { StaffStrings } from '@/lib/staff';

type Result = { ok: true } | { ok: false; error: string };

function useRun(s: StaffStrings) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const msg = (code: string) => (code === 'has_tickets' ? s.hasTickets : code === 'payments_off' ? s.paymentsOff : (s.errors[code] ?? s.failed));
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(msg(r.error));
      setError(null);
      after?.();
      router.refresh();
    });
  return { pending, error, run };
}

export interface TicketTypeValues {
  name: string;
  price: string;
  capacity: string;
  sales_start: string;
  sales_end: string;
}

export function TicketTypeForm({ slug, eventId, id, initial, s }: { slug: string; eventId: string; id?: string; initial?: TicketTypeValues; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<TicketTypeValues>(initial ?? { name: '', price: '', capacity: '', sales_start: '', sales_end: '' });
  const { pending, error, run } = useRun(s);
  const [confirm, setConfirm] = useState(false);
  const cents = Math.round(Number(v.price.replace(',', '.')) * 100) || 0;
  return (
    <>
      {id ? (
        <IconButton icon="pencil" size="sm" label={`${s.editTicketType}: ${initial?.name ?? ''}`} onClick={() => setOpen(true)} />
      ) : (
        <Button size="sm" variant="secondary" iconStart="plus" onClick={() => setOpen(true)}>
          {s.addTicketType}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={id ? s.editTicketType : s.addTicketType}
        closeLabel={s.close}
        footer={
          <>
            {id ? (
              <Button variant="ghost" iconStart="trash-2" style={{ marginRight: 'auto' }} onClick={() => setConfirm(true)}>
                {s.delete}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!v.name.trim()} onClick={() => run(() => saveTicketType(slug, eventId, id ?? null, { ...v, price: cents }), () => setOpen(false))}>
              {s.save}
            </Button>
          </>
        }
      >
        <div className="form-2col">
          {error ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <AlertCard tone="error">{error}</AlertCard>
            </div>
          ) : null}
          <TextInput label={s.name} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} placeholder="Adult" />
          <TextInput label={s.price} prefix="$" inputMode="decimal" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} />
          <TextInput label={s.capacity} hint={s.capacityHint} optional inputMode="numeric" value={v.capacity} onChange={(e) => setV({ ...v, capacity: e.target.value.replace(/\D/g, '') })} />
          <span />
          <TextInput label={s.salesStart} optional type="date" value={v.sales_start} onChange={(e) => setV({ ...v, sales_start: e.target.value })} />
          <TextInput label={s.salesEnd} optional type="date" value={v.sales_end} onChange={(e) => setV({ ...v, sales_end: e.target.value })} />
        </div>
      </Modal>
      {id ? (
        <ConfirmDialog
          open={confirm}
          title={s.delete}
          tone="danger"
          confirmLabel={s.delete}
          cancelLabel={s.cancel}
          loading={pending}
          onCancel={() => setConfirm(false)}
          onConfirm={() =>
            run(
              () => deleteTicketType(slug, id),
              () => {
                setConfirm(false);
                setOpen(false);
              },
            )
          }
        >
          {s.confirmDelete}
        </ConfirmDialog>
      ) : null}
    </>
  );
}

export function CompIssuer({ slug, types, people, s }: { slug: string; types: { id: string; name: string }[]; people: { id: string; name: string }[]; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ type: types[0]?.id ?? '', person: '', count: '2' });
  const { pending, error, run } = useRun(s);
  if (!types.length) return null;
  return (
    <>
      <Button size="sm" variant="ghost" iconStart="ticket" onClick={() => setOpen(true)}>
        {s.issueComp}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={s.issueComp}
        closeLabel={s.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button loading={pending} disabled={!v.person || !v.type} onClick={() => run(() => issueComps(slug, v.type, v.person, Number(v.count)), () => setOpen(false))}>
              {s.issueComp}
            </Button>
          </>
        }
      >
        <div className="stack">
          {error ? <AlertCard tone="error">{error}</AlertCard> : null}
          <Select label={s.compTo} value={v.person} onChange={(e) => setV({ ...v, person: e.target.value })} options={[{ value: '', label: '—' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
          <div className="form-2col">
            <Select label={s.ticketTypes} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })} options={types.map((t) => ({ value: t.id, label: t.name }))} />
            <Select label={s.howMany} value={v.count} onChange={(e) => setV({ ...v, count: e.target.value })} options={['1', '2', '3', '4', '5', '6']} />
          </div>
        </div>
      </Modal>
    </>
  );
}

export function RefundOrderButton({ slug, orderId, s }: { slug: string; orderId: string; s: StaffStrings }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useRun(s);
  return (
    <>
      <Button size="sm" variant="ghost" iconStart="rotate-ccw" onClick={() => setOpen(true)}>
        {s.refund}
      </Button>
      <ConfirmDialog
        open={open}
        title={s.refundOrder}
        tone="danger"
        confirmLabel={s.refundOrder}
        cancelLabel={s.cancel}
        loading={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => run(() => refundOrder(slug, orderId), () => setOpen(false))}
      >
        {error ?? s.refundOrderBody}
      </ConfirmDialog>
    </>
  );
}

export function VoidTicketButton({ slug, ticketId, s }: { slug: string; ticketId: string; s: StaffStrings }) {
  const { pending, run } = useRun(s);
  return <IconButton icon="x" size="sm" label={s.void} disabled={pending} onClick={() => run(() => voidTicket(slug, ticketId))} />;
}

/**
 * Door scanning: reads ticket QR codes with the device camera (jsQR, in the
 * browser), or a typed code. Each scan marks the ticket used.
 */
export function DoorScanner({ slug, eventId, s }: { slug: string; eventId: string; s: StaffStrings }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);
  const [noCam, setNoCam] = useState(false);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pending, start] = useTransition();
  const last = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const check = (raw: string) =>
    start(async () => {
      const r = await scanTicket(slug, eventId, raw);
      setResult(r);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(r.status === 'ok' ? 80 : [60, 60, 60]);
    });

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const v = video.current;
      const c = canvas.current;
      if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const g = c.getContext('2d', { willReadFrequently: true });
        if (g) {
          g.drawImage(v, 0, 0, c.width, c.height);
          const found = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: 'dontInvert' });
          const now = Date.now();
          // The same code is not checked twice in a row within three seconds.
          if (found?.data && (found.data !== last.current.code || now - last.current.at > 3000)) {
            last.current = { code: found.data, at: now };
            check(found.data);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        setNoCam(true);
        setOn(false);
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // check is stable enough for this purpose; restarting the camera on each render would flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  const tone = !result ? null : result.status === 'ok' ? 'success' : result.status === 'already' ? 'warning' : 'error';
  return (
    <div className="stack">
      {result ? (
        <div className={`scan-result scan-result--${tone}`} role="status" aria-live="assertive">
          <strong>{s[`scan_${result.status}`]}</strong>
          {'type' in result ? (
            <span>
              {result.type}
              {result.buyer ? ` · ${result.buyer}` : ''}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="scan-video" hidden={!on}>
        <video ref={video} playsInline muted aria-label={s.scanTitle} />
        <canvas ref={canvas} hidden />
      </div>
      {noCam ? <AlertCard tone="warning">{s.noCamera}</AlertCard> : null}
      <div>
        <Button variant={on ? 'secondary' : 'primary'} iconStart="scan-line" onClick={() => setOn(!on)}>
          {on ? s.stopCamera : s.startCamera}
        </Button>
      </div>
      <form
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) check(code);
          setCode('');
        }}
      >
        <TextInput label={s.ticketCode} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="none" style={{ fontFamily: 'var(--font-mono)' }} />
        <Button type="submit" variant="secondary" loading={pending} disabled={!code.trim()}>
          {s.check}
        </Button>
      </form>
    </div>
  );
}
