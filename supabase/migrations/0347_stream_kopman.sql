-- Livestreams via YouTube: een eigen kopman per lid voor de streamstijl Strip
-- (2026-11-20).
--
-- Wens eigenaar: bij Strip stelt een lid een eigen getekende renner samen, in
-- de stijl van de renners uit Kopman, als man of vrouw. De figuur hoort bij het
-- profiel en staat op de overlay en de thumbnail van elke eigen stream in
-- Strip. Zonder rij blijft Strip zoals het was.
--
-- `look` is een klein json-object (soort, huid, kapsel, haarkleur,
-- gezichtshaar, bril), gecontroleerd in de server action
-- (lib/youtube-live/kopman.ts). Tenue en helm komen altijd uit de clubkleuren
-- en staan hier niet in.
--
-- Het lid leest de eigen rij; schrijven alleen via de service-role, na de
-- controle in de server action. De overlay en de thumbnail lezen via de
-- service-role.
--
-- Vereist 0338. Geen ZWB-data, geen persoonsgegevens (installatie.md §7).

create table if not exists public.stream_kopman (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  look jsonb not null,
  updated_at timestamptz not null default now(),
  constraint stream_kopman_look_object check (jsonb_typeof(look) = 'object')
);

alter table public.stream_kopman enable row level security;

revoke all on public.stream_kopman from anon, authenticated;
grant select on public.stream_kopman to authenticated;
grant all on public.stream_kopman to service_role;

drop policy if exists "stream_kopman_select_own" on public.stream_kopman;
create policy "stream_kopman_select_own" on public.stream_kopman
  for select to authenticated
  using (profile_id = (select auth.uid()));

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select policyname, cmd from pg_policies where tablename = 'stream_kopman';
-- select count(*) from public.stream_kopman;
