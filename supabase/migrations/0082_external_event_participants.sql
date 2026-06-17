-- ZWB-deelnemers die via beheer aan externe kalenderconcepten zijn gekoppeld.

create table if not exists public.external_event_participants (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.external_event_candidates(id) on delete cascade,
  source text not null check (source in ('zwiftpower_text', 'manual')),
  external_name text not null,
  category text,
  profile_id uuid references public.profiles(id) on delete set null,
  raw_text text,
  matched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists external_event_participants_candidate_idx
  on public.external_event_participants (candidate_id);
create index if not exists external_event_participants_profile_idx
  on public.external_event_participants (profile_id);
create unique index if not exists external_event_participants_unique_idx
  on public.external_event_participants (
    candidate_id,
    lower(external_name),
    coalesce(category, '')
  );

alter table public.external_event_participants enable row level security;

-- Alleen server-side beheeracties lezen/schrijven deze tabel via service-role.
