-- Geslacht op het profiel, en een klachtenlogboek.
--
-- Waarom klachten en geen cyclusfase: fase-effecten op prestatie zijn in de
-- literatuur inconsistent en zwak onderbouwd, terwijl klachtenlast wél
-- samenhangt met ervaren belastbaarheid en gemiste sessies. Bovendien heeft een
-- deel van de leden door hormonale anticonceptie geen natuurlijke cyclus, en
-- dan is een faseberekening betekenisloos. Zie docs/training-en-cyclus.md.

-- 1. Geslacht. Vervangt het afleiden uit zrl_division — dat is een
--    wedstrijdklasse (open/women), geen fysiologie.
alter table public.profiles
  add column if not exists sex text
    check (sex is null or sex in ('man', 'vrouw', 'zeg_ik_liever_niet'));

-- 2. Opt-in voor het logboek. Zonder expliciete keuze tonen we het niet en
--    rekent er niets mee.
alter table public.profiles
  add column if not exists symptom_tracking_enabled boolean not null default false;

-- 3. Het logboek zelf. Eén rij per dag. Is die dag de eerste dag van de
--    menstruatie, dan vinkt het lid cycle_start aan; daaruit volgt de
--    cycluslengte vanzelf, zonder aparte tabel.
--
--    Dit is gezondheidsdata in de zin van artikel 9 AVG: eigen tabel, strikte
--    RLS, en de trainer ziet hier niets van.
create table if not exists public.symptom_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null,
  -- 1 = geen last, 5 = veel last. Null = alleen een cyclusmarkering.
  severity int check (severity is null or severity between 1 and 5),
  symptoms text[] not null default '{}',
  cycle_start boolean not null default false,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists symptom_logs_profile_date_idx
  on public.symptom_logs (profile_id, log_date);

alter table public.symptom_logs enable row level security;

-- Alleen het lid zelf. Geen uitzondering voor beheerders of trainers: wie dit
-- wil delen, deelt het buiten de app om.
drop policy if exists "symptom_logs_own_all" on public.symptom_logs;
create policy "symptom_logs_own_all" on public.symptom_logs
  for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

notify pgrst, 'reload schema';
