-- Events (rehearsals, concerts, sectionals, tours…), attendance, absence
-- reports and availability replies.

create type public.event_type as enum ('rehearsal', 'sectional', 'concert', 'tour', 'social', 'deadline');
create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');
create type public.absence_kind as enum ('absent', 'late');
create type public.availability_answer as enum ('yes', 'no', 'maybe');

create table public.event_series (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- iCalendar RRULE, e.g. FREQ=WEEKLY;BYDAY=TH;UNTIL=20270513
  rrule text not null check (length(rrule) <= 500),
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  season_id uuid,
  series_id uuid,
  type public.event_type not null,
  title text not null check (length(title) between 1 and 160),
  description text check (length(description) <= 4000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  call_at timestamptz,
  location text check (length(location) <= 200),
  address text check (length(address) <= 300),
  map_url text check (map_url ~ '^https://'),
  dress_code text check (length(dress_code) <= 500),
  bring text check (length(bring) <= 500),
  -- [{ "time": "18:45", "item": "Ubi Caritas", "who": "Full choir" }, …]
  running_order jsonb not null default '[]'::jsonb check (jsonb_typeof(running_order) = 'array'),
  -- Empty means the whole choir is called.
  section_ids uuid[] not null default '{}',
  availability_requested boolean not null default false,
  availability_due_at timestamptz,
  counts_for_attendance boolean not null default true,
  cancelled_at timestamptz,
  cancel_reason text check (length(cancel_reason) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  unique (organization_id, id),
  foreign key (organization_id, season_id) references public.seasons (organization_id, id) on delete set null (season_id),
  foreign key (organization_id, series_id) references public.event_series (organization_id, id) on delete set null (series_id)
);
create index events_org_start_idx on public.events (organization_id, starts_at);
create trigger events_touch before update on public.events
  for each row execute function app.touch_updated_at();

create table public.attendance (
  organization_id uuid not null,
  event_id uuid not null,
  person_id uuid not null,
  status public.attendance_status not null,
  note text check (length(note) <= 500),
  -- How it was recorded: by staff, by QR check-in, or applied from an absence report.
  source text not null default 'staff' check (source in ('staff', 'qr', 'report')),
  marked_by uuid references auth.users (id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (event_id, person_id),
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);
create index attendance_person_idx on public.attendance (person_id);

create table public.absence_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  event_id uuid not null,
  person_id uuid not null,
  kind public.absence_kind not null default 'absent',
  reason text not null check (length(reason) between 1 and 500),
  -- Expected arrival for lateness.
  arrives_at timestamptz,
  reported_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, person_id),
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);

create table public.availability_replies (
  organization_id uuid not null,
  event_id uuid not null,
  person_id uuid not null,
  answer public.availability_answer not null,
  comment text check (length(comment) <= 500),
  updated_at timestamptz not null default now(),
  primary key (event_id, person_id),
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);
create trigger availability_touch before update on public.availability_replies
  for each row execute function app.touch_updated_at();

-- Members only report absences and availability for themselves, for future events.
create function app.guard_self_report() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  starts timestamptz;
begin
  if current_setting('app.bypass_guards', true) = 'on' or auth.uid() is null then
    return new;
  end if;
  if app.has_perm(new.organization_id, 'attendance', 'edit') then
    return new;
  end if;
  select e.starts_at into starts from public.events e where e.id = new.event_id;
  if starts < now() - interval '6 hours' then
    raise exception 'This event has already happened' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger absence_reports_guard before insert or update on public.absence_reports
  for each row execute function app.guard_self_report();
create trigger availability_guard before insert or update on public.availability_replies
  for each row execute function app.guard_self_report();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.event_series enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;
alter table public.absence_reports enable row level security;
alter table public.availability_replies enable row level security;

create policy event_series_select on public.event_series for select to authenticated
  using ((select app.is_member(organization_id)));
create policy event_series_write on public.event_series for all to authenticated
  using ((select app.has_perm(organization_id, 'calendar', 'edit')))
  with check ((select app.has_perm(organization_id, 'calendar', 'edit')));

create policy events_select on public.events for select to authenticated
  using ((select app.is_member(organization_id)));
create policy events_write on public.events for all to authenticated
  using ((select app.has_perm(organization_id, 'calendar', 'edit')))
  with check ((select app.has_perm(organization_id, 'calendar', 'edit')));

create policy attendance_select on public.attendance for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'attendance', 'view')));
create policy attendance_write on public.attendance for all to authenticated
  using ((select app.has_perm(organization_id, 'attendance', 'edit')))
  with check ((select app.has_perm(organization_id, 'attendance', 'edit')));

create policy absence_reports_select on public.absence_reports for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'attendance', 'view')));
create policy absence_reports_insert on public.absence_reports for insert to authenticated
  with check (
    ((select app.is_me(person_id)) and reported_by = (select auth.uid()))
    or (select app.has_perm(organization_id, 'attendance', 'edit'))
  );
create policy absence_reports_update on public.absence_reports for update to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'attendance', 'edit')))
  with check ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'attendance', 'edit')));
create policy absence_reports_delete on public.absence_reports for delete to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'attendance', 'edit')));

create policy availability_select on public.availability_replies for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'calendar', 'view')));
create policy availability_insert on public.availability_replies for insert to authenticated
  with check ((select app.is_me(person_id)));
create policy availability_update on public.availability_replies for update to authenticated
  using ((select app.is_me(person_id))) with check ((select app.is_me(person_id)));
create policy availability_delete on public.availability_replies for delete to authenticated
  using ((select app.is_me(person_id)));
