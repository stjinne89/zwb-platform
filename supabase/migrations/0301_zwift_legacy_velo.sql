-- Legacy vELO per Zwift-ID voor de Club Ladder (2026-11-02).
--
-- Vraag eigenaar: voor ieder lid de legacy vELO, zodat de Ladder die kan
-- gebruiken. Het Club Ladder Race Book (sinds 23 oktober 2026): alle verwijzingen
-- naar vELO gaan over vELO1 (legacy), niet vELO 2, en de rank is de open/mixed
-- klasse van de hoogste rating over 30 dagen (zonder 30-dagenwaarde die over 90).
--
-- * zwift_legacy_velo: per Zwift-ID de legacy rating van ZwiftRacing.app zoals
--   de rennerpagina hem toont (live, max30, max90). Geen cache die verloopt: de
--   waardes komen niet van de API maar worden met de hand uit de site gelezen
--   (Chrome), en blijven staan tot de volgende keer. Ook renners zonder account
--   (rosternamen), dus op Zwift-ID, zoals ladder_ranks (0290).
-- * Alleen de server leest en schrijft: RLS aan zonder policies, zoals de
--   andere laddertabellen (0285, 0290, 0291, 0298).
--
-- De ratings zelf staan niet in deze migratie: dat zijn gegevens van renners, die
-- bij het toepassen los worden ingevuld.

create table if not exists public.zwift_legacy_velo (
  zwift_id bigint primary key check (zwift_id > 0),
  velo_live numeric(6, 1),
  velo_max30 numeric(6, 1),
  velo_max90 numeric(6, 1),
  fetched_at timestamptz not null default now()
);

alter table public.zwift_legacy_velo enable row level security;
