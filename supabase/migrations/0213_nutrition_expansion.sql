-- Voeding, uitbreiding: micronutriënten, receptbron, voorkeuren per lid en
-- recepten delen met de club.
--
-- Wat hier bewust niet staat:
--
-- * Geen opgeslagen dieetvoorkeur. Dat blijft een filter in de URL (zie 0168).
-- * Geen dagtotaal micronutriënten. Zonder eetdagboek valt dat niet te
--   berekenen; de kolommen hieronder dienen alleen voor een label per recept.
-- * EPA en DHA staan apart. NEVO levert ze apart, en de voorwaarden staan geen
--   bewerkte waarden toe; optellen gebeurt in de code.
--
-- De nieuwe kolommen op nutrition_foods worden gevuld door 0214 (gegenereerd).

-- ──────────────────────────────────────────────────────────────────────
-- Voedingsmiddelen: micronutriënten en productgroep (NEVO)
-- ──────────────────────────────────────────────────────────────────────

alter table public.nutrition_foods
  add column if not exists food_group text,
  add column if not exists calcium_mg numeric,
  add column if not exists iron_mg numeric,
  add column if not exists magnesium_mg numeric,
  add column if not exists zinc_mg numeric,
  add column if not exists vitamin_d_ug numeric,
  add column if not exists vitamin_c_mg numeric,
  add column if not exists epa_g numeric,
  add column if not exists dha_g numeric;

-- ──────────────────────────────────────────────────────────────────────
-- Recepten: bron en delen
-- ──────────────────────────────────────────────────────────────────────

alter table public.nutrition_recipes
  -- Het gerecht komt van een externe bron; tekst en waarden zijn van ZWB.
  add column if not exists source_name text,
  add column if not exists source_url text,
  -- Null = niet gedeeld. Een goedgekeurd recept wordt een clubrecept en heeft
  -- daarna geen status meer.
  add column if not exists share_status text,
  -- Wie het recept aandroeg; blijft staan nadat het een clubrecept is geworden.
  add column if not exists contributed_by uuid references public.profiles(id) on delete set null;

alter table public.nutrition_recipes
  drop constraint if exists nutrition_recipes_source_check,
  add constraint nutrition_recipes_source_check
    check (
      (source_url is null or source_name is not null)
      and (source_url is null or source_url ~ '^https://')
      and (source_name is null or length(source_name) between 1 and 120)
    ),
  drop constraint if exists nutrition_recipes_share_status_check,
  add constraint nutrition_recipes_share_status_check
    check (share_status is null or (share_status in ('voorgesteld', 'afgewezen') and not is_standard)),
  -- Alleen een clubrecept draagt een naam; zo kan een lid op een eigen recept
  -- niet de naam van een ander zetten.
  drop constraint if exists nutrition_recipes_contributed_check,
  add constraint nutrition_recipes_contributed_check
    check (contributed_by is null or is_standard);

create index if not exists nutrition_recipes_share_idx
  on public.nutrition_recipes (share_status)
  where share_status is not null;

-- Wie schema's mag maken ziet ook de voorgestelde recepten.
drop policy if exists "nutrition_recipes_read" on public.nutrition_recipes;
create policy "nutrition_recipes_read" on public.nutrition_recipes
  for select to authenticated using (
    (
      is_standard
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.is_approved
      )
    )
    or owner_id = (select auth.uid())
    or (share_status = 'voorgesteld' and public.current_user_has_permission('training.create_plans'))
  );

-- Beoordelen gaat via een functie en niet via de update-policy. Na afwijzen is
-- het recept voor de beoordelaar niet meer zichtbaar, en Postgres weigert een
-- update waarvan de nieuwe rij buiten de eigen select-policy valt. De
-- update-policy uit 0168 blijft dus zoals hij is: een lid kan zijn eigen recept
-- wijzigen en voorstellen, maar er geen clubrecept van maken.
create or replace function public.review_shared_nutrition_recipe(
  p_recipe_id uuid,
  p_approve boolean,
  p_slug text default null
)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.current_user_has_permission('training.create_plans') then
    raise exception 'Geen rechten om recepten te beoordelen.' using errcode = '42501';
  end if;

  if p_approve then
    -- Het lid is daarna geen eigenaar meer; zijn naam blijft als aandrager staan.
    update public.nutrition_recipes
       set is_standard = true,
           contributed_by = owner_id,
           owner_id = null,
           share_status = null,
           slug = coalesce(nullif(p_slug, ''), slug)
     where id = p_recipe_id and share_status = 'voorgesteld';
  else
    update public.nutrition_recipes
       set share_status = 'afgewezen'
     where id = p_recipe_id and share_status = 'voorgesteld';
  end if;
  return found;
end $$;

revoke all on function public.review_shared_nutrition_recipe(uuid, boolean, text) from public, anon;
grant execute on function public.review_shared_nutrition_recipe(uuid, boolean, text) to authenticated;

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
              where p.id = (select auth.uid()) and p.is_approved
            )
          )
          or r.owner_id = (select auth.uid())
          or (r.share_status = 'voorgesteld' and public.current_user_has_permission('training.create_plans'))
        )
    )
  );

-- ──────────────────────────────────────────────────────────────────────
-- Voorkeur per recept, alleen voor het lid zelf
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.nutrition_recipe_prefs (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.nutrition_recipes(id) on delete cascade,
  -- Eén voorkeur per recept: favoriet, of verborgen ("niet voor mij").
  pref text not null check (pref in ('favoriet', 'verborgen')),
  created_at timestamptz not null default now(),
  primary key (profile_id, recipe_id)
);

alter table public.nutrition_recipe_prefs enable row level security;

drop policy if exists "nutrition_recipe_prefs_own" on public.nutrition_recipe_prefs;
create policy "nutrition_recipe_prefs_own" on public.nutrition_recipe_prefs
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from public.nutrition_foods where calcium_mg is not null;  -- 0 tot 0214 draait
-- select tablename, rowsecurity from pg_tables where tablename like 'nutrition_%';  -- overal true
