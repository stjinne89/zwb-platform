-- Routevoorstellen voor buitenritten: een vertrekpunt per lid, en de rondjes
-- die daar bij een geplande training uit komen.
--
-- PRIVACY -- lees dit voordat je hier iets aan verandert.
--
-- Dit platform bewaarde tot nu toe bewust géén start- of eindlocatie van ritten.
-- Migratie 0111 (ZWBlokken) zegt het met zoveel woorden: "het blok waar een rit
-- begint of eindigt komt hier nooit in, en de eerste en laatste kilometer van
-- elke rit tellen niet mee". Een vertrekpunt opslaan is dus een echte
-- verschuiving, en daarom met drie grenzen eromheen:
--
-- 1. Het lid wijst het zelf aan op een kaart. Er wordt niets afgeleid uit ritten,
--    geen adres gevraagd en niets gegeocodeerd -- er gaat dus ook geen adres naar
--    een externe dienst.
-- 2. De coördinaat wordt afgerond op drie decimalen (~110 m). Genoeg om een
--    rondje mee te plannen, te grof om een voordeur mee aan te wijzen. De
--    afronding gebeurt in de database (zie de trigger), niet alleen in de client,
--    zodat een tweede schrijfpad hem niet kan omzeilen.
-- 3. RLS laat alleen het lid zelf bij zijn eigen punten. Geen beheerinzage, geen
--    clubbrede lijst, en `profile_visibility` krijgt hier bewust geen sleutel:
--    er is geen stand waarin dit zichtbaar is voor een ander.

create table if not exists public.profile_start_points (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- "Thuis", "Clubhuis", "Parkeerplaats Lage Vuursche".
  label text not null check (length(btrim(label)) between 1 and 60),
  lat numeric(8, 3) not null check (lat between -90 and 90),
  lon numeric(8, 3) not null check (lon between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_start_points_profile_idx
  on public.profile_start_points (profile_id, created_at);

-- Een lid heeft er genoeg aan een handvol; dit voorkomt dat een kapotte client
-- er duizend wegschrijft.
create or replace function public.limit_start_points()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.profile_start_points where profile_id = new.profile_id) >= 10 then
    raise exception 'Je kunt hoogstens 10 vertrekpunten bewaren.';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_start_points_limit on public.profile_start_points;
create trigger profile_start_points_limit
  before insert on public.profile_start_points
  for each row execute function public.limit_start_points();

-- De afronding hoort in de database, niet in de client: zie punt 2 hierboven.
create or replace function public.round_start_point()
returns trigger language plpgsql as $$
begin
  new.lat := round(new.lat::numeric, 3);
  new.lon := round(new.lon::numeric, 3);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profile_start_points_round on public.profile_start_points;
create trigger profile_start_points_round
  before insert or update on public.profile_start_points
  for each row execute function public.round_start_point();

alter table public.profile_start_points enable row level security;

drop policy if exists "start_points_own_select" on public.profile_start_points;
create policy "start_points_own_select" on public.profile_start_points
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "start_points_own_insert" on public.profile_start_points;
create policy "start_points_own_insert" on public.profile_start_points
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists "start_points_own_update" on public.profile_start_points;
create policy "start_points_own_update" on public.profile_start_points
  for update to authenticated using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "start_points_own_delete" on public.profile_start_points;
create policy "start_points_own_delete" on public.profile_start_points
  for delete to authenticated using (profile_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────
-- De voorgestelde rondjes.
--
-- Waarom opgeslagen en niet per keer opnieuw berekend (anders dan de
-- Zwift-voorstellen): een rondje kost een call naar een routeplanner. Dat mag
-- niet bij elke keer dat iemand zijn schema opent gebeuren -- niet voor onze
-- laadtijd en niet voor de gratis dienst die we gebruiken. Het lid vraagt er
-- expliciet om, en daarna staat het er.
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.outdoor_route_suggestions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.training_workouts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Blijft staan als het lid het vertrekpunt later weggooit; de route is dan nog
  -- steeds te rijden.
  start_point_id uuid references public.profile_start_points(id) on delete set null,

  -- Welke van de drie windvarianten dit is (zie routeVariants in roundtrip.ts).
  variant text not null,
  heading_deg int not null check (heading_deg between 0 and 359),

  distance_km numeric(6, 1) not null,
  elevation_m int not null,
  estimated_minutes int not null,
  score_pct int not null check (score_pct between 0 and 100),
  -- Korte Nederlandse regels, al klaar voor weergave.
  summary text,
  wind_note text,

  -- {"lat": [...], "lon": [...], "ele": [...]} -- zelfde vorm als zwift_routes.
  geometry jsonb not null,

  chosen_at timestamptz,
  generated_at timestamptz not null default now()
);

create index if not exists outdoor_route_suggestions_workout_idx
  on public.outdoor_route_suggestions (workout_id, score_pct desc);

alter table public.outdoor_route_suggestions enable row level security;

drop policy if exists "outdoor_routes_own_select" on public.outdoor_route_suggestions;
create policy "outdoor_routes_own_select" on public.outdoor_route_suggestions
  for select to authenticated using (profile_id = auth.uid());

-- Schrijven gebeurt via de service-role serveractie, die de eigenaarscheck zelf
-- doet -- gelijk aan de andere trainingsacties.

notify pgrst, 'reload schema';
