-- Teamplanning voor de Sunday Race Club (fase 2, 2026-09-30).
--
-- Bij de SRC rijdt een team de hele maand onder dezelfde teamnaam, met 3 tot 5
-- renners uit dezelfde categorie, en een renner wisselt niet halverwege de maand
-- van team. De categorie deelt MyWhoosh zelf in. ZWB stelt dus niets op; het
-- legt per maand vast wie onder welke teamnaam rijdt (src_month_entries), en per
-- zondag wie kan (team_event_availability op het zondag-hoofdevent, 0068).
--
-- Schrijven in src_month_entries gebeurt alleen met de service-role, na de
-- permissiecheck in de server-action. Leden lezen alles.

-- Teamtype 'src'. De oude check gaat er op zijn definitie uit en niet op zijn
-- naam: de check uit 0001 is naamloos.
do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'teams'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%type%'
      and pg_get_constraintdef(con.oid) ilike '%ladder%'
  loop
    execute format('alter table public.teams drop constraint %I', v_constraint);
  end loop;
end;
$$;

alter table public.teams
  add constraint teams_type_check
    check (type in ('zrl', 'ladder', 'social', 'outdoor', 'src'));

-- De naam waaronder het team bij MyWhoosh staat. Uniek, hoofdletters tellen niet.
alter table public.teams
  add column if not exists mywhoosh_team_name text;

create unique index if not exists teams_mywhoosh_team_name_idx
  on public.teams (lower(mywhoosh_team_name))
  where mywhoosh_team_name is not null;

create table if not exists public.src_month_entries (
  month date not null check (extract(day from month) = 1),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  race text not null check (race in ('men', 'women')),
  -- De categorie waarin het lid verwacht te rijden; MyWhoosh beslist.
  category int check (category is null or category between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Eén team per lid per maand.
  primary key (month, profile_id)
);

create index if not exists src_month_entries_team_idx
  on public.src_month_entries (team_id, month);

alter table public.src_month_entries enable row level security;

drop policy if exists "src_month_entries_read" on public.src_month_entries;
create policy "src_month_entries_read" on public.src_month_entries
  for select to authenticated using (true);

notify pgrst, 'reload schema';
