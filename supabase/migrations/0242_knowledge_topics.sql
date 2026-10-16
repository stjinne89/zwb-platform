-- ZWBieb (was: Wie weet wat): onderwerpen en spullen in de database, zodat
-- leden er zelf bij kunnen zetten.
--
-- In 0239 stond de lijst vast in code (src/lib/zwbieb/topics.ts), zodat
-- iedereen onder hetzelfde woord zoekt. Besluiten eigenaar (2026-10-16):
-- * leden moeten ook een onderwerp kunnen toevoegen dat er nog niet tussen staat;
-- * naast "wie weet wat" ook "wie heeft wat": spullen die een lid wil uitlenen
--   aan een ander ZWB-lid (fietskoffer, momentsleutel, fietsendrager, camper).
--   Dat werkt als een onderwerp met kind = 'spullen': je zet het bij jezelf,
--   een ander vraagt het aan in een gesprek. Het onderdeel heet daarom ZWBieb.
--
-- * De vijftien onderwerpen uit code komen hier als startlijst in, met hun
--   volgorde. Een nieuw onderwerp komt daarachter, op alfabet.
-- * Elk goedgekeurd lid kan een onderwerp toevoegen, hooguit vijf per dag. De
--   app laat eerst zien wat er al lijkt op wat je typt; dezelfde naam twee keer
--   kan niet (hoofdletters en spaties tellen niet mee).
-- * De moderatie (community.manage of content.moderate_posts) kan een
--   onderwerp hernoemen of verbergen. Verbergen haalt het uit de keuzelijsten;
--   wie het al had, houdt het. Verwijderen kan alleen als niemand het gebruikt.
-- * De slug verandert niet: hernoemen is alleen het label.

create table if not exists public.knowledge_topics (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  label text not null check (length(btrim(label)) between 2 and 40),
  -- 'kennis': waar je ervaring mee hebt. 'spullen': wat je wilt uitlenen.
  kind text not null default 'kennis' check (kind in ('kennis', 'spullen')),
  sort_order int not null default 1000,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists knowledge_topics_label_idx
  on public.knowledge_topics (lower(btrim(label)));

insert into public.knowledge_topics (slug, label, sort_order) values
  ('zwift-racen', 'Zwift-racen (ZRL, WTRL)', 1),
  ('zwift-setup', 'Zwift-setup en smart trainers', 2),
  ('vermogensmeters', 'Vermogensmeters', 3),
  ('trainen-met-schema', 'Trainen met schema', 4),
  ('data-apps', 'Strava, intervals.icu en Garmin', 5),
  ('voeding-onderweg', 'Eten en drinken onderweg', 6),
  ('kracht-core', 'Kracht en core', 7),
  ('bikefit', 'Bikefit en houding', 8),
  ('sleutelen', 'Sleutelen en onderhoud', 9),
  ('banden-tubeless', 'Banden en tubeless', 10),
  ('gravel', 'Gravel en bikepacking', 11),
  ('bergen-cols', 'Bergen en cols', 12),
  ('groepsrijden', 'Rijden in een groep', 13),
  ('toertochten', 'Toertochten en granfondo''s', 14),
  ('kleding-weer', 'Kleding en slecht weer', 15)
on conflict (slug) do nothing;

insert into public.knowledge_topics (slug, label, kind, sort_order) values
  ('fietskoffer', 'Fietskoffer of fietstas', 'spullen', 101),
  ('momentsleutel', 'Momentsleutel', 'spullen', 102),
  ('fietsendrager', 'Fietsendrager (trekhaak)', 'spullen', 103),
  ('dakdrager-zuignap', 'Dakdrager met zuignappen (SeaSucker)', 'spullen', 104),
  ('werkstandaard', 'Werkstandaard', 'spullen', 105),
  ('camper', 'Camper', 'spullen', 106)
on conflict (slug) do nothing;

-- Vanaf nu moet elk onderwerp in de tabel staan. Tot nu toe kon de app alleen
-- de vijftien slugs hierboven schrijven, dus bestaande rijen passen.
alter table public.member_knowledge_topics
  drop constraint if exists member_knowledge_topics_topic_fk;
alter table public.member_knowledge_topics
  add constraint member_knowledge_topics_topic_fk
  foreign key (topic_slug) references public.knowledge_topics(slug);

alter table public.member_tips drop constraint if exists member_tips_topic_fk;
alter table public.member_tips
  add constraint member_tips_topic_fk
  foreign key (topic_slug) references public.knowledge_topics(slug);

alter table public.knowledge_threads drop constraint if exists knowledge_threads_topic_fk;
alter table public.knowledge_threads
  add constraint knowledge_threads_topic_fk
  foreign key (topic_slug) references public.knowledge_topics(slug);

alter table public.knowledge_topics enable row level security;

-- Lezen: elk goedgekeurd lid, ook verborgen onderwerpen (bestaande tips en
-- gesprekken houden hun naam). De app laat verborgen onderwerpen alleen niet
-- meer kiezen.
drop policy if exists "knowledge_topics_select" on public.knowledge_topics;
create policy "knowledge_topics_select" on public.knowledge_topics
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
  );

drop policy if exists "knowledge_topics_insert" on public.knowledge_topics;
create policy "knowledge_topics_insert" on public.knowledge_topics
  for insert to authenticated
  with check (
    (
      created_by = (select auth.uid())
      and status = 'active'
      and sort_order = 1000
      and public.current_user_has_permission('content.create_posts')
    )
    or public.current_user_moderates_member_tips()
  );

drop policy if exists "knowledge_topics_update" on public.knowledge_topics;
create policy "knowledge_topics_update" on public.knowledge_topics
  for update to authenticated
  using (public.current_user_moderates_member_tips())
  with check (public.current_user_moderates_member_tips());

-- Verwijderen lukt alleen als niemand het onderwerp gebruikt: de foreign keys
-- hierboven weigeren het anders.
drop policy if exists "knowledge_topics_delete" on public.knowledge_topics;
create policy "knowledge_topics_delete" on public.knowledge_topics
  for delete to authenticated
  using (public.current_user_moderates_member_tips());

-- Hooguit vijf nieuwe onderwerpen per dag per lid (TOPICS_PER_DAY in
-- src/lib/wie-weet-wat/limits.ts); de moderatie telt niet mee.
create or replace function public.knowledge_topics_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.label := btrim(new.label);
  if (select auth.uid()) is null or public.current_user_moderates_member_tips() then
    return new;
  end if;
  if (
    select count(*) from public.knowledge_topics
    where created_by = new.created_by and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'Daglimiet voor nieuwe onderwerpen bereikt';
  end if;
  return new;
end;
$$;

drop trigger if exists knowledge_topics_before_insert on public.knowledge_topics;
create trigger knowledge_topics_before_insert
  before insert on public.knowledge_topics
  for each row execute function public.knowledge_topics_before_insert();

notify pgrst, 'reload schema';

-- Vooraf, op productie: dit moet niets opleveren, anders faalt een foreign key.
-- select topic_slug from public.member_knowledge_topics
--  union select topic_slug from public.member_tips
--  union select topic_slug from public.knowledge_threads
-- except select unnest(array['zwift-racen','zwift-setup','vermogensmeters',
--   'trainen-met-schema','data-apps','voeding-onderweg','kracht-core','bikefit',
--   'sleutelen','banden-tubeless','gravel','bergen-cols','groepsrijden',
--   'toertochten','kleding-weer']);
