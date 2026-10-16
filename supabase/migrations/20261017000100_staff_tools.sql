-- Server-side helpers for the staff tools (Phase 4): in-app notifications,
-- publishing announcements to their audience, QR check-in at the door,
-- pausing a member's messaging, staff resending guardian links, and the
-- monthly member updates.

-- ---------------------------------------------------------------------------
-- Notifications. Staff actions (an event cancelled, a reminder, an
-- announcement) notify people in the app. Respects each person's in-app
-- preference for the category. Returns how many were created.
-- ---------------------------------------------------------------------------

create function public.notify_people(
  org uuid, people uuid[], category public.notification_category,
  title text, body text default null, link text default null,
  title_fr text default null, body_fr text default null
)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if not app.is_staff(org) then
    raise exception 'Only staff can send notifications' using errcode = '42501';
  end if;
  insert into public.notifications (organization_id, user_id, category, title, body, link)
  select distinct on (p.user_id) org, p.user_id, category,
         left(case when p.lang = 'fr' and title_fr is not null then title_fr else title end, 200),
         left(case when p.lang = 'fr' and body_fr is not null then body_fr else body end, 1000),
         case when link ~ '^/' then link end
    from public.people p
   where p.organization_id = org and p.id = any(people) and p.user_id is not null and p.status = 'active'
     and coalesce((select np.in_app from public.notification_preferences np
                    where np.user_id = p.user_id and np.category = notify_people.category), true);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.notify_people(uuid, uuid[], public.notification_category, text, text, text, text, text) from public, anon;
