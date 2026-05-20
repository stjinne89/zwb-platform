-- Materiaalzone: markdown-posts met categorieën, tags, likes en comments.

create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  category text not null check (
    category in ('voeding','materiaal','training','race-craft','regelgeving','routes','algemeen')
  ),
  body_md text not null,
  excerpt text,
  tags text[] not null default '{}',
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.posts (category, created_at desc);
create index on public.posts using gin (tags);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table public.post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);

create index on public.post_comments (post_id, created_at);

-- ---------- RLS ----------

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

-- posts: alle leden lezen; iedereen schrijft eigen; auteur of admin update/verwijdert.
create policy "posts_select_authenticated" on public.posts
  for select to authenticated using (true);

create policy "posts_insert_own" on public.posts
  for insert to authenticated with check (auth.uid() = author_id);

create policy "posts_update_own_or_admin" on public.posts
  for update to authenticated
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

create policy "posts_delete_own_or_admin" on public.posts
  for delete to authenticated
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- likes: lezen voor allen; eigen rij beheren.
create policy "likes_select_authenticated" on public.post_likes
  for select to authenticated using (true);

create policy "likes_self_write" on public.post_likes
  for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- comments: lezen voor allen; auteur schrijft; auteur of admin verwijdert.
create policy "comments_select_authenticated" on public.post_comments
  for select to authenticated using (true);

create policy "comments_insert_own" on public.post_comments
  for insert to authenticated with check (auth.uid() = author_id);

create policy "comments_delete_own_or_admin" on public.post_comments
  for delete to authenticated
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

-- Auto-update updated_at on posts.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();
