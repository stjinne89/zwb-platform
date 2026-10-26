-- ZWBriljant: de bewaarde score met de gewichten van 2026-10-22 (tweede stap):
-- fitheid 20% (was 15%), racen 12,5% (was 17,5%); vermogen samen 50% (sprint 5,
-- anaeroob 10, VO2max 20, drempel 15) en durability 17,5% blijven. Zie
-- src/lib/briljant/norms.ts.
--
-- Alleen de score verandert: de niveaus per onderdeel en de schaal
-- (SCALE_VERSION "2026-10-22-ctl40") blijven, dus geen nieuwe schaalversie. De app
-- rekent de score bij het lezen toch opnieuw uit de niveaus (storedScore); dit houdt
-- de kolom gelijk voor wie hem direct leest. Mag in elke volgorde met de deploy.

update public.zwbriljant_snapshots
set score = case
    when (
      (facets->>'sprint' is not null)::int + (facets->>'anaeroob' is not null)::int
      + (facets->>'vo2max' is not null)::int + (facets->>'drempel' is not null)::int
      + (facets->>'durability' is not null)::int + (facets->>'fitheid' is not null)::int
      + (facets->>'racen' is not null)::int
    ) < 4 then null
    else round(
      (
        0.05 * coalesce((facets->>'sprint')::numeric, 0)
        + 0.10 * coalesce((facets->>'anaeroob')::numeric, 0)
        + 0.20 * coalesce((facets->>'vo2max')::numeric, 0)
        + 0.15 * coalesce((facets->>'drempel')::numeric, 0)
        + 0.175 * coalesce((facets->>'durability')::numeric, 0)
        + 0.20 * coalesce((facets->>'fitheid')::numeric, 0)
        + 0.125 * coalesce((facets->>'racen')::numeric, 0)
      ) * (case when consistency is null then 1 else 0.8 + 0.2 * consistency end),
      2)
  end
where provenance->>'scale' = '2026-10-22-ctl40';

-- Controle na toepassen:
-- select count(*) from zwbriljant_snapshots where provenance->>'scale' = '2026-10-22-ctl40';  -- gelijk aan voor
