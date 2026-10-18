-- ZWB DS: meer van de spelersstatus bewaren (zie 0249 en docs/zwb-ds-spike.md).
--
-- Cadans, draft, rijtijd, arbeid en geklommen meters staan in hetzelfde
-- antwoord van Zwift als afstand en vermogen; ze kosten geen extra verzoek.
-- Uit arbeid en rijtijd volgt het gemiddelde vermogen sinds de start. Nog
-- steeds geen hartslag. Wist na zes uur, net als de rest van de rij.

alter table public.zwb_ds_rider_states
  add column if not exists cadence_rpm smallint,
  add column if not exists draft integer,
  add column if not exists elapsed_s integer,
  add column if not exists kj real,
  add column if not exists climbing_m integer;
