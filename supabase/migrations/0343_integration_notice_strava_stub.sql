-- Pop-up "je ritten via Strava komen niet binnen" (bij 0307).
--
-- Een lid met intervals.icu waarvan de ritten daar via Strava binnenkomen:
-- intervals.icu geeft zulke ritten via de API alleen als lege stub door, dus
-- mist de club ze helemaal. Zijn koppelingen tellen als in orde, dus de
-- bestaande meldingen bereiken hem niet. Nieuwe waarde `intervals-strava`;
-- die lost niet vanzelf op, maar verdwijnt als het lid hem gezien heeft
-- (src/lib/integrations/member-notices.ts).

alter table public.integration_notices
  drop constraint if exists integration_notices_integration_check;

alter table public.integration_notices
  add constraint integration_notices_integration_check
  check (integration in ('strava', 'intervals', 'telegram', 'push', 'agenda', 'live', 'intervals-strava'));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'integration_notices_integration_check';
