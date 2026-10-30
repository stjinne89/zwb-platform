-- App-updates: elke week kort wat er nieuw is en wat er opgelost is, op
-- /updates en als pop-up vanaf donderdag 17:00 (wens eigenaar, 2026-10-30).
--
-- * Eén update per week (`week_start`, de maandag). Verschijnen doet hij op
--   `publish_at`, de donderdag van die week om 17:00 Nederlandse tijd; de
--   server rekent dat uit (src/lib/app-updates/schedule.ts). Zo kan de update
--   eerder klaarstaan zonder dat leden hem al zien, en hoeft er geen deploy
--   voor.
-- * Wie schrijft: het recht notifications.broadcast, hetzelfde als een
--   pushbericht aan alle leden. Een eigen recht zou de check-constraint van
--   community_role_permissions vragen (zie 0254).
-- * Lezen: elk ingelogd lid, zodra publish_at voorbij is; wie schrijft ziet
--   ook wat nog klaarstaat. Schrijven via de gewone client, de policy checkt
--   het recht.
-- * Geen persoonsgegevens, dus niet in de data-export.

create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique check (extract(isodow from week_start) = 1),
  publish_at timestamptz not null,
  -- De korte tekst in de pop-up.
  summary text not null check (length(btrim(summary)) between 10 and 400),
  -- Eén regel per punt.
  changes text[] not null default '{}',
  fixes text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(changes) + cardinality(fixes) between 1 and 30)
);

create index if not exists app_updates_publish_idx on public.app_updates (publish_at desc);

alter table public.app_updates enable row level security;

revoke all on public.app_updates from anon, authenticated;
grant select, insert, update, delete on public.app_updates to authenticated;
grant all on public.app_updates to service_role;

drop policy if exists "app_updates_select" on public.app_updates;
create policy "app_updates_select" on public.app_updates
  for select to authenticated
  using (
    publish_at <= now()
    or public.current_user_has_permission('notifications.broadcast')
  );

drop policy if exists "app_updates_write" on public.app_updates;
create policy "app_updates_write" on public.app_updates
  for all to authenticated
  using (public.current_user_has_permission('notifications.broadcast'))
  with check (public.current_user_has_permission('notifications.broadcast'));
