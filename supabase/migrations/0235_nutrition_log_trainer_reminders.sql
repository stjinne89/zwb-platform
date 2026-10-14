-- Voeding, naleving stap 5: de trainer kijkt mee, en herinneringen.
--
-- * Trainerinzage alleen met een eigen schakelaar en toestemming van het lid,
--   en alleen voor een trainer met een actieve koppeling aan dit lid. Bewust
--   niet via current_user_can_train_profile: die laat ook wie koppelingen
--   beheert meelezen, en dat valt buiten wat het lid aanzette.
-- * De trainer leest alleen; schrijven blijft voor het lid zelf.
-- * Herinneringen staan uit tot het lid ze aanzet. Welke er verstuurd zijn,
--   staat in nutrition_reminder_sends, zodat de cron er per dag één van elk
--   soort stuurt. Die tabel is alleen voor de server.

alter table public.nutrition_log_settings
  add column if not exists trainer_visible boolean not null default false,
  add column if not exists trainer_consent_at timestamptz,
  add column if not exists reminders boolean not null default false;

alter table public.nutrition_log_settings
  drop constraint if exists nutrition_log_settings_trainer_consent_check,
  add constraint nutrition_log_settings_trainer_consent_check
    check (not trainer_visible or trainer_consent_at is not null);

-- Of de ingelogde gebruiker als trainer het eetdagboek van dit lid mag lezen.
create or replace function public.nutrition_log_trainer_can_read(target_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.nutrition_log_settings s
    join public.training_coach_assignments tca on tca.athlete_id = s.profile_id
    where s.profile_id = target_profile
      and s.trainer_visible
      and tca.trainer_id = auth.uid()
      and tca.status = 'active'
  );
$$;

revoke all on function public.nutrition_log_trainer_can_read(uuid) from public, anon;
grant execute on function public.nutrition_log_trainer_can_read(uuid) to authenticated;

drop policy if exists "nutrition_log_settings_trainer_read" on public.nutrition_log_settings;
create policy "nutrition_log_settings_trainer_read" on public.nutrition_log_settings
  for select to authenticated using (public.nutrition_log_trainer_can_read(profile_id));

drop policy if exists "nutrition_log_meals_trainer_read" on public.nutrition_log_meals;
create policy "nutrition_log_meals_trainer_read" on public.nutrition_log_meals
  for select to authenticated using (public.nutrition_log_trainer_can_read(profile_id));

drop policy if exists "nutrition_log_items_trainer_read" on public.nutrition_log_items;
create policy "nutrition_log_items_trainer_read" on public.nutrition_log_items
  for select to authenticated using (
    exists (
      select 1 from public.nutrition_log_meals m
      where m.id = meal_id and public.nutrition_log_trainer_can_read(m.profile_id)
    )
  );

-- ──────────────────────────────────────────────────────────────────────
-- Herinneringen
-- ──────────────────────────────────────────────────────────────────────

-- Zoals elke andere pushsoort; het eigenlijke aan of uit staat in
-- nutrition_log_settings.reminders.
alter table public.notification_preferences
  add column if not exists on_nutrition_reminder boolean not null default true;

create table if not exists public.nutrition_reminder_sends (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sent_on date not null,
  kind text not null check (kind in ('morgen_zwaar', 'herstel')),
  created_at timestamptz not null default now(),
  primary key (profile_id, sent_on, kind)
);

alter table public.nutrition_reminder_sends enable row level security;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from pg_policies where tablename like 'nutrition_log_%' and policyname like '%trainer%';  -- 3
