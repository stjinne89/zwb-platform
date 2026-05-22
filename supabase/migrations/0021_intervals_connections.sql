-- intervals.icu koppeling per gebruiker.
-- Voor nu: persoonlijke API-key (Basic Auth). Later vervangbaar door
-- OAuth2 access_token zodra intervals.icu de OAuth-app heeft goedgekeurd.

create table if not exists public.intervals_connections (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  athlete_id text,           -- intervals.icu athlete-id (bv. "i12345")
  athlete_name text,
  api_key text not null,     -- per-user API-key
  scope text default 'ACTIVITY:READ,WELLNESS:READ',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.intervals_connections enable row level security;

-- Iedere user kan alleen z'n eigen connection lezen + schrijven.
create policy "intervals_connections_self_read" on public.intervals_connections
  for select to authenticated using (auth.uid() = profile_id);

create policy "intervals_connections_self_write" on public.intervals_connections
  for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- updated_at automatisch bijhouden.
create or replace function public.touch_intervals_connections_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_intervals_connections on public.intervals_connections;
create trigger touch_intervals_connections
  before update on public.intervals_connections
  for each row execute function public.touch_intervals_connections_updated_at();
