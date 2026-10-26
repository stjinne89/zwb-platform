-- ZWBriljant: wie zijn steen verbergt, ziet ook de stenen van andere leden niet
-- (eigenaar, 2026-10-22). Tot nu toe (0266) besliste alleen de eigenaar van een
-- steen; de lezer hoefde niet zelf te delen.
--
-- De lezer telt als delend tenzij hij zijn steen verborg: zonder voorkeur is delen
-- de standaard (0267). Je eigen snapshots blijven altijd leesbaar. Het
-- ZWB-gemiddelde rekent de server uit (service_role, anoniem) en blijft dus ook
-- voor wie verbergt zichtbaar.

drop policy if exists "zwbriljant_snapshots_read" on public.zwbriljant_snapshots;
create policy "zwbriljant_snapshots_read" on public.zwbriljant_snapshots
  for select to authenticated using (
    profile_id = (select auth.uid())
    or (
      public.zwbriljant_shares(profile_id)
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
      and not exists (
        select 1 from public.zwbriljant_preferences pref
        where pref.profile_id = (select auth.uid()) and not pref.visible
      )
    )
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select qual from pg_policies where policyname = 'zwbriljant_snapshots_read';  -- met "not pref.visible"
