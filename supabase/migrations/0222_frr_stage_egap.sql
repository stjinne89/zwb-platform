-- FRR voorlopig klassement: het tijdverlies per etappe zoals FRR het rekende
-- (melding eigenaar, 2026-10-08).
--
-- Het voorlopige klassement rekende elke etappe zelf uit de finishtijden van
-- Zwift. Daar zit niet alles in: wie promoveert neemt het verlies uit zijn oude
-- klasse mee, en FRR geeft tijdstraffen op de etappetijd (gezien: 10%). FRR
-- toont per renner en etappe de etappetijd en het verlies van die etappe; die
-- bewaren we erbij, zodat alleen etappes die FRR nog niet verwerkte uit Zwift
-- komen.

alter table public.frr_gc_history
  add column if not exists stage_time_s numeric(12, 3),
  add column if not exists stage_egap_s numeric(12, 3);

create or replace function public.frr_replace_gc_history(p_tour_id uuid, p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Leeg of ongeldig klassement.';
  end if;
  perform 1 from frr_tours where id = p_tour_id for update;
  delete from frr_gc_history where tour_id = p_tour_id;
  insert into frr_gc_history (
    tour_id, after_stage, gender_class, class_code, zwift_id, position, name, club,
    stages_ridden, tour_time_s, egap_s, penalty_s, stage_time_s, stage_egap_s
  )
  select p_tour_id, r.after_stage, r.gender_class, r.class_code, r.zwift_id, r.position,
         r.name, r.club, r.stages_ridden, r.tour_time_s, r.egap_s, coalesce(r.penalty_s, 0),
         r.stage_time_s, r.stage_egap_s
  from jsonb_to_recordset(p_rows) as r(
    after_stage int, gender_class text, class_code text, zwift_id text, position int,
    name text, club text, stages_ridden int, tour_time_s numeric, egap_s numeric,
    penalty_s numeric, stage_time_s numeric, stage_egap_s numeric
  )
  on conflict (tour_id, after_stage, gender_class, zwift_id) do nothing;
end $$;
revoke all on function public.frr_replace_gc_history(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.frr_replace_gc_history(uuid, jsonb) to service_role;

notify pgrst, 'reload schema';