grant execute on function public.notify_people(uuid, uuid[], public.notification_category, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Announcements: expand the audience into recipients (who then see it from
-- published_at on, through the existing policy), notify in the app, and queue
-- one email-digest line per person who wants email. A scheduled announcement
-- becomes visible at its time; its bell notification goes out with the next
-- daily round (public.notify_due_announcements).
-- ---------------------------------------------------------------------------

alter table public.announcements add column notified_at timestamptz;

create function app.announcement_audience(ann public.announcements) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select p.id
    from public.people p
    left join public.choristers c on c.person_id = p.id
   where p.organization_id = ann.organization_id and p.status = 'active'
     and (c.person_id is null or c.status <> 'departed')
     and (
       coalesce((ann.audience ->> 'all')::boolean, false)
       or c.section_id in (select jsonb_array_elements_text(coalesce(ann.audience -> 'section_ids', '[]'))::uuid)
       or p.id in (select jsonb_array_elements_text(coalesce(ann.audience -> 'person_ids', '[]'))::uuid)
       -- Staff always get a copy of what goes out.
       or exists (select 1 from public.member_roles mr where mr.person_id = p.id)
     )
$$;

create function app.notify_announcement(ann public.announcements) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (organization_id, user_id, category, title, body, link)
  select ann.organization_id, p.user_id, 'announcements', left(ann.title, 200), left(ann.body, 200),
         '/c/' || o.slug || '/announcements'
    from public.announcement_recipients r
    join public.people p on p.id = r.person_id
    join public.organizations o on o.id = ann.organization_id
   where r.announcement_id = ann.id and p.user_id is not null
     and coalesce((select np.in_app from public.notification_preferences np
                    where np.user_id = p.user_id and np.category = 'announcements'), true);

  -- Email goes out as part of each person's daily digest (Resend free tier: 100 a day).
  insert into public.email_queue (organization_id, to_email, to_person_id, template, subject, payload, digest_key, priority, not_before)
  select ann.organization_id, p.email, p.id, 'digest_item', left(ann.title, 200),
         jsonb_build_object('kind', 'announcement', 'announcement_id', ann.id, 'title', ann.title),
         'digest:' || p.id || ':' || to_char(ann.published_at at time zone 'America/Toronto', 'YYYY-MM-DD'),
         case when ann.pinned then 4 else 6 end, ann.published_at
    from public.announcement_recipients r
    join public.people p on p.id = r.person_id
   where r.announcement_id = ann.id and p.email is not null
     and coalesce((select np.email_digest from public.notification_preferences np
                    where np.user_id = p.user_id and np.category = 'announcements'), true);

  update public.announcements set notified_at = now() where id = ann.id;
end $$;

create function public.publish_announcement(ann_id uuid)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  ann public.announcements;
  n int;
begin
  select * into ann from public.announcements where id = ann_id;
  if ann.id is null or not app.has_perm(ann.organization_id, 'announcements', 'edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if ann.notified_at is not null then
    raise exception 'This announcement has already gone out' using errcode = '22023';
  end if;

  update public.announcements
     set published_at = coalesce(publish_at, now())
   where id = ann_id
  returning * into ann;

  delete from public.announcement_recipients where announcement_id = ann_id;
  insert into public.announcement_recipients (organization_id, announcement_id, person_id)
  select ann.organization_id, ann.id, a from app.announcement_audience(ann) a;
  get diagnostics n = row_count;

  if ann.published_at <= now() then
    perform app.notify_announcement(ann);
  end if;
  return n;
end $$;
revoke all on function public.publish_announcement(uuid) from public, anon;
grant execute on function public.publish_announcement(uuid) to authenticated;

-- Daily round (server only): notify for scheduled announcements whose time has come.
create function public.notify_due_announcements()
returns int
language plpgsql security definer set search_path = '' as $$
declare
  ann public.announcements;
  n int := 0;
begin
  for ann in
    select * from public.announcements
     where notified_at is null and published_at is not null and published_at <= now()
       and published_at > now() - interval '3 days'
  loop
    perform app.notify_announcement(ann);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.notify_due_announcements() from public, anon, authenticated;
grant execute on function public.notify_due_announcements() to service_role;

-- ---------------------------------------------------------------------------
-- QR check-in. A screen at the door shows a QR code that changes every 30
-- seconds. Choristers scan it with their phone camera, which opens the app and
-- records them present (or late). Codes are an HMAC of the time window with a
-- per-event secret that only attendance staff can obtain.
-- ---------------------------------------------------------------------------

create table public.event_checkin_keys (
  event_id uuid primary key,
  organization_id uuid not null,
  secret bytea not null default extensions.gen_random_bytes(32),
  created_at timestamptz not null default now(),
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade
);
alter table public.event_checkin_keys enable row level security;
-- Nobody reads it directly (the policy matches no rows); only the functions below do.
create policy event_checkin_keys_none on public.event_checkin_keys for select to authenticated using (false);

create function app.checkin_code_for(secret bytea, win bigint) returns text
language sql immutable set search_path = '' as $$
  select upper(substr(encode(extensions.hmac(win::text::bytea, secret, 'sha256'), 'hex'), 1, 8))
$$;

-- The code to show right now, and how many seconds it stays valid.
create function public.checkin_code(event uuid)
returns table (code text, seconds_left int)
language plpgsql security definer set search_path = '' as $$
declare
  org uuid;
  s bytea;
  epoch bigint := floor(extract(epoch from now()))::bigint;
begin
  select e.organization_id into org from public.events e where e.id = event;
  if org is null or not app.has_perm(org, 'attendance', 'edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.event_checkin_keys (event_id, organization_id) values (event, org) on conflict (event_id) do nothing;
  select k.secret into s from public.event_checkin_keys k where k.event_id = event;
  return query select app.checkin_code_for(s, epoch / 30), (30 - (epoch % 30))::int;
end $$;
revoke all on function public.checkin_code(uuid) from public, anon;
grant execute on function public.checkin_code(uuid) to authenticated;

-- A chorister checks themself in. Returns present, late, already, invalid,
-- closed (not during the event) or not_called (not a chorister called to it).
create function public.qr_check_in(event uuid, code text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  e public.events;
  me uuid;
  s bytea;
  epoch bigint := floor(extract(epoch from now()))::bigint;
  ok boolean := false;
  current_status public.attendance_status;
  late_after int;
  result public.attendance_status;
begin
  select * into e from public.events where id = event;
  if e.id is null then
    return 'invalid';
  end if;
  me := app.my_person_id(e.organization_id);
  if me is null then
    return 'invalid';
  end if;
  select k.secret into s from public.event_checkin_keys k where k.event_id = event;
  if s is null then
    return 'invalid';
  end if;
  -- Accept the current code and the two before it (about a minute and a half).
  for i in 0..2 loop
    if app.checkin_code_for(s, epoch / 30 - i) = upper(code) then
      ok := true;
    end if;
  end loop;
  if not ok then
    return 'invalid';
  end if;
  if e.cancelled_at is not null or now() < e.starts_at - interval '2 hours'
     or now() > coalesce(e.ends_at, e.starts_at + interval '4 hours') then
    return 'closed';
  end if;
  if not exists (
    select 1 from public.choristers c
     where c.person_id = me and c.status <> 'departed'
       and (cardinality(e.section_ids) = 0 or c.section_id = any(e.section_ids))
  ) then
    return 'not_called';
  end if;

  select a.status into current_status from public.attendance a where a.event_id = event and a.person_id = me;
  if current_status in ('present', 'late') then
    return 'already';
  end if;

  late_after := coalesce((select (o.settings ->> 'late_after_minutes')::int from public.organizations o where o.id = e.organization_id), 10);
  result := case when now() > coalesce(e.call_at, e.starts_at) + make_interval(mins => late_after) then 'late' else 'present' end;

  insert into public.attendance (organization_id, event_id, person_id, status, source, marked_at)
  values (e.organization_id, event, me, result, 'qr', now())
  on conflict (event_id, person_id) do update set status = excluded.status, source = 'qr', marked_at = now(), marked_by = null;
  return result::text;
end $$;
revoke all on function public.qr_check_in(uuid, text) from public, anon;
grant execute on function public.qr_check_in(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Moderation: pause or restore a member's messaging.
-- ---------------------------------------------------------------------------

create function public.set_messaging_suspended(person uuid, suspended boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  org uuid;
begin
  select p.organization_id into org from public.people p where p.id = person;
  if org is null or not app.has_perm(org, 'moderation', 'edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  perform set_config('app.bypass_guards', 'on', true);
  update public.people set messaging_suspended_at = case when suspended then now() end where id = person;
  perform set_config('app.bypass_guards', 'off', true);
  insert into public.audit_log (organization_id, actor_id, action, entity, entity_id, changed_columns, details)
  values (org, auth.uid(), 'update', 'people', person::text, array['messaging_suspended_at'],
          jsonb_build_object('op', case when suspended then 'suspend_messaging' else 'restore_messaging' end));
end $$;
revoke all on function public.set_messaging_suspended(uuid, boolean) from public, anon;
grant execute on function public.set_messaging_suspended(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Guardian links: forms staff may also resend them (same rules otherwise).
-- ---------------------------------------------------------------------------

create or replace function public.request_guardian_signatures(response uuid)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  g record;
  token text;
  sent int := 0;
begin
  select fr.id, fr.organization_id, fr.person_id, fr.status, f.title, f.guardian_signature_required,
         p.first_name, p.date_of_birth
    into r
    from public.form_responses fr
    join public.forms f on f.id = fr.form_id
    join public.people p on p.id = fr.person_id
   where fr.id = response;

  if r.id is null or not (app.is_me(r.person_id) or app.has_perm(r.organization_id, 'forms', 'edit')) then
    raise exception 'Not your form' using errcode = '42501';
  end if;
  if not r.guardian_signature_required or r.status not in ('submitted', 'approved')
     or r.date_of_birth is null or r.date_of_birth <= (current_date - interval '18 years') then
    return 0;
  end if;
  -- At most one round every ten minutes, so the button cannot flood a guardian's inbox.
  if exists (select 1 from public.guardian_signatures s where s.response_id = response and s.created_at > now() - interval '10 minutes') then
    return -1;
  end if;

  update public.guardian_signatures set revoked_at = now()
   where response_id = response and used_at is null and revoked_at is null;

  for g in
    select gu.id, gu.email, gu.first_name, gu.lang
      from public.guardian_links gl join public.guardians gu on gu.id = gl.guardian_id
     where gl.chorister_id = r.person_id and gu.email is not null
  loop
    token := encode(extensions.gen_random_bytes(24), 'hex');
    insert into public.guardian_signatures (organization_id, response_id, guardian_id, token_hash, expires_at, sent_at)
    values (r.organization_id, response, g.id, encode(extensions.digest(token, 'sha256'), 'hex'), now() + interval '14 days', now());
    insert into public.email_queue (organization_id, to_email, to_guardian_id, template, subject, payload, priority)
    values (r.organization_id, g.email, g.id, 'guardian_signature',
            case when g.lang = 'fr' then 'Signature demandée : ' || r.title else 'Signature needed: ' || r.title end,
            jsonb_build_object('token', token, 'guardian', g.first_name, 'chorister', r.first_name, 'form', r.title, 'lang', g.lang),
            2);
    sent := sent + 1;
  end loop;
  return sent;
end $$;

-- ---------------------------------------------------------------------------
-- Monthly member updates: one personal summary per active chorister for the
-- month (attendance, what is owed, forms still to do, what is coming next).
-- Staff review the drafts, then send: each member sees theirs in the app and
-- gets it in their email digest.
-- ---------------------------------------------------------------------------

create function public.generate_monthly_update(target uuid)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  u public.monthly_updates;
  m_start timestamptz;
  m_end timestamptz;
  n int;
begin
  select * into u from public.monthly_updates where id = target;
  if u.id is null or not app.has_perm(u.organization_id, 'monthly_updates', 'edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if u.status = 'sent' then
    raise exception 'This update has already been sent' using errcode = '22023';
  end if;
  m_start := app.at_local(u.month, '00:00');
  m_end := app.at_local((u.month + interval '1 month')::date, '00:00');

  delete from public.monthly_update_deliveries d where d.update_id = u.id;
  insert into public.monthly_update_deliveries (organization_id, update_id, person_id, content)
  select u.organization_id, u.id, p.id, jsonb_build_object(
    'first_name', coalesce(p.preferred_name, p.first_name),
    'attendance', (
      select jsonb_build_object(
        'present', count(*) filter (where a.status = 'present'),
        'late', count(*) filter (where a.status = 'late'),
        'excused', count(*) filter (where a.status = 'excused'),
        'absent', count(*) filter (where a.status = 'absent'))
      from public.attendance a join public.events e on e.id = a.event_id
      where a.person_id = p.id and e.starts_at >= m_start and e.starts_at < m_end),
    'owing_cents', (
      select coalesce(sum(greatest(0, b.amount_cents - b.paid_cents - b.adjusted_cents)), 0)
      from public.fee_balances b where b.person_id = p.id),
    'forms_due', (
      select coalesce(jsonb_agg(f.title order by f.due_on nulls last), '[]'::jsonb)
      from public.forms f
      where f.organization_id = u.organization_id and f.status = 'open'
        and (cardinality(f.section_ids) = 0 or c.section_id = any(f.section_ids))
        and not exists (select 1 from public.form_responses r where r.form_id = f.id and r.person_id = p.id
                         and r.status in ('submitted', 'approved'))),
    'practice_done', (
      select count(*) from public.practice_completions pc where pc.person_id = p.id
        and pc.completed_at >= m_start and pc.completed_at < m_end),
    'coming_up', (
      select coalesce(jsonb_agg(jsonb_build_object('title', e.title, 'starts_at', e.starts_at, 'type', e.type) order by e.starts_at), '[]'::jsonb)
      from (select * from public.events e
             where e.organization_id = u.organization_id and e.cancelled_at is null and e.type <> 'rehearsal'
               and e.starts_at >= m_end and e.starts_at < m_end + interval '1 month'
               and (cardinality(e.section_ids) = 0 or c.section_id = any(e.section_ids))
             order by e.starts_at limit 5) e)
  )
  from public.people p
  join public.choristers c on c.person_id = p.id
  where p.organization_id = u.organization_id and p.status = 'active' and c.status in ('active', 'on_leave');
  get diagnostics n = row_count;

  update public.monthly_updates set status = 'review' where id = u.id;
  return n;
end $$;
revoke all on function public.generate_monthly_update(uuid) from public, anon;
grant execute on function public.generate_monthly_update(uuid) to authenticated;

create function public.send_monthly_update(target uuid)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  u public.monthly_updates;
  o public.organizations;
  n int;
begin
  select * into u from public.monthly_updates where id = target;
  if u.id is null or not app.has_perm(u.organization_id, 'monthly_updates', 'edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if u.status <> 'review' then
    raise exception 'Generate and review the update first' using errcode = '22023';
  end if;
  select * into o from public.organizations where id = u.organization_id;

  update public.monthly_update_deliveries d set sent_at = now() where d.update_id = u.id;
  get diagnostics n = row_count;
  update public.monthly_updates set status = 'sent', sent_at = now() where id = u.id;

  insert into public.notifications (organization_id, user_id, category, title, link)
  select u.organization_id, p.user_id, 'system',
         case when p.lang = 'fr' then 'Votre bilan du mois est prêt' else 'Your monthly update is ready' end,
         '/c/' || o.slug || '/announcements'
    from public.monthly_update_deliveries d join public.people p on p.id = d.person_id
   where d.update_id = u.id and p.user_id is not null;

  insert into public.email_queue (organization_id, to_email, to_person_id, template, subject, payload, priority)
  select u.organization_id, p.email, p.id, 'monthly_update',
         case when p.lang = 'fr' then o.name || ' : votre bilan du mois' else o.name || ': your monthly update' end,
         jsonb_build_object('update_id', u.id), 7
    from public.monthly_update_deliveries d join public.people p on p.id = d.person_id
   where d.update_id = u.id and p.email is not null;
  return n;
end $$;
revoke all on function public.send_monthly_update(uuid) from public, anon;
grant execute on function public.send_monthly_update(uuid) to authenticated;

-- Members can read the update their delivery belongs to (for the conductor's note).
create policy monthly_updates_select_recipient on public.monthly_updates for select to authenticated
  using (
    status = 'sent' and exists (
      select 1 from public.monthly_update_deliveries d where d.update_id = monthly_updates.id and (select app.is_me(d.person_id))
    )
  );

-- ---------------------------------------------------------------------------
-- Storage used by the choir's music files (the free plan has 1 GB in total).
-- ---------------------------------------------------------------------------

create function public.music_storage_used(org uuid)
returns bigint
language sql stable security definer set search_path = '' as $$
  select case when app.is_staff(org) then
    coalesce((select sum(size_bytes) from public.score_files where organization_id = org), 0)
    + coalesce((select sum(size_bytes) from public.learning_tracks where organization_id = org), 0)
  end
$$;
revoke all on function public.music_storage_used(uuid) from public, anon;
grant execute on function public.music_storage_used(uuid) to authenticated;

-- Existing announcements went out before this column existed.
update public.announcements set notified_at = coalesce(published_at, now()) where notified_at is null and published_at is not null;

-- Demo rebuild: its sample announcements count as already notified.
create or replace function public.rebuild_demo(demo_password text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
begin
  result := public.reset_demo(demo_password);
  update public.events
     set starts_at = starts_at + interval '1 day', ends_at = ends_at + interval '1 day'
   where organization_id = app.demo_org_id() and type = 'social' and title = 'Holiday party';
  update public.announcements set notified_at = published_at
   where organization_id = app.demo_org_id() and published_at is not null;
  return result;
end $$;
