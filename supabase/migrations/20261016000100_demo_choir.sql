-- The public demo: a fictional youth choir (ages 15–25) that anyone can explore
-- as a chorister or as staff, rebuilt from scratch every night by
-- public.reset_demo(). Every date is relative to the day of the reset, so the
-- demo always looks like the middle of a live season.
--
-- Everything here is fictional. Emails use example.com.

-- Fixed ids so the demo accounts survive every reset.
create function app.demo_org_id() returns uuid language sql immutable as $$ select 'd0000000-0000-4000-8000-000000000001'::uuid $$;

-- The four shared demo accounts: chorister, administrator, section leader, treasurer.
create function public.demo_accounts()
returns table (role text, user_id uuid, email text)
language sql immutable as $$
  values
    ('chorister',      'd0000000-0000-4000-8000-0000000000a1'::uuid, 'demo.chorister@example.com'),
    ('administrator',  'd0000000-0000-4000-8000-0000000000a2'::uuid, 'demo.admin@example.com'),
    ('section_leader', 'd0000000-0000-4000-8000-0000000000a3'::uuid, 'demo.sectionleader@example.com'),
    ('treasurer',      'd0000000-0000-4000-8000-0000000000a4'::uuid, 'demo.treasurer@example.com')
$$;
grant execute on function public.demo_accounts() to anon, authenticated, service_role;

-- Is the caller one of the shared demo accounts? (Used to block account changes.)
create function public.is_demo_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.demo_accounts() d where d.user_id = auth.uid())
$$;
grant execute on function public.is_demo_user() to authenticated, service_role;

-- A stable pseudo-random number 0–99 for a piece of text, so the demo is the same every night.
create function app.roll(seed text) returns int
language sql immutable as $$ select abs(hashtext(seed)) % 100 $$;

-- Local Toronto time on a date, as a timestamp.
create function app.at_local(d date, t time) returns timestamptz
language sql immutable as $$ select (d + t) at time zone 'America/Toronto' $$;

