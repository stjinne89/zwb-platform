-- Media-tab: één tabel voor mededelingen, nieuwsbrieven, podcasts, video's,
-- artikelen. Per item kan een admin meerdere platform-URLs invullen (Apple,
-- Spotify, RSS, YouTube, web) zodat een lid via z'n favoriete app kan openen.

create table public.media_items (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (
    kind in ('mededeling','nieuwsbrief','podcast','video','artikel')
  ),
  title text not null,
  body_md text,
  apple_url text,
  spotify_url text,
  rss_url text,
  youtube_url text,
  web_url text,
  cover_url text,
  pinned boolean not null default false,
  author_id uuid not null references public.profiles(id) on delete restrict,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index media_items_published_idx
  on public.media_items (published_at desc);
create index media_items_pinned_idx
  on public.media_items (pinned desc, published_at desc);
create index media_items_kind_idx
  on public.media_items (kind, published_at desc);

alter table public.media_items enable row level security;

create policy "media_select_authenticated" on public.media_items
  for select to authenticated using (true);

create policy "media_admin_write" on public.media_items
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
    and auth.uid() = author_id
  );

-- Eénmalig: migreer bestaande announcements naar media_items als mededeling.
-- Idempotent: skip rijen die we eerder al gemigreerd hebben.
insert into public.media_items (kind, title, body_md, pinned, author_id, published_at, created_at)
select 'mededeling', a.title, a.body_md, a.pinned, a.author_id, a.created_at, a.created_at
from public.announcements a
where not exists (
  select 1 from public.media_items mi
  where mi.kind = 'mededeling'
    and mi.title = a.title
    and mi.author_id = a.author_id
);
