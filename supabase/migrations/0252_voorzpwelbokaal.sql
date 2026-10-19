-- voorZpWelBokaal: het wedkantoor voor het veldrijden (heropbouw 2026-10-19).
--
-- Vervangt de losse app op voorzpwelbokaal.netlify.app. Renners krijgen een
-- quotering uit hun CyclingFlash-veldritrating; leden zetten ZWBallen in op
-- winnaar, podium, top 10 of een duel. Spelregels en formule: PLAN.md en
-- src/lib/bokaal/.
--
-- * Saldo per seizoen: je begint met 10 ballen, winst komt erbij en kun je
--   opnieuw inzetten (besluit eigenaar, 2026-10-19).
-- * Hoogstens 5 ballen per wedstrijd, dames en heren apart, ook met een groot
--   saldo (besluit eigenaar, 2026-10-19).
-- * Een goed antwoord op de bonusvraag levert 1 bal op, zonder inzet.
-- * Meedoen is een eigen keuze met een eigen toestemming (consent_version),
--   zoals ZWBieb (0239); geen nieuwe privacyversie. Wie stopt, wist zijn rij
--   in bokaal_players en daarmee al zijn briefjes en antwoorden.
-- * Inzetten, intrekken en antwoorden gaan alleen via de functies hieronder:
--   die lezen de quotering van het bord zelf, zodat een lid geen eigen
--   quotering kan meesturen, en ze vergrendelen de spelersrij zodat twee
--   gelijktijdige inzetten samen niet over het saldo of de 5 ballen gaan.
-- * Het startsaldo (10), de limiet (5) en de bonus (1) staan ook in
--   src/lib/bokaal/rules.ts. Wie ze wijzigt, wijzigt beide.

create table if not exists public.bokaal_players (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  season text not null check (season ~ '^[0-9]{4}-[0-9]{4}$'),
  consent_version text not null check (consent_version in ('2026-10-19')),
  joined_at timestamptz not null default now(),
  primary key (profile_id, season)
);

-- Laatst opgehaalde CyclingFlash-veldritratings; alleen de server leest ze.
create table if not exists public.bokaal_ratings (
  category text not null check (category in ('w', 'm')),
  rider_slug text not null check (rider_slug ~ '^[a-z0-9-]{1,160}$'),
  rider_name text not null check (length(rider_name) between 1 and 120),
  rating integer not null check (rating between 0 and 3000),
  fetched_at timestamptz not null default now(),
  primary key (category, rider_slug)
);

create table if not exists public.bokaal_races (
  id uuid primary key default gen_random_uuid(),
  season text not null check (season ~ '^[0-9]{4}-[0-9]{4}$'),
  category text not null check (category in ('w', 'm')),
  event_slug text not null check (event_slug ~ '^[a-z0-9-]{1,160}$'),
  event_name text not null check (length(event_name) between 1 and 160),
  race_slug text not null unique check (race_slug ~ '^[a-z0-9-]{1,160}$'),
  location text check (location is null or length(location) <= 120),
  starts_at timestamptz not null,
  -- concept: nog niet zichtbaar; open: op het bord (inzetten tot starts_at);
  -- afgerekend: uitslag verwerkt; geannuleerd: alle inzetten terug.
  status text not null default 'concept'
    check (status in ('concept', 'open', 'afgerekend', 'geannuleerd')),
  -- { riders: [{slug, name, rating, win, pod, top}], duels: [{a, b, oa, ob}] };
  -- een quotering null staat niet op het bord.
  board jsonb not null default '{"riders": [], "duels": []}'::jsonb
    check (jsonb_typeof(board->'riders') = 'array' and jsonb_typeof(board->'duels') = 'array'),
  -- { key, question, options: [...], answer: index | null }
  bonus jsonb check (bonus is null or jsonb_typeof(bonus->'options') = 'array'),
  result jsonb check (result is null or jsonb_typeof(result) = 'array'),
  odds_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bokaal_races_board on public.bokaal_races (status, starts_at);

create table if not exists public.bokaal_bets (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.bokaal_races(id) on delete cascade,
  profile_id uuid not null,
  season text not null,
  market text not null check (market in ('win', 'pod', 'top', 'duel')),
  rider_slug text not null,
  rider_name text not null,
  vs_slug text,
  vs_name text,
  odds numeric(6, 2) not null check (odds >= 1.05 and odds <= 50),
  stake integer not null check (stake between 1 and 5),
  outcome text not null default 'open' check (outcome in ('open', 'raak', 'mis', 'terug')),
  payout numeric(8, 2) check (payout is null or payout >= 0),
  created_at timestamptz not null default now(),
  check ((market = 'duel') = (vs_slug is not null)),
  check ((outcome = 'open') = (payout is null)),
  foreign key (profile_id, season) references public.bokaal_players(profile_id, season) on delete cascade
);
create index if not exists bokaal_bets_player on public.bokaal_bets (profile_id, season);
create index if not exists bokaal_bets_race on public.bokaal_bets (race_id);

create table if not exists public.bokaal_bonus_answers (
  race_id uuid not null references public.bokaal_races(id) on delete cascade,
  profile_id uuid not null,
  season text not null,
  choice smallint not null check (choice between 0 and 5),
  correct boolean,
  answered_at timestamptz not null default now(),
  primary key (race_id, profile_id),
  foreign key (profile_id, season) references public.bokaal_players(profile_id, season) on delete cascade
);
create index if not exists bokaal_bonus_player on public.bokaal_bonus_answers (profile_id, season);

alter table public.bokaal_players enable row level security;
alter table public.bokaal_ratings enable row level security;
alter table public.bokaal_races enable row level security;
alter table public.bokaal_bets enable row level security;
alter table public.bokaal_bonus_answers enable row level security;

revoke all on public.bokaal_players, public.bokaal_ratings, public.bokaal_races,
  public.bokaal_bets, public.bokaal_bonus_answers from anon, authenticated;
grant select, insert, delete on public.bokaal_players to authenticated;
grant select on public.bokaal_races, public.bokaal_bets, public.bokaal_bonus_answers to authenticated;
grant all on public.bokaal_players, public.bokaal_ratings, public.bokaal_races,
  public.bokaal_bets, public.bokaal_bonus_answers to service_role;

create or replace function public.bokaal_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved)
$$;

