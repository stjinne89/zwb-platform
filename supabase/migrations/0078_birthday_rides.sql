-- Een verjaardagsrondje per lid en verjaardagsjaar.
-- Alleen de jarige beheert de uitnodiging en bijbehorende GPX-route.

create table if not exists public.birthday_rides (
  birthday_profile_id uuid not null references public.profiles(id) on delete cascade,
  celebration_year int not null check (celebration_year between 2000 and 2100),
  ride_date date not null,
  ride_time time not null,
  location text not null check (
    char_length(btrim(location)) between 1 and 160
  ),
  invitation text not null check (
    char_length(btrim(invitation)) between 1 and 1000
  ),
  gpx_path text,
  distance_km numeric(7, 2) check (distance_km is null or distance_km >= 0),
  elevation_m int check (elevation_m is null or elevation_m >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (birthday_profile_id, celebration_year)
);

alter table public.birthday_rides enable row level security;

drop policy if exists "birthday_rides_members_read" on public.birthday_rides;
create policy "birthday_rides_members_read" on public.birthday_rides
  for select to authenticated using (
    exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id = birthday_rides.birthday_profile_id
      where viewer.id = auth.uid()
        and viewer.is_approved
        and (
          birthday_member.share_birthday
          or birthday_member.id = auth.uid()
        )
    )
  );

drop policy if exists "birthday_rides_owner_insert" on public.birthday_rides;
create policy "birthday_rides_owner_insert" on public.birthday_rides
  for insert to authenticated with check (
    auth.uid() = birthday_profile_id
    and exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid() and profile.is_approved
    )
  );

drop policy if exists "birthday_rides_owner_update" on public.birthday_rides;
create policy "birthday_rides_owner_update" on public.birthday_rides
  for update to authenticated using (
    auth.uid() = birthday_profile_id
  ) with check (
    auth.uid() = birthday_profile_id
  );

drop policy if exists "birthday_rides_owner_delete" on public.birthday_rides;
create policy "birthday_rides_owner_delete" on public.birthday_rides
  for delete to authenticated using (
    auth.uid() = birthday_profile_id
  );

create or replace function public.set_updated_at_birthday_rides()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists birthday_rides_set_updated_at on public.birthday_rides;
create trigger birthday_rides_set_updated_at
  before update on public.birthday_rides
  for each row execute function public.set_updated_at_birthday_rides();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'birthday-gpx',
  'birthday-gpx',
  false,
  10485760
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "birthday_gpx_members_read" on storage.objects;
create policy "birthday_gpx_members_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'birthday-gpx'
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

-- Pad: <birthday_profile_id>/<year>/<filename>.gpx
drop policy if exists "birthday_gpx_owner_insert" on storage.objects;
create policy "birthday_gpx_owner_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'birthday-gpx'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid() and profile.is_approved
    )
  );

drop policy if exists "birthday_gpx_owner_or_admin_delete" on storage.objects;
create policy "birthday_gpx_owner_or_admin_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'birthday-gpx'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles profile
        where profile.id = auth.uid() and profile.is_admin
      )
    )
  );
