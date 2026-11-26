-- TV koppelen (2026-11-26): de browser van een tv toont het streamcenter van
-- vanavond zonder dat iemand op de tv inlogt. De tv toont een code; een
-- ingelogd lid keurt die goed op de telefoon; de tv krijgt een eigen sleutel in
-- een cookie die alleen /tv opent. Zie docs/streamcenter-tv-onderzoek.md.
--
-- Beide geheimen staan alleen als sha256-hash: niemand hoeft ze later terug te
-- zien, anders dan het agenda-abonnement (0236). Schrijven gaat met de
-- service-rol (de tv is niet ingelogd); een lid ziet en verwijdert alleen de
-- eigen tv's.

-- Een wachtende tv. code: wat de tv toont (zes tekens). wait_hash: het geheim
-- in de cookie van die tv, zodat alleen de tv die de code toont de sleutel
-- krijgt. profile_id: wie de code goedkeurde; leeg tot dan. Na tien minuten
-- verlopen; de app ruimt oude rijen op bij een nieuwe code.
create table if not exists public.tv_pair_codes (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  wait_hash text not null unique,
  profile_id uuid references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.tv_pair_codes enable row level security;
-- Geen policies en geen rechten: alleen de service-rol.
revoke all on public.tv_pair_codes from anon, authenticated;
grant all on public.tv_pair_codes to service_role;

-- Een gekoppelde tv. key_hash: de sleutel in de cookie van de tv. Kijkt hij
-- negentig dagen niet, dan vervalt hij (de app weigert en verwijdert hem).
create table if not exists public.tv_devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists tv_devices_profile_idx on public.tv_devices (profile_id);

alter table public.tv_devices enable row level security;

drop policy if exists "tv_devices_select_own" on public.tv_devices;
create policy "tv_devices_select_own" on public.tv_devices
  for select to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "tv_devices_delete_own" on public.tv_devices;
create policy "tv_devices_delete_own" on public.tv_devices
  for delete to authenticated
  using ((select auth.uid()) = profile_id);

-- De sleutel is geheim, ook voor het lid zelf: lezen zonder key_hash.
revoke all on public.tv_devices from anon, authenticated;
grant select (id, profile_id, created_at, last_seen_at) on public.tv_devices to authenticated;
grant delete on public.tv_devices to authenticated;
grant all on public.tv_devices to service_role;

-- Controle na het toepassen:
-- select grantee, privilege_type, column_name from information_schema.column_privileges
--   where table_name = 'tv_devices' and grantee = 'authenticated';
