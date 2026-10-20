-- Col-detector: per rit één keer scannen in plaats van bij elk nawerk de hele
-- historie.
--
-- De databasecheck van 2026-10-20 vond de detector als zwaarste query (52% van
-- de databasetijd, ~550 ms per pagina van 500 ritten). Hij haalde na elk
-- binnengekomen event de polylines van alle ritten van het lid op; raw->map
-- laat Postgres per rij de hele raw uitpakken. Nu bewaart elke rit welke cols
-- erin zitten, met de sleutel van de cols-catalogus waartegen gescand is. Een
-- run leest daarna alleen deze lichte kolommen en scant alleen ritten zonder of
-- met een verouderde sleutel. Zie src/lib/cols/detector.ts.
--
-- Kolommen zonder default: geen herschrijving van de tabel, geen WAL-piek (de
-- les van 2026-10-01).

alter table public.strava_activities
  add column if not exists col_slugs text[],
  add column if not exists col_scan_key text;

-- De gepagineerde lezers per lid (detector, mijlpalen, losgekoppelde ritten)
-- filteren op profile_id en sorteren op start_date.
create index if not exists strava_activities_profile_start_idx
  on public.strava_activities (profile_id, start_date);

create or replace function public.set_activity_col_scans(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Ongeldige scanrijen.';
  end if;
  update strava_activities a
     set col_slugs = r.col_slugs,
         col_scan_key = r.col_scan_key
    from jsonb_to_recordset(p_rows) as r(id bigint, col_slugs text[], col_scan_key text)
   where a.id = r.id;
end $$;
revoke all on function public.set_activity_col_scans(jsonb) from public, anon, authenticated;
grant execute on function public.set_activity_col_scans(jsonb) to service_role;
