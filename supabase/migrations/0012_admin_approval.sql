-- Admin moet nieuwe registraties goedkeuren voordat ze toegang krijgen.
-- Bestaande gebruikers worden auto-goedgekeurd zodat niemand wordt buitengesloten.

alter table public.profiles
  add column if not exists is_approved boolean not null default false,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null;

-- Goedkeur alle bestaande profielen.
update public.profiles
set
  is_approved = true,
  approved_at = coalesce(approved_at, now())
where is_approved = false;

create index if not exists profiles_pending_idx
  on public.profiles (created_at)
  where is_approved = false;
