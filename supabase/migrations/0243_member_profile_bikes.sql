-- Fietsen op het ledenprofiel (/leden/[id]) voor andere leden.
--
-- strava_bikes heeft alleen de eigen-policy uit 0089. Daardoor zag een ander
-- lid geen fietsen op het ledenprofiel, terwijl de showcase op /profiel per fiets
-- vraagt of hij op het profiel staat (show_on_profile). Besluit eigenaar
-- (2026-10-16): goedgekeurde leden zien elkaars fietsen, met dezelfde regel als
-- het publieke profiel uit 0094.
--
-- Bewust een functie en geen select-policy: strava_bikes heeft ook kolommen die
-- alleen voor het eigen onderhoud zijn, en zo blijft de keuze per fiets de
-- enige poort. Kijker én lid moeten goedgekeurd zijn, net als bij het lezen van
-- member_knowledge_topics (0239).

create or replace function public.get_member_profile_bikes(target_profile_id uuid)
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
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = (select auth.uid()) and viewer.is_approved
    )
    and coalesce(b.show_on_profile, not b.retired)
  order by b.is_primary desc, b.distance_m desc;
$$;

revoke execute on function public.get_member_profile_bikes(uuid) from public, anon;
grant execute on function public.get_member_profile_bikes(uuid) to authenticated;
