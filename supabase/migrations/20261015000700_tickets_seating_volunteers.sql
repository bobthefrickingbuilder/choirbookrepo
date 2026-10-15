-- Concert tickets and orders; seating and riser charts; volunteer jobs,
-- time slots and sign-ups; chaperone police-check expiry dates.

create type public.order_status as enum ('pending', 'paid', 'refunded', 'partially_refunded', 'cancelled');

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  event_id uuid not null,
  name text not null check (length(name) between 1 and 80),
  price_cents int not null check (price_cents >= 0),
  capacity int check (capacity >= 0),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade
);

-- Each chorister can have a personal sales link; orders through it credit them.
create table public.seller_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  event_id uuid not null,
  person_id uuid not null,
  code text not null unique check (code ~ '^[a-z0-9]{6,16}$'),
  created_at timestamptz not null default now(),
  unique (event_id, person_id),
  unique (organization_id, id),
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);

-- Orders come from the public sales page (server, with the service key) or
-- are comps issued by ticket staff.
create table public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  event_id uuid not null,
  buyer_name text not null check (length(buyer_name) between 1 and 160),
  buyer_email extensions.citext not null,
  seller_link_id uuid,
  total_cents int not null check (total_cents >= 0),
  refunded_cents int not null default 0 check (refunded_cents >= 0),
  status public.order_status not null default 'pending',
  stripe_checkout_session_id text unique,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade,
  foreign key (organization_id, seller_link_id) references public.seller_links (organization_id, id) on delete set null (seller_link_id)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid,
  ticket_type_id uuid not null,
  -- Comp tickets issued to a chorister.
  issued_to uuid,
  is_comp boolean not null default false,
  -- Random code printed as a QR and checked at the door.
  code text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  scanned_at timestamptz,
  scanned_by uuid references auth.users (id) on delete set null,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, order_id) references public.ticket_orders (organization_id, id) on delete cascade,
  foreign key (organization_id, ticket_type_id) references public.ticket_types (organization_id, id) on delete cascade,
  foreign key (organization_id, issued_to) references public.people (organization_id, id) on delete set null (issued_to)
);

-- ---------------------------------------------------------------------------
-- Seating and risers
-- ---------------------------------------------------------------------------

create table public.seating_charts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  event_id uuid not null,
  name text not null default 'Risers' check (length(name) <= 80),
  -- { "rows": [ { "label": "A", "seats": 14 }, … ] }
  layout jsonb not null default '{"rows": []}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade
);
create trigger seating_charts_touch before update on public.seating_charts
  for each row execute function app.touch_updated_at();

create table public.seating_positions (
  organization_id uuid not null,
  chart_id uuid not null,
  person_id uuid not null,
  row_label text not null check (length(row_label) <= 8),
  seat int not null check (seat >= 1),
  primary key (chart_id, person_id),
  unique (chart_id, row_label, seat),
  foreign key (organization_id, chart_id) references public.seating_charts (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Volunteers
-- ---------------------------------------------------------------------------

create table public.volunteer_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  event_id uuid,
  title text not null check (length(title) between 1 and 120),
  description text check (length(description) <= 2000),
  requires_police_check boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id) references public.organizations (id) on delete cascade,
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade
);

create table public.volunteer_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  job_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  needed int not null default 1 check (needed between 1 and 200),
  check (ends_at > starts_at),
  unique (organization_id, id),
  foreign key (organization_id, job_id) references public.volunteer_jobs (organization_id, id) on delete cascade
);

create table public.volunteer_signups (
  organization_id uuid not null,
  slot_id uuid not null,
  person_id uuid not null,
  created_at timestamptz not null default now(),
  hours_logged numeric(5, 2) check (hours_logged >= 0),
  primary key (slot_id, person_id),
  foreign key (organization_id, slot_id) references public.volunteer_slots (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);

-- A slot cannot take more sign-ups than it needs.
create function app.guard_volunteer_capacity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  taken int;
  cap int;
begin
  select needed into cap from public.volunteer_slots where id = new.slot_id for update;
  select count(*) into taken from public.volunteer_signups where slot_id = new.slot_id;
  if taken >= cap then
    raise exception 'This time slot is full' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger volunteer_signups_capacity before insert on public.volunteer_signups
  for each row execute function app.guard_volunteer_capacity();

-- Police checks for chaperones in youth choirs. Only the expiry date is stored, never the check itself.
create table public.chaperone_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null,
  check_type text not null default 'Vulnerable sector check' check (length(check_type) <= 80),
  verified_on date not null,
  expires_on date not null,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_on > verified_on),
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ticket_types enable row level security;
alter table public.seller_links enable row level security;
alter table public.ticket_orders enable row level security;
alter table public.tickets enable row level security;
alter table public.seating_charts enable row level security;
alter table public.seating_positions enable row level security;
alter table public.volunteer_jobs enable row level security;
alter table public.volunteer_slots enable row level security;
alter table public.volunteer_signups enable row level security;
alter table public.chaperone_checks enable row level security;

