-- Wie weet wat: kennis van leden.
--
-- Een lid zegt waar hij ervaring mee heeft, een ander lid stelt hem daar een
-- vraag over in de app, en wat bruikbaar is, wordt een korte tip die op de plek
-- staat waar je hem nodig hebt (het onderwerp, het event, de col).
--
-- Bewust geen forum: "vraag" en "tip" bestaan al als soort post (0019) en
-- leverden in vier maanden één post op. Kennis zit bij mensen; de app wijst
-- naar de persoon en bewaart wat eruit komt. Onderzoek: docs/kennis-van-leden.md.
--
-- * Toestemming per functie (MEMBER_KNOWLEDGE_CONSENT_VERSION in
--   src/lib/wie-weet-wat/consent.ts), zoals het eetdagboek (0231) en de
--   protocollen (0237); geen nieuwe privacyversie. Eén rij in member_knowledge
--   dekt alles: als kenner vermeld staan, vragen stellen en berichten sturen.
-- * Geen telefoonnummers (besluit eigenaar, 2026-10-15): het gesprek blijft in
--   de app, zodat een goed antwoord er ook een tip kan worden.
-- * Een gesprek lezen alleen de twee deelnemers. Ook het bestuur niet: net als
--   de coachchat (0167) is het vrije tekst tussen twee mensen.
-- * Tips staan los van maintenance_tips (0122). Die hangen aan een onderdeel in
--   Mijn garage, hebben pro-bronnen en leden schrijven er niet zelf in.

-- ──────────────────────────────────────────────────────────────────────
-- Meedoen en onderwerpen
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.member_knowledge (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  consent_version text not null check (consent_version in ('2026-10-15')),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_knowledge_topics (
  profile_id uuid not null references public.member_knowledge(profile_id) on delete cascade,
  topic_slug text not null check (topic_slug ~ '^[a-z0-9-]{2,40}$'),
  note text check (note is null or length(note) <= 140),
  created_at timestamptz not null default now(),
  primary key (profile_id, topic_slug)
);

create index if not exists member_knowledge_topics_topic_idx
  on public.member_knowledge_topics (topic_slug);

alter table public.member_knowledge enable row level security;
alter table public.member_knowledge_topics enable row level security;

-- De toestemming is van het lid zelf; niemand anders hoeft hem te zien.
drop policy if exists "member_knowledge_own" on public.member_knowledge;
create policy "member_knowledge_own" on public.member_knowledge
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Onderwerpen ziet elk goedgekeurd lid, van goedgekeurde leden. profiles is
-- leesbaar voor elk ingelogd account (0001), ook een account dat nog wacht;
-- daarom de goedkeuring hier expliciet.
drop policy if exists "member_knowledge_topics_select" on public.member_knowledge_topics;
create policy "member_knowledge_topics_select" on public.member_knowledge_topics
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (
      exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
      and exists (select 1 from public.profiles p where p.id = profile_id and p.is_approved)
    )
  );

drop policy if exists "member_knowledge_topics_own_insert" on public.member_knowledge_topics;
create policy "member_knowledge_topics_own_insert" on public.member_knowledge_topics
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists "member_knowledge_topics_own_update" on public.member_knowledge_topics;
create policy "member_knowledge_topics_own_update" on public.member_knowledge_topics
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "member_knowledge_topics_own_delete" on public.member_knowledge_topics;
create policy "member_knowledge_topics_own_delete" on public.member_knowledge_topics
  for delete to authenticated
  using (profile_id = (select auth.uid()));

