-- Omnium-beheer ziet ook concepten.
--
-- De leespolicies uit 0126/0128 geven alleen gepubliceerde seizoenen en edities
-- vrij, ook aan ingelogde leden. /beheer/omnium leest met de gewone RLS-client,
-- dus een conceptseizoen was onzichtbaar voor de beheerder zelf: de pagina zei
-- "Maak eerst een seizoen aan" terwijl seizoen 2026-27 al bestond, en het
-- publiceren of plannen ervan kon daardoor nergens.
--
-- Deze policies komen naast de publieke; Postgres combineert permissive policies
-- met OR. Alleen lezen: schrijven blijft service-role-only via de serveracties.
-- omnium_kit_codes krijgt bewust niets.

drop policy if exists "omnium_seasons_manage_read" on public.omnium_seasons;
create policy "omnium_seasons_manage_read" on public.omnium_seasons
  for select to authenticated
  using (public.current_user_has_permission('omnium.manage'));

drop policy if exists "omnium_editions_manage_read" on public.omnium_editions;
create policy "omnium_editions_manage_read" on public.omnium_editions
  for select to authenticated
  using (public.current_user_has_permission('omnium.manage'));

drop policy if exists "omnium_edition_events_manage_read" on public.omnium_edition_events;
create policy "omnium_edition_events_manage_read" on public.omnium_edition_events
  for select to authenticated
  using (public.current_user_has_permission('omnium.manage'));

drop policy if exists "omnium_results_manage_read" on public.omnium_results;
create policy "omnium_results_manage_read" on public.omnium_results
  for select to authenticated
  using (public.current_user_has_permission('omnium.manage'));

drop policy if exists "omnium_edition_standings_manage_read" on public.omnium_edition_standings;
create policy "omnium_edition_standings_manage_read" on public.omnium_edition_standings
  for select to authenticated
  using (public.current_user_has_permission('omnium.manage'));

drop policy if exists "omnium_season_standings_manage_read" on public.omnium_season_standings;
create policy "omnium_season_standings_manage_read" on public.omnium_season_standings
  for select to authenticated
  using (public.current_user_has_permission('omnium.manage'));

-- Controle na toepassen (als beheerder met omnium.manage via de app, of hier):
--   select policyname, tablename from pg_policies
--   where policyname like 'omnium_%_manage_read' order by tablename;
-- Verwacht: zes rijen.
