-- Foto-galerij per event.
--
-- Leden uploaden foto's na (of tijdens) een rit, gekoppeld aan een
-- event. Alle goedgekeurde leden kunnen alle foto's bekijken. Eigen
-- foto's wisbaar door uploader; admins kunnen alles weghalen voor
-- moderatie.
--
-- Storage-pad-conventie: `<event_id>/<user_id>/<timestamp>-<naam>.jpg`
-- zodat RLS-policies de uploader-folder kunnen valideren via
-- storage.foldername(name)[2] = auth.uid().

create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  width int,
  height int,
  lat numeric(9, 6),
  lon numeric(9, 6),
  created_at timestamptz not null default now()
);

create index if not exists event_photos_event_created_idx
  on public.event_photos (event_id, created_at desc);

create index if not exists event_photos_profile_idx
  on public.event_photos (profile_id, created_at desc);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — leden zien alles, eigen uploads + admin kunnen verwijderen
-- ──────────────────────────────────────────────────────────────────────

alter table public.event_photos enable row level security;

drop policy if exists "event_photos_members_read" on public.event_photos;
create policy "event_photos_members_read" on public.event_photos
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "event_photos_own_insert" on public.event_photos;
create policy "event_photos_own_insert" on public.event_photos
  for insert to authenticated with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "event_photos_own_or_admin_delete" on public.event_photos;
create policy "event_photos_own_or_admin_delete" on public.event_photos
  for delete to authenticated using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

drop policy if exists "event_photos_own_update" on public.event_photos;
create policy "event_photos_own_update" on public.event_photos
  for update to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ──────────────────────────────────────────────────────────────────────
-- Storage bucket
-- ──────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

drop policy if exists "event_photos_storage_public_read" on storage.objects;
create policy "event_photos_storage_public_read" on storage.objects
  for select to public using (bucket_id = 'event-photos');

-- Uploaden alleen in `<event_id>/<auth.uid()>/...` folder.
drop policy if exists "event_photos_storage_member_insert" on storage.objects;
create policy "event_photos_storage_member_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "event_photos_storage_member_delete" on storage.objects;
create policy "event_photos_storage_member_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'event-photos'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin
      )
    )
  );
