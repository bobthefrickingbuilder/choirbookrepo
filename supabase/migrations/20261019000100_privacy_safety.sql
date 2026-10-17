-- Phase 6: privacy, consent and safety.
--
--  * Age rules: minor status computed from the date of birth (Toronto days), a
--    hard block on choristers under 14, and what happens on the 18th birthday.
--  * Guardian copies of selected emails, chosen per choir.
--  * Guardian signatures: the page a guardian opens from their single-use link.
--  * Default consent wording for every choir (drafts for Matthew to approve).
--  * A server-side profanity filter (EN and FR, configurable per choir) that
--    holds flagged messages for staff review.
--  * Account deletion with an emailed confirmation link.
--  * Rate limits for sign-in and other public endpoints.
--
-- Everything here is additive: the live site keeps working before and after.

-- ---------------------------------------------------------------------------
-- Age
-- ---------------------------------------------------------------------------

create function app.today_toronto() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Toronto')::date
$$;

-- Whole years old today (in Toronto). Matches packages/shared/src/rules/age.ts.
create function public.age_years(dob date) returns int
language sql stable set search_path = '' as $$
  select extract(year from age(app.today_toronto(), dob))::int
$$;
grant execute on function public.age_years(date) to authenticated, service_role;

create function public.is_minor(dob date) returns boolean
language sql stable set search_path = '' as $$
  select dob is not null and public.age_years(dob) < 18
$$;
grant execute on function public.is_minor(date) to authenticated, service_role;

-- Choristers under 14 cannot consent for themselves (Quebec Law 25), and the
-- guardian registration flow they would need is not built. Refuse them.
create function app.guard_min_age() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  dob date;
begin
  if tg_table_name = 'choristers' then
    select p.date_of_birth into dob from public.people p where p.id = new.person_id;
  else
    if not exists (select 1 from public.choristers c where c.person_id = new.id) then
      return new;
    end if;
    dob := new.date_of_birth;
  end if;
  if dob is not null and public.age_years(dob) < 14 then
    raise exception 'Choristers must be at least 14 to register' using errcode = '22023', hint = 'under_14';
  end if;
  return new;
end $$;
create trigger choristers_min_age before insert on public.choristers
  for each row execute function app.guard_min_age();
create trigger people_min_age before update of date_of_birth on public.people
  for each row when (new.date_of_birth is distinct from old.date_of_birth)
  execute function app.guard_min_age();

-- On the 18th birthday guardians stop getting copies, and the chorister is told
-- in the app. Runs every night (and is safe to run more often). Guardians stay
-- on file as emergency contacts.
create function public.process_coming_of_age() returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int := 0;
  r record;
begin
  for r in
    select distinct p.id, p.organization_id, p.user_id, p.lang, o.slug, (p.date_of_birth + interval '18 years')::date as turned_18_on
      from public.people p
      join public.choristers c on c.person_id = p.id
      join public.guardian_links gl on gl.chorister_id = p.id and gl.receives_copies
      join public.organizations o on o.id = p.organization_id
     where p.date_of_birth is not null and not public.is_minor(p.date_of_birth)
  loop
    update public.guardian_links set receives_copies = false where chorister_id = r.id and receives_copies;
    -- Only tell people who have just turned 18, not adults who joined with a guardian on file.
    if r.user_id is not null and r.turned_18_on > app.today_toronto() - 31 then
      insert into public.notifications (organization_id, user_id, category, title, body, link)
      values (r.organization_id, r.user_id, 'system',
              case when r.lang = 'fr' then 'Joyeux 18e anniversaire!' else 'Happy 18th birthday!' end,
              case when r.lang = 'fr'
                then 'Vos parents ou tuteurs ne reçoivent plus de copies des courriels du chœur, et vos formulaires n’ont plus besoin de leur signature. Ils restent vos contacts d’urgence.'
                else 'Your parents or guardians no longer get copies of choir emails, and your forms no longer need their signature. They stay on file as your emergency contacts.' end,
              '/c/' || r.slug || '/profile');
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.process_coming_of_age() from public, anon, authenticated;
grant execute on function public.process_coming_of_age() to service_role;

