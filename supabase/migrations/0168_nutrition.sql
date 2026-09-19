-- Voeding in ZWBeter Worden: voedingswaarden, recepten en de lengte van een lid.
--
-- Drie dingen staan hier bewust niet:
--
-- * Geen eetdagboek. Wat iemand eet, leggen we niet vast. Dat is veel invoer voor
--   weinig winst, en tellen werkt het soort gedrag in de hand waar het IOC
--   REDs-consensusstuk (2023) voor waarschuwt.
-- * Geen vetpercentage en geen dieetvoorkeur. Een vetpercentage is
--   gezondheidsinformatie, en "glutenvrij" of "lactosevrij" als opgeslagen
--   voorkeur kan een aandoening verraden. Filteren op dieet gebeurt daarom alleen
--   in de URL.
-- * De lengte staat niet op profiles. Die tabel is voor elk ingelogd lid leesbaar
--   (0001, profiles_select_authenticated), dus een kolom daar is via de API voor
--   iedereen op te vragen. nutrition_profiles is alleen van het lid zelf.
--
-- De voedingswaarden komen ongewijzigd uit NEVO-online versie 2025/9.0 (RIVM).
-- De voorwaarden staan geen wijzigingen toe en vragen bronvermelding; de seed
-- staat in 0169 en wordt gegenereerd door scripts/nutrition/generate-seed.mjs.

-- ──────────────────────────────────────────────────────────────────────
-- Voedingsmiddelen (NEVO)
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.nutrition_foods (
  id uuid primary key default gen_random_uuid(),
  nevo_code int not null unique,
  name_nl text not null,
  -- NEVO geeft de meeste waarden per 100 g en een klein deel per 100 ml.
  quantity_unit text not null default 'g' check (quantity_unit in ('g', 'ml')),
  -- Null betekent: niet bekend in NEVO. Nooit zelf aanvullen met een schatting.
  kcal numeric,
  carbs_g numeric,
  sugars_g numeric,
  protein_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  nevo_version text not null
);

create index if not exists nutrition_foods_name_idx
  on public.nutrition_foods (lower(name_nl));

-- ──────────────────────────────────────────────────────────────────────
-- Lengte, alleen voor het lid zelf
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.nutrition_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- Alleen gebruikt om vaste receptingrediënten mee te schalen (Mifflin-St Jeor).
  height_cm smallint check (height_cm between 120 and 230),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- Recepten
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.nutrition_recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (length(title) between 1 and 120),
  meal_moment text not null
    check (meal_moment in ('ontbijt', 'lunch', 'diner', 'tussendoor', 'voor_rit', 'tijdens_rit', 'na_rit', 'voor_slapen')),
  fuel_profile text not null
    check (fuel_profile in ('hoog_kh', 'gemengd', 'eiwitrijk')),
  diet_tags text[] not null default '{}'
    check (diet_tags <@ array['vegetarisch', 'vegan', 'glutenvrij', 'lactosevrij']::text[]),
  -- Alle hoeveelheden in de ingrediënten zijn voor dit aantal porties samen.
  servings int not null default 1 check (servings between 1 and 20),
  prep_minutes int check (prep_minutes between 0 and 600),
  -- Bereiding in markdown; gerenderd met src/components/markdown.tsx.
  steps_md text not null default '',
  is_standard boolean not null default false,
  -- Null bij de clubrecepten; anders het lid dat het recept maakte.
  owner_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_recipes_owner
    check ((is_standard and owner_id is null) or (not is_standard and owner_id is not null))
);

create index if not exists nutrition_recipes_owner_idx
  on public.nutrition_recipes (owner_id, created_at desc);

create table if not exists public.nutrition_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.nutrition_recipes(id) on delete cascade,
  food_id uuid not null references public.nutrition_foods(id) on delete restrict,
  sort_order int not null check (sort_order >= 0),
  grams numeric not null check (grams > 0 and grams <= 5000),
  -- Bepaalt hoe het ingrediënt meeschaalt, zie src/lib/nutrition/scale.ts.
  role text not null check (role in ('kh_bron', 'eiwit_bron', 'vast')),
  unique (recipe_id, sort_order)
);

