-- ZWBriljant: wie deelt, deelt met alle goedgekeurde leden (eigenaar, 2026-10-21).
-- Tot nu toe (0265) zag je de steen van een ander alleen als jullie allebei
-- deelden. Nu bepaalt alleen de eigenaar van de steen of die zichtbaar is; de
-- lezer hoeft niet zelf te delen, wel goedgekeurd te zijn.
--
-- Ongewijzigd: delen gebeurt bij het lezen (zwbriljant_shares), dus intrekken of
-- verbergen werkt meteen. Snapshots bevatten nog steeds alleen niveaus, geen ruwe
-- waarden. Het ZWB-gemiddelde rekent de server uit (service_role, anoniem, vanaf
-- vijf leden) en heeft deze policy niet nodig.

drop policy if exists "zwbriljant_snapshots_read" on public.zwbriljant_snapshots;
create policy "zwbriljant_snapshots_read" on public.zwbriljant_snapshots
  for select to authenticated using (
    profile_id = (select auth.uid())
    or (
      public.zwbriljant_shares(profile_id)
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
    )
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select qual from pg_policies where policyname = 'zwbriljant_snapshots_read';  -- zonder tweede zwbriljant_shares
