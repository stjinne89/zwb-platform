-- Beveiligingsgaten in de rechten dicht (rechtenronde fase A, 2026-10-01).
--
-- 1. Wie leden rollen mag geven (members.manage_roles), kon zichzelf of een ander
--    is_admin geven, en de rol board (alle rechten). is_admin wijzigen kan nu
--    alleen een admin; board geven of afnemen vraagt ook roles.manage_permissions.
-- 2. profiles_admin_update liet wie leden mag goedkeuren of rollen geven ELKE
--    kolom van een ander profiel wijzigen. Bij andermans profiel mogen nu alleen
--    nog de goedkeurings- en rolvelden veranderen. Je eigen profiel, admins en de
--    service-role (cron, sync) blijven zoals ze waren.
-- 3. Trainingsschema's, workouts, AI-concepten, aanpassingsrondes en
--    workoutverslagen: alleen trainer_id = auth.uid() werd gecontroleerd, dus elk
--    lid kon rijen voor een ander aanmaken. Nu moet je die renner ook mogen
--    trainen (jezelf, een actieve koppeling, of training.manage_assignments).
--    Een trainerkoppeling aanmaken kan alleen met iemand die de rol trainer heeft.
--    De app schrijft dit allemaal met de service-role; die merkt hier niets van.
-- 4. Een paar security-definer-functies waren via de API door elk ingelogd lid
--    aan te roepen. Ze worden alleen door triggers (die als eigenaar draaien) en
--    door de service-role gebruikt.

-- ──────────────────────────────────────────────────────────────────────
-- 1 + 2. Profielen
-- ──────────────────────────────────────────────────────────────────────

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Kolommen die beheer bij een ander profiel mag wijzigen.
  managed text[] := array['is_approved', 'approved_at', 'approved_by', 'community_roles', 'updated_at'];
begin
  if public.current_user_is_admin() then
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin then
    raise exception 'Alleen een beheerder kan beheerdersrechten geven of afnemen.';
  end if;

  if new.community_roles is distinct from old.community_roles then
    if not public.current_user_has_permission('members.manage_roles') then
      raise exception 'Geen recht om ledenrollen te wijzigen.';
    end if;
    if ('board' = any(coalesce(new.community_roles, array[]::text[])))
       is distinct from ('board' = any(coalesce(old.community_roles, array[]::text[])))
       and not public.current_user_has_permission('roles.manage_permissions') then
      raise exception 'Geen recht om de rol Bestuur te geven of af te nemen.';
    end if;
  end if;

  if (new.is_approved is distinct from old.is_approved
      or new.approved_at is distinct from old.approved_at
      or new.approved_by is distinct from old.approved_by)
    and not public.current_user_has_permission('members.approve') then
    raise exception 'Geen recht om leden goed te keuren.';
  end if;

  -- Andermans profiel (de service-role heeft geen auth.uid()): alleen de
  -- beheervelden mogen veranderen.
  if auth.uid() is not null and auth.uid() <> old.id
     and (to_jsonb(new) - managed) is distinct from (to_jsonb(old) - managed) then
    raise exception 'Bij een ander profiel kun je alleen goedkeuring en rollen wijzigen.';
  end if;

  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 3. Training
-- ──────────────────────────────────────────────────────────────────────

create or replace function public.profile_has_community_role(p_profile_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = p_profile_id
       and p_role = any(coalesce(community_roles, array[]::text[]))
  );
$$;
revoke all on function public.profile_has_community_role(uuid, text) from public, anon;
grant execute on function public.profile_has_community_role(uuid, text) to authenticated, service_role;

drop policy if exists "training_assignments_write" on public.training_coach_assignments;
drop policy if exists "training_assignments_insert" on public.training_coach_assignments;
create policy "training_assignments_insert" on public.training_coach_assignments
  for insert to authenticated
  with check (
    (athlete_id = auth.uid() and public.profile_has_community_role(trainer_id, 'trainer'))
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_assignments_update" on public.training_coach_assignments;
create policy "training_assignments_update" on public.training_coach_assignments
  for update to authenticated
  using (
    athlete_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    -- Intrekken mag altijd; een actieve koppeling alleen met een trainer.
    (athlete_id = auth.uid()
      and (status <> 'active' or public.profile_has_community_role(trainer_id, 'trainer')))
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_assignments_delete" on public.training_coach_assignments;
create policy "training_assignments_delete" on public.training_coach_assignments
  for delete to authenticated
  using (
    athlete_id = auth.uid()
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_ai_write" on public.training_ai_generations;
create policy "training_ai_write" on public.training_ai_generations
  for all to authenticated
  using (
    (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_plans_write" on public.training_plans;
create policy "training_plans_write" on public.training_plans
  for all to authenticated
  using (
    (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_workouts_write" on public.training_workouts;
create policy "training_workouts_write" on public.training_workouts
  for all to authenticated
  using (
    (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_adaptation_runs_write" on public.training_adaptation_runs;
create policy "training_adaptation_runs_write" on public.training_adaptation_runs
  for all to authenticated
  using (
    (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  );

drop policy if exists "training_workout_reports_write" on public.training_workout_reports;
create policy "training_workout_reports_write" on public.training_workout_reports
  for all to authenticated
  using (
    profile_id = auth.uid()
    or (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  )
  with check (
    profile_id = auth.uid()
    or (trainer_id = auth.uid() and public.current_user_can_train_profile(profile_id))
    or public.current_user_has_permission('training.manage_assignments')
  );

-- ──────────────────────────────────────────────────────────────────────
-- 4. Definer-functies alleen voor triggers en de service-role
-- ──────────────────────────────────────────────────────────────────────

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'sync_zrl_parent_team_membership',
         'sync_all_zrl_parent_team_memberships',
         'sync_zrl_parent_roster_entries',
         'join_event_team_for_member',
         'link_roster_by_zwift_id',
         'convert_zrl_umbrella_races',
         'rate_limit_hit',
         'rate_limit_cleanup'
       )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
