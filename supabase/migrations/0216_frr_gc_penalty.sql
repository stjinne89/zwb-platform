-- FRR-klassement: de straf voor een upgrade (melding eigenaar, 2026-10-04).
--
-- FRR telt bij een renner die naar een hogere klasse gaat een straf op, in de
-- tabel als "(30s)". Die zit in de eGAP en in de positie, maar niet in de
-- tourtijd. ZWB las de kolom zonder straf en toonde dus de goede plaats met een
-- te kleine eGAP. egap_s is vanaf nu de eGAP zoals FRR hem toont (met straf, op
-- de leider van de klasse); penalty_s bewaart de straf om hem te kunnen tonen.
--
-- Bestaande rijen worden bij de eerstvolgende klassement-sync vervangen.

alter table public.frr_gc_standings
  add column if not exists penalty_s numeric(8, 3) not null default 0 check (penalty_s >= 0);

create or replace function public.frr_replace_gc(p_tour_id uuid, p_after_stage int, p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Leeg of ongeldig klassement.';
  end if;
  perform 1 from frr_tours where id = p_tour_id for update;
  delete from frr_gc_standings where tour_id = p_tour_id;
  insert into frr_gc_standings (
    tour_id, gender_class, class_code, gender, zwift_id, position, name, club,
    age_cat, stages_ridden, tour_time_s, egap_s, penalty_s, after_stage
  )
  select p_tour_id, r.gender_class, r.class_code, r.gender, r.zwift_id, r.position,
         r.name, r.club, r.age_cat, r.stages_ridden, r.tour_time_s, r.egap_s,
         coalesce(r.penalty_s, 0), p_after_stage
  from jsonb_to_recordset(p_rows) as r(
    gender_class text, class_code text, gender text, zwift_id text, position int,
    name text, club text, age_cat text, stages_ridden int, tour_time_s numeric, egap_s numeric,
    penalty_s numeric
  )
  on conflict (tour_id, gender_class, zwift_id) do nothing;
  update frr_tours
     set gc_after_stage = p_after_stage, gc_scraped_at = clock_timestamp(), gc_error = null
   where id = p_tour_id;
end $$;
revoke all on function public.frr_replace_gc(uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.frr_replace_gc(uuid, int, jsonb) to service_role;

notify pgrst, 'reload schema';
