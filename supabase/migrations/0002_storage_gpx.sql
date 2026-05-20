-- Storage bucket for event GPX files.
-- Layout: event-gpx/<uploader_user_id>/<random>.gpx

insert into storage.buckets (id, name, public)
values ('event-gpx', 'event-gpx', false)
on conflict (id) do nothing;

-- Any authenticated user can read GPX files (events themselves are readable to all members).
create policy "event-gpx read authenticated" on storage.objects
  for select to authenticated
  using (bucket_id = 'event-gpx');

-- Users can only upload into their own folder (auth.uid as first path segment).
create policy "event-gpx upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-gpx'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Same for delete/update.
create policy "event-gpx delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-gpx'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
