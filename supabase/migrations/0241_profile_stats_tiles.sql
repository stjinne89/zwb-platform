-- Stats "Ik": welke tegels een lid ziet, en in welke volgorde.
--
-- Wens eigenaar (2026-10-16): een eigen statistiekpagina waarop ieder lid kiest
-- welke tegels zichtbaar zijn, zodat voor iedereen de eigen interessantste data
-- bovenaan staat. Eén rij per lid; `tiles` is een lijst
-- [{ "id": "<tegel>", "visible": true|false }] in de gekozen volgorde. De app
-- valideert de id's tegen het tegelregister (src/lib/stats/tiles.ts) en vult
-- nieuwe tegels zelf aan, dus hier alleen de vorm.
--
-- `club_tiles` is dezelfde keuze voor /stats (Club); die pagina kreeg dezelfde
-- tegels op dezelfde dag, voordat deze migratie was toegepast.
--
-- Alleen het lid zelf leest en schrijft de eigen rij: het is een voorkeur, geen
-- gegeven waar anderen iets aan hebben.

create table if not exists public.profile_stats_tiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  tiles jsonb not null default '[]'::jsonb check (jsonb_typeof(tiles) = 'array'),
  club_tiles jsonb not null default '[]'::jsonb check (jsonb_typeof(club_tiles) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.profile_stats_tiles enable row level security;

revoke all on public.profile_stats_tiles from anon, authenticated;
grant select, insert, update, delete on public.profile_stats_tiles to authenticated;
grant all on public.profile_stats_tiles to service_role;

drop policy if exists "profile_stats_tiles_self" on public.profile_stats_tiles;
create policy "profile_stats_tiles_self" on public.profile_stats_tiles
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
