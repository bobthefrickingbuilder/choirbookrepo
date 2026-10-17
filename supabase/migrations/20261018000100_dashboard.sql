-- Phase 5: the staff dashboard.
--
-- attendance_facts: each attendance mark with its event's date and the
-- chorister's section, joined in the database so the dashboard and reports
-- fetch one narrow row per mark. It runs with the caller's rights
-- (security_invoker), so the usual attendance and roster rules apply.
--
-- dashboard_layouts: which widgets a staff member shows, in what order, per choir.

create view public.attendance_facts with (security_invoker = true) as
select
  a.organization_id,
  a.event_id,
  a.person_id,
  a.status,
  e.starts_at,
  e.title,
  e.type as event_type,
  e.counts_for_attendance,
  e.cancelled_at,
  c.section_id
from public.attendance a
join public.events e on e.organization_id = a.organization_id and e.id = a.event_id
left join public.choristers c on c.organization_id = a.organization_id and c.person_id = a.person_id;

grant select on public.attendance_facts to authenticated;

create table public.dashboard_layouts (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  widgets text[] not null default '{}',
  hidden text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  check (cardinality(widgets) <= 20 and cardinality(hidden) <= 20)
);

create trigger dashboard_layouts_touch before update on public.dashboard_layouts
  for each row execute function app.touch_updated_at();

alter table public.dashboard_layouts enable row level security;

create policy dashboard_layouts_own on public.dashboard_layouts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select app.is_staff(organization_id)));
