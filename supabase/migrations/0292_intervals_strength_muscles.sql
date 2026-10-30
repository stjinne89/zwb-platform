-- Krachttraining uit intervals.icu in het krachtspoor (wens eigenaar, 2026-10-28).
--
-- Op 2026-10-28 toegepast als `0290_intervals_strength_muscles`; daarna kreeg
-- de Ladderpuzzel op main het nummer 0290, dus dit bestand heet 0292. In de
-- migratiehistorie van productie staat de oude naam.
--
-- De sync zet al alle activiteiten in intervals_activities, ook WeightTraining
-- van een Garmin of met de hand ingevoerd. Het krachtspoor telt die nu mee voor
-- de rust tussen krachtsessies. Welke spieren je trainde weet intervals niet;
-- dat tikt het lid zelf aan op de spierkaart, en dat staat hier.
--
-- Een eigen tabel en geen kolom op intervals_activities: die tabel schrijft
-- alleen de service-role, en de sync is de eigenaar van die rijen. De
-- vreemde sleutel ruimt de keuze op als de activiteit verdwijnt.
--
-- De namen van de spiergroepen volgen MUSCLE_GROUPS in
-- src/lib/training/muscles.ts; tests/unit/intervals-strength.test.ts bewaakt
-- dat de lijst hieronder daarmee gelijk blijft.

create table if not exists public.intervals_strength_muscles (
  profile_id uuid not null,
  intervals_id text not null,
  muscles text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (profile_id, intervals_id),
  foreign key (profile_id, intervals_id)
    references public.intervals_activities (profile_id, intervals_id)
    on delete cascade,
  constraint intervals_strength_muscles_groups_check check (
    muscles <@ array[
      'schouders', 'borst', 'biceps', 'triceps', 'onderarmen', 'nek',
      'bovenrug', 'onderrug', 'buik', 'schuin', 'heupbuigers', 'bilspieren',
      'adductoren', 'quadriceps', 'hamstrings', 'kuiten'
    ]::text[]
  )
);

alter table public.intervals_strength_muscles enable row level security;

-- Alleen het lid zelf, zoals mobility_sessions (0109).
drop policy if exists "intervals_strength_muscles_own" on public.intervals_strength_muscles;
create policy "intervals_strength_muscles_own" on public.intervals_strength_muscles
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from public.intervals_strength_muscles;                        -- 0
-- select polname from pg_policy where polrelid = 'public.intervals_strength_muscles'::regclass;
