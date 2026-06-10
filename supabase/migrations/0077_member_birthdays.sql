-- Geboortedata en een afgeschermde verjaardagsruimte voor leden.
--
-- birth_date blijft altijd een profielveld van het lid zelf. Alleen met de
-- expliciete share_birthday-opt-in verschijnt de verjaardag bij andere
-- goedgekeurde leden, op de kalender en op het ledenprofiel.

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists share_birthday boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_birth_date_reasonable;

alter table public.profiles
  add constraint profiles_birth_date_reasonable
  check (birth_date is null or birth_date >= date '1900-01-01');

create table if not exists public.birthday_messages (
  id uuid primary key default gen_random_uuid(),
  birthday_profile_id uuid not null references public.profiles(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id) on delete cascade,
  celebration_year int not null check (celebration_year between 2000 and 2100),
  body text not null check (
    char_length(btrim(body)) between 1 and 500
  ),
  created_at timestamptz not null default now()
);

create index if not exists birthday_messages_target_year_idx
  on public.birthday_messages (birthday_profile_id, celebration_year, created_at);

alter table public.birthday_messages enable row level security;

drop policy if exists "birthday_messages_members_read" on public.birthday_messages;
create policy "birthday_messages_members_read" on public.birthday_messages
  for select to authenticated using (
    exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id = birthday_messages.birthday_profile_id
      where viewer.id = auth.uid()
        and viewer.is_approved
        and (
          birthday_member.share_birthday
          or birthday_member.id = auth.uid()
        )
    )
  );

drop policy if exists "birthday_messages_members_insert" on public.birthday_messages;
create policy "birthday_messages_members_insert" on public.birthday_messages
  for insert to authenticated with check (
    auth.uid() = author_profile_id
    and exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id = birthday_messages.birthday_profile_id
      where viewer.id = auth.uid()
        and viewer.is_approved
        and birthday_member.is_approved
        and birthday_member.share_birthday
    )
  );

drop policy if exists "birthday_messages_author_or_admin_delete" on public.birthday_messages;
create policy "birthday_messages_author_or_admin_delete" on public.birthday_messages
  for delete to authenticated using (
    auth.uid() = author_profile_id
    or auth.uid() = birthday_profile_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

create table if not exists public.birthday_photos (
  id uuid primary key default gen_random_uuid(),
  birthday_profile_id uuid not null references public.profiles(id) on delete cascade,
  uploader_profile_id uuid not null references public.profiles(id) on delete cascade,
  celebration_year int not null check (celebration_year between 2000 and 2100),
  storage_path text not null unique,
  caption text check (caption is null or char_length(caption) <= 300),
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  created_at timestamptz not null default now()
);

create index if not exists birthday_photos_target_year_idx
  on public.birthday_photos (birthday_profile_id, celebration_year, created_at desc);

alter table public.birthday_photos enable row level security;

drop policy if exists "birthday_photos_members_read" on public.birthday_photos;
create policy "birthday_photos_members_read" on public.birthday_photos
  for select to authenticated using (
    exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id = birthday_photos.birthday_profile_id
      where viewer.id = auth.uid()
        and viewer.is_approved
        and (
          birthday_member.share_birthday
          or birthday_member.id = auth.uid()
        )
    )
  );

drop policy if exists "birthday_photos_members_insert" on public.birthday_photos;
create policy "birthday_photos_members_insert" on public.birthday_photos
  for insert to authenticated with check (
    auth.uid() = uploader_profile_id
    and exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id = birthday_photos.birthday_profile_id
      where viewer.id = auth.uid()
        and viewer.is_approved
        and birthday_member.is_approved
        and birthday_member.share_birthday
    )
  );

drop policy if exists "birthday_photos_uploader_or_admin_delete" on public.birthday_photos;
create policy "birthday_photos_uploader_or_admin_delete" on public.birthday_photos
  for delete to authenticated using (
    auth.uid() = uploader_profile_id
    or auth.uid() = birthday_profile_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'birthday-photos',
  'birthday-photos',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "birthday_photos_storage_members_read" on storage.objects;
create policy "birthday_photos_storage_members_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'birthday-photos'
    and exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id::text = (storage.foldername(name))[1]
      where viewer.id = auth.uid()
        and viewer.is_approved
        and (
          birthday_member.share_birthday
          or birthday_member.id = auth.uid()
        )
    )
  );

-- Pad: <birthday_profile_id>/<year>/<uploader_profile_id>/<filename>.jpg
drop policy if exists "birthday_photos_storage_members_insert" on storage.objects;
create policy "birthday_photos_storage_members_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'birthday-photos'
    and (storage.foldername(name))[3] = auth.uid()::text
    and exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id::text = (storage.foldername(name))[1]
      where viewer.id = auth.uid()
        and viewer.is_approved
        and birthday_member.is_approved
        and birthday_member.share_birthday
    )
  );

drop policy if exists "birthday_photos_storage_owner_or_admin_delete" on storage.objects;
create policy "birthday_photos_storage_owner_or_admin_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'birthday-photos'
    and (
      (storage.foldername(name))[3] = auth.uid()::text
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin
      )
    )
  );