-- ---------------------------------------------------------------------------
-- Guardian copies. Each choir picks which kinds of email guardians of minors
-- get a copy of: organizations.settings -> 'guardian_copies' (an array of
-- 'announcements', 'monthly_update', 'schedule', 'fees', 'tours').
-- ---------------------------------------------------------------------------

create function app.email_category(template text, payload jsonb) returns text
language sql immutable set search_path = '' as $$
  select coalesce(
    payload ->> 'category',
    case template
      when 'digest_item' then case payload ->> 'kind' when 'announcement' then 'announcements' else payload ->> 'kind' end
      when 'monthly_update' then 'monthly_update'
    end
  )
$$;

create function app.copy_email_to_guardians() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cat text := app.email_category(new.template, new.payload);
begin
  if cat is null or new.payload ? 'guardian_copy' then
    return new;
  end if;
  insert into public.email_queue (organization_id, to_email, to_guardian_id, template, subject, payload, digest_key, priority, not_before)
  select new.organization_id, g.email, g.id, new.template,
         left(case when g.lang = 'fr' then 'Copie pour parent ou tuteur : ' else 'Guardian copy: ' end || new.subject, 200),
         new.payload || jsonb_build_object('guardian_copy', true, 'chorister_id', new.to_person_id, 'lang', g.lang),
         case when new.digest_key is not null then 'guardian:' || g.id || ':' || new.digest_key end,
         new.priority, new.not_before
    from public.people p
    join public.organizations o on o.id = p.organization_id
    join public.guardian_links gl on gl.chorister_id = p.id and gl.receives_copies
    join public.guardians g on g.id = gl.guardian_id and g.email is not null
   where p.id = new.to_person_id
     and public.is_minor(p.date_of_birth)
     and coalesce(o.settings -> 'guardian_copies', '[]'::jsonb) ? cat;
  return new;
end $$;
create trigger email_queue_guardian_copies after insert on public.email_queue
  for each row when (new.to_person_id is not null and new.to_guardian_id is null)
  execute function app.copy_email_to_guardians();

-- ---------------------------------------------------------------------------
-- Guardian signatures. A guardian opens the emailed link without an account;
-- the server looks the token up and records the signature through these two
-- functions (server only, so the IP address it records is the real one).
-- ---------------------------------------------------------------------------

