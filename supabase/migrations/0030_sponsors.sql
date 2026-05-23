-- Sponsorzone + ledenvoordeel.
--
-- Twee aparte entiteiten met losse koppeling: een benefit kan optioneel
-- bij een sponsor horen (kortingscode bij bike-shop X), maar kan ook
-- losstaand zijn (lokale bakker zonder sponsorovereenkomst).
--
-- RLS:
--   sponsors          → publiek leesbaar mits active=true (homepage + /sponsors zonder login)
--   member_benefits   → alleen ingelogde leden zien actieve voordelen
--   beide             → schrijven via server-action met admin-client + permission-check

-- ──────────────────────────────────────────────────────────────────────
-- Sponsor tiers — gespiegeld aan de huidige indeling op zwbcycling.nl
-- ──────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_type where typname = 'sponsor_tier') then
    create type public.sponsor_tier as enum (
      'hoofd',   -- Hoofdsponsor (groot bovenaan)
      'sub',     -- Sub-sponsor (rij eronder)
      'team',    -- Team sponsor (grid)
      'web',     -- Web/technical sponsor
      'vriend'   -- Vriend van ZWB (klein onderaan, voor losse contributies)
    );
  end if;
end$$;

-- ──────────────────────────────────────────────────────────────────────
-- Tabellen
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website_url text,
  description_md text,
  tier public.sponsor_tier not null default 'team',
  display_order int not null default 100,
  contact_email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists sponsors_tier_order_idx
  on public.sponsors (tier, display_order);

create table if not exists public.member_benefits (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references public.sponsors(id) on delete set null,
  title text not null,
  description_md text,
  discount_code text,
  redeem_url text,
  valid_from date,
  valid_until date,
  active boolean not null default true,
  display_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists member_benefits_active_order_idx
  on public.member_benefits (active, display_order);

-- ──────────────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────────────

alter table public.sponsors enable row level security;
alter table public.member_benefits enable row level security;

drop policy if exists "sponsors_public_read" on public.sponsors;
create policy "sponsors_public_read" on public.sponsors
  for select to public using (active);

drop policy if exists "sponsors_admin_read_inactive" on public.sponsors;
create policy "sponsors_admin_read_inactive" on public.sponsors
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

-- Voordelen zijn alleen voor ingelogde leden zichtbaar. Niet-leden
-- zien de sponsors wel maar niet de kortingscodes — dat is logisch:
-- het is "ledenvoordeel", niet "wereldvoordeel".
drop policy if exists "member_benefits_members_read" on public.member_benefits;
create policy "member_benefits_members_read" on public.member_benefits
  for select to authenticated using (active);

drop policy if exists "member_benefits_admin_read_inactive" on public.member_benefits;
create policy "member_benefits_admin_read_inactive" on public.member_benefits
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

-- Writes voor beide tabellen lopen via server-actions met service-role-client.
-- Geen direct-write policies → veilig dichtgetimmerd.

-- ──────────────────────────────────────────────────────────────────────
-- Storage bucket voor logo's
-- ──────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('sponsors', 'sponsors', true)
on conflict (id) do nothing;

drop policy if exists "sponsors_logo_public_read" on storage.objects;
create policy "sponsors_logo_public_read" on storage.objects
  for select to public using (bucket_id = 'sponsors');

-- Upload via app gebeurt vanuit de admin-action met service-role,
-- dus storage-writes via authenticated users zijn niet nodig. We
-- staan ze niet expliciet toe.

-- ──────────────────────────────────────────────────────────────────────
-- Permissions: nieuwe 'sponsors.manage' permission
-- ──────────────────────────────────────────────────────────────────────

alter table public.community_role_permissions
  drop constraint if exists community_role_permissions_allowed;

alter table public.community_role_permissions
  add constraint community_role_permissions_allowed
  check (
    permissions <@ array[
      'events.create',
      'events.manage_all',
      'teams.create',
      'teams.manage_roster',
      'teams.manage_results',
      'teams.sync_sources',
      'content.create_posts',
      'content.moderate_posts',
      'media.manage',
      'community.manage',
      'members.approve',
      'members.manage_roles',
      'roles.manage_permissions',
      'achievements.finalize',
      'live.start',
      'live.manage',
      'sponsors.manage'
    ]::text[]
  );

-- Bestaande rollen krijgen 'sponsors.manage' waar dat past:
-- board → altijd (alles), community_manager → expliciet toegevoegd.
update public.community_role_permissions
set permissions = array_append(permissions, 'sponsors.manage')
where role in ('board', 'community_manager')
  and not ('sponsors.manage' = any(permissions));

-- ──────────────────────────────────────────────────────────────────────
-- Seed: huidige sponsors van zwbcycling.nl/sponsors
-- ──────────────────────────────────────────────────────────────────────

insert into public.sponsors (
  name, slug, website_url, description_md, tier, display_order
)
values
  ('Haga Rubbers', 'haga-rubbers',
   'https://www.hagerubbers-shop.nl/',
   'Kwaliteit voor afdichting van kozijnen en deuren (diverse materialen).',
   'hoofd', 10),
  ('RSC Corp. Recruiters', 'rsc-corp-recruiters',
   'https://www.rsc.nl/',
   'Recruitment van technische professionals in bouw, infra, installatie en engineering.',
   'sub', 20),
  ('SPOTR', 'spotr',
   'https://www.spotr.ai',
   'Inspectie van vastgoedportefeuilles met AI.',
   'team', 30),
  ('JeKa Technisch Projectmanagement', 'jeka-projectmanagement',
   'https://jekaprojectmanagement.nl/',
   'Uitzonderlijk project- en interim management in de industriële sector.',
   'team', 31),
  ('Kalas', 'kalas',
   'https://www.kalas.nl/',
   'Wielerkleding-partner van ZWB Cycling vanaf 2026.',
   'team', 32),
  ('NexReply', 'nexreply',
   'https://www.nexreply.nl/nl',
   'Digitaliseren van logistiek- en communicatie-oplossingen, gedreven door AI.',
   'team', 33),
  ('A-Lourens Interim', 'a-lourens-interim',
   null,
   null,
   'team', 34),
  ('KP Design', 'kp-design',
   'https://www.kp-design.nl/',
   'Goede digitale entree (website, app en webshop).',
   'web', 40)
on conflict (slug) do nothing;

-- ──────────────────────────────────────────────────────────────────────
-- updated_at-triggers (consistent met de rest van de schema)
-- ──────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at_sponsors()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists sponsors_updated_at on public.sponsors;
create trigger sponsors_updated_at
  before update on public.sponsors
  for each row execute function public.set_updated_at_sponsors();

drop trigger if exists member_benefits_updated_at on public.member_benefits;
create trigger member_benefits_updated_at
  before update on public.member_benefits
  for each row execute function public.set_updated_at_sponsors();
