-- Media: Instagram posts from the official Meta/Instagram API.

alter table public.media_items
  drop constraint if exists media_items_kind_check;

alter table public.media_items
  add constraint media_items_kind_check
  check (kind in ('mededeling','nieuwsbrief','podcast','video','artikel','instagram'));
