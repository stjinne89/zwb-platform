-- Fietsen op het profiel: eigen foto + zichtbaarheidskeuze per fiets.
--
-- image_url        : door het lid geüploade foto (storage-bucket 'bikes').
-- show_on_profile  : NULL = standaard (tonen tenzij retired), true/false =
--                    expliciete keuze van het lid. De Strava-gear-sync raakt
--                    deze twee kolommen niet aan (upsert zet alleen z'n eigen
--                    kolommen), dus de keuze + foto blijven behouden.

alter table public.strava_bikes
  add column if not exists image_url text,
  add column if not exists show_on_profile boolean;

-- ──────────────────────────────────────────────────────────────────────
-- Storage-bucket voor fietsfoto's. Public-read (worden op profielen
-- getoond), schrijven alleen in je eigen folder `<auth.uid()>/...`.
-- Spiegelt de avatars-bucket (0026 + 0060).
-- ──────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('bikes', 'bikes', true)
on conflict (id) do nothing;

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
where id = 'bikes';

drop policy if exists "bikes_public_read" on storage.objects;
create policy "bikes_public_read" on storage.objects
  for select to public using (bucket_id = 'bikes');

drop policy if exists "bikes_own_insert" on storage.objects;
create policy "bikes_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bikes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "bikes_own_update" on storage.objects;
create policy "bikes_own_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'bikes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'bikes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "bikes_own_delete" on storage.objects;
create policy "bikes_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bikes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
