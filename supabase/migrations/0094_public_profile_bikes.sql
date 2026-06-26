-- Publieke profielpagina: toon alleen fietsen die het lid op het profiel toont.

create or replace function public.get_public_profile_bikes(target_profile_id uuid)
returns table (
  id text,
  name text,
  brand_model text,
  distance_m numeric,
  retired boolean,
  image_url text,
  show_on_profile boolean,
  source text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.name,
    b.brand_model,
    b.distance_m,
    b.retired,
    b.image_url,
    b.show_on_profile,
    b.source
  from public.profiles p
  join public.strava_bikes b on b.profile_id = p.id
  where p.id = target_profile_id
    and p.is_approved = true
    and p.public_profile_enabled = true
    and coalesce(b.show_on_profile, not b.retired)
  order by b.is_primary desc, b.distance_m desc;
$$;

grant execute on function public.get_public_profile_bikes(uuid) to anon, authenticated;
