-- Ladderpuzzel: conceptindeling voor seizoen 8 (2026-11-25).
--
-- Vraag eigenaar: de stand Seizoen 8 van de Ladderpuzzel loskoppelen van de
-- werkende puzzel, om alvast voor te puzzelen. Tot nu toe was Seizoen 8 alleen
-- een andere weergave: slepen verplaatste de renner echt (team_members of
-- ladder_roster_riders, 0290).
--
-- * Eén rij per renner die in het concept is verplaatst: een lid (profile_id)
--   of een rosternaam zonder account (roster_entry_id), precies één van de twee.
-- * team_id leeg = in het concept bij de losse stukjes. Wie geen rij heeft,
--   staat in het concept in zijn huidige puzzelteam.
-- * Opnieuw van Nu wist alle rijen.
-- * Alleen de server leest en schrijft (admin-client na de check uit
--   lib/club-ladder/access.ts): RLS aan zonder policies, zoals 0285 en 0290.

create table if not exists public.ladder_draft_placements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  roster_entry_id uuid references public.roster_entries(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint ladder_draft_placements_one_rider check (num_nonnulls(profile_id, roster_entry_id) = 1),
  -- Gewone unique (lege waarden tellen niet als gelijk), zodat upsert met
  -- onConflict werkt; een partiële index kan PostgREST niet gebruiken.
  constraint ladder_draft_placements_profile_key unique (profile_id),
  constraint ladder_draft_placements_roster_key unique (roster_entry_id)
);

alter table public.ladder_draft_placements enable row level security;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select relrowsecurity from pg_class where oid = 'public.ladder_draft_placements'::regclass;
--   -- true
-- select count(*) from pg_policies where tablename = 'ladder_draft_placements';
--   -- 0
