-- Renners uit de Ladderpuzzel halen (2026-10-29).
--
-- Vraag eigenaar: in de puzzel namen kunnen verwijderen als ze niet meer mee
-- willen doen. Een rosternaam verliest dan zijn ladderkoppeling
-- (ladder_roster_riders, 0290). Een lid gaat uit de puzzelteams en de
-- ladderpool, maar wie zelf Ladder aanvinkte, stond daarna nog steeds in de
-- lijst. Die interesse is een keuze van het lid zelf en stuurt ook zijn
-- kalender (zie 0285), dus die zet een captain niet uit. Daarom deze markering.
--
-- * Wie hier staat, valt uit de ladderlijst en de puzzel, ook met interesse of
--   lidmaatschap van een ladderteam buiten de puzzel.
-- * Indelen, captain maken of weer toevoegen haalt de markering weg.
-- * Alleen de server leest en schrijft: RLS aan zonder policies, zoals 0285.

create table if not exists public.ladder_withdrawn (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  withdrawn_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ladder_withdrawn enable row level security;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select relrowsecurity from pg_class where oid = 'public.ladder_withdrawn'::regclass;
--   -- true
-- select count(*) from pg_policies where tablename = 'ladder_withdrawn';
--   -- 0
