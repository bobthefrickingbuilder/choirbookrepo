'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { zonedInstant } from '@/lib/format';
import { currentUserId, dbError, done, fail, staffContext, uuid, type ActionResult } from '@/lib/staff';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Ticket setup, comps, refunds and door scanning (staff with "tickets" edit).

const typeSchema = z.object({
  name: z.string().trim().min(1, 'required').max(80),
  price: z.number().int().min(0).max(100_000),
  capacity: z.union([z.literal(''), z.coerce.number().int().min(0).max(100_000)]).transform((v) => (v === '' ? null : v)),
  sales_start: z.union([z.literal(''), z.iso.date()]),
  sales_end: z.union([z.literal(''), z.iso.date()]),
});
export type TicketTypeInput = z.input<typeof typeSchema>;

export async function saveTicketType(slug: string, eventId: string, id: string | null, input: TicketTypeInput): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'tickets');
  const parsed = typeSchema.safeParse(input);
  if (!ctx || !uuid.safeParse(eventId).success || (id && !uuid.safeParse(id).success)) return fail('not_allowed');
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');
  const v = parsed.data;
  const row = {
    name: v.name,
    price_cents: v.price,
    capacity: v.capacity,
    sales_start_at: v.sales_start ? zonedInstant(v.sales_start, '00:00').toISOString() : null,
    sales_end_at: v.sales_end ? zonedInstant(v.sales_end, '23:59').toISOString() : null,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from('ticket_types').update(row).eq('id', id).eq('organization_id', ctx.org.id)
    : await supabase.from('ticket_types').insert({ ...row, organization_id: ctx.org.id, event_id: eventId });
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/tickets`, 'layout');
  return done;
}

export async function deleteTicketType(slug: string, id: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'tickets');
  if (!ctx || !uuid.safeParse(id).success) return fail('not_allowed');
  const supabase = await createClient();
  const { count } = await supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('ticket_type_id', id);
  if (count) return fail('has_tickets');
  const { error } = await supabase.from('ticket_types').delete().eq('id', id).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/tickets`, 'layout');
  return done;
}

export async function issueComps(slug: string, ticketTypeId: string, personId: string, count: number): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'tickets');
  if (!ctx || !uuid.safeParse(ticketTypeId).success || !uuid.safeParse(personId).success || !Number.isInteger(count) || count < 1 || count > 10) return fail('invalid');
  const supabase = await createClient();
  const { error } = await supabase
    .from('tickets')
    .insert(Array.from({ length: count }, () => ({ organization_id: ctx.org.id, ticket_type_id: ticketTypeId, issued_to: personId, is_comp: true })));
  if (error) return fail(dbError(error));
  await supabase.rpc('notify_people', {
    org: ctx.org.id,
    people: [personId],
    category: 'tickets',
    title: count > 1 ? `${count} complimentary tickets` : 'A complimentary ticket',
    title_fr: count > 1 ? `${count} billets de faveur` : 'Un billet de faveur',
    link: `/c/${slug}/tickets`,
  });
  revalidatePath(`/c/${slug}/tickets`, 'layout');
  return done;
}

export async function voidTicket(slug: string, ticketId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'tickets');
  if (!ctx || !uuid.safeParse(ticketId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { error } = await supabase.from('tickets').update({ voided_at: new Date().toISOString() }).eq('id', ticketId).eq('organization_id', ctx.org.id);
  if (error) return fail(dbError(error));
  revalidatePath(`/c/${slug}/tickets`, 'layout');
  return done;
}

/** Refunds a whole order: through Stripe (test mode) when paid by card, and voids its tickets. */
export async function refundOrder(slug: string, orderId: string): Promise<ActionResult> {
  const ctx = await staffContext(slug, 'tickets');
  if (!ctx || !uuid.safeParse(orderId).success) return fail('not_allowed');
  const supabase = await createClient();
  const { data: order } = await supabase.from('ticket_orders').select('*').eq('id', orderId).eq('organization_id', ctx.org.id).maybeSingle();
  if (!order || order.status !== 'paid') return fail('invalid');
  if (order.stripe_checkout_session_id && order.total_cents > 0) {
    const stripe = getStripe();
    if (!stripe) return fail('payments_off');
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
      const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      if (!intent) return fail('failed');
      await stripe.refunds.create({ payment_intent: intent });
    } catch {
      return fail('failed');
    }
  }
  const { error } = await supabase.from('ticket_orders').update({ status: 'refunded', refunded_cents: order.total_cents }).eq('id', orderId);
  if (error) return fail(dbError(error));
  await supabase.from('tickets').update({ voided_at: new Date().toISOString() }).eq('order_id', orderId).is('voided_at', null);
  revalidatePath(`/c/${slug}/tickets`, 'layout');
  return done;
}

