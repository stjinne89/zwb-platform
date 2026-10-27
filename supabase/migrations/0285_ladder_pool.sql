-- Ladderpool: leden die een captain aan de ladderlijst toevoegt (2026-10-27).
--
-- Vraag eigenaar: op /teams/club-ladder ook leden in de lijst van ladderrenners
-- zetten die zelf nog geen Ladder bij Interesses aanvinkten, zonder ze meteen in
-- een team te zetten. De interesse (profiles.event_type_interests, 0143) is een
-- keuze van het lid zelf en stuurt ook zijn kalender; die zet een captain niet
-- voor hem aan. Daarom een eigen lijst.
--
-- * Een renner staat in de ladderlijst als hij Ladder aanvinkte, in een
--   ladderteam zit of in deze tabel staat.
-- * Alleen de server leest en schrijft (admin-client, na de check op
--   teams.manage_roster of captain van een ladderteam), dus RLS aan zonder
--   policies, zoals zwift_rider_metrics (0260).

create table if not exists public.ladder_pool (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ladder_pool enable row level security;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select relrowsecurity from pg_class where oid = 'public.ladder_pool'::regclass;
--   -- true
-- select count(*) from pg_policies where tablename = 'ladder_pool';
--   -- 0
