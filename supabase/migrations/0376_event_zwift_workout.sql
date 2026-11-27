-- De workout van een gekoppelde Zwift-groepstraining, samengevat.
--
-- Een `GROUP_WORKOUT` op Zwift verwijst per subgroep naar een workoutbestand
-- (`customUrl`, ZWO-XML op cdn.zwift.com). Het schema rekende zo'n event tot nu
-- toe als een uur tempo op 80-90%. Nu leest de app de workout zelf en zet hij
-- de echte duur en het belastingsgelijke vermogen in het eventblok; aanleiding
-- is de gezamenlijke ZWB-warming-up vóór de ZRL (2026-11-27).
--
-- Vorm: {"name": text, "seconds": int, "pct": int, "url": text}. `pct` is het
-- kwadratisch gemiddelde vermogen in %FTP (zie lib/zwift/zwo.ts). Wordt gevuld
-- bij het opslaan van het event en elk uur ververst door de trainingscron, zodat
-- een aangepaste workout vanzelf doorkomt. Leeg: geen groepstraining of het
-- bestand was niet te lezen; het eventblok valt dan terug op de schatting.

alter table public.events
  add column if not exists zwift_workout jsonb;
