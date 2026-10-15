-- Choirbook foundations: organizations (choirs), accounts, people, roles and permissions.
--
-- Security model, in short:
--   * Every table has row-level security (RLS) turned on. With RLS on and no
--     matching policy, a row is invisible, so the default is "deny".
--   * A signed-in user can belong to several choirs. In each choir they have one
--     row in public.people. Staff powers come from roles (public.member_roles),
--     and each role grants a level (none / view / edit) per area.
--   * Policies call the helper functions in the private "app" schema. That schema
--     is not exposed through the Supabase API, so these helpers cannot be called
--     directly by a browser.

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type app.perm_area as enum (
  'dashboard', 'roster', 'care', 'staff_notes', 'calendar', 'attendance', 'music',
  'announcements', 'inbox', 'monthly_updates', 'forms', 'fees', 'tickets', 'seating',
  'volunteers', 'reports', 'users', 'settings', 'moderation', 'audit'
);
-- Order matters: comparisons use it (none < view < edit).
create type app.perm_level as enum ('none', 'view', 'edit');

create type public.choir_kind as enum ('youth', 'adult');
create type public.person_status as enum ('invited', 'active', 'archived');
create type public.contact_visibility as enum ('private', 'choir');
create type public.lang as enum ('en', 'fr');
create type public.theme_mode as enum ('auto', 'light', 'dark');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

create function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Organizations (choirs)
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  name text not null check (length(name) between 2 and 120),
  short_name text check (length(short_name) <= 8),
  kind public.choir_kind not null default 'adult',
  -- Raw brand colour (decorative only: header rule and logo tile). Accessible
  -- accent values are derived from it in the app.
  brand_color text check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_path text,
  timezone text not null default 'America/Toronto',
  default_lang public.lang not null default 'en',
  is_demo boolean not null default false,
  -- Choir-wide settings that are not worth their own column yet
  -- (for example which emails guardians get copies of).
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_touch before update on public.organizations
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Account profiles (one per signed-in user, across all their choirs)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  lang public.lang not null default 'en',
  theme public.theme_mode not null default 'auto',
  last_organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

-- People who run Choirbook itself (Matthew). They read the feedback inbox.
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- People: one row per human per choir (choristers and staff alike)
-- ---------------------------------------------------------------------------

create table public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Filled in when the person accepts their invitation and signs in.
  user_id uuid references auth.users (id) on delete set null,
  first_name text not null check (length(first_name) between 1 and 80),
  last_name text not null check (length(last_name) between 1 and 80),
  preferred_name text check (length(preferred_name) <= 80),
  email extensions.citext check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (length(phone) <= 40),
  date_of_birth date,
  pronouns text check (length(pronouns) <= 40),
  lang public.lang not null default 'en',
  status public.person_status not null default 'invited',
  -- Privacy-protective default: other members cannot see contact details or photo.
  contact_visibility public.contact_visibility not null default 'private',
  photo_path text,
  messaging_suspended_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create unique index people_org_email_key on public.people (organization_id, email) where email is not null;
create unique index people_org_user_key on public.people (organization_id, user_id) where user_id is not null;
create index people_user_idx on public.people (user_id);
create trigger people_touch before update on public.people
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Roles and permissions (editable per choir)
-- ---------------------------------------------------------------------------

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Built-in roles have a key (administrator, conductor, …); custom roles do not.
  key text check (key in ('administrator', 'conductor', 'section_leader', 'office', 'treasurer', 'chaperone')),
  name_en text not null check (length(name_en) between 1 and 60),
  name_fr text not null check (length(name_fr) between 1 and 60),
  description_en text,
  description_fr text,
  -- The administrator role cannot be edited or removed, so a choir can never lock itself out.
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, key)
);

create table public.role_permissions (
  organization_id uuid not null,
  role_id uuid not null,
  area app.perm_area not null,
  level app.perm_level not null default 'none',
  primary key (role_id, area),
  foreign key (organization_id, role_id) references public.roles (organization_id, id) on delete cascade
);

create table public.member_roles (
  organization_id uuid not null,
  person_id uuid not null,
  role_id uuid not null,
  -- Optional limit for section leaders (filled in once sections exist).
  section_id uuid,
  created_at timestamptz not null default now(),
  primary key (person_id, role_id),
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade,
  foreign key (organization_id, role_id) references public.roles (organization_id, id) on delete cascade
);
create index member_roles_role_idx on public.member_roles (role_id);

-- ---------------------------------------------------------------------------
-- Policy helpers. SECURITY DEFINER lets them read the tables above without
-- tripping over those tables' own policies (which would recurse).
-- ---------------------------------------------------------------------------

create function app.uid() returns uuid
language sql stable set search_path = '' as $$
  select auth.uid()
$$;

create function app.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

