-- Berichten naar de fietscomputer tijdens een rit (2026-10-19).
--
-- Een organisator stuurt vanuit de eventchat een bericht naar de rijders; een
-- lid stuurt vanaf Samen fietsen een bericht naar iemand die live rijdt. Het
-- bericht gaat als pushmelding (die toont een Garmin via de telefoon) en via
-- Telegram. Telegram is er voor Wahoo: de ELEMNT toont alleen meldingen van sms,
-- WhatsApp, Telegram, Signal, Line en WeChat, niet van een web-app.
--
-- * on_ride_message: één voorkeur voor beide kanalen. Ontbreekt de rij, dan
--   geldt aan (zoals de andere voorkeuren).
-- * telegram_links: per lid één Telegram-chat. Het lid maakt een eenmalige
--   koppellink (alleen de hash staat hier, 30 minuten geldig); de bot vult
--   chat_id als die /start met dat token ontvangt. Schrijven gaat alleen via de
--   server (service role): een lid mag geen chat_id van een ander invullen.
-- * event_chat_messages.to_riders: markeert in de chat welk bericht ook naar de
--   fietscomputers ging.

alter table public.notification_preferences
  add column if not exists on_ride_message boolean not null default true;

create table if not exists public.telegram_links (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  chat_id bigint unique,
  link_token_hash text unique,
  link_token_expires_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.telegram_links enable row level security;

drop policy if exists "telegram_links_own_select" on public.telegram_links;
create policy "telegram_links_own_select" on public.telegram_links
  for select to authenticated
  using (auth.uid() = profile_id);

drop policy if exists "telegram_links_own_delete" on public.telegram_links;
create policy "telegram_links_own_delete" on public.telegram_links
  for delete to authenticated
  using (auth.uid() = profile_id);

alter table public.event_chat_messages
  add column if not exists to_riders boolean not null default false;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select column_name from information_schema.columns
--   where table_name in ('notification_preferences', 'event_chat_messages')
--   and column_name in ('on_ride_message', 'to_riders');
-- select tablename, rowsecurity from pg_tables where tablename = 'telegram_links';