-- ──────────────────────────────────────────────────────────────────────
-- Tips
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.member_tips (
  id uuid primary key default gen_random_uuid(),
  -- Wie het zei, en dus wie het mag aanpassen of weghalen.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  topic_slug text not null check (topic_slug ~ '^[a-z0-9-]{2,40}$'),
  -- Optioneel: de plek waar de tip ook staat.
  event_id uuid references public.events(id) on delete set null,
  col_slug text references public.cols(slug) on delete set null,
  body text not null check (length(btrim(body)) between 3 and 300),
  -- 'lid': zelf geplaatst. 'import': uit een groepsapp, via /beheer/citaten.
  source text not null default 'lid' check (source in ('lid', 'import')),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_tips_topic_idx
  on public.member_tips (topic_slug, status, created_at desc);
create index if not exists member_tips_profile_idx
  on public.member_tips (profile_id, created_at desc);
create index if not exists member_tips_event_idx
  on public.member_tips (event_id) where event_id is not null;
create index if not exists member_tips_col_idx
  on public.member_tips (col_slug) where col_slug is not null;

create or replace function public.current_user_moderates_member_tips()
returns boolean language sql stable as $$
  select public.current_user_has_permission('community.manage')
      or public.current_user_has_permission('content.moderate_posts');
$$;

alter table public.member_tips enable row level security;

drop policy if exists "member_tips_select" on public.member_tips;
create policy "member_tips_select" on public.member_tips
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.current_user_moderates_member_tips()
    or (
      status = 'published'
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
    )
  );

-- Een lid plaatst alleen een eigen, zichtbare tip. Importeren onder de naam van
-- een ander lid is beheer.
drop policy if exists "member_tips_insert" on public.member_tips;
create policy "member_tips_insert" on public.member_tips
  for insert to authenticated
  with check (
    (
      profile_id = (select auth.uid())
      and source = 'lid'
      and status = 'published'
      and public.current_user_has_permission('content.create_posts')
    )
    or public.current_user_has_permission('community.manage')
  );

drop policy if exists "member_tips_update" on public.member_tips;
create policy "member_tips_update" on public.member_tips
  for update to authenticated
  using (profile_id = (select auth.uid()) or public.current_user_moderates_member_tips())
  with check (profile_id = (select auth.uid()) or public.current_user_moderates_member_tips());

drop policy if exists "member_tips_delete" on public.member_tips;
create policy "member_tips_delete" on public.member_tips
  for delete to authenticated
  using (profile_id = (select auth.uid()) or public.current_user_moderates_member_tips());

-- De update-policy laat het lid zijn eigen tip bewerken. Zonder deze wacht kon
-- hij een tip die de moderatie verborg ook zelf weer zichtbaar zetten.
create or replace function public.member_tips_guard()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if (select auth.uid()) is null or public.current_user_moderates_member_tips() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.source is distinct from old.source
     or new.profile_id is distinct from old.profile_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Alleen de moderatie wijzigt status, bron of auteur van een tip';
  end if;
  return new;
end;
$$;

drop trigger if exists member_tips_guard on public.member_tips;
create trigger member_tips_guard
  before update on public.member_tips
  for each row execute function public.member_tips_guard();

-- ──────────────────────────────────────────────────────────────────────
-- Vragen: een gesprek tussen twee leden
-- ──────────────────────────────────────────────────────────────────────

create table if not exists public.knowledge_threads (
  id uuid primary key default gen_random_uuid(),
  asker_id uuid not null references public.profiles(id) on delete cascade,
  expert_id uuid not null references public.profiles(id) on delete cascade,
  topic_slug text not null check (topic_slug ~ '^[a-z0-9-]{2,40}$'),
  -- De tip waar de vraag op inhaakte, als die er was.
  tip_id uuid references public.member_tips(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  last_author_id uuid references public.profiles(id) on delete set null,
  asker_read_at timestamptz,
  expert_read_at timestamptz,
  created_at timestamptz not null default now(),
  check (asker_id <> expert_id)
);

create index if not exists knowledge_threads_asker_idx
  on public.knowledge_threads (asker_id, last_message_at desc);
create index if not exists knowledge_threads_expert_idx
  on public.knowledge_threads (expert_id, last_message_at desc);

create table if not exists public.knowledge_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.knowledge_threads(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists knowledge_messages_thread_idx
  on public.knowledge_messages (thread_id, created_at);

alter table public.knowledge_threads enable row level security;
alter table public.knowledge_messages enable row level security;

drop policy if exists "knowledge_threads_participants" on public.knowledge_threads;
create policy "knowledge_threads_participants" on public.knowledge_threads
  for select to authenticated
  using ((select auth.uid()) in (asker_id, expert_id));

-- Vragen kan wie zelf toestemming gaf, aan een goedgekeurd lid dat dit
-- onderwerp opgaf. Bijwerken loopt alleen via de functies hieronder.
drop policy if exists "knowledge_threads_ask" on public.knowledge_threads;
create policy "knowledge_threads_ask" on public.knowledge_threads
  for insert to authenticated
  with check (
    asker_id = (select auth.uid())
    and status = 'open'
    and exists (select 1 from public.member_knowledge mk where mk.profile_id = (select auth.uid()))
    and exists (
      select 1 from public.member_knowledge_topics t
      join public.profiles p on p.id = t.profile_id and p.is_approved
      where t.profile_id = expert_id and t.topic_slug = knowledge_threads.topic_slug
    )
  );

drop policy if exists "knowledge_messages_participants" on public.knowledge_messages;
create policy "knowledge_messages_participants" on public.knowledge_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.knowledge_threads t
      where t.id = thread_id and (select auth.uid()) in (t.asker_id, t.expert_id)
    )
  );

