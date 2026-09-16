-- Startlijst als atomaire snapshot, inclusief het verschil tussen leeg en niet opgehaald.
alter table public.omnium_edition_events
  add column if not exists entrants_synced_at timestamptz;

create or replace function public.omnium_invalidate_entrants() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.zwift_event_id is distinct from old.zwift_event_id
     or new.subgroup_leagues is distinct from old.subgroup_leagues then
    new.entrants_synced_at := null;
    delete from omnium_entrants where edition_event_id = new.id and source = 'zwift_entrants';
  end if;
  return new;
end $$;
drop trigger if exists omnium_invalidate_entrants on public.omnium_edition_events;
create trigger omnium_invalidate_entrants before update on public.omnium_edition_events
  for each row execute function public.omnium_invalidate_entrants();

create or replace function public.omnium_replace_entrants(p_event_id uuid, p_zwift_event_id text, p_league_map jsonb, p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare part omnium_edition_events; r jsonb; rider uuid; known omnium_riders;
begin
  select * into strict part from omnium_edition_events where id = p_event_id for update;
  if part.zwift_event_id is distinct from p_zwift_event_id
     or part.subgroup_leagues is distinct from p_league_map then
    raise exception 'Zwift-instellingen gewijzigd; haal de startlijst opnieuw op.';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Ongeldige startlijst'; end if;
  delete from omnium_entrants where edition_event_id = p_event_id and source = 'zwift_entrants';
  for r in select * from jsonb_array_elements(p_rows) loop
    -- Een geanonimiseerde identiteit nooit via een volgende sync opnieuw openbaar maken.
    insert into omnium_riders(zwift_id,name_key,display_name,last_league)
      values(r->>'zwift_id',r->>'name_key',r->>'display_name',r->>'league')
      on conflict (zwift_id) where zwift_id is not null do nothing;
    select * into strict known from omnium_riders where zwift_id = r->>'zwift_id';
    if known.merged_into_id is not null then
      raise exception 'Samengevoegde Zwift-identiteit moet eerst worden hersteld.';
    end if;
    rider := known.id;
    if known.anonymised_at is null then
      update omnium_riders set display_name = r->>'display_name', name_key = r->>'name_key', last_league = r->>'league' where id = rider;
    end if;
    insert into omnium_entrants(edition_event_id,rider_id,league,subgroup_label,source)
      values(p_event_id,rider,r->>'league',r->>'subgroup_label','zwift_entrants')
      on conflict (edition_event_id,rider_id) do nothing;
  end loop;
  update omnium_edition_events set entrants_synced_at = clock_timestamp() where id = p_event_id;
end $$;
revoke all on function public.omnium_replace_entrants(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.omnium_replace_entrants(uuid,text,jsonb,jsonb) to service_role;

-- Vervangen mag een bestaande uitslag nooit wissen als een nieuwe rij ongeldig is.
create or replace function public.omnium_replace_results(p_event_id uuid, p_rows jsonb, p_state text, p_expected_sync timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare part omnium_edition_events;
begin
  select * into strict part from omnium_edition_events where id = p_event_id for update;
  if part.entrants_synced_at is distinct from p_expected_sync then raise exception 'Startlijst gewijzigd; maak opnieuw een voorbeeld.'; end if;
  if p_state not in ('partial','final') or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'Ongeldige uitslag'; end if;
  delete from omnium_results where edition_event_id = p_event_id;
  insert into omnium_results(edition_id,edition_event_id,rider_id,league,status,position,overall_position,time_seconds,time_text,segment_seconds,finish_points,sprint_points,points,points_raw,voided_reason,matched_via,source,entered_by)
    select part.edition_id,part.id,r.rider_id,r.league,r.status,r.position,r.overall_position,r.time_seconds,r.time_text,r.segment_seconds,r.finish_points,r.sprint_points,r.points,r.points_raw,r.voided_reason,r.matched_via,r.source,r.entered_by
    from jsonb_populate_recordset(null::omnium_results,p_rows) r;
  update omnium_edition_events set results_state = p_state where id = p_event_id;
end $$;
revoke all on function public.omnium_replace_results(uuid,jsonb,text,timestamptz) from public,anon,authenticated;
grant execute on function public.omnium_replace_results(uuid,jsonb,text,timestamptz) to service_role;

-- Verplaatst alle verwijzingen in één transactie. De standen worden daarna
-- door de beheeractie opnieuw opgebouwd voor de geretourneerde edities.
create or replace function public.omnium_merge_riders(
  p_from_rider_id uuid,
  p_into_rider_id uuid
) returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  source_rider omnium_riders;
  target_rider omnium_riders;
  affected uuid[];
begin
  if p_from_rider_id = p_into_rider_id then
    raise exception 'Kies twee verschillende renners.';
  end if;

  select * into strict source_rider
  from omnium_riders where id = p_from_rider_id for update;
  select * into strict target_rider
  from omnium_riders where id = p_into_rider_id for update;

  if source_rider.merged_into_id is not null or target_rider.merged_into_id is not null then
    raise exception 'Een geselecteerde renner is al samengevoegd.';
  end if;
  if source_rider.zwift_id is not null and target_rider.zwift_id is not null then
    raise exception 'Beide renners hebben een verschillend Zwift-ID.';
  end if;
  if source_rider.public_profile_id is not null
     and target_rider.public_profile_id is not null
     and source_rider.public_profile_id <> target_rider.public_profile_id then
    raise exception 'Beide renners zijn aan een ander openbaar profiel gekoppeld.';
  end if;

  select coalesce(array_agg(distinct edition_id), '{}') into affected
  from omnium_results
  where rider_id in (p_from_rider_id, p_into_rider_id);

  delete from omnium_results source
  using omnium_results target
  where source.rider_id = p_from_rider_id
    and target.rider_id = p_into_rider_id
    and source.edition_event_id = target.edition_event_id;
  update omnium_results set rider_id = p_into_rider_id
  where rider_id = p_from_rider_id;

  delete from omnium_entrants source
  using omnium_entrants target
  where source.rider_id = p_from_rider_id
    and target.rider_id = p_into_rider_id
    and source.edition_event_id = target.edition_event_id;
  update omnium_entrants set rider_id = p_into_rider_id
  where rider_id = p_from_rider_id;

  update omnium_prize_awards set rider_id = p_into_rider_id
  where rider_id = p_from_rider_id;

  if exists (select 1 from omnium_rider_links where rider_id = p_into_rider_id) then
    delete from omnium_rider_links where rider_id = p_from_rider_id;
  else
    update omnium_rider_links set rider_id = p_into_rider_id
    where rider_id = p_from_rider_id;
  end if;

  -- Eerst de unieke identiteit van de bron vrijgeven, daarna overnemen.
  update omnium_riders
  set zwift_id = null,
      public_profile_id = null,
      merged_into_id = p_into_rider_id
  where id = p_from_rider_id;
  update omnium_riders
  set zwift_id = coalesce(target_rider.zwift_id, source_rider.zwift_id),
      public_profile_id = coalesce(target_rider.public_profile_id, source_rider.public_profile_id)
  where id = p_into_rider_id;

  return affected;
end
$$;
revoke all on function public.omnium_merge_riders(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.omnium_merge_riders(uuid,uuid) to service_role;
