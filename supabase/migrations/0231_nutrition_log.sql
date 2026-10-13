-- Voeding, naleving: het eetdagboek.
--
-- 0168 sloot een eetdagboek bewust uit. De eigenaar heeft dat op 2026-10-14
-- ingetrokken; het plan staat in docs/naleving-voeding-plan.md. Wat blijft:
--
-- * Alleen wie het zelf aanzet en ervoor tekent. Zonder rij in
--   nutrition_log_settings kan er geen maaltijd bestaan, en die rij weghalen
--   wist het hele eetdagboek (cascade).
-- * Geen kcal-doel, geen vet als doel, geen gewicht. Een maaltijd is een lijst
--   NEVO-producten met grammen; koolhydraten en eiwit rekent de app daaruit.
-- * Geen foto's. Die worden nergens bewaard, ook later niet.
-- * Alleen het lid zelf leest en schrijft. De trainer komt er pas bij met een
--   eigen schakelaar, in een latere migratie.

-- ──────────────────────────────────────────────────────────────────────
-- Toestemming en pauze
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.nutrition_log_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- De tekst waarvoor het lid tekende, zie LOG_CONSENT_VERSION in
  -- src/lib/nutrition/log.ts. Een nieuwe tekst is een nieuwe waarde hier.
  consent_version text not null check (consent_version in ('2026-10-14')),
  consented_at timestamptz not null default now(),
  -- Gepauzeerd: het dagboek blijft staan, maar er komt niets bij.
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists nutrition_log_settings_touch on public.nutrition_log_settings;
create trigger nutrition_log_settings_touch
  before update on public.nutrition_log_settings
  for each row execute function public.touch_training_updated_at();

-- ──────────────────────────────────────────────────────────────────────
-- Maaltijden en wat erin zat
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.nutrition_log_meals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.nutrition_log_settings(profile_id) on delete cascade,
  eaten_on date not null,
  meal_moment text not null
    check (meal_moment in ('ontbijt', 'lunch', 'diner', 'tussendoor', 'voor_rit', 'tijdens_rit', 'na_rit', 'voor_slapen')),
  -- Hoe de maaltijd is ingevoerd. Foto, barcode en tekst komen er later bij.
  source text not null check (source in ('recept', 'handmatig')),
  recipe_id uuid references public.nutrition_recipes(id) on delete set null,
  title text not null check (length(title) between 1 and 120),
  created_at timestamptz not null default now()
);

create index if not exists nutrition_log_meals_day_idx
  on public.nutrition_log_meals (profile_id, eaten_on);

create table if not exists public.nutrition_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.nutrition_log_meals(id) on delete cascade,
  food_id uuid not null references public.nutrition_foods(id) on delete restrict,
  sort_order int not null check (sort_order >= 0),
  grams numeric not null check (grams > 0 and grams <= 5000)
);

create index if not exists nutrition_log_items_meal_idx
  on public.nutrition_log_items (meal_id, sort_order);

-- ──────────────────────────────────────────────────────────────────────
-- RLS: alleen het lid zelf
-- ──────────────────────────────────────────────────────────────────────

alter table public.nutrition_log_settings enable row level security;
alter table public.nutrition_log_meals enable row level security;
alter table public.nutrition_log_items enable row level security;

drop policy if exists "nutrition_log_settings_own" on public.nutrition_log_settings;
create policy "nutrition_log_settings_own" on public.nutrition_log_settings
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "nutrition_log_meals_read" on public.nutrition_log_meals;
create policy "nutrition_log_meals_read" on public.nutrition_log_meals
  for select to authenticated using (profile_id = (select auth.uid()));

-- Tijdens een pauze komt er niets bij; lezen en wissen blijft kunnen.
drop policy if exists "nutrition_log_meals_insert" on public.nutrition_log_meals;
create policy "nutrition_log_meals_insert" on public.nutrition_log_meals
  for insert to authenticated with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.nutrition_log_settings s
      where s.profile_id = (select auth.uid()) and not s.paused
    )
  );

drop policy if exists "nutrition_log_meals_delete" on public.nutrition_log_meals;
create policy "nutrition_log_meals_delete" on public.nutrition_log_meals
  for delete to authenticated using (profile_id = (select auth.uid()));

drop policy if exists "nutrition_log_items_own" on public.nutrition_log_items;
create policy "nutrition_log_items_own" on public.nutrition_log_items
  for all to authenticated
  using (
    exists (
      select 1 from public.nutrition_log_meals m
      where m.id = meal_id and m.profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.nutrition_log_meals m
      where m.id = meal_id and m.profile_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select tablename, rowsecurity from pg_tables where tablename like 'nutrition_log_%';  -- drie keer true
