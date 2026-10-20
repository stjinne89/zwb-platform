-- Zelf gekozen recepten in het dag- en weekmenu.
--
-- Per lid, dag en moment hooguit één recept. Wat hier staat, staat vast in het
-- Dagmenu en in Boodschappen; de dagen eromheen passen zich aan (zie
-- src/lib/nutrition/plan.ts). Zonder rij kiest het menu zelf, zoals voorheen.
-- Alleen voor het lid zelf, net als favorieten (nutrition_recipe_prefs, 0213).
-- Een verwijderd recept haalt de keuze mee weg.

create table if not exists public.nutrition_menu_choices (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  meal_moment text not null
    check (meal_moment in ('ontbijt', 'lunch', 'diner', 'tussendoor', 'voor_rit', 'tijdens_rit', 'na_rit', 'voor_slapen')),
  recipe_id uuid not null references public.nutrition_recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, day, meal_moment)
);

create index if not exists nutrition_menu_choices_recipe_idx
  on public.nutrition_menu_choices (recipe_id);

alter table public.nutrition_menu_choices enable row level security;

-- Alleen een recept dat het lid zelf mag zien (RLS van nutrition_recipes).
drop policy if exists "nutrition_menu_choices_own" on public.nutrition_menu_choices;
create policy "nutrition_menu_choices_own" on public.nutrition_menu_choices
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    and exists (select 1 from public.nutrition_recipes r where r.id = recipe_id)
  );

revoke all on public.nutrition_menu_choices from anon, authenticated;
grant select, insert, update, delete on public.nutrition_menu_choices to authenticated;
grant all on public.nutrition_menu_choices to service_role;
