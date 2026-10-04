-- FRR voorlopig klassement: de klasse uit de laatste etappe waarin de renner bij
-- FRR staat (melding eigenaar, 2026-10-04).
--
-- De klasse kwam uit frr_gc_standings, het klassement na de laatste etappe. FRR
-- verwerkt een etappe per tijdslot: wie een later slot reed, staat daar nog niet
-- in en viel uit het voorlopige klassement, terwijl zijn finishtijd wel binnen
-- was. Op 4 oktober misten zo drie ZWB'ers na etappe 2. De klasse komt nu uit
-- frr_gc_history (0218): per renner de rij van de laatste etappe waarin hij
-- staat. Een promotie komt zo ook door zodra FRR die etappe heeft verwerkt.

-- De renners van de gevraagde klassen, elk met zijn laatste klasse en straf.
create or replace function public.frr_class_riders(p_tour_id uuid, p_gender_classes text[])
returns table (
  zwift_id text,
  gender_class text,
  class_code text,
  name text,
  club text,
  penalty_s numeric
) language sql stable security invoker set search_path = public as $$
  select l.zwift_id, l.gender_class, l.class_code, l.name, l.club, l.penalty_s
  from (
    select distinct on (h.zwift_id)
           h.zwift_id, h.gender_class, h.class_code, h.name, h.club, h.penalty_s
    from frr_gc_history h
    where h.tour_id = p_tour_id
    order by h.zwift_id, h.after_stage desc, h.position
  ) l
  where l.gender_class = any (p_gender_classes)
  order by l.gender_class, l.zwift_id;
$$;
revoke all on function public.frr_class_riders(uuid, text[]) from public, anon;
grant execute on function public.frr_class_riders(uuid, text[]) to authenticated, service_role;

-- Zelfde selectie voor de finishtijden (0218 keek naar frr_gc_standings).
create or replace function public.frr_class_stage_results(p_tour_id uuid, p_gender_classes text[])
returns table (
  slot_event_id uuid,
  zwift_id text,
  stage int,
  pen text,
  time_s numeric
) language sql stable security invoker set search_path = public as $$
  select r.slot_event_id, r.zwift_id, r.stage, r.pen, r.time_s
  from frr_stage_results r
  where r.tour_id = p_tour_id
    and r.zwift_id in (
      select l.zwift_id
      from (
        select distinct on (h.zwift_id) h.zwift_id, h.gender_class
        from frr_gc_history h
        where h.tour_id = p_tour_id
        order by h.zwift_id, h.after_stage desc, h.position
      ) l
      where l.gender_class = any (p_gender_classes)
    )
  order by r.slot_event_id, r.zwift_id;
$$;
revoke all on function public.frr_class_stage_results(uuid, text[]) from public, anon;
grant execute on function public.frr_class_stage_results(uuid, text[]) to authenticated, service_role;

notify pgrst, 'reload schema';