drop policy if exists "knowledge_messages_write" on public.knowledge_messages;
create policy "knowledge_messages_write" on public.knowledge_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.knowledge_threads t
      where t.id = thread_id
        and t.status = 'open'
        and (select auth.uid()) in (t.asker_id, t.expert_id)
    )
  );

drop policy if exists "knowledge_messages_own_delete" on public.knowledge_messages;
create policy "knowledge_messages_own_delete" on public.knowledge_messages
  for delete to authenticated
  using (author_id = (select auth.uid()));

-- Hooguit tien nieuwe vragen per dag per lid (KNOWLEDGE_QUESTIONS_PER_DAY in
-- src/lib/wie-weet-wat/limits.ts). In de database, omdat de REST-API er anders
-- omheen kan.
create or replace function public.knowledge_threads_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (
    select count(*) from public.knowledge_threads
    where asker_id = new.asker_id and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'Daglimiet voor nieuwe vragen bereikt';
  end if;
  new.last_message_at := now();
  new.last_author_id := new.asker_id;
  new.asker_read_at := now();
  new.expert_read_at := null;
  return new;
end;
$$;

drop trigger if exists knowledge_threads_before_insert on public.knowledge_threads;
create trigger knowledge_threads_before_insert
  before insert on public.knowledge_threads
  for each row execute function public.knowledge_threads_before_insert();

-- Een nieuw bericht zet het gesprek bovenaan en markeert het als gelezen voor
-- wie het schreef. Security definer: leden hebben geen update-recht op
-- knowledge_threads.
create or replace function public.knowledge_messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.knowledge_threads
     set last_message_at = new.created_at,
         last_author_id = new.author_id,
         asker_read_at = case when asker_id = new.author_id then new.created_at else asker_read_at end,
         expert_read_at = case when expert_id = new.author_id then new.created_at else expert_read_at end
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists knowledge_messages_after_insert on public.knowledge_messages;
create trigger knowledge_messages_after_insert
  after insert on public.knowledge_messages
  for each row execute function public.knowledge_messages_after_insert();

-- Gelezen zetten: alleen je eigen kolom.
create or replace function public.mark_knowledge_thread_read(thread uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.knowledge_threads
     set asker_read_at = case when asker_id = auth.uid() then now() else asker_read_at end,
         expert_read_at = case when expert_id = auth.uid() then now() else expert_read_at end
   where id = thread and auth.uid() in (asker_id, expert_id);
end;
$$;

-- Sluiten kan elke deelnemer; daarna komen er geen berichten meer bij.
create or replace function public.close_knowledge_thread(thread uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.knowledge_threads
     set status = 'closed'
   where id = thread and auth.uid() in (asker_id, expert_id);
end;
$$;

revoke execute on function public.mark_knowledge_thread_read(uuid) from public, anon;
revoke execute on function public.close_knowledge_thread(uuid) from public, anon;
grant execute on function public.mark_knowledge_thread_read(uuid) to authenticated;
grant execute on function public.close_knowledge_thread(uuid) to authenticated;

-- Een eigen voorkeur, los van de andere meldingen.
alter table public.notification_preferences
  add column if not exists on_knowledge_message boolean not null default true;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select tablename, rowsecurity from pg_tables
--  where tablename in ('member_knowledge', 'member_knowledge_topics', 'member_tips',
--                      'knowledge_threads', 'knowledge_messages');  -- vijf keer true
