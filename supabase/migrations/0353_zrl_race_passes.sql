-- WTRL-racepass per team per racedatum (2026-11-23).
--
-- 0186 bewaarde één pass per team per ronde, maar de racekalender op
-- zwbcycling.nl heeft voor elke race een andere link. Na een race bleef de
-- racepagina daardoor de pass van die race tonen.
--
-- `source` zegt waar `url` vandaan komt: 'site' volgt de racekalender, 'manual'
-- is met de hand gezet en wordt door de import niet overschreven. `site_url` is
-- de laatst op de site gelezen link, zodat het beheer een verschil kan tonen.
--
-- team_racepasses blijft nog staan, zodat de huidige deploy blijft werken tot de
-- nieuwe code live is. Hij wordt niet meer gelezen en kan daarna weg.

create table if not exists public.zrl_race_passes (
  team_id uuid not null references public.teams(id) on delete cascade,
  race_date date not null,
  url text not null check (url ~ '^https://'),
  source text not null default 'manual' check (source in ('site', 'manual')),
  site_url text check (site_url is null or site_url ~ '^https://'),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (team_id, race_date)
);

create index if not exists zrl_race_passes_date_idx
  on public.zrl_race_passes (race_date);

alter table public.zrl_race_passes enable row level security;

revoke all on public.zrl_race_passes from anon, authenticated;
grant select on public.zrl_race_passes to authenticated;
grant all on public.zrl_race_passes to service_role;

drop policy if exists "zrl_race_passes_read" on public.zrl_race_passes;
create policy "zrl_race_passes_read" on public.zrl_race_passes
  for select to authenticated
  using (true);

-- Eén rij met de uitkomst van de laatste import, alleen voor het beheer.
create table if not exists public.zrl_racepass_import_status (
  id boolean primary key default true check (id),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text
);

alter table public.zrl_racepass_import_status enable row level security;

revoke all on public.zrl_racepass_import_status from anon, authenticated;
grant all on public.zrl_racepass_import_status to service_role;

-- De passes van ronde 2 horen bij de race van 24 november: die zijn op
-- 2026-11-23 voor die race ingevuld. Als 'manual', zodat een afwijking van de
-- site zichtbaar wordt in plaats van stilletjes vervangen. Gelijke links zet de
-- eerste import op 'site'. Ronde 4 gaat bewust niet mee: daar staan sinds
-- 2026-10-12 de links van ronde 1, race 4.
insert into public.zrl_race_passes (team_id, race_date, url, source, created_by, updated_at)
select team_id, date '2026-11-24', url, 'manual', created_by, updated_at
from public.team_racepasses
where season = '2026/27' and round = 2
on conflict (team_id, race_date) do nothing;
