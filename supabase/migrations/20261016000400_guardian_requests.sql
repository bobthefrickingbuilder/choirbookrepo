-- Guardian signature requests for minors' forms, and receipts numbering.
--
-- When a chorister under 18 submits a form marked "guardian signature
-- required", each linked guardian with an email gets a single-use link that
-- expires in 14 days. Only a SHA-256 hash of each link's token is stored; the
-- token itself travels only in the queued email.

-- Staff can see the email queue (status, recipient, subject) but not the
-- contents, which may hold such links.
revoke select on public.email_queue from authenticated;
grant select (id, organization_id, to_email, to_person_id, to_guardian_id, template, subject, digest_key, priority, status,
              not_before, attempts, last_error, sent_at, created_at)
  on public.email_queue to authenticated;

create function public.request_guardian_signatures(response uuid)
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

  if r.id is null or not app.is_me(r.person_id) then
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
revoke all on function public.request_guardian_signatures(uuid) from public, anon;
grant execute on function public.request_guardian_signatures(uuid) to authenticated;
