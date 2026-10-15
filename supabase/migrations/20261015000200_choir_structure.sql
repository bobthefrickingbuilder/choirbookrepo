-- Seasons, terms, sections and voice parts; choristers; guardian contacts;
-- care (medical) notes; staff-only notes; and the member directory.

create type public.chorister_status as enum ('auditioning', 'active', 'on_leave', 'departed');

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (organization_id, id)
);
create unique index seasons_one_current on public.seasons (organization_id) where is_current;

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  season_id uuid not null,
  name text not null check (length(name) between 1 and 60),
  starts_on date not null,
  ends_on date not null,
  -- How many unexcused absences a chorister may have this term before staff are alerted.
  absence_limit int check (absence_limit between 0 and 100),
  check (ends_on >= starts_on),
  unique (organization_id, id),
  foreign key (organization_id, season_id) references public.seasons (organization_id, id) on delete cascade
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key text not null check (key ~ '^[A-Z][A-Za-z0-9]{0,5}$'),
  name_en text not null,
  name_fr text not null,
  sort int not null default 0,
  unique (organization_id, key),
  unique (organization_id, id)
);

create table public.voice_parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  section_id uuid not null,
  key text not null check (key ~ '^[A-Z][A-Za-z0-9]{0,5}$'),
  name_en text not null,
  name_fr text not null,
  sort int not null default 0,
  unique (organization_id, key),
  unique (organization_id, id),
  foreign key (organization_id, section_id) references public.sections (organization_id, id) on delete cascade
);

alter table public.member_roles
  add foreign key (organization_id, section_id) references public.sections (organization_id, id) on delete set null (section_id);

create table public.choristers (
  person_id uuid primary key,
  organization_id uuid not null,
  section_id uuid,
  voice_part_id uuid,
  status public.chorister_status not null default 'active',
  joined_on date,
  departed_on date,
  school text check (length(school) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, person_id),
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade,
  foreign key (organization_id, section_id) references public.sections (organization_id, id) on delete set null (section_id),
  foreign key (organization_id, voice_part_id) references public.voice_parts (organization_id, id) on delete set null (voice_part_id)
);
create index choristers_section_idx on public.choristers (organization_id, section_id);
create trigger choristers_touch before update on public.choristers
  for each row execute function app.touch_updated_at();

-- Guardians have no accounts. They are contact records for choristers under 18:
-- they get copies of selected emails and sign guardian-required forms by link.
create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  first_name text not null check (length(first_name) between 1 and 80),
  last_name text not null check (length(last_name) between 1 and 80),
  email extensions.citext check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (length(phone) <= 40),
  lang public.lang not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create trigger guardians_touch before update on public.guardians
  for each row execute function app.touch_updated_at();

create table public.guardian_links (
  organization_id uuid not null,
  guardian_id uuid not null,
  chorister_id uuid not null,
  relationship text check (length(relationship) <= 40),
  is_primary boolean not null default false,
  is_emergency_contact boolean not null default true,
  receives_copies boolean not null default true,
  primary key (guardian_id, chorister_id),
  foreign key (organization_id, guardian_id) references public.guardians (organization_id, id) on delete cascade,
  foreign key (organization_id, chorister_id) references public.choristers (organization_id, person_id) on delete cascade
);
create index guardian_links_chorister_idx on public.guardian_links (chorister_id);

-- Medical and care notes: only the person and staff with the "care" permission.
create table public.care_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null,
  label text not null check (length(label) between 1 and 120),
  detail text check (length(detail) <= 2000),
  severity text not null default 'medium' check (severity in ('medium', 'high')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);
create index care_notes_person_idx on public.care_notes (person_id);
create trigger care_notes_touch before update on public.care_notes
  for each row execute function app.touch_updated_at();

-- Staff-only notes about a member. The member never sees these.
create table public.staff_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);
create index staff_notes_person_idx on public.staff_notes (person_id);
create trigger staff_notes_touch before update on public.staff_notes
  for each row execute function app.touch_updated_at();

