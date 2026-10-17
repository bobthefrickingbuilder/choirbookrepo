-- The demo's "try the guardian link" can be used again after a visitor signs:
-- it clears that form's earlier demo signatures before making a fresh link.

create or replace function public.demo_guardian_link(response uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  g uuid;
  token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  select fr.id, fr.organization_id, fr.person_id into r
    from public.form_responses fr join public.organizations o on o.id = fr.organization_id
   where fr.id = response and o.is_demo;
  if r.id is null or not public.is_demo_user()
     or not (app.is_me(r.person_id) or app.has_perm(r.organization_id, 'forms', 'edit')) then
    raise exception 'Not available' using errcode = '42501';
  end if;
  select gl.guardian_id into g from public.guardian_links gl
   where gl.chorister_id = r.person_id order by gl.is_primary desc limit 1;
  if g is null then
    return null;
  end if;
  delete from public.guardian_signatures where response_id = response;
  insert into public.guardian_signatures (organization_id, response_id, guardian_id, token_hash, expires_at, sent_at)
  values (r.organization_id, response, g, encode(extensions.digest(token, 'sha256'), 'hex'), now() + interval '14 days', now());
  return token;
end $$;
revoke all on function public.demo_guardian_link(uuid) from public, anon;
grant execute on function public.demo_guardian_link(uuid) to authenticated;