create function public.reset_demo(demo_password text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  org uuid := app.demo_org_id();
  today date := (now() at time zone 'America/Toronto')::date;
  first_rehearsal date;
  season_id uuid := gen_random_uuid();
  fall_term uuid := gen_random_uuid();
  sec record;
  sec_ids jsonb := '{}'::jsonb;
  part_ids jsonb := '{}'::jsonb;
  pid uuid;
  i int := 0;
  j int;
  nm text;
  first_n text;
  last_n text;
  age int;
  dob date;
  sec_key text;
  part_key text;
  status_txt public.chorister_status;
  person_ids uuid[] := '{}';
  minors uuid[] := '{}';
  ella uuid;
  lucas uuid;
  claire uuid;
  anika uuid;
  jordan uuid;
  marcus uuid;
  helen uuid;
  ruth uuid;
  tom uuid;
  d date;
  ev uuid;
  n_rehearsal int := 0;
  concert1 uuid;
  concert2 uuid;
  dress uuid;
  tour uuid;
  sect_tb uuid;
  workshop uuid;
  concert1_day date;
  piece_ids jsonb := '{}'::jsonb;
  assign1 uuid;
  assign2 uuid;
  assign3 uuid;
  fee1 uuid := gen_random_uuid();
  fee2 uuid := gen_random_uuid();
  fa uuid;
  r int;
  form_perm uuid := gen_random_uuid();
  form_med uuid := gen_random_uuid();
  form_media uuid := gen_random_uuid();
  form_reg uuid := gen_random_uuid();
  form_conduct uuid := gen_random_uuid();
  form_tour uuid := gen_random_uuid();
  resp uuid;
  wording uuid;
  ann uuid;
  conv uuid;
  tt_adult uuid;
  tt_student uuid;
  ord uuid;
  chart uuid;
  job uuid;
  slot uuid;
  acct record;
  role_id uuid;
  g1 uuid;
  g2 uuid;
  names text[];
  sections text[] := array['S', 'A', 'T', 'B', 'U'];
  s_names text[] := array['Amara Okafor','Maya Chen','Sophie Gagnon','Lily Nguyen','Zoe Patel','Chloé Roy','Hannah Kowalski','Isla MacDonald','Nora Haddad','Grace Liu','Émilie Côté','Ruby Singh','Leah Friedman','Aanya Sharma','Clara Bouchard','Mia Rossi','Tessa Morin','Jade Wong','Elena Petrov','Freya Lindqvist','Naomi Asante','Juliette Pelletier'];
  a_names text[] := array['Ella Martin','Priya Nair','Charlotte Lavoie','Imogen Clarke','Sara Haile','Olivia Bergeron','Ayesha Rahman','Camille Dubé','Hazel Park','Lucia Moreno','Rosalie Fortin','Ivy Thompson','Mei Tanaka','Bianca Ferreira','Noor Al-Sayed','Audrey Leblanc','Sienna Walsh','Kiara Williams','Anouk Visser'];
  t_names text[] := array['Theo Novak','Samuel Osei','Gabriel Lefebvre','Arjun Mehta','Félix Girard','Daniel Kim','Owen Fraser','Mateo Silva','Elliot Brooks','Jonah Weiss'];
  b_names text[] := array['Lucas Bergeron','Oliver Tremblay','Ethan Wright','Malik Johnson','Nathan Caron','William Zhang','Isaac Mensah','Liam O''Connor','Henry Ashworth','Marcus Ibrahim','Adrien Paquette','Kai Yamamoto','Benjamin Hall'];
  u_names text[] := array['Zara Hussain','Eli Fontaine','Maeve Doyle','Ravi Iyer','Noah Kim'];
  g_first text[] := array['Mei','Sandra','Robert','Fatima','Marc','Julie','Kwame','Anne','Hiroshi','Lisa','Ahmed','Nathalie','Paul','Rachel','Viktor','Isabelle','Omar','Karen'];
  slugify text;
  rehearsal_ids uuid[] := '{}';
  past_rehearsals uuid[] := '{}';
  st public.attendance_status;
begin
  perform set_config('app.bypass_guards', 'on', true);
  perform set_config('app.skip_audit', 'on', true);

  -- Start clean: removing the choir removes everything in it.
  delete from public.organizations where id = org;
  delete from public.notifications where user_id in (select user_id from public.demo_accounts());
  delete from public.feedback where user_id in (select user_id from public.demo_accounts());

  insert into public.organizations (id, slug, name, short_name, kind, brand_color, is_demo, settings)
  values (org, 'demo', 'Maple Valley Youth Choir', 'MVYC', 'youth', '#B9391F', true,
          jsonb_build_object('guardian_copies', jsonb_build_array('fees', 'schedule', 'tours')));

  -- Season: a weekly Thursday rehearsal that began about five weeks ago.
  first_rehearsal := today - 35 - ((extract(isodow from today - 35)::int - 4 + 7) % 7);
  concert1_day := today + 56 + ((6 - extract(isodow from today + 56)::int + 7) % 7);
  insert into public.seasons (id, organization_id, name, starts_on, ends_on, is_current)
  values (season_id, org, extract(year from first_rehearsal)::int || '–' || right((extract(year from first_rehearsal)::int + 1)::text, 2),
          first_rehearsal - 7, first_rehearsal + 7 * 36, true);
  insert into public.terms (id, organization_id, season_id, name, starts_on, ends_on, absence_limit) values
    (fall_term, org, season_id, 'Fall', first_rehearsal - 7, concert1_day + 10, 3),
    (gen_random_uuid(), org, season_id, 'Winter–spring', concert1_day + 11, first_rehearsal + 7 * 36, 4);

  -- Sections and voice parts.
  for sec in select * from (values ('S','Sopranos','Sopranos',1), ('A','Altos','Altos',2), ('T','Tenors','Ténors',3), ('B','Basses','Basses',4)) as v(k, en, fr, sort) loop
    pid := gen_random_uuid();
    insert into public.sections (id, organization_id, key, name_en, name_fr, sort) values (pid, org, sec.k, sec.en, sec.fr, sec.sort);
    sec_ids := sec_ids || jsonb_build_object(sec.k, pid);
    for j in 1..2 loop
      insert into public.voice_parts (id, organization_id, section_id, key, name_en, name_fr, sort)
      values (gen_random_uuid(), org, (sec_ids ->> sec.k)::uuid, sec.k || j,
              (case sec.k when 'S' then 'Soprano' when 'A' then 'Alto' when 'T' then 'Tenor' else 'Bass' end) || ' ' || j,
              (case sec.k when 'S' then 'Soprano' when 'A' then 'Alto' when 'T' then 'Ténor' else 'Basse' end) || ' ' || j, j)
      returning id into pid;
      part_ids := part_ids || jsonb_build_object(sec.k || j, pid);
    end loop;
  end loop;

  -- Choristers. Ages 15–25; a handful of 16- and 17-year-olds have guardian contacts.
  foreach sec_key in array sections loop
    names := case sec_key when 'S' then s_names when 'A' then a_names when 'T' then t_names when 'B' then b_names else u_names end;
    for j in 1..array_length(names, 1) loop
      nm := names[j];
      first_n := split_part(nm, ' ', 1);
      last_n := substr(nm, length(first_n) + 2);
      age := case
        when nm = 'Ella Martin' then 19
        when nm in ('Maya Chen', 'Priya Nair', 'Oliver Tremblay', 'Lily Nguyen') then 17
        when nm in ('Noah Kim', 'Olivia Bergeron', 'Tessa Morin', 'Félix Girard') then 16
        else 18 + (i * 7) % 8 end;
      dob := (today - make_interval(years => age))::date - (30 + (i * 37) % 300);
      if nm = 'Ella Martin' then dob := (today - interval '19 years')::date - 120; end if;
      slugify := lower(regexp_replace(translate(nm, 'éèêëàâäôöûüçÉ''', 'eeeeaaaoouucE'), '[^A-Za-z]+', '.', 'g'));
      part_key := case when sec_key = 'U' then null else sec_key || ((j % 2) + 1) end;
      if nm = 'Ella Martin' then part_key := 'A2'; end if;
      status_txt := case when sec_key = 'U' then 'auditioning' else 'active' end;
      pid := gen_random_uuid();
      insert into public.people (id, organization_id, first_name, last_name, email, phone, date_of_birth, pronouns, status, contact_visibility, lang)
      values (pid, org, first_n, last_n,
              case when nm = 'Ella Martin' then 'demo.chorister@example.com' else slugify || '@example.com' end,
              '(613) 555-01' || lpad((10 + i % 89)::text, 2, '0'), dob,
              case when sec_key in ('T', 'B') then case when i % 5 = 0 then 'they/them' else 'he/him' end
                   else case when i % 7 = 0 then 'they/them' else 'she/her' end end,
              'active',
              case when i % 4 = 0 then 'choir' else 'private' end::public.contact_visibility,
              case when i % 6 = 0 then 'fr' else 'en' end::public.lang);
      insert into public.choristers (person_id, organization_id, section_id, voice_part_id, status, joined_on, school)
      values (pid, org,
              case when sec_key = 'U' then null else (sec_ids ->> sec_key)::uuid end,
              case when part_key is null then null else (part_ids ->> part_key)::uuid end,
              status_txt,
              first_rehearsal - make_interval(years => case when nm = 'Ella Martin' then 3 else 1 + (i * 3) % 5 end),
              case when age <= 17 then (array['Northfield Secondary','Bayview Collegiate','Hillcrest High School','École secondaire Champlain'])[1 + i % 4]
                   else (array['Capital College','Northgate University'])[1 + i % 2] end);
      person_ids := person_ids || pid;
      if age < 18 then
        minors := minors || pid;
        g1 := gen_random_uuid();
        insert into public.guardians (id, organization_id, first_name, last_name, email, phone)
        values (g1, org, g_first[1 + (i * 5) % 18], last_n, lower(g_first[1 + (i * 5) % 18]) || '.' || split_part(slugify, '.', 2) || '@example.com',
                '(613) 555-02' || lpad((10 + i % 89)::text, 2, '0'));
        insert into public.guardian_links (organization_id, guardian_id, chorister_id, relationship, is_primary)
        values (org, g1, pid, (array['Mother','Father','Parent','Guardian'])[1 + i % 4], true);
        if i % 3 <> 0 then
          g2 := gen_random_uuid();
          insert into public.guardians (id, organization_id, first_name, last_name, email, phone)
          values (g2, org, g_first[1 + (i * 5 + 7) % 18], last_n, lower(g_first[1 + (i * 5 + 7) % 18]) || '.' || split_part(slugify, '.', 2) || '@example.com',
                  '(613) 555-03' || lpad((10 + i % 89)::text, 2, '0'));
          insert into public.guardian_links (organization_id, guardian_id, chorister_id, relationship, is_primary)
          values (org, g2, pid, (array['Mother','Father','Parent','Guardian'])[1 + (i + 1) % 4], false);
        end if;
      end if;
      if nm = 'Ella Martin' then ella := pid; end if;
      if nm = 'Lucas Bergeron' then lucas := pid; end if;
      i := i + 1;
    end loop;
  end loop;

  -- Care notes for a few choristers (staff with the care permission see them).
  insert into public.care_notes (organization_id, person_id, label, detail, severity) values
    (org, person_ids[2], 'Asthma', 'Carries an inhaler. A spare is in the first-aid kit.', 'medium'),
    (org, person_ids[30], 'Peanut allergy', 'EpiPen in backpack. No nuts at rehearsal snacks.', 'high'),
    (org, ella, 'Migraines', 'May need to sit out under bright stage lights.', 'medium');

  -- Staff.
  for sec in select * from (values
      ('Claire', 'Dubois', 'demo.admin@example.com', 'administrator', null),
      ('Anika', 'Rowe', 'anika.rowe@example.com', 'conductor', null),
      ('Jordan', 'Ellis', 'demo.sectionleader@example.com', 'section_leader', 'A'),
      ('Marcus', 'Lee', 'marcus.lee@example.com', 'section_leader', 'B'),
      ('Helen', 'Ng', 'demo.treasurer@example.com', 'treasurer', null),
      ('Ruth', 'Campbell', 'ruth.campbell@example.com', 'chaperone', null),
      ('Tom', 'Okafor', 'tom.okafor@example.com', 'office', null)
    ) as v(f, l, email, rkey, scope) loop
    pid := gen_random_uuid();
    insert into public.people (id, organization_id, first_name, last_name, email, status, contact_visibility)
    values (pid, org, sec.f, sec.l, sec.email, 'active', 'choir');
    select id into role_id from public.roles where organization_id = org and key = sec.rkey;
    insert into public.member_roles (organization_id, person_id, role_id, section_id)
    values (org, pid, role_id, case when sec.scope is null then null else (sec_ids ->> sec.scope)::uuid end);
    case sec.f
      when 'Claire' then claire := pid; when 'Anika' then anika := pid; when 'Jordan' then jordan := pid;
      when 'Marcus' then marcus := pid; when 'Helen' then helen := pid; when 'Ruth' then ruth := pid; else tom := pid;
    end case;
  end loop;
  insert into public.chaperone_checks (organization_id, person_id, verified_on, expires_on)
  values (org, ruth, today - 1080, today + 24), (org, tom, today - 200, today + 900);

  -- Staff-only notes.
  insert into public.staff_notes (organization_id, person_id, author_id, body, created_at) values
    (org, lucas, null, 'Hockey practice clashes with Thursdays until mid-November. Asked for a plan before the dress rehearsal.', now() - interval '6 days'),
    (org, lucas, null, 'Strong sight-reader. Would be a good candidate for bass section leader next season.', now() - interval '14 days'),
    (org, ella, null, 'Holding the A2 line confidently. Offered to buddy with a new alto.', now() - interval '7 days');

  -- Calendar: weekly rehearsals, sectionals, concerts, a tour, deadlines.
  d := first_rehearsal;
  while d <= first_rehearsal + 7 * 34 loop
    if d <> concert1_day + 12 and d <> concert1_day + 19 then
      n_rehearsal := n_rehearsal + 1;
      ev := gen_random_uuid();
      insert into public.events (id, organization_id, season_id, type, title, starts_at, ends_at, call_at, location, address, map_url, dress_code, bring, running_order)
      values (ev, org, season_id, 'rehearsal', 'Rehearsal ' || n_rehearsal, app.at_local(d, '18:30'), app.at_local(d, '20:30'), app.at_local(d, '18:15'),
              'Grace Hall', '41 Linden Street', 'https://www.openstreetmap.org/search?query=41%20Linden%20Street',
              'Rehearsal casual', 'Black folder, pencil, water bottle',
              jsonb_build_array(
                jsonb_build_object('time', '18:30', 'item', 'Warm-up and vocalises', 'who', 'Full choir'),
                jsonb_build_object('time', '18:45', 'item', 'Ubi Caritas', 'who', 'Full choir'),
                jsonb_build_object('time', '19:10', 'item', 'Sectionals', 'who', 'S/A in the hall · T/B in Room 2'),
                jsonb_build_object('time', '19:40', 'item', 'Break', 'who', ''),
                jsonb_build_object('time', '19:50', 'item', 'Bogoroditse Devo', 'who', 'Full choir'),
                jsonb_build_object('time', '20:20', 'item', 'Announcements', 'who', 'Claire Dubois')));
      rehearsal_ids := rehearsal_ids || ev;
      if d < today then past_rehearsals := past_rehearsals || ev; end if;
    end if;
    d := d + 7;
  end loop;

  insert into public.events (id, organization_id, season_id, type, title, starts_at, ends_at, location, section_ids)
  values (gen_random_uuid(), org, season_id, 'sectional', 'Tenor and bass sectional', app.at_local(today + 9, '10:00'), app.at_local(today + 9, '11:30'),
          'Grace Hall, Room 2', array[(sec_ids ->> 'T')::uuid, (sec_ids ->> 'B')::uuid])
  returning id into sect_tb;
  insert into public.events (id, organization_id, season_id, type, title, starts_at, ends_at, location)
  values (gen_random_uuid(), org, season_id, 'sectional', 'Sectional workshop', app.at_local(today + 23, '10:00'), app.at_local(today + 23, '13:00'), 'Grace Hall')
  returning id into workshop;
  insert into public.events (id, organization_id, season_id, type, title, starts_at, ends_at, call_at, location, address, dress_code, bring, availability_requested, availability_due_at)
  values (gen_random_uuid(), org, season_id, 'rehearsal', 'Dress rehearsal', app.at_local(concert1_day - 1, '17:30'), app.at_local(concert1_day - 1, '20:30'),
          app.at_local(concert1_day - 1, '17:15'), 'Holy Trinity Church', '120 Oak Avenue', 'Concert blacks', 'Folder, water, choir scarf', true, now() + interval '10 days')
  returning id into dress;
  insert into public.events (id, organization_id, season_id, type, title, description, starts_at, ends_at, call_at, location, address, map_url, dress_code, bring, availability_requested, availability_due_at)
  values (gen_random_uuid(), org, season_id, 'concert', 'Winter Light', 'Our winter concert: Duruflé, Rachmaninoff, Whitacre and a new piece by Anna Whitfield.',
          app.at_local(concert1_day, '19:00'), app.at_local(concert1_day, '21:00'), app.at_local(concert1_day, '17:45'),
          'Holy Trinity Church', '120 Oak Avenue', 'https://www.openstreetmap.org/search?query=120%20Oak%20Avenue',
          'Concert blacks with choir scarf', 'Folder, water bottle, choir scarf', true, now() + interval '10 days')
  returning id into concert1;
  insert into public.events (id, organization_id, season_id, type, title, starts_at, ends_at, location)
  values (gen_random_uuid(), org, season_id, 'social', 'Holiday party', app.at_local(concert1_day + 5, '18:30'), app.at_local(concert1_day + 5, '20:30'), 'Grace Hall');
  insert into public.events (id, organization_id, season_id, type, title, description, starts_at, ends_at, location)
  values (gen_random_uuid(), org, season_id, 'tour', 'Spring tour to Québec City', 'Three days, two concerts, one festival workshop. Bus from Grace Hall.',
          app.at_local(today + 190, '07:30'), app.at_local(today + 192, '19:00'), 'Québec City')
  returning id into tour;
  insert into public.events (id, organization_id, season_id, type, title, starts_at, ends_at, call_at, location, address)
  values (gen_random_uuid(), org, season_id, 'concert', 'Songs of the River', app.at_local(today + 212, '14:30'), app.at_local(today + 212, '16:30'),
          app.at_local(today + 212, '13:15'), 'Riverside Arts Centre', '8 Quay Road')
  returning id into concert2;
  insert into public.events (organization_id, season_id, type, title, starts_at, all_day) values
    (org, season_id, 'deadline', 'Annual fee due', app.at_local(today + 16, '00:00'), true),
    (org, season_id, 'deadline', 'Winter Light permission forms due', app.at_local(concert1_day - 12, '00:00'), true);

  -- Attendance for past rehearsals: mostly present, some late, excused or absent.
  foreach ev in array past_rehearsals loop
    foreach pid in array person_ids loop
      continue when exists (select 1 from public.choristers c where c.person_id = pid and c.status = 'auditioning');
      r := app.roll(pid::text || ev::text);
      st := case when r < 86 then 'present' when r < 92 then 'late' when r < 96 then 'excused' else 'absent' end;
      if pid = lucas and r % 2 = 0 then st := 'absent'; end if;
      if pid = ella then st := case when r < 90 then 'present' else 'excused' end; end if;
      insert into public.attendance (organization_id, event_id, person_id, status, source, marked_at)
      values (org, ev, pid, st, 'staff', (select starts_at from public.events where id = ev) + interval '20 minutes');
    end loop;
  end loop;

  -- Absence reports for the next rehearsal.
  insert into public.absence_reports (organization_id, event_id, person_id, kind, reason)
  select org, rehearsal_ids[array_length(past_rehearsals, 1) + 1], x.p, x.k::public.absence_kind, x.why
  from (values (person_ids[2], 'absent', 'Sick'), (person_ids[43], 'absent', 'Family travel'), (person_ids[24], 'late', 'Exam until 6:30')) as x(p, k, why);

  -- Availability for the dress rehearsal and concert (Ella has not answered yet).
  foreach pid in array person_ids loop
    continue when pid = ella or exists (select 1 from public.choristers c where c.person_id = pid and c.status = 'auditioning');
    r := app.roll('avail' || pid::text);
    if r < 70 then
      insert into public.availability_replies (organization_id, event_id, person_id, answer, comment)
      values (org, concert1, pid, case when r < 62 then 'yes' when r < 66 then 'maybe' else 'no' end::public.availability_answer,
              case when r between 62 and 65 then 'Waiting on my exam schedule' else null end);
      insert into public.availability_replies (organization_id, event_id, person_id, answer)
      values (org, dress, pid, case when r < 58 then 'yes' when r < 64 then 'maybe' else 'no' end::public.availability_answer);
    end if;
  end loop;

  -- Music library and practice.
  for sec in select * from (values
      ('ubi', 'Ubi Caritas', 'Maurice Duruflé', null, 'SATB', 'Latin', 154),
      ('bogo', 'Bogoroditse Devo', 'Sergei Rachmaninoff', null, 'SATB divisi', 'Church Slavonic', 196),
      ('seal', 'The Seal Lullaby', 'Eric Whitacre', null, 'SATB', 'English', 232),
      ('swallow', 'She’s Like the Swallow', 'Newfoundland folk song', 'M. Lavoie', 'SATB', 'English', 205),
      ('winter', 'Winter Light', 'Anna Whitfield', null, 'SSAATB', 'English', 268)
    ) as v(k, title, composer, arranger, voicing, language, secs) loop
    pid := gen_random_uuid();
    insert into public.pieces (id, organization_id, title, composer, arranger, voicing, language, duration_seconds)
    values (pid, org, sec.title, sec.composer, sec.arranger, sec.voicing, sec.language, sec.secs);
    piece_ids := piece_ids || jsonb_build_object(sec.k, pid);
    insert into public.score_files (organization_id, piece_id, label, storage_path, size_bytes, released_at)
    values (org, pid, 'Score', 'demo/scores/' || sec.k || '.pdf', 900000, now() - interval '30 days');
    insert into public.learning_tracks (organization_id, piece_id, label, kind, voice_part_id, section_id, storage_path, duration_seconds, released_at)
    select org, pid, label, kind, vp, sc, 'demo/tracks/' || sec.k || '-' || f || '.wav', sec.secs, now() - interval '30 days'
    from (values
      ('Full choir', 'full', null::uuid, null::uuid, 'full'),
      ('Soprano', 'predominant', null, (sec_ids ->> 'S')::uuid, 'soprano'),
      ('Alto', 'predominant', null, (sec_ids ->> 'A')::uuid, 'alto'),
      ('Tenor', 'predominant', null, (sec_ids ->> 'T')::uuid, 'tenor'),
      ('Bass', 'predominant', null, (sec_ids ->> 'B')::uuid, 'bass')) as t(label, kind, vp, sc, f);
    insert into public.set_list_items (organization_id, event_id, piece_id, position)
    values (org, case when sec.k = 'swallow' then concert2 else concert1 end, pid,
            case sec.k when 'ubi' then 1 when 'bogo' then 2 when 'seal' then 3 when 'winter' then 4 else 1 end);
  end loop;

  insert into public.practice_assignments (id, organization_id, piece_id, title, instructions, bars, due_on, released_at)
  values (gen_random_uuid(), org, (piece_ids ->> 'bogo')::uuid, 'Memorise the opening', 'Learn mm. 1–24 from memory. Watch the crescendo at m. 17 and keep the vowels tall.', 'mm. 1–24', today + 7, now() - interval '3 days')
  returning id into assign1;
  insert into public.practice_assignments (id, organization_id, piece_id, title, instructions, bars, due_on, section_ids, released_at)
  values (gen_random_uuid(), org, (piece_ids ->> 'winter')::uuid, 'Alto divisi at bar 30', 'Use the Alto track. Sing A2 against the full choir three times.', 'mm. 28–40', today + 14,
          array[(sec_ids ->> 'A')::uuid], now() - interval '2 days')
  returning id into assign2;
  insert into public.practice_assignments (id, organization_id, piece_id, title, instructions, bars, due_on, released_at)
  values (gen_random_uuid(), org, (piece_ids ->> 'ubi')::uuid, 'Ubi Caritas from memory', 'Full run without the score before the sectional workshop.', null, today + 23, now() - interval '10 days')
  returning id into assign3;
  foreach pid in array person_ids loop
    if app.roll('a1' || pid::text) < 45 then insert into public.practice_completions (organization_id, assignment_id, person_id) values (org, assign1, pid); end if;
    if app.roll('a3' || pid::text) < 70 or pid = ella then insert into public.practice_completions (organization_id, assignment_id, person_id) values (org, assign3, pid); end if;
    if app.roll('log' || pid::text) < 40 or pid = ella then
      insert into public.practice_log (organization_id, person_id, piece_id, practised_on, minutes)
      select org, pid, (piece_ids ->> (array['ubi','bogo','winter'])[1 + k % 3])::uuid, today - k * 2, 10 + (k * 7) % 25
      from generate_series(1, 5) k;
    end if;
  end loop;

  -- Consent wording and forms.
  insert into public.consent_wording_versions (id, organization_id, kind, version, body_en, body_fr)
  values (gen_random_uuid(), org, 'photo_video', 1,
          'Maple Valley Youth Choir may use photos and video of me from rehearsals and concerts on its website and social media.',
          'Le Maple Valley Youth Choir peut utiliser des photos et vidéos de moi prises aux répétitions et concerts sur son site et ses réseaux sociaux.')
  returning id into wording;
  insert into public.consent_wording_versions (organization_id, kind, version, body_en, body_fr) values
    (org, 'participation', 1, 'I agree to take part in the choir’s 2026–27 season.', 'J’accepte de participer à la saison 2026-2027 du chœur.'),
    (org, 'code_of_conduct', 1, 'I have read and agree to the choir’s code of conduct.', 'J’ai lu et j’accepte le code de conduite du chœur.'),
    (org, 'medical_info', 1, 'The choir may share my medical information with chaperones on trips.', 'Le chœur peut communiquer mes renseignements médicaux aux accompagnateurs lors des voyages.');

  insert into public.forms (id, organization_id, season_id, title, kind, description, due_on, requires_signature, guardian_signature_required, status, fields) values
    (form_perm, org, season_id, 'Winter Light permission form', 'permission', 'Dress rehearsal and concert at Holy Trinity Church.', concert1_day - 12, true, true, 'open',
     '[{"id":"attending","type":"checkbox","label_en":"I will attend the dress rehearsal and concert","label_fr":"Je serai présent à la générale et au concert","required":true},{"id":"pickup","type":"text","label_en":"Pick-up person","label_fr":"Personne qui viendra me chercher"}]'),
    (form_med, org, season_id, 'Medical information', 'medical', null, first_rehearsal + 14, true, false, 'open',
     '[{"id":"allergies","type":"text","label_en":"Allergies","label_fr":"Allergies"},{"id":"medication","type":"text","label_en":"Medication","label_fr":"Médicaments"}]'),
    (form_media, org, season_id, 'Photo and video consent', 'consent', null, first_rehearsal + 14, true, false, 'open', '[]'),
    (form_reg, org, season_id, 'Registration', 'registration', null, first_rehearsal, false, false, 'closed', '[]'),
    (form_conduct, org, season_id, 'Code of conduct', 'agreement', null, first_rehearsal, true, false, 'closed', '[]'),
    (form_tour, org, season_id, 'Spring tour permission', 'permission', 'Travel to Québec City by chartered bus, two nights in a hotel with chaperones.', today + 60, true, true, 'open',
     '[{"id":"roommate","type":"text","label_en":"Roommate request","label_fr":"Demande de compagnon de chambre"},{"id":"dietary","type":"text","label_en":"Dietary needs","label_fr":"Besoins alimentaires"}]');

  foreach pid in array person_ids loop
    continue when exists (select 1 from public.choristers c where c.person_id = pid and c.status = 'auditioning');
    r := app.roll('forms' || pid::text);
    insert into public.form_responses (organization_id, form_id, person_id, status, submitted_at, signed_name, signed_at)
    select org, f, pid, 'approved', now() - interval '40 days', 'Signed', now() - interval '40 days' from unnest(array[form_reg, form_conduct]) f;
    if r >= 6 then
      insert into public.form_responses (organization_id, form_id, person_id, status, submitted_at, answers)
      values (org, form_med, pid, 'approved', now() - interval '25 days', '{"allergies":"None"}');
    end if;
    if r >= 3 then
      insert into public.form_responses (organization_id, form_id, person_id, status, submitted_at)
      values (org, form_media, pid, 'approved', now() - interval '25 days');
      insert into public.consents (organization_id, person_id, kind, granted, wording_version_id, method, recorded_at)
      values (org, pid, 'photo_video', r >= 10, wording, 'self', now() - interval '25 days');
    end if;
    if r < 35 and pid <> ella then
      insert into public.form_responses (organization_id, form_id, person_id, status, submitted_at, answers)
      values (org, form_perm, pid, 'submitted', now() - interval '2 days', '{"attending":true}');
    end if;
  end loop;

  -- A minor's tour form, submitted and waiting on a guardian's signature.
  insert into public.form_responses (id, organization_id, form_id, person_id, status, submitted_at, answers)
  values (gen_random_uuid(), org, form_tour, minors[1], 'submitted', now() - interval '1 day', '{"roommate":"Priya Nair","dietary":"Vegetarian"}')
  returning id into resp;
  insert into public.guardian_signatures (organization_id, response_id, guardian_id, token_hash, expires_at, sent_at)
  select org, resp, gl.guardian_id, 'demo-not-a-real-token-' || resp, now() + interval '6 days', now() - interval '1 day'
  from public.guardian_links gl where gl.chorister_id = minors[1] and gl.is_primary;

  -- Fees: annual fee in every state, plus an overdue tour deposit.
  insert into public.fees (id, organization_id, season_id, name, description, amount_cents, due_on, allows_instalments) values
    (fee1, org, season_id, 'Annual fee', 'Covers music, the hall and the conductor. Pay in full or in two instalments.', 39000, today + 16, true),
    (fee2, org, season_id, 'Spring tour deposit', 'Holds your seat on the bus and in the hotel.', 15000, today - 9, false);
  foreach pid in array person_ids loop
    continue when exists (select 1 from public.choristers c where c.person_id = pid and c.status = 'auditioning');
    r := app.roll('fee' || pid::text);
    fa := gen_random_uuid();
    insert into public.fee_assignments (id, organization_id, fee_id, person_id, amount_cents) values (fa, org, fee1, pid, 39000);
    if pid = ella then
      insert into public.instalments (organization_id, assignment_id, due_on, amount_cents) values (org, fa, today - 20, 19500), (org, fa, today + 16, 19500);
      insert into public.payments (organization_id, assignment_id, person_id, amount_cents, method, status, received_at, receipt_number, stripe_payment_intent_id)
      values (org, fa, pid, 19500, 'card', 'succeeded', now() - interval '21 days', 'MVYC-' || upper(left(replace(fa::text, '-', ''), 10)), 'pi_demo_' || replace(fa::text, '-', ''));
    elsif r < 55 then
      insert into public.payments (organization_id, assignment_id, person_id, amount_cents, method, status, received_at, receipt_number)
      values (org, fa, pid, 39000, case when r < 40 then 'card' when r < 48 then 'etransfer' else 'cheque' end::public.payment_method, 'succeeded',
              now() - make_interval(days => 5 + r % 30), 'MVYC-' || upper(left(replace(fa::text, '-', ''), 10)));
    elsif r < 65 then
      insert into public.instalments (organization_id, assignment_id, due_on, amount_cents) values (org, fa, today - 20, 19500), (org, fa, today + 16, 19500);
      insert into public.payments (organization_id, assignment_id, person_id, amount_cents, method, status, received_at)
      values (org, fa, pid, 19500, 'card', 'succeeded', now() - interval '20 days');
    elsif r < 69 then
      insert into public.fee_adjustments (organization_id, assignment_id, kind, amount_cents, reason, status, decided_at)
      values (org, fa, 'financial_aid', 39000, 'Bursary approved by the board.', 'approved', now() - interval '30 days');
    elsif r < 72 then
      insert into public.fee_adjustments (organization_id, assignment_id, kind, amount_cents, reason, status)
      values (org, fa, 'financial_aid', 19500, 'Asking for help with half of the fee this year.', 'requested');
    end if;
    -- Tour deposit: most paid, some overdue.
    fa := gen_random_uuid();
    insert into public.fee_assignments (id, organization_id, fee_id, person_id, amount_cents) values (fa, org, fee2, pid, 15000);
    if app.roll('dep' || pid::text) < 88 or pid = ella then
      insert into public.payments (organization_id, assignment_id, person_id, amount_cents, method, status, received_at)
      values (org, fa, pid, 15000, 'card', 'succeeded', now() - interval '12 days');
    end if;
  end loop;

  -- Announcements, sent to everyone, with read receipts.
  for sec in select * from (values
      ('Group photo this Thursday', 'Please wear your choir T-shirt on Thursday. The photo is right after the break and takes about five minutes.', 2, false, false),
      ('Winter Light tickets are on sale', 'Family tickets are $20, students $10, and choristers are free. Use your personal sales link so we can thank our top sellers.', 6, true, false),
      ('Carpool sign-up for the dress rehearsal', 'If you can drive from Grace Hall to Holy Trinity Church for the dress rehearsal, add your name by next Friday.', 13, false, true),
      ('Welcome to the new season', 'Welcome back, and welcome to our new members. Your learning tracks are in Music.', 34, false, false)
    ) as v(title, body, days_ago, pinned, ack) loop
    ann := gen_random_uuid();
    insert into public.announcements (id, organization_id, title, body, pinned, requires_ack, ack_due_on, published_at, created_at)
    values (ann, org, sec.title, sec.body, sec.pinned, sec.ack, case when sec.ack then today + 8 end,
            now() - make_interval(days => sec.days_ago), now() - make_interval(days => sec.days_ago));
    insert into public.announcement_recipients (organization_id, announcement_id, person_id, read_at, acknowledged_at)
    select org, ann, p.id,
           case when (p.id = ella and sec.days_ago = 2) then null
                when app.roll(ann::text || p.id::text) < 72 or sec.days_ago > 20 then now() - make_interval(days => greatest(sec.days_ago - 1, 0)) end,
           case when sec.ack and app.roll('ack' || p.id::text) < 45 then now() - interval '3 days' end
    from public.people p where p.organization_id = org;
  end loop;

  -- Office inbox.
  insert into public.conversations (id, organization_id, member_id, subject, category, status, assigned_to, created_at, last_message_at, first_staff_reply_at, resolved_at)
  values (gen_random_uuid(), org, ella, 'Alto 2 track for Winter Light', 'music', 'resolved', jordan, now() - interval '7 days', now() - interval '6 days', now() - interval '6 days', now() - interval '6 days')
  returning id into conv;
  insert into public.messages (organization_id, conversation_id, author_person_id, body, created_at) values
    (org, conv, ella, 'Is there a separate alto 2 learning track for Winter Light? The divisi in bar 30 is hard to hear on the full alto track.', now() - interval '7 days'),
    (org, conv, jordan, 'Good catch. Anika recorded one today. It is in Music under Winter Light now.', now() - interval '6 days');
  -- The reply trigger reopens a thread when the member writes; this one was resolved afterwards.
  update public.conversations set status = 'resolved' where id = conv;
  insert into public.conversations (id, organization_id, member_id, subject, category, status, assigned_to, created_at, last_message_at, first_staff_reply_at)
  values (gen_random_uuid(), org, ella, 'Paying the rest of my fee', 'fees', 'open', claire, now() - interval '2 days', now() - interval '1 day', now() - interval '1 day')
  returning id into conv;
  insert into public.messages (organization_id, conversation_id, author_person_id, body, created_at) values
    (org, conv, ella, 'Hi! Can I pay the second half of my fee after my student loan comes in next month?', now() - interval '2 days'),
    (org, conv, claire, 'Of course. Your second instalment is due on the date shown in Forms and fees; if you need a week or two more, just reply here.', now() - interval '1 day');
  insert into public.conversations (id, organization_id, member_id, subject, category, status, assigned_to, created_at, last_message_at, first_staff_reply_at)
  values (gen_random_uuid(), org, lucas, 'Hockey practice on Thursdays', 'absence', 'open', anika, now() - interval '5 days', now() - interval '4 days', now() - interval '4 days')
  returning id into conv;
  insert into public.messages (organization_id, conversation_id, author_person_id, body, created_at) values
    (org, conv, lucas, 'My hockey practices move to Thursdays until mid-November. I really want to sing in Winter Light. Is there a way to make it work?', now() - interval '5 days'),
    (org, conv, anika, 'Thanks for telling us early. If you can come to the T/B sectional and the workshop, you can catch up on what you miss.', now() - interval '4 days');
  insert into public.conversations (id, organization_id, member_id, subject, category, status, created_at, last_message_at)
  values (gen_random_uuid(), org, person_ids[2], 'Spare inhaler', 'general', 'open', now() - interval '3 days', now() - interval '3 days')
  returning id into conv;
  insert into public.messages (organization_id, conversation_id, author_person_id, body, created_at)
  values (org, conv, person_ids[2], 'I will have a new inhaler next week. Can a chaperone keep a spare in the first-aid kit?', now() - interval '3 days');
  insert into public.conversations (id, organization_id, member_id, subject, category, status, created_at, last_message_at)
  values (gen_random_uuid(), org, person_ids[array_length(person_ids, 1)], 'First rehearsal', 'general', 'open', now() - interval '20 hours', now() - interval '20 hours')
  returning id into conv;
  insert into public.messages (organization_id, conversation_id, author_person_id, body, created_at)
  values (org, conv, person_ids[array_length(person_ids, 1)], 'I start next Thursday. Should I bring anything?', now() - interval '20 hours');

  -- Monthly update draft.
  insert into public.monthly_updates (organization_id, month, status, conductor_note, free_text)
  values (org, date_trunc('month', today)::date, 'review',
          'The choir is singing Ubi Caritas from memory, and the Rachmaninoff is starting to glow. Keep up ten minutes of practice a day.',
          'Winter Light tickets are on sale. Choristers are free.');

  -- Tickets for Winter Light, with a personal sales link for Ella.
  insert into public.ticket_types (id, organization_id, event_id, name, price_cents, capacity, sales_start_at, sales_end_at)
  values (gen_random_uuid(), org, concert1, 'Adult', 2000, 250, now() - interval '7 days', app.at_local(concert1_day, '18:00')) returning id into tt_adult;
  insert into public.ticket_types (id, organization_id, event_id, name, price_cents, capacity, sales_start_at, sales_end_at)
  values (gen_random_uuid(), org, concert1, 'Student', 1000, 100, now() - interval '7 days', app.at_local(concert1_day, '18:00')) returning id into tt_student;
  insert into public.seller_links (organization_id, event_id, person_id, code) values (org, concert1, ella, 'ellamvyc1');
  insert into public.seller_links (organization_id, event_id, person_id, code)
  select org, concert1, p, 'mvyc' || lpad(k::text, 4, '0') from unnest(person_ids[1:12]) with ordinality as t(p, k);
  for j in 1..34 loop
    ord := gen_random_uuid();
    insert into public.ticket_orders (id, organization_id, event_id, buyer_name, buyer_email, seller_link_id, total_cents, status, created_at)
    values (ord, org, concert1, 'Buyer ' || j, 'buyer' || j || '@example.com',
            (select id from public.seller_links where organization_id = org and (j % 3 = 0 and person_id = ella or j % 3 = 1 and code = 'mvyc' || lpad((1 + j % 12)::text, 4, '0')) limit 1),
            2000 * (1 + j % 3) + 1000 * (j % 2), 'paid', now() - make_interval(days => j % 7, hours => j));
    insert into public.tickets (organization_id, order_id, ticket_type_id) select org, ord, tt_adult from generate_series(1, 1 + j % 3);
    if j % 2 = 1 then insert into public.tickets (organization_id, order_id, ticket_type_id) values (org, ord, tt_student); end if;
  end loop;
  insert into public.tickets (organization_id, ticket_type_id, issued_to, is_comp) values (org, tt_adult, ella, true), (org, tt_adult, ella, true);

  -- Riser chart for Winter Light: one row per section.
  insert into public.seating_charts (id, organization_id, event_id, name, layout, published_at)
  values (gen_random_uuid(), org, concert1, 'Risers', '{"rows":[{"label":"A","seats":22},{"label":"B","seats":22},{"label":"C","seats":22},{"label":"D","seats":22}]}', now() - interval '1 day')
  returning id into chart;
  insert into public.seating_positions (organization_id, chart_id, person_id, row_label, seat)
  select org, chart, c.person_id,
         case s.key when 'S' then 'A' when 'A' then 'B' when 'T' then 'C' else 'D' end,
         row_number() over (partition by s.key order by c.person_id)
  from public.choristers c join public.sections s on s.id = c.section_id
  where c.organization_id = org and c.status = 'active';

  -- Volunteers for Winter Light.
  for sec in select * from (values ('Front of house', 'Greet the audience and check tickets at the door.', 4), ('Stage setup', 'Set up risers and chairs before the call.', 3), ('Refreshments', 'Serve at intermission.', 3)) as v(title, descr, needed) loop
    insert into public.volunteer_jobs (id, organization_id, event_id, title, description) values (gen_random_uuid(), org, concert1, sec.title, sec.descr) returning id into job;
    insert into public.volunteer_slots (id, organization_id, job_id, starts_at, ends_at, needed)
    values (gen_random_uuid(), org, job, app.at_local(concert1_day, '17:30'), app.at_local(concert1_day, '19:30'), sec.needed) returning id into slot;
    insert into public.volunteer_signups (organization_id, slot_id, person_id)
    select org, slot, p from unnest(person_ids) p where app.roll(slot::text || p::text) < 4 limit sec.needed - 1;
  end loop;

  -- Demo accounts: create them the first time, reset the password every night.
  for acct in select * from public.demo_accounts() loop
    if not exists (select 1 from auth.users where id = acct.user_id) then
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                              confirmation_token, email_change, email_change_token_new, recovery_token)
      values ('00000000-0000-0000-0000-000000000000', acct.user_id, 'authenticated', 'authenticated', acct.email,
              extensions.crypt(demo_password, extensions.gen_salt('bf')), now(),
              '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', 'Demo'), now(), now(), '', '', '', '');
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), acct.user_id, acct.user_id::text,
              jsonb_build_object('sub', acct.user_id::text, 'email', acct.email, 'email_verified', true), 'email', now(), now(), now());
    else
      update auth.users set encrypted_password = extensions.crypt(demo_password, extensions.gen_salt('bf')),
                            email = acct.email, email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
      where id = acct.user_id;
    end if;
    insert into public.profiles (id, display_name) values (acct.user_id, 'Demo') on conflict (id) do nothing;
    update public.profiles set lang = 'en', theme = 'auto', last_organization_id = org where id = acct.user_id;
    update public.people set user_id = acct.user_id where organization_id = org and email = acct.email::extensions.citext;
  end loop;

  -- The demo administrator's own notifications.
  insert into public.notifications (organization_id, user_id, category, title, body, link, created_at) values
    (org, 'd0000000-0000-4000-8000-0000000000a2', 'messages', 'New message from Noah Kim', 'First rehearsal', '/c/demo/communications', now() - interval '20 hours'),
    (org, 'd0000000-0000-4000-8000-0000000000a2', 'forms', '22 permission forms submitted', 'Winter Light permission form', '/c/demo/forms-fees', now() - interval '2 days'),
    (org, 'd0000000-0000-4000-8000-0000000000a1', 'announcements', 'Group photo this Thursday', null, '/c/demo', now() - interval '2 days');

  perform set_config('app.bypass_guards', 'off', true);
  perform set_config('app.skip_audit', 'off', true);

  return jsonb_build_object(
    'organization', org,
    'choristers', (select count(*) from public.choristers where organization_id = org),
    'events', (select count(*) from public.events where organization_id = org),
    'attendance', (select count(*) from public.attendance where organization_id = org),
    'reset_at', now());
end $$;

-- Only the server (nightly job, with the secret key) may rebuild the demo.
revoke all on function public.reset_demo(text) from public, anon, authenticated;
grant execute on function public.reset_demo(text) to service_role;

-- Demo accounts are shared by everyone trying the demo, so they may not change
-- their email or password, and can never be given access to a real choir.
create function app.guard_demo_people() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id in (select user_id from public.demo_accounts()) and new.organization_id <> app.demo_org_id() then
    raise exception 'Demo accounts cannot join a real choir' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger people_demo_guard before insert or update of user_id, organization_id on public.people
  for each row execute function app.guard_demo_people();
