-- Q&A: leden stellen een vraag over de app, de makers werken hem uit en
-- antwoorden (wens eigenaar, 2026-10-19).
--
-- Bewust geen forum en geen gesprek: één vraag, één antwoord, van wie het recht
-- qa.answer heeft (standaard alleen het bestuur, in te stellen op
-- /beheer/rechten). Vragen aan andere leden horen in ZWBieb (0239); een open
-- forum leverde in vier maanden één post op (zie de kop van 0239).
--
-- * Wie vraagt, kiest per vraag wie hem leest: 'club' (elk goedgekeurd lid, met
--   naam) of 'bestuur' (alleen de vrager en wie antwoordt). Wie antwoordt, kan
--   een clubvraag ook naar 'bestuur' zetten; terug naar 'club' kan ook, want het
--   blijft de keuze van de vrager die daar het eerst stond.
-- * De vraag zelf verandert niet meer, ook niet door wie antwoordt. Wie vraagt,
--   kan hem wel altijd verwijderen.
-- * Wie het antwoord schreef en wanneer zet de database zelf (trigger), zodat
--   niemand een antwoord op naam van een ander zet.
-- * Hooguit vijf nieuwe vragen per lid per dag (QA_QUESTIONS_PER_DAY in
--   src/lib/qa/limits.ts), in de database zodat de REST-API er niet omheen kan.
-- * Push: on_qa_question naar wie antwoordt, on_qa_answer naar de vrager. De
--   melding noemt nooit de tekst van de vraag of het antwoord.

create table if not exists public.member_questions (
  id uuid primary key default gen_random_uuid(),
  -- Wie de vraag stelde. Heet profile_id, zodat hij vanzelf in de data-export zit.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 3 and 1000),
  visibility text not null default 'club' check (visibility in ('club', 'bestuur')),
  answer text check (answer is null or length(btrim(answer)) between 1 and 4000),
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Waar de lijst op sorteert: een vers antwoord komt weer bovenaan.
  activity_at timestamptz generated always as (coalesce(answered_at, created_at)) stored,
  check ((answer is null) = (answered_at is null))
);

create index if not exists member_questions_activity_idx
  on public.member_questions (activity_at desc);
create index if not exists member_questions_profile_idx
  on public.member_questions (profile_id, created_at desc);
create index if not exists member_questions_open_idx
  on public.member_questions (created_at) where answered_at is null;

create or replace function public.current_user_answers_questions()
returns boolean language sql stable as $$
  select public.current_user_has_permission('qa.answer');
$$;

revoke execute on function public.current_user_answers_questions() from public, anon;
grant execute on function public.current_user_answers_questions() to authenticated;

alter table public.member_questions enable row level security;

revoke all on public.member_questions from anon, authenticated;
grant select, insert, update, delete on public.member_questions to authenticated;
grant all on public.member_questions to service_role;

-- profiles is leesbaar voor elk ingelogd account (0001), ook een account dat
-- nog wacht; daarom de goedkeuring hier expliciet, zoals in 0239.
drop policy if exists "member_questions_select" on public.member_questions;
create policy "member_questions_select" on public.member_questions
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.current_user_answers_questions()
    or (
      visibility = 'club'
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
    )
  );

drop policy if exists "member_questions_ask" on public.member_questions;
create policy "member_questions_ask" on public.member_questions
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
  );

-- Bijwerken is antwoorden of de zichtbaarheid zetten; de trigger hieronder
-- houdt de vraag zelf vast.
drop policy if exists "member_questions_answer" on public.member_questions;
create policy "member_questions_answer" on public.member_questions
  for update to authenticated
  using (public.current_user_answers_questions())
  with check (public.current_user_answers_questions());

drop policy if exists "member_questions_delete" on public.member_questions;
create policy "member_questions_delete" on public.member_questions
  for delete to authenticated
  using (profile_id = (select auth.uid()) or public.current_user_answers_questions());

create or replace function public.member_questions_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (
    select count(*) from public.member_questions
    where profile_id = new.profile_id and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'Daglimiet voor nieuwe vragen bereikt';
  end if;
  new.created_at := now();
  new.updated_at := now();
  -- Een vraag begint altijd open; antwoorden gaat via een update.
  new.answer := null;
  new.answered_by := null;
  new.answered_at := null;
  return new;
end;
$$;

drop trigger if exists member_questions_before_insert on public.member_questions;
create trigger member_questions_before_insert
  before insert on public.member_questions
  for each row execute function public.member_questions_before_insert();

create or replace function public.member_questions_before_update()
returns trigger language plpgsql as $$
begin
  if new.profile_id is distinct from old.profile_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'De vraag zelf verandert niet';
  end if;
  new.updated_at := now();
  if new.answer is null then
    -- Antwoord weggehaald: de vraag staat weer open.
    new.answered_by := null;
    new.answered_at := null;
  elsif old.answer is null or new.answer is distinct from old.answer then
    -- Wie het antwoord schrijft of aanpast, staat erbij. Zonder sessie (service
    -- role) blijft staan wat er werd meegegeven.
    new.answered_by := coalesce((select auth.uid()), new.answered_by);
    new.answered_at := coalesce(old.answered_at, now());
  else
    -- Leeg mag: zo zet "on delete set null" het als wie antwoordde zijn
    -- account opheft. Een andere naam invullen niet.
    if new.answered_by is not null then
      new.answered_by := old.answered_by;
    end if;
    new.answered_at := old.answered_at;
  end if;
  return new;
end;
$$;

drop trigger if exists member_questions_before_update on public.member_questions;
create trigger member_questions_before_update
  before update on public.member_questions
  for each row execute function public.member_questions_before_update();

-- ──────────────────────────────────────────────────────────────────────
-- Het recht qa.answer
-- ──────────────────────────────────────────────────────────────────────

alter table public.community_role_permissions
  drop constraint if exists community_role_permissions_allowed;

alter table public.community_role_permissions
  add constraint community_role_permissions_allowed
  check (
    permissions <@ array[
      'events.create',
      'events.manage_all',
      'calendar.sources',
      'competitions.manage',
      'teams.create',
      'teams.manage_roster',
      'teams.manage_results',
      'teams.sync_sources',
      'content.create_posts',
      'content.moderate_posts',
      'media.manage',
      'community.manage',
      'notifications.broadcast',
      'integrations.manage',
      'members.approve',
      'members.manage_roles',
      'roles.manage_permissions',
      'achievements.finalize',
      'live.start',
      'sponsors.manage',
      'polls.manage',
      'qa.answer',
      'training.view_assigned',
      'training.manage_assignments',
      'training.create_plans',
      'training.publish_plans',
      'training.ai_generate',
      'omnium.manage',
      'src.manage',
      'zwbgame.manage'
    ]::text[]
  );

update public.community_role_permissions
   set permissions = (
     select array_agg(distinct permission order by permission)
       from unnest(permissions || array['qa.answer']::text[]) as t(permission)
   )
 where role = 'board';

-- ──────────────────────────────────────────────────────────────────────
-- Pushvoorkeuren
-- ──────────────────────────────────────────────────────────────────────

alter table public.notification_preferences
  add column if not exists on_qa_question boolean not null default true,
  add column if not exists on_qa_answer boolean not null default true;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select relrowsecurity from pg_class where relname = 'member_questions';  -- true
-- select role from public.community_role_permissions
--  where 'qa.answer' = any(permissions);                                  -- board
-- select column_name from information_schema.columns
--  where table_name = 'notification_preferences'
--    and column_name in ('on_qa_question', 'on_qa_answer');               -- twee rijen
