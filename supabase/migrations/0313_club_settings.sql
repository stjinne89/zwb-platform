-- Clubinstellingen en modules: fase 1 van de generieke versie voor andere clubs
-- (docs/multi-club-ontwerp.md, besluit eigenaar 2026-11-09).
--
-- Elke club krijgt een eigen installatie van dezelfde code. Wat per club
-- verschilt, staat hier in plaats van in de code: de naam en het contact
-- (club_settings, één rij) en welke modules aan staan en hoe ze heten
-- (club_modules). Het register van de modules zelf staat in src/lib/modules.ts.
--
-- Een module zonder rij hier staat aan. Een sleutel die de code niet kent, wordt
-- genegeerd. Daarom geen check-constraint op module_key: een nieuwe module vraagt
-- dan geen migratie.
--
-- Lezen mag iedereen, ook anon: de publieke pagina's (inloggen, /live, /omnium)
-- tonen de naam en moeten weten of hun module aan staat. Er staat niets geheims
-- in; sleutels en wachtwoorden blijven env. Schrijven alleen de server met de
-- service role, na de controle op roles.manage_permissions (/beheer/modules).
--
-- ZWB krijgt hier zijn huidige waarden en alle modules aan, dus voor de leden
-- verandert er niets. Het Zwift-club-ID staat bewust niet hier: dat is een
-- env-waarde, en die mag niet letterlijk in de repo (Netlify secrets-scan).

create table if not exists public.club_settings (
  -- Altijd één rij: de primaire sleutel kan alleen true zijn.
  id boolean primary key default true check (id),
  name text not null,
  short_name text not null,
  member_noun text,
  member_noun_plural text,
  contact_email text,
  website_url text,
  instagram_handle text,
  youtube_handle text,
  setup_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.club_modules (
  module_key text primary key,
  enabled boolean not null default true,
  -- Eigen naam van de module bij deze club; leeg = de neutrale naam uit de code.
  label text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.club_settings enable row level security;
alter table public.club_modules enable row level security;

revoke all on public.club_settings from anon, authenticated;
revoke all on public.club_modules from anon, authenticated;
grant select on public.club_settings to anon, authenticated;
grant select on public.club_modules to anon, authenticated;
grant all on public.club_settings to service_role;
grant all on public.club_modules to service_role;

drop policy if exists "club_settings_select" on public.club_settings;
create policy "club_settings_select" on public.club_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "club_modules_select" on public.club_modules;
create policy "club_modules_select" on public.club_modules
  for select to anon, authenticated
  using (true);

-- ZWB, de eerste club. Ingericht, want de app draait al.
insert into public.club_settings (
  id, name, short_name, member_noun, member_noun_plural, contact_email, website_url,
  instagram_handle, youtube_handle, setup_completed_at
) values (
  true, 'ZWB Cycling', 'ZWB', 'ZWB''er', 'ZWB''ers', 'info@zwbcycling.nl',
  'https://zwbcycling.nl', 'zwb_cycling', 'zwbcycling', now()
)
on conflict (id) do nothing;

-- De ZWB-namen van de modules die een merknaam dragen. De rest houdt de
-- neutrale naam. Alles aan.
insert into public.club_modules (module_key, enabled, label) values
  ('training', true, 'ZWBeter Worden'),
  ('bibliotheek', true, 'ZWBieb'),
  ('bekers', true, 'ZWBekers'),
  ('segmenten', true, 'ZWB Segments'),
  ('blokkenjacht', true, 'ZWBlokken'),
  ('rennersniveau', true, 'ZWBriljant'),
  ('live_race', true, 'ZWB DS'),
  ('omnium', true, 'ZWB Omnium'),
  ('managerspel', true, 'ZWBgame'),
  ('voorspelspel', true, 'voorZpWelBokaal')
on conflict (module_key) do nothing;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select * from public.club_settings;
-- select module_key, enabled, label from public.club_modules order by module_key;
-- select tablename, policyname, roles, cmd from pg_policies
--   where tablename in ('club_settings', 'club_modules');
