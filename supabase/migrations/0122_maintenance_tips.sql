-- Tips bij de onderdelen in Mijn garage.
--
-- Drie bronnen: algemene onderhoudskennis, samenvattingen van openbaar
-- gepubliceerd advies mét bronlink, en uitspraken van ZWB-leden uit de
-- clubgroepen.
--
-- Bij een citaat van een lid blijft profile_id staan. Dat is het hele punt: het
-- lid ziet zijn eigen citaten op zijn profiel en kan ze daar zelf aanpassen of
-- verwijderen, zonder tussenkomst. Zie /voorwaarden.

create table if not exists public.maintenance_tips (
  id uuid primary key default gen_random_uuid(),
  component_type text not null,
  -- null = geldt voor elk fietstype
  discipline text
    check (discipline is null or discipline in ('race', 'gravel', 'mtb', 'indoor', 'stad', 'overig')),
  body text not null check (length(btrim(body)) between 3 and 600),
  source_type text not null check (source_type in ('pro', 'lid', 'algemeen')),
  -- Naam van de pro of van het lid, zoals getoond bij de tip.
  source_name text,
  -- Alleen bij 'pro': de bron waar de samenvatting op gebaseerd is.
  source_url text,
  -- Alleen bij 'lid': wie het gezegd heeft, en dus wie het mag weghalen.
  profile_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Een ledencitaat zonder lid erachter kan niet: dan kan niemand het beheren.
  constraint maintenance_tips_member_has_profile
    check (source_type <> 'lid' or profile_id is not null)
);

create index if not exists maintenance_tips_component_idx
  on public.maintenance_tips (component_type, status);
create index if not exists maintenance_tips_profile_idx
  on public.maintenance_tips (profile_id);

alter table public.maintenance_tips enable row level security;

-- Lezen: elk ingelogd lid ziet de gepubliceerde tips. Je eigen citaten zie je
-- altijd, ook als ze verborgen zijn.
drop policy if exists "maintenance_tips_read" on public.maintenance_tips;
create policy "maintenance_tips_read" on public.maintenance_tips
  for select to authenticated
  using (
    status = 'published'
    or profile_id = auth.uid()
    or public.current_user_has_permission('community.manage')
  );

-- Toevoegen: alleen beheer. Leden voegen niets rechtstreeks toe; hun citaten
-- komen via de import binnen.
drop policy if exists "maintenance_tips_insert" on public.maintenance_tips;
create policy "maintenance_tips_insert" on public.maintenance_tips
  for insert to authenticated
  with check (public.current_user_has_permission('community.manage'));

-- Wijzigen en verwijderen: beheer, of het lid dat geciteerd wordt.
drop policy if exists "maintenance_tips_update" on public.maintenance_tips;
create policy "maintenance_tips_update" on public.maintenance_tips
  for update to authenticated
  using (profile_id = auth.uid() or public.current_user_has_permission('community.manage'))
  with check (profile_id = auth.uid() or public.current_user_has_permission('community.manage'));

drop policy if exists "maintenance_tips_delete" on public.maintenance_tips;
create policy "maintenance_tips_delete" on public.maintenance_tips
  for delete to authenticated
  using (profile_id = auth.uid() or public.current_user_has_permission('community.manage'));

notify pgrst, 'reload schema';
