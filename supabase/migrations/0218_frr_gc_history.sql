-- FRR: klassement per etappe, definitief en voorlopig (wens eigenaar, 2026-10-04).
--
-- Op de tourpagina kiest een lid een etappe en ziet de ZWB'ers in het klassement
-- na die etappe: definitief van de FRR-site, of voorlopig uit de finishtijden
-- van Zwift (0215).
--
-- frr_gc_standings (0195) houdt alleen de laatste etappe en blijft de bron voor
-- de klasse van een renner en voor de rivalenlijst. Deze tabel bewaart elke
-- etappe die FRR in zijn tabel heeft. Schrijven alleen met de service-role.

create table if not exists public.frr_gc_history (
  tour_id uuid not null references public.frr_tours(id) on delete cascade,
  after_stage int not null check (after_stage > 0),
  gender_class text not null,
  class_code text not null,
  zwift_id text not null check (zwift_id ~ '^\d+$'),
  position int not null check (position > 0),
  name text not null,
  club text,
  stages_ridden int,
  tour_time_s numeric(12, 3),
  egap_s numeric(12, 3),
  penalty_s numeric(8, 3) not null default 0 check (penalty_s >= 0),
  primary key (tour_id, after_stage, gender_class, zwift_id)
);

create index if not exists frr_gc_history_zwift_idx
  on public.frr_gc_history (tour_id, zwift_id);

alter table public.frr_gc_history enable row level security;

drop policy if exists "frr_gc_history_read" on public.frr_gc_history;
create policy "frr_gc_history_read" on public.frr_gc_history
  for select to authenticated using (true);

-- Alle etappes van een tour in één keer vervangen, zodat een lid nooit een half
-- klassement ziet.
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
    stages_ridden, tour_time_s, egap_s, penalty_s
  )
  select p_tour_id, r.after_stage, r.gender_class, r.class_code, r.zwift_id, r.position,
         r.name, r.club, r.stages_ridden, r.tour_time_s, r.egap_s, coalesce(r.penalty_s, 0)
  from jsonb_to_recordset(p_rows) as r(
    after_stage int, gender_class text, class_code text, zwift_id text, position int,
    name text, club text, stages_ridden int, tour_time_s numeric, egap_s numeric,
    penalty_s numeric
  )
  on conflict (tour_id, after_stage, gender_class, zwift_id) do nothing;
end $$;
revoke all on function public.frr_replace_gc_history(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.frr_replace_gc_history(uuid, jsonb) to service_role;

-- De finishtijden van iedereen in de gevraagde klassen. De klasse komt uit het
-- laatste klassement; een lijst Zwift-ID's van een paar honderd renners past
-- niet in een URL, vandaar een functie. Leest met de rechten van de aanroeper.
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
    and exists (
      select 1 from frr_gc_standings s
      where s.tour_id = r.tour_id
        and s.zwift_id = r.zwift_id
        and s.gender_class = any (p_gender_classes)
    )
  order by r.slot_event_id, r.zwift_id;
$$;
revoke all on function public.frr_class_stage_results(uuid, text[]) from public, anon;
grant execute on function public.frr_class_stage_results(uuid, text[]) to authenticated, service_role;

notify pgrst, 'reload schema';