-- The caller's person record in a choir (null if they are not an active member).
create function app.my_person_id(org uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.people p
  where p.organization_id = org and p.user_id = auth.uid() and p.status = 'active'
$$;

create function app.my_person_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.people p where p.user_id = auth.uid() and p.status = 'active'
$$;

create function app.is_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.people p
    where p.organization_id = org and p.user_id = auth.uid() and p.status = 'active'
  )
$$;

-- The caller's level in an area, combining all their roles (highest wins).
create function app.perm_level(org uuid, area app.perm_area) returns app.perm_level
language sql stable security definer set search_path = '' as $$
  select coalesce(max(rp.level), 'none'::app.perm_level)
  from public.people p
  join public.member_roles mr on mr.person_id = p.id
  join public.role_permissions rp on rp.role_id = mr.role_id and rp.area = perm_level.area
  where p.organization_id = org and p.user_id = auth.uid() and p.status = 'active'
$$;

create function app.has_perm(org uuid, area app.perm_area, need app.perm_level default 'view')
returns boolean
language sql stable security definer set search_path = '' as $$
  select app.perm_level(org, area) >= need
$$;

create function app.is_staff(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.people p join public.member_roles mr on mr.person_id = p.id
    where p.organization_id = org and p.user_id = auth.uid() and p.status = 'active'
  )
$$;

-- Is this person record the caller's own?
create function app.is_me(person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.people p where p.id = person and p.user_id = auth.uid() and p.status = 'active'
  )
$$;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Built-in roles: created for every new choir
-- ---------------------------------------------------------------------------

create function app.create_builtin_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  rid uuid;
  a app.perm_area;
  lvl app.perm_level;
begin
  -- Setting up a new choir's default roles is not a permission change worth auditing row by row.
  perform set_config('app.skip_audit', 'on', true);
  for r in
    select * from (values
      ('administrator',  'Administrator',  'Administration',      'Runs the choir office. Full access to everything.', 'Gère le bureau du chœur. Accès complet.', true),
      ('conductor',      'Conductor',      'Direction musicale',  'Artistic lead. Manages music, calendar and attendance.', 'Direction artistique. Gère la musique, le calendrier et les présences.', false),
      ('section_leader', 'Section leader', 'Chef de pupitre',     'Takes attendance and supports one section.', 'Prend les présences et soutient un pupitre.', false),
      ('office',         'Office',         'Bureau',              'Handles messages, forms and day-to-day admin.', 'S’occupe des messages, des formulaires et de l’administration courante.', false),
      ('treasurer',      'Treasurer',      'Trésorerie',          'Looks after fees, payments and ticket sales.', 'S’occupe des frais, des paiements et de la billetterie.', false),
      ('chaperone',      'Chaperone',      'Accompagnateur',      'Supervises at rehearsals, concerts and trips.', 'Encadre lors des répétitions, concerts et voyages.', false)
    ) as t(key, name_en, name_fr, desc_en, desc_fr, locked)
  loop
    insert into public.roles (organization_id, key, name_en, name_fr, description_en, description_fr, locked)
    values (new.id, r.key, r.name_en, r.name_fr, r.desc_en, r.desc_fr, r.locked)
    returning id into rid;

    foreach a in array enum_range(null::app.perm_area) loop
      lvl := case r.key
        when 'administrator' then 'edit'
        when 'conductor' then case
          when a in ('music', 'calendar', 'attendance', 'announcements', 'inbox', 'monthly_updates', 'seating') then 'edit'
          when a in ('fees', 'users', 'settings', 'audit', 'staff_notes', 'moderation') then 'none'
          else 'view' end
        when 'section_leader' then case
          when a = 'attendance' then 'edit'
          when a in ('dashboard', 'roster', 'calendar', 'music', 'inbox', 'seating') then 'view'
          else 'none' end
        when 'office' then case
          when a in ('roster', 'calendar', 'announcements', 'inbox', 'monthly_updates', 'forms', 'volunteers', 'tickets', 'moderation', 'staff_notes') then 'edit'
          when a in ('dashboard', 'attendance', 'music', 'fees', 'reports', 'seating', 'care') then 'view'
          else 'none' end
        when 'treasurer' then case
          when a in ('fees', 'tickets') then 'edit'
          when a in ('dashboard', 'roster', 'reports') then 'view'
          else 'none' end
        when 'chaperone' then case
          when a = 'attendance' then 'edit'
          when a in ('roster', 'care', 'calendar') then 'view'
          else 'none' end
      end;
      insert into public.role_permissions (organization_id, role_id, area, level) values (new.id, rid, a, lvl);
    end loop;
  end loop;
  perform set_config('app.skip_audit', 'off', true);
  return new;
end $$;

create trigger organizations_builtin_roles after insert on public.organizations
  for each row execute function app.create_builtin_roles();

-- The locked administrator role keeps full access, and a choir always keeps at least one administrator.
create function app.guard_locked_role_permissions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.roles where id = coalesce(old.role_id, new.role_id) and locked)
     and current_setting('app.bypass_guards', true) is distinct from 'on' then
    raise exception 'The administrator role cannot be changed' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger role_permissions_guard before update or delete on public.role_permissions
  for each row execute function app.guard_locked_role_permissions();

