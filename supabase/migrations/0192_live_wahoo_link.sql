-- Live volgen via de vaste Wahoo-link ("Share Forever").
--
-- De ELEMNT-app stuurt geen LiveTrack-mail naar een adres; hij geeft één vaste
-- link die altijd de huidige of laatste rit toont. Een lid plakt die link op
-- /live. Opent iemand een live-pagina, dan kijkt src/lib/live/external-refresh.ts
-- hooguit elke 3 minuten per link of er een rit loopt (keuze eigenaar
-- 2026-09-28: alleen bij kijken, geen cron).
--
-- De link is een blijvend geheim: wie hem heeft, volgt het lid bij elke rit.
-- Hij staat daarom alleen hier (RLS: alleen de eigen rij), niet in
-- live_sessions.external_track_url, dat andere leden en de publieke eventpagina
-- zien. De sessie wijst via tracker_token_id naar de link.

alter table public.live_tracker_tokens
  add column if not exists external_url text,
  add column if not exists last_checked_at timestamptz;

alter table public.live_tracker_tokens
  drop constraint if exists live_tracker_tokens_provider_check;
alter table public.live_tracker_tokens
  add constraint live_tracker_tokens_provider_check
    check (provider in ('owntracks', 'mail', 'wahoo_link'));

alter table public.live_tracker_tokens
  drop constraint if exists live_tracker_tokens_external_url_check;
alter table public.live_tracker_tokens
  add constraint live_tracker_tokens_external_url_check
    check (
      provider <> 'wahoo_link'
      or external_url ~ '^https://(www\.)?wahooligan\.com/users/live/[A-Za-z0-9_-]{10,64}$'
    );

create index if not exists live_tracker_tokens_wahoo_idx
  on public.live_tracker_tokens (profile_id)
  where provider = 'wahoo_link' and enabled and revoked_at is null;

alter table public.live_sessions
  add column if not exists tracker_token_id uuid
    references public.live_tracker_tokens(id) on delete set null;

notify pgrst, 'reload schema';
