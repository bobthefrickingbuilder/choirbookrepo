'use client';

import { format } from '@choirbook/shared/i18n';
import { AlertCard, Button } from '@choirbook/ui';
import { useEffect, useState } from 'react';
import { getDoorCode, type DoorCode } from '@/app/actions/attendance';

/** Full-screen door display: a QR code that refreshes before each 30-second window ends. */
export function QrDoor({
  slug,
  eventId,
  title,
  backHref,
  s,
}: {
  slug: string;
  eventId: string;
  title: string;
  backHref: string;
  s: { qrTitle: string; qrHelp: string; qrManual: string; checkedInN: string; exitFullScreen: string; failed: string };
}) {
  const [code, setCode] = useState<DoorCode | null>(null);
  const [left, setLeft] = useState(30);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const load = async () => {
      const r = await getDoorCode(slug, eventId);
      if (stopped) return;
      if (r.ok) {
        setCode(r.data);
        setLeft(r.data.secondsLeft);
        setFailed(false);
        // Fetch the next code just as this one rolls over.
        timer = setTimeout(load, Math.max(1, r.data.secondsLeft) * 1000 + 300);
      } else {
        setFailed(true);
        timer = setTimeout(load, 5000);
      }
    };
    void load();
    const tick = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [slug, eventId]);

  return (
    <div className="qr-screen qr-screen--overlay">
      <p className="overline overline--accent">{title}</p>
      <h1 className="qr-screen__title">{s.qrTitle}</h1>
      {failed ? <AlertCard tone="error">{s.failed}</AlertCard> : null}
      <div className="qr-screen__code" role="img" aria-label={s.qrTitle}>
        {code ? <div dangerouslySetInnerHTML={{ __html: code.svg }} style={{ width: '100%', height: '100%' }} /> : null}
      </div>
      <div className="qr-bar" aria-hidden>
        <span style={{ width: `${(left / 30) * 100}%` }} />
      </div>
      <p className="qr-screen__count" role="status" aria-live="polite">
        {format(s.checkedInN, { n: code?.checkedIn ?? 0 })}
      </p>
      <p className="qr-screen__manual">{s.qrHelp}</p>
      {code ? (
        <p className="qr-screen__manual">
          {format(s.qrManual, { url: code.url })} <code>{code.code}</code>
        </p>
      ) : null}
      <Button variant="ghost" iconStart="arrow-left" href={backHref}>
        {s.exitFullScreen}
      </Button>
    </div>
  );
}