-- Is the caller this chorister, or (for later) someone acting for them?
create function app.is_my_chorister(chorister uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_me(chorister)
$$;
grant execute on function app.is_my_chorister(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.seasons enable row level security;
alter table public.terms enable row level security;
alter table public.sections enable row level security;
alter table public.voice_parts enable row level security;
alter table public.choristers enable row level security;
alter table public.guardians enable row level security;
alter table public.guardian_links enable row level security;
alter table public.care_notes enable row level security;
alter table public.staff_notes enable row level security;

-- Choir structure: every member can read it; settings editors change it.
create policy seasons_select on public.seasons for select to authenticated
  using ((select app.is_member(organization_id)));
create policy seasons_write on public.seasons for all to authenticated
  using ((select app.has_perm(organization_id, 'settings', 'edit')))
  with check ((select app.has_perm(organization_id, 'settings', 'edit')));

create policy terms_select on public.terms for select to authenticated
  using ((select app.is_member(organization_id)));
create policy terms_write on public.terms for all to authenticated
  using ((select app.has_perm(organization_id, 'settings', 'edit')))
  with check ((select app.has_perm(organization_id, 'settings', 'edit')));

create policy sections_select on public.sections for select to authenticated
  using ((select app.is_member(organization_id)));
create policy sections_write on public.sections for all to authenticated
  using ((select app.has_perm(organization_id, 'settings', 'edit')))
  with check ((select app.has_perm(organization_id, 'settings', 'edit')));

create policy voice_parts_select on public.voice_parts for select to authenticated
  using ((select app.is_member(organization_id)));
create policy voice_parts_write on public.voice_parts for all to authenticated
  using ((select app.has_perm(organization_id, 'settings', 'edit')))
  with check ((select app.has_perm(organization_id, 'settings', 'edit')));

-- Choristers: yourself, or the roster.
create policy choristers_select on public.choristers for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'roster', 'view')));
create policy choristers_write on public.choristers for all to authenticated
  using ((select app.has_perm(organization_id, 'roster', 'edit')))
  with check ((select app.has_perm(organization_id, 'roster', 'edit')));

-- Guardians: the chorister they are linked to, or the roster.
create policy guardians_select on public.guardians for select to authenticated
  using (
    (select app.has_perm(organization_id, 'roster', 'view'))
    or exists (
      select 1 from public.guardian_links gl
      where gl.guardian_id = guardians.id and (select app.is_me(gl.chorister_id))
    )
  );
create policy guardians_write on public.guardians for all to authenticated
  using ((select app.has_perm(organization_id, 'roster', 'edit')))
  with check ((select app.has_perm(organization_id, 'roster', 'edit')));

create policy guardian_links_select on public.guardian_links for select to authenticated
  using ((select app.is_me(chorister_id)) or (select app.has_perm(organization_id, 'roster', 'view')));
create policy guardian_links_write on public.guardian_links for all to authenticated
  using ((select app.has_perm(organization_id, 'roster', 'edit')))
  with check ((select app.has_perm(organization_id, 'roster', 'edit')));

-- Care notes: the person themself, or staff with the care permission.
create policy care_notes_select on public.care_notes for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'care', 'view')));
create policy care_notes_write on public.care_notes for all to authenticated
  using ((select app.has_perm(organization_id, 'care', 'edit')))
  with check ((select app.has_perm(organization_id, 'care', 'edit')));

-- Staff notes: staff with the staff_notes permission only. Never the member.
create policy staff_notes_select on public.staff_notes for select to authenticated
  using ((select app.has_perm(organization_id, 'staff_notes', 'view')));
create policy staff_notes_insert on public.staff_notes for insert to authenticated
  with check ((select app.has_perm(organization_id, 'staff_notes', 'edit')) and author_id = (select auth.uid()));
create policy staff_notes_update on public.staff_notes for update to authenticated
  using ((select app.has_perm(organization_id, 'staff_notes', 'edit')) and author_id = (select auth.uid()))
  with check ((select app.has_perm(organization_id, 'staff_notes', 'edit')) and author_id = (select auth.uid()));
create policy staff_notes_delete on public.staff_notes for delete to authenticated
  using ((select app.has_perm(organization_id, 'staff_notes', 'edit')) and author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Member directory: what members may see of each other.
-- Names and section always; email, phone and photo only if the member shares them
-- (or the viewer can see the roster). Runs with the view owner's rights, and
-- filters to the viewer's own choirs itself.
-- ---------------------------------------------------------------------------

create view public.member_directory with (security_barrier = true) as
select
  p.id,
  p.organization_id,
  p.first_name,
  p.last_name,
  p.preferred_name,
  p.pronouns,
  c.section_id,
  c.voice_part_id,
  exists (select 1 from public.member_roles mr where mr.person_id = p.id) as is_staff,
  case when p.contact_visibility = 'choir' or app.has_perm(p.organization_id, 'roster', 'view') or app.is_me(p.id)
       then p.email::text end as email,
  case when p.contact_visibility = 'choir' or app.has_perm(p.organization_id, 'roster', 'view') or app.is_me(p.id)
       then p.phone end as phone,
  case when p.contact_visibility = 'choir' or app.has_perm(p.organization_id, 'roster', 'view') or app.is_me(p.id)
       then p.photo_path end as photo_path
from public.people p
left join public.choristers c on c.person_id = p.id
where p.status = 'active' and app.is_member(p.organization_id);

revoke all on public.member_directory from anon;
grant select on public.member_directory to authenticated;
