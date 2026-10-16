import { format } from '@choirbook/shared/i18n';
import { Badge, Card, EmptyState } from '@choirbook/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { CopyText, SalesLinkButton } from '@/components/member/SmallActions';
import { publicEnv } from '@/lib/env';
import { formatRange } from '@/lib/format';
import { getT } from '@/lib/prefs';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Tickets' };

// Tickets for members: complimentary tickets with a door code, and a personal
// sales link per concert. (Staff ticket management comes in Phase 4.)
export default async function TicketsPage({ params }: PageProps<'/c/[choir]/tickets'>) {
  const { choir } = await params;
  const [ctx, { lang, t }] = await Promise.all([getChoirContext(choir), getT()]);
  if (!ctx) notFound();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [{ data: comps }, { data: concerts }, { data: sales }] = await Promise.all([
    supabase.from('tickets').select('id, code, scanned_at, voided_at, ticket_types(name, events(title, starts_at, ends_at, location))').eq('issued_to', ctx.personId),
    supabase.from('events').select('id, title, starts_at, ends_at, location, ticket_types(id)').eq('organization_id', ctx.org.id).eq('type', 'concert').gte('starts_at', nowIso).order('starts_at'),
    supabase.rpc('my_ticket_sales', { org: ctx.org.id }),
  ]);
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const onSale = (concerts ?? []).filter((c) => c.ticket_types.length > 0);
  const compCards = await Promise.all(
    (comps ?? [])
      .filter((c) => !c.voided_at)
      .map(async (c) => ({ ...c, qr: await QRCode.toString(c.code, { type: 'svg', margin: 1, width: 160 }) })),
  );

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <h1 className="page__title">{t.member.ticketsTitle}</h1>

      <Card title={t.member.myComps}>
        {compCards.length === 0 ? (
          <p className="muted">{t.member.noComps}</p>
        ) : (
          <div className="ticket-grid">
            {compCards.map((c) => {
              const ev = c.ticket_types?.events;
              return (
                <div key={c.id} className="ticket">
                  <div className="ticket__qr" dangerouslySetInnerHTML={{ __html: c.qr }} role="img" aria-label={`${ev?.title ?? ''} · ${c.code}`} />
                  <div className="stack" style={{ gap: 4 }}>
                    <strong>{ev?.title}</strong>
                    {ev ? <span className="muted">{formatRange(ev.starts_at, ev.ends_at, lang)}</span> : null}
                    <span className="muted">
                      {c.ticket_types?.name} · <span className="cb-tabular">{c.code.slice(0, 8).toUpperCase()}</span>
                    </span>
                    {c.scanned_at ? (
                      <Badge tone="neutral" icon="check-check">
                        {t.member.done}
                      </Badge>
                    ) : (
                      <span className="muted">{t.member.showAtDoor}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title={t.member.salesLink}>
        <div className="stack">
          <p className="muted">{t.member.salesIntro}</p>
          {onSale.length === 0 ? (
            <EmptyState icon="ticket" size="sm">
              {t.member.noConcerts}
            </EmptyState>
          ) : (
            <ul className="plain-list" style={{ gap: 16 }}>
              {onSale.map((c) => {
                const mine = (sales ?? []).find((s) => s.event_id === c.id);
                const url = mine ? `${site}/buy/${mine.code}` : null;
                return (
                  <li key={c.id} className="stack" style={{ gap: 6 }}>
                    <strong>{c.title}</strong>
                    <span className="muted">{formatRange(c.starts_at, c.ends_at, lang)}</span>
                    {url ? (
                      <>
                        <div className="link-box">
                          <code>{url}</code>
                          <CopyText text={url} copy={t.member.copyLink} copied={t.member.copied} />
                        </div>
                        <span>{format(t.member.soldN, { n: mine?.tickets ?? 0 })}</span>
                      </>
                    ) : (
                      <div>
                        <SalesLinkButton slug={choir} eventId={c.id} label={t.member.getSalesLink} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