create function app.guard_locked_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.locked and current_setting('app.bypass_guards', true) is distinct from 'on' then
    raise exception 'The administrator role cannot be changed or removed' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger roles_guard before update or delete on public.roles
  for each row execute function app.guard_locked_role();

create function app.guard_last_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  remaining int;
begin
  if current_setting('app.bypass_guards', true) = 'on' then
    return old;
  end if;
  if exists (select 1 from public.roles where id = old.role_id and key = 'administrator') then
    select count(*) into remaining
    from public.member_roles mr join public.people p on p.id = mr.person_id
    where mr.role_id = old.role_id and mr.person_id <> old.person_id and p.status = 'active';
    if remaining = 0 then
      raise exception 'A choir needs at least one administrator' using errcode = '42501';
    end if;
  end if;
  return old;
end $$;
create trigger member_roles_last_admin before delete on public.member_roles
  for each row execute function app.guard_last_admin();

-- ---------------------------------------------------------------------------
-- Accounts: profile on sign-up, and linking invited people to their account
-- ---------------------------------------------------------------------------

create function app.handle_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  -- Link people records waiting for this email, but only once the address is
  -- confirmed, so nobody can claim a record by typing someone else's email.
  if new.email_confirmed_at is not null then
    update public.people
       set user_id = new.id,
           status = case when status = 'invited' then 'active'::public.person_status else status end
     where user_id is null and email = new.email::extensions.citext and status <> 'archived';
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_auth_user();
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function app.handle_auth_user();

-- Members may edit their own contact details, but not who they are in the choir.
create function app.guard_people_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('app.bypass_guards', true) = 'on' or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.user_id is not null then
      raise exception 'Accounts are linked automatically when an invitation is accepted' using errcode = '42501';
    end if;
    return new;
  end if;
  if app.has_perm(old.organization_id, 'roster', 'edit') then
    -- Staff cannot hand someone else's account to a record either.
    if new.user_id is distinct from old.user_id then
      raise exception 'Accounts are linked automatically when an invitation is accepted' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.organization_id is distinct from old.organization_id
     or new.user_id is distinct from old.user_id
     or new.status is distinct from old.status
     or new.first_name is distinct from old.first_name
     or new.last_name is distinct from old.last_name
     or new.date_of_birth is distinct from old.date_of_birth
     or new.email is distinct from old.email
     or new.messaging_suspended_at is distinct from old.messaging_suspended_at
     or new.archived_at is distinct from old.archived_at then
    raise exception 'Ask your choir office to change these details' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger people_guard before insert or update on public.people
  for each row execute function app.guard_people_update();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.people enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.member_roles enable row level security;

-- organizations: members see their choirs; settings editors change them.
-- Creating a choir happens through the onboarding function (Phase 7), not directly.
create policy organizations_select on public.organizations for select to authenticated
  using ((select app.is_member(id)) or (select app.is_platform_admin()));
create policy organizations_update on public.organizations for update to authenticated
  using ((select app.has_perm(id, 'settings', 'edit')))
  with check ((select app.has_perm(id, 'settings', 'edit')));

-- profiles: your own only.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- platform_admins: you can see whether you are one.
create policy platform_admins_select on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- people: your own record, or everyone if you can view the roster.
-- Other members see each other only through public.member_directory (names, section,
-- and contact details only when that member has chosen to share them).
create policy people_select on public.people for select to authenticated
  using (user_id = (select auth.uid()) or (select app.has_perm(organization_id, 'roster', 'view')));
create policy people_insert on public.people for insert to authenticated
  with check ((select app.has_perm(organization_id, 'roster', 'edit')));
create policy people_update on public.people for update to authenticated
  using (user_id = (select auth.uid()) or (select app.has_perm(organization_id, 'roster', 'edit')))
  with check (user_id = (select auth.uid()) or (select app.has_perm(organization_id, 'roster', 'edit')));
-- No delete policy: people are archived, never deleted, except by account deletion (Phase 6).

-- roles and permissions: members can read role names; user managers edit them.
create policy roles_select on public.roles for select to authenticated
  using ((select app.is_member(organization_id)));
create policy roles_write on public.roles for all to authenticated
  using ((select app.has_perm(organization_id, 'users', 'edit')))
  with check ((select app.has_perm(organization_id, 'users', 'edit')));

create policy role_permissions_select on public.role_permissions for select to authenticated
  using ((select app.is_staff(organization_id)));
create policy role_permissions_write on public.role_permissions for all to authenticated
  using ((select app.has_perm(organization_id, 'users', 'edit')))
  with check ((select app.has_perm(organization_id, 'users', 'edit')));

create policy member_roles_select on public.member_roles for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'users', 'view')));
create policy member_roles_write on public.member_roles for all to authenticated
  using ((select app.has_perm(organization_id, 'users', 'edit')))
  with check ((select app.has_perm(organization_id, 'users', 'edit')));
