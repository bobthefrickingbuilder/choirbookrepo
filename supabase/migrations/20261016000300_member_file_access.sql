-- Members may read a score or learning track file once it is released to them.
-- The row-level rules on score_files / learning_tracks decide "released to
-- them"; the storage rule just follows those rows. Files are always fetched
-- through short-lived signed links.

create function app.can_read_music_file(bucket text, object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case bucket
    when 'scores' then exists (
      select 1 from public.score_files f
      where f.storage_path = object_name and f.released_at is not null and f.released_at <= now()
        and app.is_member(f.organization_id))
    when 'tracks' then exists (
      select 1 from public.learning_tracks t
      where t.storage_path = object_name and t.released_at is not null and t.released_at <= now()
        and app.is_member(t.organization_id))
    else false end
$$;
grant execute on function app.can_read_music_file(text, text) to authenticated;

create policy "members read released music" on storage.objects for select to authenticated
  using (bucket_id in ('scores', 'tracks') and (select app.can_read_music_file(bucket_id, name)));
