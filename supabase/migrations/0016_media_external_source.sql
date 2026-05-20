-- Voor automatische import van media uit YouTube / Spotify / RSS:
-- houd bij waar een item vandaan komt + welke externe ID het heeft,
-- zodat re-syncs idempotent zijn (geen duplicaten bij re-import).

alter table public.media_items
  add column if not exists external_id text,
  add column if not exists source text;

create unique index if not exists media_items_external_unique_idx
  on public.media_items (source, external_id)
  where external_id is not null;
