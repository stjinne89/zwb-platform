-- Livestreams via YouTube: een eigen stream aan een race koppelen (2026-11-24).
--
-- Wens eigenaar: een lid met een eigen YouTube-stream plakt de link bij de
-- race, zonder dat ZWB de uitzending maakt. event_streams.source zegt wie de
-- uitzending maakte:
-- - 'zwb': klaargezet via de app (0338); ZWB mag de thumbnail zetten en een
--   uitzending vóór de start ook op YouTube wissen.
-- - 'eigen': gekoppeld met een link; de video blijft helemaal van het lid. ZWB
--   zet er geen thumbnail op en wist hem nooit op YouTube.
-- Bestaande rijen zijn 'zwb'.
--
-- Vereist 0338. Geen clubdata, geen persoonsgegevens.

alter table public.event_streams
  add column if not exists source text not null default 'zwb';

alter table public.event_streams drop constraint if exists event_streams_source_check;

alter table public.event_streams
  add constraint event_streams_source_check check (source in ('zwb', 'eigen'));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select source, count(*) from public.event_streams group by 1;
