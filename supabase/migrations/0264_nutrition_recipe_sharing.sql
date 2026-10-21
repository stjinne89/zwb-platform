-- Voeding: een eigen recept delen met alle leden, met of zonder naam en foto, en
-- een recept van een link (foto van de bron).
--
-- Naast het voorstellen aan de club (0213) kan een lid een eigen recept nu ook
-- direct met alle goedgekeurde leden delen, zonder beoordeling. Het blijft een
-- eigen recept: alleen de maker kan het wijzigen, terugzetten of verwijderen.
--
-- Wat hier bewust niet staat:
--
-- * owner_id afschermen bij een recept dat zonder naam gedeeld is. Leden kunnen
--   profiles al lezen (0001), en de app filtert overal op owner_id. "Zonder
--   naam" betekent dat de app geen naam of foto toont, niet dat de maker via de
--   API onvindbaar is.
-- * De foto zelf opslaan. image_url wijst naar de site van het recept.

alter table public.nutrition_recipes
  -- 'prive': alleen de maker. 'leden': elk goedgekeurd lid kan het lezen.
  add column if not exists visibility text not null default 'prive',
  -- Naam en profielfoto van de maker tonen bij een gedeeld recept.
  add column if not exists show_owner boolean not null default false,
  -- Foto van de bron, bij een recept van een link.
  add column if not exists image_url text;

alter table public.nutrition_recipes
  drop constraint if exists nutrition_recipes_visibility_check,
  add constraint nutrition_recipes_visibility_check
    check (visibility in ('prive', 'leden') and (visibility = 'prive' or not is_standard)),
  drop constraint if exists nutrition_recipes_show_owner_check,
  add constraint nutrition_recipes_show_owner_check
    check (not show_owner or visibility = 'leden'),
  drop constraint if exists nutrition_recipes_image_check,
  add constraint nutrition_recipes_image_check
    check (image_url is null or (image_url ~ '^https://' and length(image_url) <= 1000));

create index if not exists nutrition_recipes_visibility_idx
  on public.nutrition_recipes (visibility)
  where visibility = 'leden';

drop policy if exists "nutrition_recipes_read" on public.nutrition_recipes;
create policy "nutrition_recipes_read" on public.nutrition_recipes
  for select to authenticated using (
    (
      (is_standard or visibility = 'leden')
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.is_approved
      )
    )
    or owner_id = (select auth.uid())
    or (share_status = 'voorgesteld' and public.current_user_has_permission('training.create_plans'))
  );

drop policy if exists "nutrition_recipe_ingredients_read" on public.nutrition_recipe_ingredients;
create policy "nutrition_recipe_ingredients_read" on public.nutrition_recipe_ingredients
  for select to authenticated using (
    exists (
      select 1 from public.nutrition_recipes r
      where r.id = recipe_id
        and (
          (
            (r.is_standard or r.visibility = 'leden')
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

-- Zoals 0213, plus: een goedgekeurd recept is een clubrecept en heeft dus geen
-- eigen zichtbaarheid meer. De naam staat er daarna als aandrager bij.
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
    update public.nutrition_recipes
       set is_standard = true,
           contributed_by = owner_id,
           owner_id = null,
           share_status = null,
           visibility = 'prive',
           show_owner = false,
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

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select visibility, count(*) from public.nutrition_recipes group by 1;  -- alles 'prive'
-- select policyname from pg_policies where tablename = 'nutrition_recipes';
