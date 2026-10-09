-- Training en Social zijn geen categorie maar een soort rit (wens van de
-- eigenaar, 2026-10-09): een Zwift-event kan een training zijn, een buitenrit
-- een social. Ze verhuizen daarom van `events.type` naar een eigen kolom.
--
-- Hooguit één van de twee per event; null = geen van beide.
--
-- Bestaande events met type 'social' of 'training' krijgen type 'overig' en
-- hun oude type als soort. Welke categorie ze werkelijk zijn (Zwift, buitenrit)
-- is uit de data niet af te leiden; dat zet de beheerder zelf op het event.
--
-- `profiles.event_type_interests` blijft ongemoeid: 'social' en 'training'
-- blijven daar geldige waarden en tellen voortaan tegen de soort van een event
-- (src/lib/events/fit.ts).

alter table public.events
  add column if not exists kind text;

alter table public.events
  drop constraint if exists events_kind_check;

alter table public.events
  add constraint events_kind_check
  check (kind is null or kind in ('training', 'social'));

update public.events
  set kind = type,
      type = 'overig'
  where type in ('social', 'training');

alter table public.events
  drop constraint if exists events_type_check;

alter table public.events
  add constraint events_type_check
  check (
    type in (
      'outdoor',
      'gran_fondo',
      'toertocht',
      'gravel_race',
      'zrl',
      'ladder',
      'flamme_rouge',
      'zwift',
      'mywhoosh',
      'omnium',
      'src',
      'overig'
    )
  );
