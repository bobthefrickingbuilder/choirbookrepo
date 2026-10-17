-- Demo rebuild, Phase 5 touches: the tenor and bass sectional moves into the
-- coming week and asks for availability, with only two tenors confirmed so far,
-- so the dashboard shows a balance warning like a real week would.

create or replace function public.rebuild_demo(demo_password text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
  org uuid := app.demo_org_id();
  admin_user uuid := 'd0000000-0000-4000-8000-0000000000a2';
  treasurer_user uuid := 'd0000000-0000-4000-8000-0000000000a4';
  lucas uuid;
  ella uuid;
  role_id uuid;
  sect uuid;
begin
  result := public.reset_demo(demo_password);
  update public.events
     set starts_at = starts_at + interval '1 day', ends_at = ends_at + interval '1 day'
   where organization_id = org and type = 'social' and title = 'Holiday party';
  update public.announcements set notified_at = published_at
   where organization_id = org and published_at is not null;
  update public.staff_notes set author_id = admin_user where organization_id = org and author_id is null;

  update public.events
     set starts_at = starts_at - interval '3 days', ends_at = ends_at - interval '3 days',
         availability_requested = true, availability_due_at = starts_at - interval '4 days'
   where organization_id = org and title = 'Tenor and bass sectional'
  returning id into sect;
  if sect is not null then
    insert into public.availability_replies (organization_id, event_id, person_id, answer)
    select org, sect, x.person_id, a.answer::public.availability_answer
    from (
      select c.person_id, s.key, row_number() over (partition by s.key order by p.last_name, p.first_name) as n
      from public.choristers c
      join public.sections s on s.id = c.section_id
      join public.people p on p.id = c.person_id
      where c.organization_id = org and c.status = 'active' and s.key in ('T', 'B')
    ) x
    cross join lateral (
      select case
        when x.key = 'T' and x.n <= 2 then 'yes'
        when x.key = 'T' and x.n <= 5 then 'no'
        when x.key = 'B' and x.n <= 10 then 'yes'
        when x.key = 'B' and x.n <= 12 then 'maybe'
      end as answer
    ) a
    where a.answer is not null;
  end if;

  delete from public.audit_log where organization_id = org;
  select id into lucas from public.people where organization_id = org and first_name = 'Lucas' and last_name = 'Bergeron';
  select id into ella from public.people where organization_id = org and first_name = 'Ella' and last_name = 'Martin';
  select id into role_id from public.roles where organization_id = org and key = 'office';
  insert into public.audit_log (organization_id, actor_id, action, entity, entity_id, changed_columns, details, created_at) values
    (org, admin_user, 'permission_change', 'role_permissions', role_id::text, array['level'], '{"op": "update"}', now() - interval '5 days'),
    (org, admin_user, 'view', 'people', lucas::text, null, '{}', now() - interval '2 days 3 hours'),
    (org, admin_user, 'update', 'choristers', lucas::text, array['voice_part_id'], '{"op": "update"}', now() - interval '2 days 2 hours'),
    (org, treasurer_user, 'export', 'report_fees', null, null, '{"period": "term", "rows": 2}', now() - interval '1 day 4 hours'),
    (org, admin_user, 'view', 'people', ella::text, null, '{}', now() - interval '6 hours');
  return result;
end $$;
revoke all on function public.rebuild_demo(text) from public, anon, authenticated;
grant execute on function public.rebuild_demo(text) to service_role;