export type ScanResult =
  | { status: 'ok' | 'already'; type: string; buyer: string | null; at?: string }
  | { status: 'void' | 'wrong_event' | 'unknown' };

/** Checks a ticket at the door and marks it used. */
export async function scanTicket(slug: string, eventId: string, raw: string): Promise<ScanResult> {
  const ctx = await staffContext(slug, 'tickets', 'edit');
  const code = raw.trim().toLowerCase();
  if (!ctx || !uuid.safeParse(eventId).success || !/^[0-9a-f]{8,64}$/.test(code)) return { status: 'unknown' };
  const supabase = await createClient();
  // A short code (the first 8 characters printed under the QR) also works for typing in.
  const query = supabase.from('tickets').select('id, code, scanned_at, voided_at, ticket_types!inner(name, event_id), ticket_orders(buyer_name)').eq('organization_id', ctx.org.id);
  const { data: rows } = code.length === 24 ? await query.eq('code', code).limit(1) : await query.like('code', `${code}%`).limit(2);
  const t = rows?.length === 1 ? rows[0] : null;
  if (!t) return { status: 'unknown' };
  if (t.ticket_types.event_id !== eventId) return { status: 'wrong_event' };
  if (t.voided_at) return { status: 'void' };
  const buyer = t.ticket_orders?.buyer_name ?? null;
  if (t.scanned_at) return { status: 'already', type: t.ticket_types.name, buyer, at: t.scanned_at };
  await supabase.from('tickets').update({ scanned_at: new Date().toISOString(), scanned_by: await currentUserId() }).eq('id', t.id).is('scanned_at', null);
  return { status: 'ok', type: t.ticket_types.name, buyer };
}

// ---------------------------------------------------------------------------
// Public purchase (no sign-in). Runs with the server key after checking the
// event, sales window and capacity itself.
// ---------------------------------------------------------------------------

const buySchema = z.object({
  name: z.string().trim().min(2, 'required').max(160),
  email: z.email('bad_email'),
  items: z.record(uuid, z.number().int().min(0).max(10)),
});