create policy ticket_types_select on public.ticket_types for select to authenticated
  using ((select app.is_member(organization_id)));
create policy ticket_types_write on public.ticket_types for all to authenticated
  using ((select app.has_perm(organization_id, 'tickets', 'edit')))
  with check ((select app.has_perm(organization_id, 'tickets', 'edit')));

create policy seller_links_select on public.seller_links for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'tickets', 'view')));
create policy seller_links_insert on public.seller_links for insert to authenticated
  with check ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'tickets', 'edit')));
create policy seller_links_delete on public.seller_links for delete to authenticated
  using ((select app.has_perm(organization_id, 'tickets', 'edit')));

-- Orders hold buyers' contact details: ticket staff only. A seller sees counts
-- through a summary function, not buyers' names and emails.
create policy ticket_orders_select on public.ticket_orders for select to authenticated
  using ((select app.has_perm(organization_id, 'tickets', 'view')));
create policy ticket_orders_write on public.ticket_orders for all to authenticated
  using ((select app.has_perm(organization_id, 'tickets', 'edit')))
  with check ((select app.has_perm(organization_id, 'tickets', 'edit')));

create policy tickets_select on public.tickets for select to authenticated
  using ((select app.is_me(issued_to)) or (select app.has_perm(organization_id, 'tickets', 'view')));
create policy tickets_write on public.tickets for all to authenticated
  using ((select app.has_perm(organization_id, 'tickets', 'edit')))
  with check ((select app.has_perm(organization_id, 'tickets', 'edit')));

create policy seating_charts_select on public.seating_charts for select to authenticated
  using (
    (published_at is not null and (select app.is_member(organization_id)))
    or (select app.has_perm(organization_id, 'seating', 'view'))
  );
create policy seating_charts_write on public.seating_charts for all to authenticated
  using ((select app.has_perm(organization_id, 'seating', 'edit')))
  with check ((select app.has_perm(organization_id, 'seating', 'edit')));

create policy seating_positions_select on public.seating_positions for select to authenticated
  using (
    (select app.has_perm(organization_id, 'seating', 'view'))
    or exists (
      select 1 from public.seating_charts sc
      where sc.id = chart_id and sc.published_at is not null and (select app.is_member(sc.organization_id))
    )
  );
create policy seating_positions_write on public.seating_positions for all to authenticated
  using ((select app.has_perm(organization_id, 'seating', 'edit')))
  with check ((select app.has_perm(organization_id, 'seating', 'edit')));

create policy volunteer_jobs_select on public.volunteer_jobs for select to authenticated
  using ((select app.is_member(organization_id)));
create policy volunteer_jobs_write on public.volunteer_jobs for all to authenticated
  using ((select app.has_perm(organization_id, 'volunteers', 'edit')))
  with check ((select app.has_perm(organization_id, 'volunteers', 'edit')));

create policy volunteer_slots_select on public.volunteer_slots for select to authenticated
  using ((select app.is_member(organization_id)));
create policy volunteer_slots_write on public.volunteer_slots for all to authenticated
  using ((select app.has_perm(organization_id, 'volunteers', 'edit')))
  with check ((select app.has_perm(organization_id, 'volunteers', 'edit')));

create policy volunteer_signups_select on public.volunteer_signups for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'volunteers', 'view')));
create policy volunteer_signups_insert on public.volunteer_signups for insert to authenticated
  with check ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'volunteers', 'edit')));
create policy volunteer_signups_delete on public.volunteer_signups for delete to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'volunteers', 'edit')));
create policy volunteer_signups_update on public.volunteer_signups for update to authenticated
  using ((select app.has_perm(organization_id, 'volunteers', 'edit')))
  with check ((select app.has_perm(organization_id, 'volunteers', 'edit')));

create policy chaperone_checks_select on public.chaperone_checks for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'volunteers', 'view')));
create policy chaperone_checks_write on public.chaperone_checks for all to authenticated
  using ((select app.has_perm(organization_id, 'volunteers', 'edit')))
  with check ((select app.has_perm(organization_id, 'volunteers', 'edit')));
