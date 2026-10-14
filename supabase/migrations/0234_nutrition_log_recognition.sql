-- Voeding, naleving stap 3: een maaltijd herkennen uit een foto of omschrijving.
--
-- De foto of tekst gaat naar OpenAI, dat de onderdelen benoemt en per onderdeel
-- de grammen schat. De koppeling aan NEVO en de koolhydraten en het eiwit doet
-- ZWB zelf; het lid bevestigt elke hoeveelheid voor er iets wordt bewaard.
--
-- * Een eigen schakelaar met eigen toestemming (ai_consent_at), los van het
--   eetdagboek zelf: wie geen AI wil, kan het dagboek gewoon gebruiken.
-- * De foto wordt nergens in de database of in Storage bewaard. Wat hier staat
--   is alleen het gebruik: wanneer, welk soort, en het response-id om het
--   antwoord op te halen. Daarmee geldt de daglimiet, en alleen wie de
--   herkenning startte kan het antwoord ophalen.

alter table public.nutrition_log_settings
  add column if not exists ai_consent_at timestamptz;

create table if not exists public.nutrition_log_ai_usage (
  id uuid primary key default gen_random_uuid(),
  -- Aan het profiel en niet aan de instellingen: alles wissen en opnieuw aanzetten
  -- mag de daglimiet niet resetten. Er staat geen inhoud in.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('foto', 'tekst')),
  response_id text not null unique,
  used_at timestamptz not null default now()
);

create index if not exists nutrition_log_ai_usage_profile_idx
  on public.nutrition_log_ai_usage (profile_id, used_at desc);

alter table public.nutrition_log_ai_usage enable row level security;

-- Lezen mag het lid zelf; schrijven doet alleen de server (service role), zodat
-- niemand de daglimiet omzeilt door rijen weg te halen.
drop policy if exists "nutrition_log_ai_usage_read" on public.nutrition_log_ai_usage;
create policy "nutrition_log_ai_usage_read" on public.nutrition_log_ai_usage
  for select to authenticated using (profile_id = (select auth.uid()));

alter table public.nutrition_log_meals
  drop constraint if exists nutrition_log_meals_source_check,
  add constraint nutrition_log_meals_source_check
    check (source in ('recept', 'handmatig', 'foto', 'tekst'));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select column_name from information_schema.columns
--   where table_name = 'nutrition_log_settings' and column_name = 'ai_consent_at';  -- 1 rij
