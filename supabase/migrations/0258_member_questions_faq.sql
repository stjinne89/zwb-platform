-- Q&A: "Ik ook" en een FAQ (wens eigenaar, 2026-10-20).
--
-- De FAQ vult zich met vragen die vaker gesteld worden. Hoe vaak, telt de
-- database; wat erin komt, kiest wie qa.answer heeft (keuze eigenaar: geen
-- automatische drempel en geen AI die groepeert).
--
-- * "Ik ook": een goedgekeurd lid tikt het bij een clubvraag van een ander. Dat
--   telt mee in asked_count en zet hem op de lijst voor de melding bij het
--   antwoord. Wie wat tikte, zien alleen het lid zelf en wie antwoordt; de
--   club ziet alleen het aantal.
-- * Dubbel: wie antwoordt, voegt een vraag die er al staat samen met het
--   origineel. De app zet de vrager dan als "Ik ook" bij het origineel en
--   verwijdert de dubbele vraag; daarvoor mag wie antwoordt hier ook een rij
--   namens een ander invoegen.
-- * FAQ: faq_at staat aan of uit, alleen bij een beantwoorde clubvraag. Gaat
--   het antwoord weg of wordt de vraag afgeschermd, dan valt hij er vanzelf uit.
-- * asked_count (1 = de vrager zelf) houdt de trigger op member_question_askers
--   bij; een update van buiten laat hem staan.

alter table public.member_questions
  add column if not exists faq_at timestamptz,
  add column if not exists asked_count integer not null default 1;

alter table public.member_questions
  drop constraint if exists member_questions_faq_check;
alter table public.member_questions
  add constraint member_questions_faq_check
  check (faq_at is null or (answered_at is not null and visibility = 'club'));

create index if not exists member_questions_faq_idx
  on public.member_questions (asked_count desc, faq_at) where faq_at is not null;

create table if not exists public.member_question_askers (
  question_id uuid not null references public.member_questions(id) on delete cascade,
  -- Heet profile_id, zodat het vanzelf in de data-export zit.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, profile_id)
);

create index if not exists member_question_askers_profile_idx
  on public.member_question_askers (profile_id);

alter table public.member_question_askers enable row level security;

revoke all on public.member_question_askers from anon, authenticated;
grant select, insert, delete on public.member_question_askers to authenticated;
grant all on public.member_question_askers to service_role;

drop policy if exists "member_question_askers_select" on public.member_question_askers;
create policy "member_question_askers_select" on public.member_question_askers
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.current_user_answers_questions());

-- Een lid alleen voor zichzelf en alleen bij een clubvraag die het mag zien
-- (de subquery valt onder de RLS van member_questions); wie antwoordt ook
-- namens een ander, voor het samenvoegen van een dubbele vraag.
drop policy if exists "member_question_askers_insert" on public.member_question_askers;
create policy "member_question_askers_insert" on public.member_question_askers
  for insert to authenticated
  with check (
    public.current_user_answers_questions()
    or (
      profile_id = (select auth.uid())
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_approved)
      and exists (
        select 1 from public.member_questions q
        where q.id = question_id and q.visibility = 'club'
      )
    )
  );

drop policy if exists "member_question_askers_delete" on public.member_question_askers;
create policy "member_question_askers_delete" on public.member_question_askers
  for delete to authenticated
  using (profile_id = (select auth.uid()) or public.current_user_answers_questions());

create or replace function public.member_question_askers_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.member_questions
    where id = new.question_id and profile_id = new.profile_id
  ) then
    raise exception 'Je eigen vraag telt al';
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists member_question_askers_before_insert on public.member_question_askers;
create trigger member_question_askers_before_insert
  before insert on public.member_question_askers
  for each row execute function public.member_question_askers_before_insert();

create or replace function public.member_question_askers_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.question_id, old.question_id);
begin
  update public.member_questions q
     set asked_count = 1 + (
       select count(*) from public.member_question_askers a where a.question_id = target
     )
   where q.id = target;
  return null;
end;
$$;

revoke execute on function public.member_question_askers_count() from public, anon, authenticated;
revoke execute on function public.member_question_askers_before_insert() from public, anon, authenticated;

drop trigger if exists member_question_askers_count on public.member_question_askers;
create trigger member_question_askers_count
  after insert or delete on public.member_question_askers
  for each row execute function public.member_question_askers_count();

-- De triggers van 0254 opnieuw, met de FAQ en de teller erbij.
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
  -- Een vraag begint altijd open, buiten de FAQ en door één lid gesteld.
  new.answer := null;
  new.answered_by := null;
  new.answered_at := null;
  new.faq_at := null;
  new.asked_count := 1;
  return new;
end;
$$;

create or replace function public.member_questions_before_update()
returns trigger language plpgsql as $$
begin
  if new.profile_id is distinct from old.profile_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'De vraag zelf verandert niet';
  end if;
  -- De teller zet alleen de trigger op member_question_askers (die draait een
  -- niveau dieper).
  if pg_trigger_depth() < 2 then
    new.asked_count := old.asked_count;
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
  -- Zonder antwoord of afgeschermd: uit de FAQ. Erin zetten krijgt de tijd
  -- van de database.
  if new.answer is null or new.visibility <> 'club' then
    new.faq_at := null;
  elsif new.faq_at is not null and old.faq_at is null then
    new.faq_at := now();
  elsif new.faq_at is not null then
    new.faq_at := old.faq_at;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select column_name from information_schema.columns
--  where table_name = 'member_questions' and column_name in ('faq_at', 'asked_count'); -- twee rijen
-- select relrowsecurity from pg_class where relname = 'member_question_askers';      -- true
-- select count(*) from pg_policies where tablename = 'member_question_askers';        -- 3
