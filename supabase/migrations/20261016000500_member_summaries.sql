-- Summaries members may see without seeing other people's rows: how many
-- tickets their personal sales link has sold, and how full each volunteer slot is.

create function public.my_ticket_sales(org uuid)
returns table (event_id uuid, code text, orders int, tickets int)
language sql stable security definer set search_path = '' as $$
  select sl.event_id, sl.code,
         (select count(*)::int from public.ticket_orders o where o.seller_link_id = sl.id and o.status = 'paid'),
         (select count(*)::int from public.tickets t join public.ticket_orders o on o.id = t.order_id
           where o.seller_link_id = sl.id and o.status = 'paid' and t.voided_at is null)
  from public.seller_links sl
  where sl.organization_id = org and app.is_me(sl.person_id)
$$;
revoke all on function public.my_ticket_sales(uuid) from public, anon;
grant execute on function public.my_ticket_sales(uuid) to authenticated;

create function public.volunteer_slot_fill(org uuid)
returns table (slot_id uuid, taken int)
language sql stable security definer set search_path = '' as $$
  select s.id, (select count(*)::int from public.volunteer_signups v where v.slot_id = s.id)
  from public.volunteer_slots s
  where s.organization_id = org and app.is_member(org)
$$;
revoke all on function public.volunteer_slot_fill(uuid) from public, anon;
grant execute on function public.volunteer_slot_fill(uuid) to authenticated;

-- Demo rebuild with later fixes applied on top of reset_demo(): the holiday
-- party moves to the Friday so it no longer clashes with that Thursday's rehearsal.
-- The nightly job calls this.
create function public.rebuild_demo(demo_password text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
begin
  result := public.reset_demo(demo_password);
  update public.events
     set starts_at = starts_at + interval '1 day', ends_at = ends_at + interval '1 day'
   where organization_id = app.demo_org_id() and type = 'social' and title = 'Holiday party';
  return result;
end $$;
revoke all on function public.rebuild_demo(text) from public, anon, authenticated;
grant execute on function public.rebuild_demo(text) to service_role;
