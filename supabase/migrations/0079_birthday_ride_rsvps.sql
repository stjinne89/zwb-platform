-- Aanmeldingen (RSVP) voor het verjaardagsrondje.
--
-- Zelfde model als event_rsvps, maar gekoppeld aan een birthday_ride
-- (per jarige + verjaardagsjaar). De composite-FK zorgt dat een RSVP alleen
-- kan bestaan bij een echt rondje en automatisch verdwijnt als het rondje
-- wordt verwijderd. Lezen is afgeschermd op dezelfde share_birthday-opt-in
-- als de rest van de verjaardagsruimte; schrijven mag alleen voor jezelf.

create table if not exists public.birthday_ride_rsvps (
  birthday_profile_id uuid not null,
  celebration_year int not null check (celebration_year between 2000 and 2100),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('yes', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (birthday_profile_id, celebration_year, profile_id),
  foreign key (birthday_profile_id, celebration_year)
    references public.birthday_rides (birthday_profile_id, celebration_year)
    on delete cascade
);

create index if not exists birthday_ride_rsvps_target_idx
  on public.birthday_ride_rsvps (birthday_profile_id, celebration_year);

alter table public.birthday_ride_rsvps enable row level security;

drop policy if exists "birthday_ride_rsvps_members_read" on public.birthday_ride_rsvps;
create policy "birthday_ride_rsvps_members_read" on public.birthday_ride_rsvps
  for select to authenticated using (
    exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id = birthday_ride_rsvps.birthday_profile_id
      where viewer.id = auth.uid()
        and viewer.is_approved
        and (
          birthday_member.share_birthday
          or birthday_member.id = auth.uid()
        )
    )
  );

drop policy if exists "birthday_ride_rsvps_members_insert" on public.birthday_ride_rsvps;
create policy "birthday_ride_rsvps_members_insert" on public.birthday_ride_rsvps
  for insert to authenticated with check (
    auth.uid() = profile_id
    and exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id = birthday_ride_rsvps.birthday_profile_id
      where viewer.id = auth.uid()
        and viewer.is_approved
        and birthday_member.is_approved
        and birthday_member.share_birthday
    )
  );

drop policy if exists "birthday_ride_rsvps_members_update" on public.birthday_ride_rsvps;
create policy "birthday_ride_rsvps_members_update" on public.birthday_ride_rsvps
  for update to authenticated using (
    auth.uid() = profile_id
  ) with check (
    auth.uid() = profile_id
  );

drop policy if exists "birthday_ride_rsvps_owner_or_admin_delete" on public.birthday_ride_rsvps;
create policy "birthday_ride_rsvps_owner_or_admin_delete" on public.birthday_ride_rsvps
  for delete to authenticated using (
    auth.uid() = profile_id
    or auth.uid() = birthday_profile_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );
