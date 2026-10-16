import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Public ticket pages have no signed-in user, so they read with the server key,
// and only ever show what a buyer needs: the event and its ticket types.

export async function getSaleEvent(eventId: string) {
  if (!process.env.SUPABASE_SECRET_KEY) return null;
  const admin = createAdminClient();
  const { data: e } = await admin
    .from('events')
    .select('id, title, starts_at, ends_at, location, address, cancelled_at, organizations!inner(name, brand_color)')
    .eq('id', eventId)
    .eq('type', 'concert')
    .maybeSingle();
  if (!e) return null;
  const { data: types } = await admin.from('ticket_types').select('id, name, price_cents, capacity, sales_start_at, sales_end_at').eq('event_id', eventId).order('price_cents', { ascending: false });
  const left = await Promise.all(
    (types ?? []).map(async (x) => {
      if (x.capacity === null) return null;
      const { count } = await admin.from('tickets').select('id', { count: 'exact', head: true }).eq('ticket_type_id', x.id).is('voided_at', null);
      return Math.max(0, x.capacity - (count ?? 0));
    }),
  );
  return { event: e, types: (types ?? []).map((x, i) => ({ ...x, left: left[i] ?? null })) };
}

export async function getSeller(code: string) {
  if (!process.env.SUPABASE_SECRET_KEY || !/^[a-z0-9]{6,16}$/.test(code)) return null;
  const { data } = await createAdminClient().from('seller_links').select('event_id, people!inner(first_name)').eq('code', code).maybeSingle();
  return data ? { eventId: data.event_id, firstName: data.people.first_name } : null;
}
