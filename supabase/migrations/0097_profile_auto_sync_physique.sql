-- Opt-in: FTP en gewicht bijhouden vanuit intervals.icu in plaats van handmatig.
-- Leden vroegen hierom omdat ze eFTP en gewicht al in intervals bijhouden en de
-- handmatige waarde in ZWB daardoor verouderde. Bewust opt-in: aan staan betekent
-- dat een sync de handmatig ingevulde waarden overschrijft, en de FTP stuurt de
-- targetwatts van gepubliceerde workouts.

alter table public.profiles
  add column if not exists auto_sync_physique boolean not null default false;

-- Forceer een PostgREST schema-cache reload, zodat de kolom direct beschikbaar is.
notify pgrst, 'reload schema';
