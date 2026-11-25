-- zMAP per renner van de Club Ladder (2026-11-25).
--
-- Vraag eigenaar: de live zMAP die de ladder op een rennersprofiel toont,
-- ophalen voor de Ladderpuzzel van seizoen 8, in plaats van alleen onze
-- schatting. Het profiel (/profile/<Zwift-ID>, achter login) toont twee kaarten:
--
-- * spread_wkg: "zMAP Spread Value", de hoogste sinds de transferperiode; daar
--   rekent de ladder nu de spreiding mee.
-- * live_wkg: "If Reset Today", de laatste meting; die zet de ladder bij een
--   reset, ook bij de wissel naar seizoen 8. live_age_days: "live from Nd ago".
--
-- Een rij zonder waarden (found = false of beide leeg) betekent: opgehaald,
-- maar de ladder kent de renner niet of heeft geen meting. fetched_at zorgt dat
-- de sync niet elke run dezelfde renner neemt.
--
-- Alleen de server leest en schrijft: RLS aan zonder policies, zoals 0290.

create table if not exists public.ladder_rider_zmap (
  zwift_id bigint primary key check (zwift_id > 0),
  found boolean not null default true,
  spread_wkg numeric(5, 2) check (spread_wkg is null or spread_wkg > 0),
  live_wkg numeric(5, 2) check (live_wkg is null or live_wkg > 0),
  live_age_days smallint check (live_age_days is null or live_age_days >= 0),
  fetched_at timestamptz not null default now()
);

alter table public.ladder_rider_zmap enable row level security;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select relrowsecurity from pg_class where oid = 'public.ladder_rider_zmap'::regclass;
--   -- true
-- select count(*) from pg_policies where tablename = 'ladder_rider_zmap';
--   -- 0
