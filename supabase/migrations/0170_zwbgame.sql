-- ZWBgame: separate consent and derived game attributes. No raw power/weight.
create table public.zwbgame_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  visible boolean not null default true,
  data_consent_version text check (data_consent_version is null or data_consent_version = '2026-09-17'),
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
create table public.zwbgame_riders (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  consent_revision uuid not null,
  attributes jsonb not null check (jsonb_typeof(attributes) = 'object'),
  provenance jsonb not null check (jsonb_typeof(provenance) = 'object'),
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create table public.zwbgame_roster_exclusions (
  roster_id uuid primary key references public.roster_entries(id) on delete cascade,
  excluded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.zwbgame_preferences enable row level security;
alter table public.zwbgame_riders enable row level security;
alter table public.zwbgame_roster_exclusions enable row level security;
revoke all on public.zwbgame_preferences, public.zwbgame_riders, public.zwbgame_roster_exclusions from anon, authenticated;
grant select, insert, update on public.zwbgame_preferences to authenticated;
grant select on public.zwbgame_riders to authenticated;
grant all on public.zwbgame_preferences, public.zwbgame_riders, public.zwbgame_roster_exclusions to service_role;
create policy zwbgame_preferences_self on public.zwbgame_preferences for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved));
create policy zwbgame_riders_self on public.zwbgame_riders for select to authenticated using (profile_id = auth.uid());

create function public.zwbgame_invalidate_rider() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.revision := gen_random_uuid();
  new.updated_at := now();
  delete from public.zwbgame_riders where profile_id = new.profile_id;
  return new;
end $$;
create trigger zwbgame_preferences_changed before insert or update on public.zwbgame_preferences
  for each row execute function public.zwbgame_invalidate_rider();

-- Lock consent while writing: a slow sync cannot restore data after revocation.
create function public.zwbgame_check_rider_consent() returns trigger
language plpgsql security definer set search_path = public as $$
declare pref public.zwbgame_preferences;
begin
  select * into pref from public.zwbgame_preferences where profile_id = new.profile_id for update;
  if pref.profile_id is null or pref.data_consent_version is distinct from '2026-09-17'
    or pref.revision is distinct from new.consent_revision then
    raise exception 'Speltoestemming is gewijzigd. Probeer opnieuw.';
  end if;
  return new;
end $$;
create trigger zwbgame_rider_consent before insert or update on public.zwbgame_riders
  for each row execute function public.zwbgame_check_rider_consent();
revoke all on function public.zwbgame_invalidate_rider(), public.zwbgame_check_rider_consent() from public;
create function public.zwbgame_disconnect_intervals() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.zwbgame_riders where profile_id = old.profile_id and attributes->>'source' = 'intervals';
  return old;
end $$;
create trigger zwbgame_intervals_disconnected after delete or update of athlete_id, api_key on public.intervals_connections
  for each row execute function public.zwbgame_disconnect_intervals();
revoke all on function public.zwbgame_disconnect_intervals() from public;
notify pgrst, 'reload schema';
