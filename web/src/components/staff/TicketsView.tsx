import { format, type Lang, type Messages } from '@choirbook/shared/i18n';
import { Badge, Button, Card, EmptyState } from '@choirbook/ui';
import { CopyText } from '@/components/member/SmallActions';
import { CompIssuer, RefundOrderButton, TicketTypeForm, VoidTicketButton } from '@/components/staff/TicketParts';
import { publicEnv } from '@/lib/env';
import { formatDate, formatMoney, formatRange, isoDaysFromNow, localParts } from '@/lib/format';
import type { ChoirContext } from '@/lib/session';
import { staffStrings } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

/** The staff side of Tickets: one card per upcoming concert. */
export async function TicketsView({ ctx, slug, lang, t }: { ctx: ChoirContext; slug: string; lang: Lang; t: Messages }) {
  const supabase = await createClient();
  const org = ctx.org.id;
  const [{ data: concerts }, { data: choristers }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, starts_at, ends_at, cancelled_at')
      .eq('organization_id', org)
      .eq('type', 'concert')
      .gte('starts_at', isoDaysFromNow(-14))
      .order('starts_at'),
    supabase.from('choristers').select('person_id, people!inner(first_name, last_name, preferred_name)').eq('organization_id', org).eq('status', 'active'),
  ]);
  const eventIds = (concerts ?? []).map((c) => c.id);
  const [{ data: types }, { data: tickets }, { data: orders }, { data: sellers }] = eventIds.length
    ? await Promise.all([
        supabase.from('ticket_types').select('*').in('event_id', eventIds).order('price_cents', { ascending: false }),
        supabase.from('tickets').select('id, ticket_type_id, order_id, issued_to, is_comp, scanned_at, voided_at, code').eq('organization_id', org),
        supabase.from('ticket_orders').select('id, event_id, buyer_name, buyer_email, total_cents, status, seller_link_id, created_at').in('event_id', eventIds).order('created_at', { ascending: false }),
        supabase.from('seller_links').select('id, event_id, person_id, code').in('event_id', eventIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const people = (choristers ?? [])
    .map((c) => ({ id: c.person_id, name: `${c.people.preferred_name || c.people.first_name} ${c.people.last_name}` }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const nameOf = (pid: string | null) => people.find((p) => p.id === pid)?.name ?? '—';
  const s = staffStrings(t);
  const canEdit = ctx.can('tickets', 'edit');
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">{t.staff.ticketsTitle}</h1>
          <p className="page__lede">{t.staff.ticketsSub}</p>
        </div>
        {ctx.isChorister ? (
          <div className="page__actions">
            <Button variant="ghost" iconStart="user-round" href={`/c/${slug}/tickets?mine=1`}>
              {t.staff.myTickets}
            </Button>
          </div>
        ) : null}
      </div>
      {!concerts?.length ? (
        <Card padded={false}>
          <EmptyState icon="ticket" size="sm">
            {t.staff.noConcerts}
          </EmptyState>
        </Card>
      ) : null}
      {(concerts ?? []).map((c) => {
        const myTypes = (types ?? []).filter((x) => x.event_id === c.id);
        const valid = (tickets ?? []).filter((k) => myTypes.some((x) => x.id === k.ticket_type_id) && !k.voided_at);
        const myOrders = (orders ?? []).filter((o) => o.event_id === c.id);
        const revenue = myOrders.filter((o) => o.status === 'paid').reduce((n, o) => n + o.total_cents, 0);
        const bySeller = (sellers ?? [])
          .filter((x) => x.event_id === c.id)
          .map((x) => {
            const sold = myOrders.filter((o) => o.seller_link_id === x.id && o.status === 'paid');
            return { name: nameOf(x.person_id), orders: sold.length, tickets: valid.filter((k) => sold.some((o) => o.id === k.order_id)).length };
          })
          .filter((x) => x.orders > 0)
          .sort((a, b) => b.tickets - a.tickets);
        const comps = valid.filter((k) => k.is_comp);
        const upcoming = localParts(c.starts_at).date >= localParts(isoDaysFromNow(0)).date;
        const link = `${site}/buy/event/${c.id}`;
        return (
          <Card
            key={c.id}
            title={
              <span>
                {c.title} <span className="muted small">· {formatRange(c.starts_at, c.ends_at, lang)}</span>
              </span>
            }
            action={
              canEdit && upcoming ? (
                <Button size="sm" iconStart="scan-line" href={`/c/${slug}/tickets/scan/${c.id}`}>
                  {t.staff.doorScan}
                </Button>
              ) : undefined
            }
          >
            <div className="stack" style={{ gap: 18 }}>
              <div className="stat-strip">
                <div>
                  <span className="muted small">{t.staff.ticketsSold}</span>
                  <strong>{valid.length - comps.length}</strong>
                </div>
                <div>
                  <span className="muted small">{t.staff.revenue}</span>
                  <strong>{formatMoney(revenue, lang)}</strong>
                </div>
                <div>
                  <span className="muted small">{t.staff.comps}</span>
                  <strong>{comps.length}</strong>
                </div>
                <div>
                  <span className="muted small">{t.staff.scanned}</span>
                  <strong>{valid.filter((k) => k.scanned_at).length}</strong>
                </div>
              </div>

              <div>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <h3 className="section-title">{t.staff.ticketTypes}</h3>
                  {canEdit ? <TicketTypeForm slug={slug} eventId={c.id} s={s} /> : null}
                </div>
                {myTypes.length ? (
                  <ul className="plain-list">
                    {myTypes.map((x) => {
                      const sold = valid.filter((k) => k.ticket_type_id === x.id).length;
                      return (
                        <li key={x.id} className="person-row">
                          <div style={{ flex: 1 }}>
                            <div className="person-row__name">
                              {x.name} · {x.price_cents ? formatMoney(x.price_cents, lang) : t.staff.buyFree}
                            </div>
                            <div className="muted small">
                              {x.capacity !== null ? format(t.staff.soldOfCap, { sold, cap: x.capacity }) : format(t.staff.soldOf, { sold })}
                              {x.sales_end_at ? ` · ${t.staff.salesEnd} ${formatDate(x.sales_end_at, lang, { month: 'short', day: 'numeric' })}` : ''}
                            </div>
                          </div>
                          {canEdit ? (
                            <TicketTypeForm
                              slug={slug}
                              eventId={c.id}
                              id={x.id}
                              s={s}
                              initial={{
                                name: x.name,
                                price: (x.price_cents / 100).toFixed(2),
                                capacity: x.capacity === null ? '' : String(x.capacity),
                                sales_start: x.sales_start_at ? localParts(x.sales_start_at).date : '',
                                sales_end: x.sales_end_at ? localParts(x.sales_end_at).date : '',
                              }}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted">{t.staff.noneYet}</p>
                )}
                {myTypes.length ? (
                  <div className="link-box" style={{ marginTop: 10 }}>
                    <span className="muted small">{t.staff.publicLink}</span>
                    <code>{link}</code>
                    <CopyText text={link} copy={t.member.copyLink} copied={t.member.copied} />
                  </div>
                ) : null}
              </div>

              <div className="profile-grid">
                <div>
                  <div className="row-between" style={{ marginBottom: 6 }}>
                    <h3 className="section-title">{t.staff.comps}</h3>
                    {canEdit ? <CompIssuer slug={slug} types={myTypes.map((x) => ({ id: x.id, name: x.name }))} people={people} s={s} /> : null}
                  </div>
                  {comps.length ? (
                    <ul className="plain-list">
                      {comps.map((k) => (
                        <li key={k.id} className="history-row">
                          <span>
                            {nameOf(k.issued_to)} · <span className="muted small cb-tabular">{k.code.slice(0, 8).toUpperCase()}</span>
                          </span>
                          {canEdit && !k.scanned_at ? <VoidTicketButton slug={slug} ticketId={k.id} s={s} /> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">{t.staff.noneYet}</p>
                  )}
                </div>
                <div>
                  <h3 className="section-title" style={{ marginBottom: 6 }}>
                    {t.staff.bySeller}
                  </h3>
                  {bySeller.length ? (
                    <ul className="plain-list">
                      {bySeller.map((x) => (
                        <li key={x.name} className="history-row">
                          <span>{x.name}</span>
                          <Badge tone="neutral">{format(t.staff.soldOf, { sold: x.tickets })}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">{t.staff.noneYet}</p>
                  )}
                </div>
              </div>

              {myOrders.length ? (
                <details className="history">
                  <summary>
                    {t.staff.orders} ({myOrders.length})
                  </summary>
                  <div className="table-scroll" style={{ marginTop: 8 }}>
                    <table className="simple-table">
                      <thead>
                        <tr>
                          <th scope="col">{t.staff.date}</th>
                          <th scope="col">{t.staff.buyer}</th>
                          <th scope="col" className="num">{t.staff.total}</th>
                          <th scope="col">{t.staff.status}</th>
                          <th scope="col">
                            <span className="cb-sr-only">{t.staff.refund}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {myOrders.map((o) => (
                          <tr key={o.id}>
                            <td>{formatDate(o.created_at, lang, { month: 'short', day: 'numeric' })}</td>
                            <td>
                              {o.buyer_name}
                              <div className="muted small">{o.buyer_email}</div>
                            </td>
                            <td className="num">{formatMoney(o.total_cents, lang)}</td>
                            <td>
                              <Badge tone={o.status === 'paid' ? 'success' : 'slate'}>{o.status === 'refunded' ? t.staff.orderRefunded : t.staff.paid}</Badge>
                            </td>
                            <td>{canEdit && o.status === 'paid' ? <RefundOrderButton slug={slug} orderId={o.id} s={s} /> : null}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