create index if not exists nutrition_recipe_ingredients_recipe_idx
  on public.nutrition_recipe_ingredients (recipe_id, sort_order);

drop trigger if exists nutrition_recipes_touch on public.nutrition_recipes;
create trigger nutrition_recipes_touch
  before update on public.nutrition_recipes
  for each row execute function public.touch_training_updated_at();

drop trigger if exists nutrition_profiles_touch on public.nutrition_profiles;
create trigger nutrition_profiles_touch
  before update on public.nutrition_profiles
  for each row execute function public.touch_training_updated_at();

-- ──────────────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────────────

alter table public.nutrition_foods enable row level security;
alter table public.nutrition_profiles enable row level security;
alter table public.nutrition_recipes enable row level security;
alter table public.nutrition_recipe_ingredients enable row level security;

-- NEVO is voor elk goedgekeurd lid leesbaar en komt alleen via migraties binnen.
drop policy if exists "nutrition_foods_read" on public.nutrition_foods;
create policy "nutrition_foods_read" on public.nutrition_foods
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

drop policy if exists "nutrition_profiles_own" on public.nutrition_profiles;
create policy "nutrition_profiles_own" on public.nutrition_profiles
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Clubrecepten voor iedereen; een eigen recept alleen voor de maker, net als een
-- eigen core-serie (0109).
drop policy if exists "nutrition_recipes_read" on public.nutrition_recipes;
create policy "nutrition_recipes_read" on public.nutrition_recipes
  for select to authenticated using (
    (
      is_standard
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_approved
      )
    )
    or owner_id = auth.uid()
  );

-- Clubrecepten beheren mag wie ook schema's maakt; eigen recepten iedereen.
drop policy if exists "nutrition_recipes_insert" on public.nutrition_recipes;
create policy "nutrition_recipes_insert" on public.nutrition_recipes
  for insert to authenticated with check (
    (owner_id = auth.uid() and is_standard = false)
    or (is_standard and public.current_user_has_permission('training.create_plans'))
  );

drop policy if exists "nutrition_recipes_update" on public.nutrition_recipes;
create policy "nutrition_recipes_update" on public.nutrition_recipes
  for update to authenticated
  using (
    (owner_id = auth.uid() and is_standard = false)
    or (is_standard and public.current_user_has_permission('training.create_plans'))
  )
  with check (
    (owner_id = auth.uid() and is_standard = false)
    or (is_standard and public.current_user_has_permission('training.create_plans'))
  );

drop policy if exists "nutrition_recipes_delete" on public.nutrition_recipes;
create policy "nutrition_recipes_delete" on public.nutrition_recipes
  for delete to authenticated using (
    (owner_id = auth.uid() and is_standard = false)
    or (is_standard and public.current_user_has_permission('training.create_plans'))
  );

-- Ingrediënten erven de zichtbaarheid en schrijfrechten van hun recept.
drop policy if exists "nutrition_recipe_ingredients_read" on public.nutrition_recipe_ingredients;
create policy "nutrition_recipe_ingredients_read" on public.nutrition_recipe_ingredients
  for select to authenticated using (
    exists (
      select 1 from public.nutrition_recipes r
      where r.id = recipe_id
        and (
          (
            r.is_standard
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.is_approved
            )
          )
          or r.owner_id = auth.uid()
        )
    )
  );

drop policy if exists "nutrition_recipe_ingredients_write" on public.nutrition_recipe_ingredients;
create policy "nutrition_recipe_ingredients_write" on public.nutrition_recipe_ingredients
  for all to authenticated
  using (
    exists (
      select 1 from public.nutrition_recipes r
      where r.id = recipe_id
        and (
          (r.owner_id = auth.uid() and r.is_standard = false)
          or (r.is_standard and public.current_user_has_permission('training.create_plans'))
        )
    )
  )
  with check (
    exists (
      select 1 from public.nutrition_recipes r
      where r.id = recipe_id
        and (
          (r.owner_id = auth.uid() and r.is_standard = false)
          or (r.is_standard and public.current_user_has_permission('training.create_plans'))
        )
    )
  );

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from public.nutrition_foods;              -- 0 tot 0169 draait
-- select tablename, rowsecurity from pg_tables
--   where tablename like 'nutrition_%';                      -- overal true