create policy bokaal_players_read on public.bokaal_players for select to authenticated
  using ((select public.bokaal_member()));
create policy bokaal_players_join on public.bokaal_players for insert to authenticated
  with check (profile_id = (select auth.uid()) and (select public.bokaal_member()));
create policy bokaal_players_leave on public.bokaal_players for delete to authenticated
  using (profile_id = (select auth.uid()));

-- Een concept staat nog niet op het bord.
create policy bokaal_races_read on public.bokaal_races for select to authenticated
  using (status <> 'concept' and (select public.bokaal_member()));

-- Je eigen briefjes altijd; die van anderen pas als de koers gestart is, zodat
-- niemand vooraf kan meekijken.
create policy bokaal_bets_read on public.bokaal_bets for select to authenticated
  using (
    profile_id = (select auth.uid())
    or ((select public.bokaal_member()) and exists (
      select 1 from public.bokaal_races r where r.id = race_id and r.starts_at <= now()))
  );
create policy bokaal_bonus_read on public.bokaal_bonus_answers for select to authenticated
  using (
    profile_id = (select auth.uid())
    or ((select public.bokaal_member()) and exists (
      select 1 from public.bokaal_races r where r.id = race_id and r.starts_at <= now()))
  );

-- Saldo: 10 bij de start, min alle inzetten, plus alle uitbetalingen (een
-- terugbetaalde inzet is een uitbetaling van de inzet), plus 1 per goed antwoord.
create or replace function public.bokaal_balance(p_profile uuid, p_season text) returns numeric
language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from public.bokaal_players where profile_id = p_profile and season = p_season)
      then 0::numeric
    else 10
      - coalesce((select sum(stake) from public.bokaal_bets where profile_id = p_profile and season = p_season), 0)
      + coalesce((select sum(payout) from public.bokaal_bets where profile_id = p_profile and season = p_season), 0)
      + (select count(*) from public.bokaal_bonus_answers where profile_id = p_profile and season = p_season and correct)
  end
$$;

