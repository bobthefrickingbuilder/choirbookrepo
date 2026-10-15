-- Audit log (who viewed or changed member records, exports, permission changes),
-- the Choirbook feedback inbox, private storage buckets, and table grants.

-- ---------------------------------------------------------------------------
-- Audit log: append-only. Written by triggers and by app.log_event().
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('view', 'insert', 'update', 'delete', 'export', 'sign_in', 'permission_change')),
  entity text not null check (length(entity) <= 60),
  entity_id text,
  -- Which columns changed (names only, never the values, so the log holds no extra personal data).
  changed_columns text[],
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_time_idx on public.audit_log (organization_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

create function app.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  org uuid := (rec ->> 'organization_id')::uuid;
  eid text := coalesce(rec ->> 'id', rec ->> 'person_id', rec ->> 'role_id');
  cols text[];
  act text := lower(tg_op);
begin
  if current_setting('app.skip_audit', true) = 'on' then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into cols
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at');
    if cols is null then
      return new;
    end if;
  end if;
  if tg_table_name in ('member_roles', 'role_permissions', 'roles') then
    act := 'permission_change';
  end if;
  insert into public.audit_log (organization_id, actor_id, action, entity, entity_id, changed_columns, details)
  values (org, auth.uid(), act, tg_table_name, eid, cols, jsonb_build_object('op', lower(tg_op)));
  return coalesce(new, old);
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'people', 'choristers', 'guardians', 'guardian_links', 'care_notes', 'staff_notes',
    'member_roles', 'role_permissions', 'roles', 'consents', 'payments', 'fee_adjustments'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function app.audit_row_change()', t || '_audit', t);
  end loop;
end $$;

-- Record that someone viewed or exported member data. The server calls this when a
-- staff member opens a chorister profile or downloads a report.
create function public.log_event(org uuid, action text, entity text, entity_id text default null, details jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if action not in ('view', 'export') then
    raise exception 'Only view and export events can be logged directly' using errcode = '22023';
  end if;
  if not app.is_member(org) then
    raise exception 'Not a member of this choir' using errcode = '42501';
  end if;
  insert into public.audit_log (organization_id, actor_id, action, entity, entity_id, details)
  values (org, auth.uid(), action, left(entity, 60), left(entity_id, 100), coalesce(details, '{}'::jsonb));
end $$;
revoke all on function public.log_event(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.log_event(uuid, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Feedback inbox (only Choirbook's own admins read it)
-- ---------------------------------------------------------------------------

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  body text not null check (length(body) between 1 and 5000),
  page text check (length(page) <= 300),
  role text check (length(role) <= 60),
  user_agent text check (length(user_agent) <= 400),
  app_version text check (length(app_version) <= 40),
  status text not null default 'new' check (status in ('new', 'triaged', 'done')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.audit_log enable row level security;
alter table public.feedback enable row level security;

create policy audit_log_select on public.audit_log for select to authenticated
  using ((select app.has_perm(organization_id, 'audit', 'view')));
-- No insert/update/delete policies: only triggers and log_event() write here.

create policy feedback_insert on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()) and (organization_id is null or (select app.is_member(organization_id))));
create policy feedback_select on public.feedback for select to authenticated
  using ((select app.is_platform_admin()) or user_id = (select auth.uid()));
create policy feedback_update on public.feedback for update to authenticated
  using ((select app.is_platform_admin())) with check ((select app.is_platform_admin()));

-- ---------------------------------------------------------------------------
-- Storage: member content lives in private buckets. Files are always served
-- through short-lived signed URLs that the server creates after checking the
-- database rules above. Object paths start with the choir's id: {org_id}/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('scores', 'scores', false, 20971520, array['application/pdf']),
  ('tracks', 'tracks', false, 20971520, array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a']),
  ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('choir-logos', 'choir-logos', true, 1048576, array['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create function app.object_org(name text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return split_part(name, '/', 1)::uuid;
exception when others then
  return null;
end $$;
grant execute on function app.object_org(text) to authenticated, service_role;

create policy "music staff read files" on storage.objects for select to authenticated
  using (bucket_id in ('scores', 'tracks') and (select app.has_perm(app.object_org(name), 'music', 'view')));
create policy "music staff upload files" on storage.objects for insert to authenticated
  with check (bucket_id in ('scores', 'tracks') and (select app.has_perm(app.object_org(name), 'music', 'edit')));
create policy "music staff change files" on storage.objects for update to authenticated
  using (bucket_id in ('scores', 'tracks') and (select app.has_perm(app.object_org(name), 'music', 'edit')));
create policy "music staff delete files" on storage.objects for delete to authenticated
  using (bucket_id in ('scores', 'tracks') and (select app.has_perm(app.object_org(name), 'music', 'edit')));

-- Photos: {org_id}/{person_id}.ext — the person or roster staff.
create policy "photo owner or roster reads" on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and ((select app.has_perm(app.object_org(name), 'roster', 'view'))
         or (select app.is_me(nullif(split_part(split_part(name, '/', 2), '.', 1), '')::uuid)))
  );
create policy "photo owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (select app.is_me(nullif(split_part(split_part(name, '/', 2), '.', 1), '')::uuid)));
create policy "photo owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (select app.is_me(nullif(split_part(split_part(name, '/', 2), '.', 1), '')::uuid)));

create policy "settings staff manage logos" on storage.objects for all to authenticated
  using (bucket_id = 'choir-logos' and (select app.has_perm(app.object_org(name), 'settings', 'edit')))
  with check (bucket_id = 'choir-logos' and (select app.has_perm(app.object_org(name), 'settings', 'edit')));

-- ---------------------------------------------------------------------------
-- Grants. RLS decides which rows; these decide which roles may try at all.
-- Signed-out visitors (anon) get nothing: public pages go through the server.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Re-apply column limits that the blanket grant above widened.
revoke select on public.guardian_signatures from authenticated;
grant select (id, organization_id, response_id, guardian_id, expires_at, sent_at, used_at, signed_name, revoked_at, created_at)
  on public.guardian_signatures to authenticated;
-- The audit log and the email queue are read-only from the browser.
revoke insert, update, delete on public.audit_log from authenticated;
revoke insert, update, delete on public.email_queue from authenticated;