create function public.guardian_link_lookup(token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  s record;
  state text;
begin
  select gs.*, f.title, f.description, f.fields, fr.answers, f.organization_id as org,
         o.name as choir, o.brand_color, g.first_name as guardian_first, g.last_name as guardian_last, g.lang as guardian_lang,
         p.first_name as chorister_first, p.last_name as chorister_last
    into s
    from public.guardian_signatures gs
    join public.form_responses fr on fr.id = gs.response_id
    join public.forms f on f.id = fr.form_id
    join public.organizations o on o.id = gs.organization_id
    join public.guardians g on g.id = gs.guardian_id
    join public.people p on p.id = fr.person_id
   where gs.token_hash = encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex');

  if s.id is null then
    return jsonb_build_object('state', 'unknown');
  end if;
  state := case
    when s.used_at is not null then 'used'
    when s.revoked_at is not null then 'revoked'
    when s.expires_at <= now() then 'expired'
    else 'valid' end;
  if state <> 'valid' then
    return jsonb_build_object('state', state, 'choir', s.choir, 'lang', s.guardian_lang, 'form', s.title,
                              'signed_name', s.signed_name, 'used_at', s.used_at);
  end if;
  return jsonb_build_object(
    'state', state, 'choir', s.choir, 'brand_color', s.brand_color, 'lang', s.guardian_lang,
    'guardian', s.guardian_first || ' ' || s.guardian_last,
    'chorister', s.chorister_first || ' ' || s.chorister_last,
    'form', s.title, 'description', s.description, 'fields', s.fields, 'answers', s.answers,
    'expires_at', s.expires_at
  );
end $$;
revoke all on function public.guardian_link_lookup(text) from public, anon, authenticated;
grant execute on function public.guardian_link_lookup(text) to service_role;

create function public.guardian_link_sign(token text, signed_name text, ip inet default null, user_agent text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  name_clean text := btrim(coalesce(signed_name, ''));
begin
  select gs.id, gs.response_id, gs.organization_id, gs.used_at, gs.revoked_at, gs.expires_at,
         fr.person_id, f.title, p.user_id, p.lang, o.slug
    into s
    from public.guardian_signatures gs
    join public.form_responses fr on fr.id = gs.response_id
    join public.forms f on f.id = fr.form_id
    join public.people p on p.id = fr.person_id
    join public.organizations o on o.id = gs.organization_id
   where gs.token_hash = encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex')
   for update of gs;

  if s.id is null then return 'unknown'; end if;
  if s.used_at is not null then return 'used'; end if;
  if s.revoked_at is not null then return 'revoked'; end if;
  if s.expires_at <= now() then return 'expired'; end if;
  if length(name_clean) < 3 or length(name_clean) > 160 then return 'name'; end if;

  update public.guardian_signatures
     set used_at = now(), signed_name = name_clean, signed_ip = ip, signed_user_agent = left(user_agent, 400)
   where id = s.id;
  -- One guardian's signature is enough: the other links for this form stop working.
  update public.guardian_signatures set revoked_at = now()
   where response_id = s.response_id and id <> s.id and used_at is null and revoked_at is null;

  if s.user_id is not null then
    insert into public.notifications (organization_id, user_id, category, title, link)
    values (s.organization_id, s.user_id, 'forms',
            left(case when s.lang = 'fr' then 'Signature du parent reçue : ' else 'Guardian signed: ' end || s.title, 200),
            '/c/' || s.slug || '/forms-fees');
  end if;
  return 'signed';
end $$;
revoke all on function public.guardian_link_sign(text, text, inet, text) from public, anon, authenticated;
grant execute on function public.guardian_link_sign(text, text, inet, text) to service_role;

-- The public demo cannot send email, so it hands back a fresh link instead and
-- the visitor opens it themselves to see what a guardian would see.
create function public.demo_guardian_link(response uuid)
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
  update public.guardian_signatures set revoked_at = now()
   where response_id = response and used_at is null and revoked_at is null;
  insert into public.guardian_signatures (organization_id, response_id, guardian_id, token_hash, expires_at, sent_at)
  values (r.organization_id, response, g, encode(extensions.digest(token, 'sha256'), 'hex'), now() + interval '14 days', now());
  return token;
end $$;
revoke all on function public.demo_guardian_link(uuid) from public, anon;
grant execute on function public.demo_guardian_link(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Consent wording. Every choir starts with a version 1 of each consent, which
-- staff can supersede in Settings. (Wording is a draft for Matthew to approve.)
-- ---------------------------------------------------------------------------

create function app.default_consent_wording(org uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  choir text;
begin
  select name into choir from public.organizations where id = org;
  insert into public.consent_wording_versions (organization_id, kind, version, body_en, body_fr)
  select org, k.kind::public.consent_kind, 1, k.en, k.fr
    from (values
      ('participation',
       'I agree to take part in ' || choir || '''s rehearsals, concerts and activities this season, and to follow its attendance and fee policies.',
       'J’accepte de participer aux répétitions, concerts et activités de ' || choir || ' cette saison et d’en respecter les politiques d’assiduité et de frais.'),
      ('code_of_conduct',
       'I have read ' || choir || '''s code of conduct and agree to follow it, including in messages sent through Choirbook.',
       'J’ai lu le code de conduite de ' || choir || ' et j’accepte de le respecter, y compris dans les messages envoyés par Choirbook.'),
      ('photo_video',
       choir || ' may use photos and video of me from rehearsals and concerts on its website, social media and printed programs. I can withdraw this at any time.',
       choir || ' peut utiliser des photos et vidéos de moi prises aux répétitions et concerts sur son site, ses réseaux sociaux et ses programmes imprimés. Je peux retirer ce consentement en tout temps.'),
      ('medical_info',
       choir || ' may share the medical and care information I give it with the conductor and chaperones, only when needed for my safety at rehearsals, concerts and trips.',
       choir || ' peut communiquer les renseignements médicaux que je lui donne au chef et aux accompagnateurs, seulement lorsque c’est nécessaire à ma sécurité aux répétitions, concerts et voyages.')
    ) as k(kind, en, fr)
   where not exists (
     select 1 from public.consent_wording_versions w where w.organization_id = org and w.kind = k.kind::public.consent_kind
   );
end $$;

create function app.on_organization_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.is_demo then
    perform app.default_consent_wording(new.id);
  end if;
  return new;
end $$;
create trigger organizations_consent_wording after insert on public.organizations
  for each row execute function app.on_organization_created();

do $$
declare
  o uuid;
begin
  for o in select id from public.organizations where not is_demo loop
    perform app.default_consent_wording(o);
  end loop;
end $$;

-- The latest answer for each consent, with the wording it was given against.
create view public.current_consents with (security_invoker = true) as
select distinct on (c.person_id, c.kind)
  c.organization_id, c.person_id, c.kind, c.granted, c.method, c.recorded_at,
  c.wording_version_id, w.version as wording_version
from public.consents c
join public.consent_wording_versions w on w.id = c.wording_version_id
order by c.person_id, c.kind, c.recorded_at desc, c.id;
grant select on public.current_consents to authenticated;

-- ---------------------------------------------------------------------------
-- Profanity filter. Built-in EN and FR lists (never readable from the browser),
-- plus each choir's own additions and exceptions in
-- organizations.settings -> 'moderation' = { "filter": true, "extra_words": [], "allowed_words": [] }.
-- A word ending in * also matches longer words that start with it.
-- Messages from members that match are held for staff review; staff messages are not.
-- ---------------------------------------------------------------------------

create table app.profanity_words (
  word text primary key check (word ~ '^[a-z'' -]+\*?$'),
  lang public.lang not null
);
insert into app.profanity_words (word, lang) values
  ('fuck*', 'en'), ('motherfuck*', 'en'), ('shit*', 'en'), ('bullshit', 'en'), ('bitch*', 'en'), ('bastard*', 'en'),
  ('asshole*', 'en'), ('arsehole*', 'en'), ('cunt*', 'en'), ('pussy', 'en'), ('slut*', 'en'), ('whore*', 'en'),
  ('wanker*', 'en'), ('twat*', 'en'), ('douchebag*', 'en'), ('retard*', 'en'), ('fag', 'en'), ('fags', 'en'),
  ('faggot*', 'en'), ('dickhead*', 'en'), ('jackass', 'en'), ('piss off', 'en'), ('stfu', 'en'), ('wtf', 'en'),
  ('merde*', 'fr'), ('putain*', 'fr'), ('pute*', 'fr'), ('salope*', 'fr'), ('connard*', 'fr'), ('connasse*', 'fr'),
  ('encule*', 'fr'), ('nique', 'fr'), ('niquer', 'fr'), ('ta gueule', 'fr'), ('ferme ta gueule', 'fr'), ('salaud*', 'fr'),
  ('batard*', 'fr'), ('chier', 'fr'), ('fais chier', 'fr'), ('tabarnak*', 'fr'), ('tabarnac*', 'fr'), ('tabarnouche', 'fr'),
  ('calisse*', 'fr'), ('caliss*', 'fr'), ('crisse*', 'fr'), ('criss', 'fr'), ('osti', 'fr'), ('ostie', 'fr'),
  ('estie', 'fr'), ('ciboire', 'fr'), ('sacrament', 'fr'), ('viarge', 'fr'), ('tapette*', 'fr'), ('fif', 'fr'),
  ('pd', 'fr'), ('ntm', 'fr'), ('fdp', 'fr');
revoke all on app.profanity_words from public, anon, authenticated;

-- Lower case, accents removed, and common look-alike characters mapped back to letters.
create function app.normalize_for_filter(t text) returns text
language sql immutable set search_path = '' as $$
  select translate(lower(coalesce(t, '')),
                   'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ@$0134!',
                   'aaaaaaceeeeiiiinooooouuuuyyasoieai')
$$;

create function app.word_pattern(word text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(rtrim(app.normalize_for_filter(word), '*'), '([.\\+*?\[^\]$(){}=!<>|:#-])', '\\\1', 'g')
         || case when right(word, 1) = '*' then '\w*' else '' end
$$;

create function public.contains_profanity(org uuid, body text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  settings jsonb;
  allowed text[];
  pattern text;
begin
  select coalesce(o.settings -> 'moderation', '{}'::jsonb) into settings from public.organizations o where o.id = org;
  if coalesce((settings ->> 'filter')::boolean, true) is false then
    return false;
  end if;
  allowed := array(select app.normalize_for_filter(rtrim(x, '*')) from jsonb_array_elements_text(coalesce(settings -> 'allowed_words', '[]')) x);
  select string_agg(app.word_pattern(w), '|') into pattern
    from (
      select word as w from app.profanity_words
      union
      select x from jsonb_array_elements_text(coalesce(settings -> 'extra_words', '[]')) x where length(btrim(x)) > 0
    ) words
   where app.normalize_for_filter(rtrim(w, '*')) <> all (allowed);
  if pattern is null then
    return false;
  end if;
  return app.normalize_for_filter(body) ~ ('\m(' || pattern || ')\M');
end $$;
revoke all on function public.contains_profanity(uuid, text) from public, anon;
grant execute on function public.contains_profanity(uuid, text) to authenticated, service_role;

-- How many built-in words there are, for the Settings page (the words themselves stay hidden).
create function public.profanity_list_size()
returns table (lang public.lang, words int)
language sql stable security definer set search_path = '' as $$
  select lang, count(*)::int from app.profanity_words group by lang order by lang
$$;
grant execute on function public.profanity_list_size() to authenticated;

create function app.filter_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.author_person_id is not null
     and not exists (select 1 from public.member_roles mr where mr.person_id = new.author_person_id)
     and public.contains_profanity(new.organization_id, new.body) then
    new.held_for_review := true;
  end if;
  return new;
end $$;
create trigger messages_filter before insert on public.messages
  for each row execute function app.filter_message();

-- ---------------------------------------------------------------------------
-- Rate limits (fixed windows). Called only by the server, with keys such as
-- "signin:ip:203.0.113.5" or "signin:email:<sha-256 of the address>".
-- ---------------------------------------------------------------------------

create table app.rate_limits (
  key text primary key check (length(key) <= 200),
  window_start timestamptz not null default now(),
  hits int not null default 0
);
revoke all on app.rate_limits from public, anon, authenticated;

-- True when this hit is within the limit.
create function public.rate_limit_hit(bucket text, max_hits int, window_seconds int)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  insert into app.rate_limits as rl (key, window_start, hits) values (left(bucket, 200), now(), 1)
  on conflict (key) do update
     set hits = case when rl.window_start <= now() - make_interval(secs => window_seconds) then 1 else rl.hits + 1 end,
         window_start = case when rl.window_start <= now() - make_interval(secs => window_seconds) then now() else rl.window_start end
  returning hits into n;
  return n <= max_hits;
end $$;
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- Account deletion. The member asks in Settings; Choirbook emails a link that
-- works once, for 24 hours; opening it and confirming erases the account.
-- Payment records stay (tax law), attached to an anonymous "Deleted member".
-- ---------------------------------------------------------------------------

create table public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  token_hash text not null unique,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  cancelled_at timestamptz,
  completed_at timestamptz
);
create index account_deletions_user_idx on public.account_deletions (user_id, requested_at desc);
alter table public.account_deletions enable row level security;
revoke all on public.account_deletions from anon, authenticated;
grant select (id, user_id, requested_at, expires_at, cancelled_at, completed_at) on public.account_deletions to authenticated;
create policy account_deletions_own on public.account_deletions for select to authenticated
  using (user_id = (select auth.uid()));

-- Why the account cannot be deleted right now, or null when it can.
create function app.deletion_blocker(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.demo_accounts() d where d.user_id = uid) then 'demo'
    when exists (
      select 1
        from public.people p
        join public.member_roles mr on mr.person_id = p.id
        join public.roles r on r.id = mr.role_id and r.key = 'administrator'
       where p.user_id = uid
         and not exists (
           select 1 from public.member_roles mr2 join public.people p2 on p2.id = mr2.person_id
            where mr2.role_id = mr.role_id and p2.id <> p.id and p2.status = 'active'
         )
    ) then 'last_admin'
  end
$$;

create function public.request_account_deletion()
returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  blocker text;
  token text := encode(extensions.gen_random_bytes(24), 'hex');
  addr text;
  person record;
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  blocker := app.deletion_blocker(uid);
  if blocker is not null then
    return blocker;
  end if;
  if exists (select 1 from public.account_deletions d
              where d.user_id = uid and d.requested_at > now() - interval '10 minutes' and d.cancelled_at is null) then
    return 'too_soon';
  end if;
  update public.account_deletions set cancelled_at = now()
   where user_id = uid and completed_at is null and cancelled_at is null;
  insert into public.account_deletions (user_id, token_hash, expires_at)
  values (uid, encode(extensions.digest(token, 'sha256'), 'hex'), now() + interval '24 hours');

  select u.email into addr from auth.users u where u.id = uid;
  select p.id, p.organization_id, p.lang into person from public.people p where p.user_id = uid order by p.created_at limit 1;
  insert into public.email_queue (organization_id, to_email, to_person_id, template, subject, payload, priority)
  values (person.organization_id, addr, person.id, 'account_deletion',
          case when person.lang = 'fr' then 'Confirmez la suppression de votre compte Choirbook' else 'Confirm deleting your Choirbook account' end,
          jsonb_build_object('token', token, 'lang', coalesce(person.lang, 'en')), 1);
  return 'sent';
end $$;
revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

create function public.cancel_account_deletion()
returns void
language sql security definer set search_path = '' as $$
  update public.account_deletions set cancelled_at = now()
   where user_id = auth.uid() and completed_at is null and cancelled_at is null
$$;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

-- Is this confirmation link still good? ('valid', 'expired', 'used' or 'unknown')
create function public.account_deletion_state(token text)
returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when d.completed_at is not null then 'used'
      when d.cancelled_at is not null or d.expires_at <= now() then 'expired'
      else 'valid' end
      from public.account_deletions d
     where d.token_hash = encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex')
  ), 'unknown')
$$;
revoke all on function public.account_deletion_state(text) from public, anon, authenticated;
grant execute on function public.account_deletion_state(text) to service_role;

-- Erases everything about the account except payment records. Returns the
-- storage paths of the member's photos so the server can delete those files.
create function app.erase_account(uid uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  p record;
  photos text[] := '{}';
begin
  perform set_config('app.bypass_guards', 'on', true);
  perform set_config('app.skip_audit', 'on', true);
  for p in select * from public.people where user_id = uid loop
    if p.photo_path is not null then
      photos := photos || p.photo_path;
    end if;
    insert into public.audit_log (organization_id, actor_id, action, entity, entity_id, details)
    values (p.organization_id, uid, 'delete', 'account', p.id::text, jsonb_build_object('op', 'account_deletion'));

    delete from public.care_notes where person_id = p.id;
    delete from public.staff_notes where person_id = p.id;
    delete from public.consents where person_id = p.id;
    delete from public.form_responses where person_id = p.id;
    delete from public.absence_reports where person_id = p.id;
    delete from public.availability_replies where person_id = p.id;
    delete from public.practice_completions where person_id = p.id;
    delete from public.practice_log where person_id = p.id;
    delete from public.announcement_recipients where person_id = p.id;
    delete from public.monthly_update_deliveries where person_id = p.id;
    delete from public.volunteer_signups where person_id = p.id;
    delete from public.seating_positions where person_id = p.id;
    delete from public.chaperone_checks where person_id = p.id;
    delete from public.conversations where member_id = p.id;
    delete from public.message_reports where reporter_person_id = p.id;
    update public.messages set author_person_id = null where author_person_id = p.id;
    delete from public.member_roles where person_id = p.id;
    -- Guardians who are not linked to anyone else in the choir go too.
    delete from public.guardians g
     where g.id in (select gl.guardian_id from public.guardian_links gl where gl.chorister_id = p.id)
       and not exists (select 1 from public.guardian_links gl2 where gl2.guardian_id = g.id and gl2.chorister_id <> p.id);
    delete from public.guardian_links where chorister_id = p.id;
    delete from public.email_queue where to_person_id = p.id and status = 'queued';
    update public.email_queue set to_email = 'deleted@invalid', payload = '{}'::jsonb where to_person_id = p.id;
    update public.choristers set status = 'departed', departed_on = coalesce(departed_on, app.today_toronto()), school = null
     where person_id = p.id;
    -- Attendance and payments stay, attached to an anonymous record.
    update public.people
       set user_id = null, first_name = 'Deleted', last_name = 'member', preferred_name = null, email = null, phone = null,
           date_of_birth = null, pronouns = null, photo_path = null, contact_visibility = 'private',
           status = 'archived', archived_at = coalesce(archived_at, now()), messaging_suspended_at = null
     where id = p.id;
  end loop;
  delete from public.email_queue where to_email = (select email from auth.users where id = uid) and status = 'queued';
  delete from auth.users where id = uid;
  return photos;
end $$;

create function public.complete_account_deletion(token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  d record;
  blocker text;
  photos text[];
begin
  select * into d from public.account_deletions
   where token_hash = encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex')
   for update;
  if d.id is null then return jsonb_build_object('state', 'unknown'); end if;
  if d.completed_at is not null then return jsonb_build_object('state', 'used'); end if;
  if d.cancelled_at is not null or d.expires_at <= now() or d.user_id is null then
    return jsonb_build_object('state', 'expired');
  end if;
  blocker := app.deletion_blocker(d.user_id);
  if blocker is not null then
    return jsonb_build_object('state', blocker);
  end if;
  update public.account_deletions set completed_at = now() where id = d.id;
  photos := app.erase_account(d.user_id);
  return jsonb_build_object('state', 'deleted', 'photos', to_jsonb(photos));
end $$;
revoke all on function public.complete_account_deletion(text) from public, anon, authenticated;
grant execute on function public.complete_account_deletion(text) to service_role;

-- ---------------------------------------------------------------------------
-- Nightly housekeeping: birthdays and old rate-limit windows.
-- ---------------------------------------------------------------------------

create function public.nightly_privacy() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  adults int;
begin
  adults := public.process_coming_of_age();
  delete from app.rate_limits where window_start < now() - interval '1 day';
  update public.account_deletions set cancelled_at = now()
   where completed_at is null and cancelled_at is null and expires_at <= now();
  return jsonb_build_object('turned_18', adults);
end $$;
revoke all on function public.nightly_privacy() from public, anon, authenticated;
grant execute on function public.nightly_privacy() to service_role;

-- ---------------------------------------------------------------------------
-- Demo: every chorister has given the two required consents, so the profile
-- shows a realistic history. (The rebuild from Phase 5 runs first.)
-- ---------------------------------------------------------------------------

alter function public.rebuild_demo(text) rename to rebuild_demo_phase5;
alter function public.rebuild_demo_phase5(text) set schema app;
revoke all on function app.rebuild_demo_phase5(text) from public, anon, authenticated;

create function public.rebuild_demo(demo_password text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
  org uuid := app.demo_org_id();
begin
  result := app.rebuild_demo_phase5(demo_password);
  -- Seed history, not staff activity: keep it out of the audit log.
  perform set_config('app.skip_audit', 'on', true);
  insert into public.consents (organization_id, person_id, kind, granted, wording_version_id, method, recorded_at)
  select org, c.person_id, w.kind, true, w.id, 'self', now() - interval '40 days'
    from public.choristers c
    join public.consent_wording_versions w on w.organization_id = org and w.kind in ('participation', 'code_of_conduct')
   where c.organization_id = org and c.status <> 'auditioning';
  perform set_config('app.skip_audit', 'off', true);
  return result;
end $$;
revoke all on function public.rebuild_demo(text) from public, anon, authenticated;
grant execute on function public.rebuild_demo(text) to service_role;