create or replace function public.bokaal_place_bet(
  p_race uuid, p_market text, p_rider text, p_vs text, p_stake integer
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r public.bokaal_races;
  entry jsonb;
  duel jsonb;
  v_odds numeric;
  v_name text;
  v_vs text;
  v_vs_name text;
  used integer;
  new_id uuid;
begin
  if me is null or not public.bokaal_member() then
    raise exception 'Alleen goedgekeurde leden kunnen inzetten.';
  end if;
  select * into r from public.bokaal_races where id = p_race;
  if r.id is null or r.status <> 'open' or r.starts_at <= now() then
    raise exception 'Dit bord is dicht.';
  end if;
  perform 1 from public.bokaal_players where profile_id = me and season = r.season for update;
  if not found then raise exception 'Doe eerst mee aan voorZpWelBokaal.'; end if;
  if p_stake is null or p_stake < 1 or p_stake > 5 then
    raise exception 'Je zet 1 tot 5 ballen in.';
  end if;

  if p_market in ('win', 'pod', 'top') then
    select e into entry from jsonb_array_elements(r.board->'riders') e where e->>'slug' = p_rider;
    if entry is null then raise exception 'Deze renner staat niet op het bord.'; end if;
    v_odds := (entry->>p_market)::numeric;
    v_name := entry->>'name';
  elsif p_market = 'duel' then
    select e into duel from jsonb_array_elements(r.board->'duels') e
      where (e->>'a' = p_rider and e->>'b' = p_vs) or (e->>'b' = p_rider and e->>'a' = p_vs);
    if duel is null then raise exception 'Dit duel staat niet op het bord.'; end if;
    v_odds := case when duel->>'a' = p_rider then (duel->>'oa')::numeric else (duel->>'ob')::numeric end;
    select e->>'name' into v_name from jsonb_array_elements(r.board->'riders') e where e->>'slug' = p_rider;
    select e->>'name' into v_vs_name from jsonb_array_elements(r.board->'riders') e where e->>'slug' = p_vs;
    v_vs := p_vs;
    if v_name is null or v_vs_name is null then raise exception 'Dit duel staat niet op het bord.'; end if;
  else
    raise exception 'Onbekende inzet.';
  end if;
  if v_odds is null then raise exception 'Hier staat geen quotering op het bord.'; end if;

  select coalesce(sum(stake), 0) into used from public.bokaal_bets where race_id = p_race and profile_id = me;
  if used + p_stake > 5 then
    raise exception 'Per wedstrijd zet je hoogstens 5 ballen in.';
  end if;
  if public.bokaal_balance(me, r.season) < p_stake then
    raise exception 'Je hebt niet genoeg ZWBallen.';
  end if;

  insert into public.bokaal_bets (race_id, profile_id, season, market, rider_slug, rider_name, vs_slug, vs_name, odds, stake)
    values (p_race, me, r.season, p_market, p_rider, v_name, v_vs, v_vs_name, v_odds, p_stake)
    returning id into new_id;
  return new_id;
end $$;

create or replace function public.bokaal_cancel_bet(p_bet uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.bokaal_bets b
    using public.bokaal_races r
    where b.id = p_bet and b.profile_id = auth.uid() and b.outcome = 'open'
      and r.id = b.race_id and r.status = 'open' and r.starts_at > now();
  if not found then raise exception 'Dit briefje kan niet meer weg.'; end if;
end $$;

create or replace function public.bokaal_answer_bonus(p_race uuid, p_choice integer) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r public.bokaal_races;
begin
  if me is null or not public.bokaal_member() then
    raise exception 'Alleen goedgekeurde leden kunnen antwoorden.';
  end if;
  select * into r from public.bokaal_races where id = p_race;
  if r.id is null or r.status <> 'open' or r.starts_at <= now() or r.bonus is null then
    raise exception 'Deze bonusvraag is dicht.';
  end if;
  if not exists (select 1 from public.bokaal_players where profile_id = me and season = r.season) then
    raise exception 'Doe eerst mee aan voorZpWelBokaal.';
  end if;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(r.bonus->'options') then
    raise exception 'Kies een van de antwoorden.';
  end if;
  insert into public.bokaal_bonus_answers (race_id, profile_id, season, choice)
    values (p_race, me, r.season, p_choice)
    on conflict (race_id, profile_id) do update set choice = excluded.choice, answered_at = now();
end $$;

-- De lei: iedereen die dit seizoen meedoet, met saldo en wat er nog openstaat.
create or replace function public.bokaal_standings(p_season text)
returns table (profile_id uuid, display_name text, balance numeric, open_stake bigint, hits bigint, bets bigint)
language sql stable security definer set search_path = public as $$
  select pl.profile_id, p.display_name,
    public.bokaal_balance(pl.profile_id, p_season),
    coalesce((select sum(stake) from public.bokaal_bets b where b.profile_id = pl.profile_id and b.season = p_season and b.outcome = 'open'), 0),
    (select count(*) from public.bokaal_bets b where b.profile_id = pl.profile_id and b.season = p_season and b.outcome = 'raak'),
    (select count(*) from public.bokaal_bets b where b.profile_id = pl.profile_id and b.season = p_season)
  from public.bokaal_players pl
  join public.profiles p on p.id = pl.profile_id and p.is_approved
  where pl.season = p_season and public.bokaal_member()
$$;

revoke all on function public.bokaal_member(), public.bokaal_balance(uuid, text),
  public.bokaal_place_bet(uuid, text, text, text, integer), public.bokaal_cancel_bet(uuid),
  public.bokaal_answer_bonus(uuid, integer), public.bokaal_standings(text) from public, anon;
-- Saldi staan op de lei voor iedereen, dus bokaal_balance mag elk lid opvragen.
grant execute on function public.bokaal_member(), public.bokaal_balance(uuid, text),
  public.bokaal_place_bet(uuid, text, text, text, integer),
  public.bokaal_cancel_bet(uuid), public.bokaal_answer_bonus(uuid, integer),
  public.bokaal_standings(text) to authenticated;
grant execute on function public.bokaal_member(), public.bokaal_balance(uuid, text),
  public.bokaal_standings(text) to service_role;

notify pgrst, 'reload schema';