export async function startPurchase(
  eventId: string,
  sellerCode: string | null,
  input: z.input<typeof buySchema>,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const parsed = buySchema.safeParse(input);
  if (!uuid.safeParse(eventId).success || !parsed.success) return { ok: false, error: parsed.success ? 'invalid' : (parsed.error.issues[0]?.message ?? 'invalid') };
  if (!process.env.SUPABASE_SECRET_KEY) return { ok: false, error: 'failed' };
  const admin = createAdminClient();
  const { data: event } = await admin.from('events').select('id, organization_id, title, starts_at, cancelled_at, organizations(name, slug)').eq('id', eventId).maybeSingle();
  if (!event || event.cancelled_at || Date.parse(event.starts_at) < Date.now()) return { ok: false, error: 'closed' };
  const { data: types } = await admin.from('ticket_types').select('*').eq('event_id', eventId);
  const now = Date.now();
  const wanted = Object.entries(parsed.data.items).filter(([, n]) => n > 0);
  if (!wanted.length || wanted.reduce((n, [, q]) => n + q, 0) > 10) return { ok: false, error: 'invalid' };

  let total = 0;
  const lines: { type: NonNullable<typeof types>[number]; qty: number }[] = [];
  for (const [typeId, qty] of wanted) {
    const type = types?.find((t) => t.id === typeId);
    if (!type) return { ok: false, error: 'invalid' };
    if ((type.sales_start_at && Date.parse(type.sales_start_at) > now) || (type.sales_end_at && Date.parse(type.sales_end_at) < now)) return { ok: false, error: 'closed' };
    if (type.capacity !== null) {
      const { count } = await admin.from('tickets').select('id', { count: 'exact', head: true }).eq('ticket_type_id', type.id).is('voided_at', null);
      if ((count ?? 0) + qty > type.capacity) return { ok: false, error: 'sold_out' };
    }
    total += type.price_cents * qty;
    lines.push({ type, qty });
  }

  let sellerId: string | null = null;
  if (sellerCode) {
    const { data: seller } = await admin.from('seller_links').select('id').eq('code', sellerCode).eq('event_id', eventId).maybeSingle();
    sellerId = seller?.id ?? null;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  if (total === 0) {
    const { data: order, error } = await admin
      .from('ticket_orders')
      .insert({ organization_id: event.organization_id, event_id: eventId, buyer_name: parsed.data.name, buyer_email: parsed.data.email, seller_link_id: sellerId, total_cents: 0, status: 'paid' })
      .select('id')
      .single();
    if (error || !order) return { ok: false, error: 'failed' };
    await admin.from('tickets').insert(lines.flatMap((l) => Array.from({ length: l.qty }, () => ({ organization_id: event.organization_id, order_id: order.id, ticket_type_id: l.type.id }))));
    await queueTicketEmail(event.organization_id, parsed.data.email, event.title, order.id);
    return { ok: true, url: `${site}/buy/tickets/${order.id}` };
  }

  const stripe = getStripe();
  if (!stripe) return { ok: false, error: 'payments_off' };
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'cad',
    customer_email: parsed.data.email,
    line_items: lines.map((l) => ({
      quantity: l.qty,
      price_data: { currency: 'cad', unit_amount: l.type.price_cents, product_data: { name: `${event.title}: ${l.type.name}` } },
    })),
    metadata: {
      kind: 'tickets',
      event_id: eventId,
      organization_id: event.organization_id,
      seller_link_id: sellerId ?? '',
      buyer_name: parsed.data.name.slice(0, 160),
      items: JSON.stringify(lines.map((l) => [l.type.id, l.qty])),
    },
    success_url: `${site}/buy/tickets/done?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/buy/${sellerCode ?? `event/${eventId}`}`,
  });
  return session.url ? { ok: true, url: session.url } : { ok: false, error: 'failed' };
}

async function queueTicketEmail(orgId: string, email: string, title: string, orderId: string) {
  // Goes out when email sending is switched on; demo choirs never send.
  await createAdminClient()
    .from('email_queue')
    .insert({ organization_id: orgId, to_email: email, template: 'tickets', subject: `Your tickets: ${title}`.slice(0, 200), payload: { order_id: orderId }, priority: 3 });
}

/** After Stripe sends the buyer back: record the paid order once, and return its id. */
export async function completePurchase(sessionId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe || !/^cs_test_[A-Za-z0-9]+$/.test(sessionId) || !process.env.SUPABASE_SECRET_KEY) return null;
  const admin = createAdminClient();
  const { data: existing } = await admin.from('ticket_orders').select('id').eq('stripe_checkout_session_id', sessionId).maybeSingle();
  if (existing) return existing.id;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const m = session.metadata ?? {};
  if (m.kind !== 'tickets' || session.payment_status !== 'paid' || !m.event_id || !m.organization_id) return null;
  const items = z.array(z.tuple([uuid, z.number().int().min(1).max(10)])).safeParse(JSON.parse(m.items ?? '[]'));
  if (!items.success) return null;
  const { data: order, error } = await admin
    .from('ticket_orders')
    .insert({
      organization_id: m.organization_id,
      event_id: m.event_id,
      buyer_name: m.buyer_name || session.customer_details?.name || 'Buyer',
      buyer_email: session.customer_details?.email ?? session.customer_email ?? 'unknown@example.com',
      seller_link_id: m.seller_link_id || null,
      total_cents: session.amount_total ?? 0,
      status: 'paid',
      stripe_checkout_session_id: sessionId,
    })
    .select('id')
    .single();
  if (error || !order) {
    // Someone else recorded it a moment ago.
    const { data: again } = await admin.from('ticket_orders').select('id').eq('stripe_checkout_session_id', sessionId).maybeSingle();
    return again?.id ?? null;
  }
  await admin.from('tickets').insert(items.data.flatMap(([typeId, qty]) => Array.from({ length: qty }, () => ({ organization_id: m.organization_id!, order_id: order.id, ticket_type_id: typeId }))));
  const { data: event } = await admin.from('events').select('title').eq('id', m.event_id).maybeSingle();
  await queueTicketEmail(m.organization_id, session.customer_details?.email ?? session.customer_email ?? '', event?.title ?? '', order.id);
  return order.id;
}
