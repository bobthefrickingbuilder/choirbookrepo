-- Music library: pieces, score files, learning tracks, practice assignments,
-- completions and the practice log; concert set lists.
-- Files live in private Storage buckets; these rows hold their paths.

create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  composer text check (length(composer) <= 200),
  arranger text check (length(arranger) <= 200),
  voicing text check (length(voicing) <= 40),
  language text check (length(language) <= 60),
  duration_seconds int check (duration_seconds between 0 and 36000),
  notes text check (length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create trigger pieces_touch before update on public.pieces
  for each row execute function app.touch_updated_at();

create table public.score_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  piece_id uuid not null,
  label text not null default 'Score' check (length(label) <= 80),
  storage_path text not null,
  size_bytes bigint check (size_bytes >= 0),
  -- Null means every section.
  section_id uuid,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, piece_id) references public.pieces (organization_id, id) on delete cascade,
  foreign key (organization_id, section_id) references public.sections (organization_id, id) on delete set null (section_id)
);

create table public.learning_tracks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  piece_id uuid not null,
  label text not null check (length(label) between 1 and 80),
  -- full: whole choir; part: one part only; predominant: one part loud over the choir.
  kind text not null default 'part' check (kind in ('full', 'part', 'predominant')),
  voice_part_id uuid,
  section_id uuid,
  storage_path text not null,
  size_bytes bigint check (size_bytes >= 0),
  duration_seconds int check (duration_seconds between 0 and 36000),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, piece_id) references public.pieces (organization_id, id) on delete cascade,
  foreign key (organization_id, voice_part_id) references public.voice_parts (organization_id, id) on delete set null (voice_part_id),
  foreign key (organization_id, section_id) references public.sections (organization_id, id) on delete set null (section_id)
);

create table public.practice_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  piece_id uuid not null,
  title text not null check (length(title) between 1 and 160),
  instructions text check (length(instructions) <= 2000),
  bars text check (length(bars) <= 60),
  due_on date,
  -- Empty means every section.
  section_ids uuid[] not null default '{}',
  released_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, piece_id) references public.pieces (organization_id, id) on delete cascade
);

create table public.practice_completions (
  organization_id uuid not null,
  assignment_id uuid not null,
  person_id uuid not null,
  completed_at timestamptz not null default now(),
  primary key (assignment_id, person_id),
  foreign key (organization_id, assignment_id) references public.practice_assignments (organization_id, id) on delete cascade,
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade
);

create table public.practice_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null,
  piece_id uuid,
  practised_on date not null default current_date,
  minutes int not null check (minutes between 1 and 600),
  note text check (length(note) <= 500),
  created_at timestamptz not null default now(),
  foreign key (organization_id, person_id) references public.people (organization_id, id) on delete cascade,
  foreign key (organization_id, piece_id) references public.pieces (organization_id, id) on delete set null (piece_id)
);
create index practice_log_person_idx on public.practice_log (person_id, practised_on);

-- Season repertoire and concert set lists.
create table public.set_list_items (
  organization_id uuid not null,
  event_id uuid not null,
  piece_id uuid not null,
  position int not null,
  primary key (event_id, piece_id),
  foreign key (organization_id, event_id) references public.events (organization_id, id) on delete cascade,
  foreign key (organization_id, piece_id) references public.pieces (organization_id, id) on delete cascade
);

alter table public.pieces enable row level security;
alter table public.score_files enable row level security;
alter table public.learning_tracks enable row level security;
alter table public.practice_assignments enable row level security;
alter table public.practice_completions enable row level security;
alter table public.practice_log enable row level security;
alter table public.set_list_items enable row level security;

create policy pieces_select on public.pieces for select to authenticated
  using ((select app.is_member(organization_id)));
create policy pieces_write on public.pieces for all to authenticated
  using ((select app.has_perm(organization_id, 'music', 'edit')))
  with check ((select app.has_perm(organization_id, 'music', 'edit')));

-- Files: members see released ones; music staff see everything.
create policy score_files_select on public.score_files for select to authenticated
  using (
    (released_at is not null and released_at <= now() and (select app.is_member(organization_id)))
    or (select app.has_perm(organization_id, 'music', 'view'))
  );
create policy score_files_write on public.score_files for all to authenticated
  using ((select app.has_perm(organization_id, 'music', 'edit')))
  with check ((select app.has_perm(organization_id, 'music', 'edit')));

create policy learning_tracks_select on public.learning_tracks for select to authenticated
  using (
    (released_at is not null and released_at <= now() and (select app.is_member(organization_id)))
    or (select app.has_perm(organization_id, 'music', 'view'))
  );
create policy learning_tracks_write on public.learning_tracks for all to authenticated
  using ((select app.has_perm(organization_id, 'music', 'edit')))
  with check ((select app.has_perm(organization_id, 'music', 'edit')));

create policy practice_assignments_select on public.practice_assignments for select to authenticated
  using (
    (released_at is not null and released_at <= now() and (select app.is_member(organization_id)))
    or (select app.has_perm(organization_id, 'music', 'view'))
  );
create policy practice_assignments_write on public.practice_assignments for all to authenticated
  using ((select app.has_perm(organization_id, 'music', 'edit')))
  with check ((select app.has_perm(organization_id, 'music', 'edit')));

create policy practice_completions_select on public.practice_completions for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'music', 'view')));
create policy practice_completions_insert on public.practice_completions for insert to authenticated
  with check ((select app.is_me(person_id)));
create policy practice_completions_delete on public.practice_completions for delete to authenticated
  using ((select app.is_me(person_id)));

create policy practice_log_select on public.practice_log for select to authenticated
  using ((select app.is_me(person_id)) or (select app.has_perm(organization_id, 'music', 'view')));
create policy practice_log_insert on public.practice_log for insert to authenticated
  with check ((select app.is_me(person_id)));
create policy practice_log_update on public.practice_log for update to authenticated
  using ((select app.is_me(person_id))) with check ((select app.is_me(person_id)));
create policy practice_log_delete on public.practice_log for delete to authenticated
  using ((select app.is_me(person_id)));

create policy set_list_items_select on public.set_list_items for select to authenticated
  using ((select app.is_member(organization_id)));
create policy set_list_items_write on public.set_list_items for all to authenticated
  using ((select app.has_perm(organization_id, 'music', 'edit')))
  with check ((select app.has_perm(organization_id, 'music', 'edit')));
