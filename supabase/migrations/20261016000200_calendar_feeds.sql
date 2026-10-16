-- Personal calendar subscription links. A calendar app (Google, Apple, Outlook)
-- fetches /api/calendar/<token>.ics without signing in, so the token is the
-- only key: long, random, per member and per choir, and replaceable.

create table public.calendar_feeds (
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);
alter table public.calendar_feeds enable row level security;

create policy calendar_feeds_own on public.calendar_feeds for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select app.is_member(organization_id)));
grant select, insert, update, delete on public.calendar_feeds to authenticated;

-- The events a feed shows: the member's choir, the whole choir or their section,
-- not cancelled. Only what a calendar needs; no personal data.
create function public.calendar_feed(feed_token text)
returns table (
  id uuid, type public.event_type, title text, description text, starts_at timestamptz, ends_at timestamptz,
  all_day boolean, location text, address text, updated_at timestamptz, choir_name text
)
language sql stable security definer set search_path = '' as $$
  select e.id, e.type, e.title, e.description, e.starts_at, e.ends_at, e.all_day, e.location, e.address, e.updated_at, o.name
  from public.calendar_feeds f
  join public.organizations o on o.id = f.organization_id
  join public.people p on p.organization_id = f.organization_id and p.user_id = f.user_id and p.status = 'active'
  left join public.choristers c on c.person_id = p.id
  join public.events e on e.organization_id = f.organization_id
  where f.token = feed_token
    and length(feed_token) = 48
    and e.cancelled_at is null
    and (cardinality(e.section_ids) = 0 or c.section_id = any (e.section_ids) or exists (select 1 from public.member_roles mr where mr.person_id = p.id))
    and e.starts_at > now() - interval '60 days'
  order by e.starts_at
$$;
revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated, service_role;
