-- Publieke profielpagina's en zichtbaarheid per profielveld.
--
-- public_profile_enabled is een expliciete opt-in voor een deelbare URL buiten
-- login. profile_visibility stuurt welke velden op read-only profielen getoond
-- worden, zowel binnen /leden als op de publieke pagina.

alter table public.profiles
  add column if not exists public_profile_enabled boolean not null default false,
  add column if not exists profile_visibility jsonb not null default '{
    "avatar": true,
    "region": true,
    "zwift_id": true,
    "strava_id": true,
    "zrl_category": true,
    "ftp_watts": true,
    "weight_kg": true,
    "bio": true,
    "roles": true,
    "badges": true
  }'::jsonb;

create or replace function public.profile_visible(target_profile_id uuid, field_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((p.profile_visibility ->> field_name)::boolean, true)
  from public.profiles p
  where p.id = target_profile_id
$$;

create or replace function public.get_public_profile(target_profile_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  region text,
  zwift_id text,
  strava_id text,
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

create or replace function public.get_public_profile_milestone_badges(target_profile_id uuid)
returns table (
  id text,
  title text,
  description text,
  icon text,
  color text,
  achievement_code text,
  tier text,
  visual_hint text,
  trigger_source text,
  trigger_config jsonb,
  sort_order int,
  earned boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.title,
    b.description,
    b.icon,
    b.color,
    b.achievement_code,
    b.tier,
    b.visual_hint,
    b.trigger_source,
    b.trigger_config,
    b.sort_order,
    exists (
      select 1
      from public.achievement_awards a
      where a.profile_id = target_profile_id
        and a.badge_id = b.id
        and a.award_scope = 'milestone'
    ) as earned
  from public.profiles p
  join public.achievement_badges b on b.kind = 'milestone'
  where p.id = target_profile_id
    and p.is_approved = true
    and p.public_profile_enabled = true
    and public.profile_visible(p.id, 'badges')
  order by b.sort_order
$$;

create or replace function public.get_public_profile_weekly_awards(target_profile_id uuid)
returns table (
  id uuid,
  period_start date,
  value numeric,
  badge_title text,
  badge_description text,
  badge_icon text,
  badge_color text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.period_start,
    a.value,
    b.title,
    b.description,
    b.icon,
    b.color
  from public.profiles p
  join public.achievement_awards a on a.profile_id = p.id
  join public.achievement_badges b on b.id = a.badge_id
  where p.id = target_profile_id
    and p.is_approved = true
    and p.public_profile_enabled = true
    and public.profile_visible(p.id, 'badges')
    and a.award_scope = 'weekly'
  order by a.period_start desc
$$;

grant execute on function public.profile_visible(uuid, text) to anon, authenticated;
grant execute on function public.get_public_profile(uuid) to anon, authenticated;
grant execute on function public.get_public_profile_milestone_badges(uuid) to anon, authenticated;
grant execute on function public.get_public_profile_weekly_awards(uuid) to anon, authenticated;
