-- Linking an existing Choirbook account to a new choir membership.
-- A person invited to a second choir already has an account, so the sign-up
-- trigger will not fire again. The server calls this (with the secret key) after
-- checking the inviter's permission.

create function public.link_existing_account(person uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  p public.people;
  uid uuid;
begin
  select * into p from public.people where id = person;
  if p.id is null or p.user_id is not null or p.email is null or p.status = 'archived' then
    return false;
  end if;
  select u.id into uid from auth.users u
  where u.email::extensions.citext = p.email and u.email_confirmed_at is not null;
  if uid is null then
    return false;
  end if;
  perform set_config('app.bypass_guards', 'on', true);
  update public.people set user_id = uid, status = 'active' where id = person;
  perform set_config('app.bypass_guards', 'off', true);
  return true;
end $$;

-- Server only: never callable from the browser.
revoke all on function public.link_existing_account(uuid) from public, anon, authenticated;
grant execute on function public.link_existing_account(uuid) to service_role;
