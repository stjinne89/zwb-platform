-- Community: curated lijst van WhatsApp-groepen + announcements-feed.
-- We "omarmen" WhatsApp (waar de community al actief is) en voegen alleen
-- discoverability + ZWB-brede announcements toe.

create table public.whatsapp_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  category text check (
    category is null or category in (
      'algemeen','bestuur','zrl','ladder','outdoor','klassiekers','social','training','overig'
    )
  ),
  invite_url text not null check (invite_url ~* '^https://chat\.whatsapp\.com/'),
  contact_profile_id uuid references public.profiles(id) on delete set null,
  member_count_estimate int check (member_count_estimate >= 0),
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.whatsapp_groups (display_order, name);

create table public.announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body_md text not null,
  pinned boolean not null default false,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index on public.announcements (pinned desc, created_at desc);

-- ---------- RLS ----------

alter table public.whatsapp_groups enable row level security;
alter table public.announcements enable row level security;

create policy "wa_groups_select_authenticated" on public.whatsapp_groups
  for select to authenticated using (true);

create policy "wa_groups_admin_write" on public.whatsapp_groups
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create policy "announcements_select_authenticated" on public.announcements
  for select to authenticated using (true);

create policy "announcements_admin_write" on public.announcements
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
    and auth.uid() = author_id
  );
