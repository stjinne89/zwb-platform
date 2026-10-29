-- ZWBekers: een prijzenkast voor prestaties die aandacht verdienen (wens
-- eigenaar, 2026-10-28), in dezelfde galerij als ZWBriljant.
--
-- * Een lid draagt een prestatie voor en ontwerpt er de beker bij (vorm,
--   metaal, oren, voet, sokkel, gravure; `design`, gecontroleerd in
--   src/lib/zwbekers/design.ts). Het bestuur keurt de voordracht samen met het
--   ontwerp; pas dan staat de beker in de kast en op de profielen van wie hem
--   wonnen.
-- * Wie keurt: het recht achievements.finalize, hetzelfde als badges toekennen
--   (Badgebeheer). Een eigen recht zou de check-constraint van
--   community_role_permissions vragen (zie 0254), en het is hetzelfde werk:
--   prijzen toekennen.
-- * Individueel of team. Een teambeker hangt aan een team uit `teams` en aan de
--   leden die toen meereden (zwbeker_winners), niet aan wie er nu in zit.
--   `team_name` bewaart de naam, zodat de beker blijft kloppen als het team
--   later wordt opgeheven of hernoemd.
-- * Een voordracht is geheim tot hij is toegekend: alleen wie voordroeg en wie
--   keurt, zien hem. Ook de winnaars zelf, zodat het een verrassing blijft.
-- * Felicitaties alleen onder toegekende bekers.
-- * Schrijven gaat alleen via de server (admin-client, na de checks in
--   src/lib/zwbekers/server.ts), zoals ladder_pool (0285): geen insert-,
--   update- of deletepolicies. Lezen gaat met de sessie van het lid, zodat RLS
--   beslist wat iemand ziet.
-- * Foto's in een eigen, besloten bucket. De server maakt de upload- en
--   leeslinks na zijn eigen check, dus ook daar geen policies.

create table if not exists public.zwbekers (
  id uuid primary key default gen_random_uuid(),
  -- Wie voordroeg. Heet profile_id, zodat de voordracht in de data-export zit.
  -- Bij het opheffen van dat account blijft de beker staan, zonder naam.
  profile_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('individueel', 'team')),
  title text not null check (length(btrim(title)) between 3 and 60),
  story text not null check (length(btrim(story)) between 10 and 1000),
  achieved_on date not null,
  team_id uuid references public.teams(id) on delete set null,
  team_name text check (team_name is null or length(btrim(team_name)) between 1 and 80),
  event_id uuid references public.events(id) on delete set null,
  result_url text check (result_url is null or (result_url ~ '^https://' and length(result_url) <= 500)),
  design jsonb not null check (jsonb_typeof(design) = 'object'),
  photo_path text check (photo_path is null or length(photo_path) <= 300),
  status text not null default 'voorgedragen'
    check (status in ('voorgedragen', 'toegekend', 'afgewezen')),
  review_note text check (review_note is null or length(btrim(review_note)) between 1 and 500),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Een individuele beker hangt niet aan een team.
  check (kind = 'team' or (team_id is null and team_name is null)),
  -- Toegekend of afgewezen heeft een moment; een open voordracht niet.
  check ((status = 'voorgedragen') = (reviewed_at is null))
);

create index if not exists zwbekers_kast_idx
  on public.zwbekers (achieved_on desc) where status = 'toegekend';
create index if not exists zwbekers_open_idx
  on public.zwbekers (created_at) where status = 'voorgedragen';
create index if not exists zwbekers_profile_idx
  on public.zwbekers (profile_id, created_at desc);

create table if not exists public.zwbeker_winners (
  beker_id uuid not null references public.zwbekers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (beker_id, profile_id)
);

create index if not exists zwbeker_winners_profile_idx
  on public.zwbeker_winners (profile_id);

create table if not exists public.zwbeker_congrats (
  id uuid primary key default gen_random_uuid(),
  beker_id uuid not null references public.zwbekers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists zwbeker_congrats_beker_idx
  on public.zwbeker_congrats (beker_id, created_at);
create index if not exists zwbeker_congrats_profile_idx
  on public.zwbeker_congrats (profile_id);

-- ──────────────────────────────────────────────────────────────────────
-- Lezen
-- ──────────────────────────────────────────────────────────────────────

alter table public.zwbekers enable row level security;
alter table public.zwbeker_winners enable row level security;
alter table public.zwbeker_congrats enable row level security;

revoke all on public.zwbekers from anon, authenticated;
revoke all on public.zwbeker_winners from anon, authenticated;
revoke all on public.zwbeker_congrats from anon, authenticated;
grant select on public.zwbekers to authenticated;
grant select on public.zwbeker_winners to authenticated;
grant select on public.zwbeker_congrats to authenticated;
grant all on public.zwbekers to service_role;
grant all on public.zwbeker_winners to service_role;
grant all on public.zwbeker_congrats to service_role;

-- profiles is leesbaar voor elk ingelogd account (0001), ook een account dat
-- nog wacht; daarom de goedkeuring hier expliciet, zoals in 0254.
drop policy if exists "zwbekers_select" on public.zwbekers;
create policy "zwbekers_select" on public.zwbekers
  for select to authenticated
  using (
    (
      status = 'toegekend'
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
    )
    or profile_id = (select auth.uid())
    or public.current_user_has_permission('achievements.finalize')
  );

-- Wie een beker won, is te zien zodra de beker zelf te zien is (de RLS van
-- zwbekers geldt ook in deze subquery).
drop policy if exists "zwbeker_winners_select" on public.zwbeker_winners;
create policy "zwbeker_winners_select" on public.zwbeker_winners
  for select to authenticated
  using (exists (select 1 from public.zwbekers b where b.id = beker_id));

drop policy if exists "zwbeker_congrats_select" on public.zwbeker_congrats;
create policy "zwbeker_congrats_select" on public.zwbeker_congrats
  for select to authenticated
  using (exists (select 1 from public.zwbekers b where b.id = beker_id and b.status = 'toegekend'));

-- ──────────────────────────────────────────────────────────────────────
-- Foto's
-- ──────────────────────────────────────────────────────────────────────

-- Pad: <beker_id>/<uploader_id>/<tijd>.jpg. Geen policies: de server maakt
-- een ondertekende uploadlink (na de check of je de voordracht mag
-- bewerken) en ondertekende leeslinks (na het lezen van de beker met RLS).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zwbeker-photos',
  'zwbeker-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ──────────────────────────────────────────────────────────────────────
-- Pushvoorkeuren
-- ──────────────────────────────────────────────────────────────────────

-- on_zwbeker_nomination: een nieuwe voordracht, voor wie keurt.
-- on_zwbeker_awarded: je wint een beker, of je voordracht is beoordeeld.
alter table public.notification_preferences
  add column if not exists on_zwbeker_nomination boolean not null default true,
  add column if not exists on_zwbeker_awarded boolean not null default true;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select relname, relrowsecurity from pg_class
--  where relname in ('zwbekers', 'zwbeker_winners', 'zwbeker_congrats');   -- drie keer true
-- select tablename, policyname, cmd from pg_policies
--  where tablename like 'zwbeker%';                                       -- drie select-policies
-- select has_table_privilege('anon', 'public.zwbekers', 'select');        -- false
-- select has_table_privilege('authenticated', 'public.zwbekers', 'insert'); -- false
-- select public, file_size_limit from storage.buckets where id = 'zwbeker-photos'; -- false, 10485760
-- select column_name from information_schema.columns
--  where table_name = 'notification_preferences'
--    and column_name in ('on_zwbeker_nomination', 'on_zwbeker_awarded'); -- twee rijen
