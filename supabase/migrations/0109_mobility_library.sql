-- Core & mobiliteit als eigen spoor, bewust náást de fietspijplijn.
--
-- Aanleiding: de AI plande ooit een "Rust + rug/mobiliteit"-sessie als gewone
-- training_workout. Dat gaat op vier plekken mis — geen wattages dus geen
-- intervals.icu-publicatie, estimateTrainingLoad telt de duur mee als
-- fietsbelasting (en dus in projectCtl), complianceForWorkouts matcht alleen
-- Strava-rítten waardoor de sessie altijd 'niet_gereden' scoort, en de AI plant
-- de dag erna juist lichter. Off-bike werk is daarom uit defaultTrainingPrompt()
-- verbannen.
--
-- Deze tabellen staan daar volledig los van: een afgevinkte core-sessie is geen
-- training_workout en komt dus nergens in TSS, CTL of naleving terecht. Dat is
-- geen implementatiedetail maar het hele punt van dit spoor.
--
-- Het beeld per oefening zit in code (src/components/mobility/figures), dus er
-- is hier geen storage-bucket. `media_json` is de naad om later alsnog foto's,
-- video of ingekochte animaties per oefening te hangen zonder schemawijziging:
-- gevulde media_json wint, anders de getekende figuur, anders alleen de tekst.

-- ──────────────────────────────────────────────────────────────────────
-- Oefeningen
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.mobility_exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null
    check (category in ('core', 'mobiliteit', 'activatie')),
  region text not null
    check (region in ('lumbaal', 'heup', 'thoracaal', 'schouder', 'enkel')),
  -- Uitvoering in markdown; gerenderd met src/components/markdown.tsx.
  cue_md text not null,
  -- Verwijst naar een figuur in het register. Onbekende slug is geen fout: de
  -- UI valt dan terug op alleen de tekst.
  illustration_slug text,
  media_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(media_json) = 'array'),
  default_hold_seconds int check (default_hold_seconds > 0 and default_hold_seconds <= 300),
  default_reps int check (default_reps > 0 and default_reps <= 100),
  -- Links en rechts apart uitvoeren; de runner telt dan twee rondes.
  is_unilateral boolean not null default false,
  level int not null default 1 check (level between 1 and 3),
  is_standard boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Een oefening zonder dosering kan de runner niet aftellen.
  constraint mobility_exercises_dosage
    check (default_hold_seconds is not null or default_reps is not null)
);

create index if not exists mobility_exercises_category_idx
  on public.mobility_exercises (category, region);

-- ──────────────────────────────────────────────────────────────────────
-- Series
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.mobility_series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  goal text not null
    check (goal in ('stabiliteit', 'mobiliteit', 'houding')),
  -- Wanneer de serie bedoeld is. Bepaalt ook de holdlimiet hieronder.
  timing text not null
    check (timing in ('pre_ride', 'post_ride', 'rustdag')),
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes <= 60),
  level int not null default 1 check (level between 1 and 3),
  is_standard boolean not null default false,
  -- Null bij de meegeleverde set; anders het lid dat de serie samenstelde.
  owner_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mobility_series_owner
    check ((is_standard and owner_id is null) or (not is_standard and owner_id is not null))
);

create index if not exists mobility_series_owner_idx
  on public.mobility_series (owner_id, created_at desc);

create table if not exists public.mobility_series_items (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.mobility_series(id) on delete cascade,
  exercise_id uuid not null references public.mobility_exercises(id) on delete restrict,
  sort_order int not null check (sort_order >= 0),
  sets int not null default 1 check (sets between 1 and 10),
  reps int check (reps > 0 and reps <= 100),
  hold_seconds int check (hold_seconds > 0 and hold_seconds <= 300),
  rest_seconds int not null default 20 check (rest_seconds >= 0 and rest_seconds <= 300),
  unique (series_id, sort_order),
  constraint mobility_series_items_dosage
    check (reps is not null or hold_seconds is not null)
);

create index if not exists mobility_series_items_series_idx
  on public.mobility_series_items (series_id, sort_order);

-- Lang statisch rekken vóór inspanning kost vermogen: >60 s per spiergroep geeft
-- 4-7,5% daling in kracht/vermogen, en in fietsen specifiek een lagere piek in
-- een 6-seconden sprint. Een pre_ride-serie mag daarom geen lange holds
-- bevatten. Dit kan geen CHECK zijn (die mag niet naar een andere tabel kijken),
-- dus het staat als trigger — aan beide kanten, want ook het omzetten van een
-- bestaande serie naar pre_ride moet blijven kloppen.

create or replace function public.mobility_pre_ride_hold_limit()
returns trigger
language plpgsql
as $$
declare
  series_timing text;
begin
  select timing into series_timing
  from public.mobility_series
  where id = new.series_id;

  if series_timing = 'pre_ride' and coalesce(new.hold_seconds, 0) > 60 then
    raise exception
      'Een serie vóór de rit mag geen hold langer dan 60 seconden bevatten (kreeg %).',
      new.hold_seconds;
  end if;

  return new;
end;
$$;

drop trigger if exists mobility_series_items_pre_ride_limit on public.mobility_series_items;
create trigger mobility_series_items_pre_ride_limit
  before insert or update on public.mobility_series_items
  for each row execute function public.mobility_pre_ride_hold_limit();

create or replace function public.mobility_series_timing_guard()
returns trigger
language plpgsql
as $$
declare
  offending int;
