-- Eigen intervals.icu-ID op het profiel, naast Zwift-ID en Strava.
--
-- Het ID dat we al in intervals_connections hebben komt uit de private
-- API-koppeling; dat publiceren we niet. Leden vullen hier zelf in wat ze
-- willen laten zien, met dezelfde zichtbaarheidsschakelaar als de rest.

alter table public.profiles
  add column if not exists intervals_id text;

alter table public.profiles
  alter column profile_visibility set default '{
    "avatar": true,
    "region": true,
    "zwift_id": true,
    "strava_id": true,
    "intervals_id": true,
    "zrl_category": true,
    "ftp_watts": true,
    "weight_kg": true,
    "bio": true,
    "roles": true,
    "badges": true
  }'::jsonb;

-- Bestaande rijen krijgen geen backfill: profile_visible() valt terug op true
-- zodra de sleutel ontbreekt, dus het veld gedraagt zich meteen als de rest.

-- De returntabel krijgt een kolom erbij, dus create or replace volstaat niet.
drop function if exists public.get_public_profile(uuid);

create function public.get_public_profile(target_profile_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  region text,
  zwift_id text,
  strava_id text,
  intervals_id text,
  zrl_category text,
  ftp_watts int,
  weight_kg numeric,
  bio text,
  is_admin boolean,
  community_roles text[],
  public_profile_enabled boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    case when public.profile_visible(p.id, 'avatar') then p.avatar_url else null end,
    case when public.profile_visible(p.id, 'region') then p.region else null end,
    case when public.profile_visible(p.id, 'zwift_id') then p.zwift_id else null end,
    case when public.profile_visible(p.id, 'strava_id') then p.strava_id else null end,
    case when public.profile_visible(p.id, 'intervals_id') then p.intervals_id else null end,
    case when public.profile_visible(p.id, 'zrl_category') then p.zrl_category else null end,
    case when public.profile_visible(p.id, 'ftp_watts') then p.ftp_watts else null end,
    case when public.profile_visible(p.id, 'weight_kg') then p.weight_kg else null end,
    case when public.profile_visible(p.id, 'bio') then p.bio else null end,
    case when public.profile_visible(p.id, 'roles') then p.is_admin else false end,
    case when public.profile_visible(p.id, 'roles') then p.community_roles else null end,
    p.public_profile_enabled
  from public.profiles p
  where p.id = target_profile_id
    and p.is_approved = true
    and p.public_profile_enabled = true
$$;

grant execute on function public.get_public_profile(uuid) to anon, authenticated;
