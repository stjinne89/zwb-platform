-- ZWBriljant: de bewaarde stenen naar de schaal van 2026-10-22 (SCALE_VERSION
-- "2026-10-22-ctl40"), zodat de zaal en je historie niet leeg zijn tot de
-- wekelijkse job alles opnieuw heeft gemaakt.
--
-- Wat er veranderde (src/lib/briljant/norms.ts):
-- * Fitheid: Goud op CTL 40 in plaats van 50, alle grenzen 10 lager (20 tot 100).
--   Een snapshot bewaart alleen het niveau; de CTL erachter is terug te rekenen
--   (oud: niveau < 1 is 30 × niveau, anders 20 + 10 × niveau) en het nieuwe niveau
--   volgt daaruit (CTL < 20 is CTL / 20, anders (CTL − 10) / 10). Dat is exact, op
--   de afronding van het niveau op twee decimalen na.
-- * Gewichten: vermogen samen 50% (sprint 5, anaeroob 10, VO2max 20, drempel 15),
--   durability 17,5, fitheid 15, racen 17,5. De score is de optelling, maal
--   0,8 + 0,2 × consistentie; met minder dan vier onderdelen geen score.
--
-- Alleen rijen van de vorige schaal ("2026-10-21-sd3"); oudere schalen ruimt de
-- terugblik zelf op. De pagina rekent de score bij het lezen toch opnieuw uit de
-- niveaus (storedScore); de kolom wordt hier bijgewerkt voor wie hem direct leest.

with old as (
  select profile_id, week, facets, consistency,
    (facets->>'fitheid')::numeric as fit
  from public.zwbriljant_snapshots
  where provenance->>'scale' = '2026-10-21-sd3'
),
converted as (
  select profile_id, week, consistency,
    case
      when fit is null then facets
      else jsonb_set(
        facets,
        '{fitheid}',
        to_jsonb(round(
          case
            when fit >= 1 then fit + 1
            when fit * 30 < 20 then fit * 1.5
            else fit * 3 - 1
          end, 2))
      )
    end as facets
  from old
),
scored as (
  select profile_id, week, facets,
    case
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
          + 0.15 * coalesce((facets->>'fitheid')::numeric, 0)
          + 0.175 * coalesce((facets->>'racen')::numeric, 0)
        ) * (case when consistency is null then 1 else 0.8 + 0.2 * consistency end),
        2)
    end as score
  from converted
)
update public.zwbriljant_snapshots s
set facets = scored.facets,
    score = scored.score,
    provenance = jsonb_set(s.provenance, '{scale}', '"2026-10-22-ctl40"')
from scored
where s.profile_id = scored.profile_id and s.week = scored.week;

-- Controle na toepassen:
-- select provenance->>'scale', count(*) from zwbriljant_snapshots group by 1;  -- alles op 2026-10-22-ctl40