begin
  if new.timing <> 'pre_ride' then
    return new;
  end if;

  select count(*) into offending
  from public.mobility_series_items
  where series_id = new.id and coalesce(hold_seconds, 0) > 60;

  if offending > 0 then
    raise exception
      'Deze serie heeft % oefening(en) met een hold langer dan 60 seconden en kan niet op pre_ride staan.',
      offending;
  end if;

  return new;
end;
$$;

drop trigger if exists mobility_series_timing_guard on public.mobility_series;
create trigger mobility_series_timing_guard
  before update of timing on public.mobility_series
  for each row execute function public.mobility_series_timing_guard();

-- ──────────────────────────────────────────────────────────────────────
-- Afvinken
-- ──────────────────────────────────────────────────────────────────────

-- Handmatig afvinken in plaats van Strava-matching: er is geen rit om aan te
-- koppelen. Unique per dag zodat dubbel tikken geen dubbele sessie oplevert.
create table if not exists public.mobility_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid not null references public.mobility_series(id) on delete cascade,
  completed_on date not null,
  minutes int check (minutes > 0 and minutes <= 120),
  feel text check (feel in ('goed', 'neutraal', 'zwaar')),
  note text,
  created_at timestamptz not null default now(),
  unique (profile_id, series_id, completed_on)
);

create index if not exists mobility_sessions_profile_date_idx
  on public.mobility_sessions (profile_id, completed_on desc);

-- ──────────────────────────────────────────────────────────────────────
-- updated_at
-- ──────────────────────────────────────────────────────────────────────

drop trigger if exists mobility_exercises_touch on public.mobility_exercises;
create trigger mobility_exercises_touch
  before update on public.mobility_exercises
  for each row execute function public.touch_training_updated_at();

drop trigger if exists mobility_series_touch on public.mobility_series;
create trigger mobility_series_touch
  before update on public.mobility_series
  for each row execute function public.touch_training_updated_at();

-- ──────────────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────────────

alter table public.mobility_exercises enable row level security;
alter table public.mobility_series enable row level security;
alter table public.mobility_series_items enable row level security;
alter table public.mobility_sessions enable row level security;

-- Oefeningen zijn voor elk goedgekeurd lid leesbaar; de club deelt één
-- bibliotheek. Zelfde toets als event_photos_members_read.
drop policy if exists "mobility_exercises_read" on public.mobility_exercises;
create policy "mobility_exercises_read" on public.mobility_exercises
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_approved
    )
  );

-- Eigen oefeningen toevoegen mag alleen wie ook schema's maakt. De standaardset
-- komt uit de seed-migratie en blijft voor iedereen gelijk.
drop policy if exists "mobility_exercises_insert" on public.mobility_exercises;
create policy "mobility_exercises_insert" on public.mobility_exercises
  for insert to authenticated with check (
    created_by = auth.uid()
    and is_standard = false
    and public.current_user_has_permission('training.create_plans')
  );

drop policy if exists "mobility_exercises_update" on public.mobility_exercises;
create policy "mobility_exercises_update" on public.mobility_exercises
  for update to authenticated
  using (created_by = auth.uid() and is_standard = false)
  with check (created_by = auth.uid() and is_standard = false);

drop policy if exists "mobility_exercises_delete" on public.mobility_exercises;
create policy "mobility_exercises_delete" on public.mobility_exercises
  for delete to authenticated
  using (created_by = auth.uid() and is_standard = false);

-- Series: de standaardset voor iedereen, eigen series alleen voor de maker.
-- Een zelfgemaakte serie is geen clubinhoud.
drop policy if exists "mobility_series_read" on public.mobility_series;
create policy "mobility_series_read" on public.mobility_series
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

drop policy if exists "mobility_series_insert" on public.mobility_series;
create policy "mobility_series_insert" on public.mobility_series
  for insert to authenticated
  with check (owner_id = auth.uid() and is_standard = false);

drop policy if exists "mobility_series_update" on public.mobility_series;
create policy "mobility_series_update" on public.mobility_series
  for update to authenticated
  using (owner_id = auth.uid() and is_standard = false)
  with check (owner_id = auth.uid() and is_standard = false);

drop policy if exists "mobility_series_delete" on public.mobility_series;
create policy "mobility_series_delete" on public.mobility_series
  for delete to authenticated
  using (owner_id = auth.uid() and is_standard = false);

-- Items erven de zichtbaarheid van hun serie.
drop policy if exists "mobility_series_items_read" on public.mobility_series_items;
create policy "mobility_series_items_read" on public.mobility_series_items
  for select to authenticated using (
    exists (
      select 1 from public.mobility_series s
      where s.id = series_id
        and (
          (
            s.is_standard
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.is_approved
            )
          )
          or s.owner_id = auth.uid()
        )
    )
  );

drop policy if exists "mobility_series_items_write" on public.mobility_series_items;
create policy "mobility_series_items_write" on public.mobility_series_items
  for all to authenticated
  using (
    exists (
      select 1 from public.mobility_series s
      where s.id = series_id and s.owner_id = auth.uid() and s.is_standard = false
    )
  )
  with check (
    exists (
      select 1 from public.mobility_series s
      where s.id = series_id and s.owner_id = auth.uid() and s.is_standard = false
    )
  );

-- Afgevinkte sessies zijn privé.
drop policy if exists "mobility_sessions_own" on public.mobility_sessions;
create policy "mobility_sessions_own" on public.mobility_sessions
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

notify pgrst, 'reload schema';
