-- Clubverhaal: anekdotes en verhalen met foto's op de publieke pagina /verhaal
-- (wens eigenaar, 2026-10-28).
--
-- * Een lid stuurt een verhaal in bij een hoofdstuk van het clubverhaal
--   (`chapter`, de vaste hoofdstukken uit src/lib/clubverhaal/chapters.ts), met
--   hooguit zes foto's. Het bestuur plaatst het; pas dan staat het op /verhaal,
--   een pagina die ook zonder inloggen open is.
-- * Een verhaal kan bij een ZWBeker horen (`beker_id`). De beker linkt dan door
--   naar het verhaal, het verhaal naar de beker.
-- * Wie plaatst: het recht community.manage, hetzelfde als aankondigingen en
--   tips en citaten. Een eigen recht zou de check-constraint van
--   community_role_permissions vragen (zie 0254).
-- * Een ingestuurd verhaal zien alleen wie het schreef en wie plaatst. Wat
--   geplaatst is, leest de server voor /verhaal met de admin-client en een
--   expliciete filter op status; anon krijgt geen rechten op de tabellen.
-- * Wie schreef, kan het verhaal altijd weghalen, ook als het geplaatst is.
-- * Schrijven gaat alleen via de server (admin-client, na de checks in
--   src/lib/clubverhaal/server.ts), zoals ZWBekers (0286).
-- * Foto's in een eigen, besloten bucket. De server maakt de upload- en
--   leeslinks na zijn eigen check, dus ook daar geen policies.

create table if not exists public.club_stories (
  id uuid primary key default gen_random_uuid(),
  -- Wie schreef. Heet profile_id, zodat het verhaal in de data-export zit.
  -- Bij het opheffen van dat account verdwijnt het verhaal mee: het staat op
  -- een publieke pagina, en zonder de schrijver kan niemand het nog terugnemen.
  profile_id uuid references public.profiles(id) on delete cascade,
  chapter text not null check (chapter in ('basis', 'anders', 'team', 'nu')),
  title text not null check (length(btrim(title)) between 3 and 80),
  body text not null check (length(btrim(body)) between 20 and 5000),
  happened_year smallint check (happened_year is null or happened_year between 2000 and 2100),
  beker_id uuid references public.zwbekers(id) on delete set null,
  status text not null default 'ingestuurd'
    check (status in ('ingestuurd', 'geplaatst', 'teruggestuurd')),
  review_note text check (review_note is null or length(btrim(review_note)) between 1 and 500),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Geplaatst of teruggestuurd heeft een moment; een open inzending niet.
  check ((status = 'ingestuurd') = (reviewed_at is null))
);

create index if not exists club_stories_placed_idx
  on public.club_stories (chapter, happened_year, created_at) where status = 'geplaatst';
create index if not exists club_stories_open_idx
  on public.club_stories (created_at) where status = 'ingestuurd';
create index if not exists club_stories_profile_idx
  on public.club_stories (profile_id, created_at desc);
create index if not exists club_stories_beker_idx
  on public.club_stories (beker_id) where beker_id is not null;

create table if not exists public.club_story_photos (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.club_stories(id) on delete cascade,
  path text not null check (length(path) <= 300),
  caption text check (caption is null or length(btrim(caption)) between 1 and 140),
  position smallint not null default 0 check (position between 0 and 5),
  created_at timestamptz not null default now()
);

create index if not exists club_story_photos_story_idx
  on public.club_story_photos (story_id, position);

-- ──────────────────────────────────────────────────────────────────────
-- Lezen
-- ──────────────────────────────────────────────────────────────────────

alter table public.club_stories enable row level security;
alter table public.club_story_photos enable row level security;

revoke all on public.club_stories from anon, authenticated;
revoke all on public.club_story_photos from anon, authenticated;
grant select on public.club_stories to authenticated;
grant select on public.club_story_photos to authenticated;
grant all on public.club_stories to service_role;
grant all on public.club_story_photos to service_role;

drop policy if exists "club_stories_select" on public.club_stories;
create policy "club_stories_select" on public.club_stories
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.current_user_has_permission('community.manage')
  );

-- Een foto is te zien zodra het verhaal te zien is (de RLS van club_stories
-- geldt ook in deze subquery).
drop policy if exists "club_story_photos_select" on public.club_story_photos;
create policy "club_story_photos_select" on public.club_story_photos
  for select to authenticated
  using (exists (select 1 from public.club_stories s where s.id = story_id));

-- ──────────────────────────────────────────────────────────────────────
-- Foto's
-- ──────────────────────────────────────────────────────────────────────

-- Pad: <story_id>/<uploader_id>/<tijd>.jpg. Geen policies: de server maakt
-- een ondertekende uploadlink (na de check of je het verhaal mag aanpassen)
-- en ondertekende leeslinks (alleen voor geplaatste verhalen, of voor wie het
-- verhaal met RLS mag lezen).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-story-photos',
  'club-story-photos',
  false,
  10485760,
  array['image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ──────────────────────────────────────────────────────────────────────
-- Pushvoorkeuren
-- ──────────────────────────────────────────────────────────────────────

-- on_story_submitted: een nieuw verhaal, voor wie plaatst.
-- on_story_reviewed: je verhaal is geplaatst of teruggestuurd.
alter table public.notification_preferences
  add column if not exists on_story_submitted boolean not null default true,
  add column if not exists on_story_reviewed boolean not null default true;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select relname, relrowsecurity from pg_class
--  where relname in ('club_stories', 'club_story_photos');                -- twee keer true
-- select tablename, policyname, cmd from pg_policies
--  where tablename like 'club_stor%';                                    -- twee select-policies
-- select has_table_privilege('anon', 'public.club_stories', 'select');   -- false
-- select has_table_privilege('authenticated', 'public.club_stories', 'insert'); -- false
-- select public, file_size_limit from storage.buckets where id = 'club-story-photos'; -- false, 10485760
-- select column_name from information_schema.columns
--  where table_name = 'notification_preferences'
--    and column_name in ('on_story_submitted', 'on_story_reviewed');     -- twee rijen
