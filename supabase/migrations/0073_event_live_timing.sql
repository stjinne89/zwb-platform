-- Aparte bron voor live timing. `results_url` blijft uitsluitend bedoeld voor
-- de definitieve uitslag; deze URL wordt tijdens het event op /live gescrapet.

alter table public.events
  add column if not exists live_timing_url text;
