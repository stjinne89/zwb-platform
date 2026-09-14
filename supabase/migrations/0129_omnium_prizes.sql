-- Omnium: prijzen, kitcodes en het palmares.
--
-- Per editie krijgt de winnaar van elke league een in-game ZWB-kit, en er is
-- ruimte voor andere prijzen. Vandaar een prijzentabel per seizoen in plaats
-- van één vaste regel in code.
--
-- Uitreiking loopt bewust via Discord en niet via het platform: er is geen
-- app-brede mailer (alleen Supabase Auth verstuurt mail) en we willen geen
-- e-mailadressen van niet-leden opslaan. Het platform houdt alleen de status
-- bij.

create table if not exists public.omnium_prizes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.omnium_seasons(id) on delete cascade,
  -- 'edition' = per editie uit te reiken, 'season' = aan het eind van het jaar.
  scope text not null check (scope in ('edition', 'season')),
  -- null = niet per league maar één prijs voor het hele veld.
  league text,
  title text not null,
  description text,
  kind text not null default 'zwift_kit' check (kind in ('zwift_kit', 'other')),
  sort_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists omnium_prizes_season_idx
  on public.omnium_prizes (season_id, scope, sort_index);

create table if not exists public.omnium_prize_awards (
  id uuid primary key default gen_random_uuid(),
  prize_id uuid not null references public.omnium_prizes(id) on delete cascade,
  -- null bij een seizoensprijs.
  edition_id uuid references public.omnium_editions(id) on delete cascade,
  league text,
  rider_id uuid not null references public.omnium_riders(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'claimed')),
  note text,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Eén prijs per editie per league gaat naar één renner.
  unique (prize_id, edition_id, league)
);

create index if not exists omnium_prize_awards_rider_idx
  on public.omnium_prize_awards (rider_id);

-- Codevoorraad. Dit zijn geheimen: er is opzettelijk geen enkele leespolicy,
-- ook niet voor ingelogde leden. De codes zijn alleen bereikbaar via de
-- service-role in de beheeractie die ze uitdeelt, en komen nooit in een
-- publieke query terecht.
create table if not exists public.omnium_kit_codes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.omnium_seasons(id) on delete cascade,
  code text not null unique,
  award_id uuid references public.omnium_prize_awards(id) on delete set null,
  issued_at timestamptz,
  created_at timestamptz not null default now()
);

-- Voor de voorraadwaarschuwing op het beheerscherm: hoeveel is er nog vrij?
create index if not exists omnium_kit_codes_free_idx
  on public.omnium_kit_codes (season_id) where issued_at is null;

alter table public.omnium_prizes enable row level security;
alter table public.omnium_prize_awards enable row level security;
alter table public.omnium_kit_codes enable row level security;

-- Het palmares is publiek; wie wat won mag iedereen zien.
drop policy if exists "omnium_prizes_public_read" on public.omnium_prizes;
create policy "omnium_prizes_public_read" on public.omnium_prizes
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.omnium_seasons s
      where s.id = omnium_prizes.season_id
        and s.published_at is not null
    )
  );

drop policy if exists "omnium_prize_awards_public_read" on public.omnium_prize_awards;
create policy "omnium_prize_awards_public_read" on public.omnium_prize_awards
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.omnium_prizes p
      join public.omnium_seasons s on s.id = p.season_id
      where p.id = omnium_prize_awards.prize_id
        and s.published_at is not null
    )
  );

-- omnium_kit_codes krijgt bewust géén policy: RLS staat aan en er is geen
-- select-, insert-, update- of delete-policy, dus alleen de service-role komt
-- erbij. Zie docs/runbook.md bij het nalopen van rechten na een deploy.

drop trigger if exists omnium_prizes_touch on public.omnium_prizes;
create trigger omnium_prizes_touch
  before update on public.omnium_prizes
  for each row execute function public.touch_updated_at();

drop trigger if exists omnium_prize_awards_touch on public.omnium_prize_awards;
create trigger omnium_prize_awards_touch
  before update on public.omnium_prize_awards
  for each row execute function public.touch_updated_at();
