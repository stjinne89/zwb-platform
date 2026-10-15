-- Wie weet wat: een antwoord uit een gesprek als tip voor de club.
--
-- In 0239 kon je alleen je eigen bericht als tip plaatsen. Besluit eigenaar
-- (2026-10-15): het omgekeerde. Wie in een gesprek een bericht van de ander
-- waardevol vindt, bewaart dat als tip voor de club, onder de naam van wie het
-- schreef. Je eigen bericht kan dat niet: of iets de moeite waard is, beslist de
-- ontvanger.
--
-- * De tip hangt aan het bericht (message_id) en staat op naam van de auteur
--   (profile_id). De auteur gaf toestemming bij Wie weet wat, krijgt een melding,
--   en kan de tip daarna zelf aanpassen of verwijderen; wie hem bewaarde niet.
-- * Eén tip per bericht.
-- * source 'gesprek', naast 'lid' en 'import'.

alter table public.member_tips
  add column if not exists message_id uuid references public.knowledge_messages(id) on delete set null;

create unique index if not exists member_tips_message_idx
  on public.member_tips (message_id) where message_id is not null;

alter table public.member_tips drop constraint if exists member_tips_source_check;
alter table public.member_tips
  add constraint member_tips_source_check check (source in ('lid', 'import', 'gesprek'));

-- Een tip uit een gesprek komt altijd van een bericht van de ander, in een
-- gesprek waar je zelf in zit, op naam van wie het schreef.
drop policy if exists "member_tips_insert" on public.member_tips;
create policy "member_tips_insert" on public.member_tips
  for insert to authenticated
  with check (
    (
      profile_id = (select auth.uid())
      and source = 'lid'
      and status = 'published'
      and message_id is null
      and public.current_user_has_permission('content.create_posts')
    )
    or (
      source = 'gesprek'
      and status = 'published'
      and created_by = (select auth.uid())
      and profile_id <> (select auth.uid())
      and exists (
        select 1
        from public.knowledge_messages m
        join public.knowledge_threads t on t.id = m.thread_id
        where m.id = message_id
          and m.author_id = profile_id
          and (select auth.uid()) in (t.asker_id, t.expert_id)
      )
    )
    or public.current_user_has_permission('community.manage')
  );

-- De wacht uit 0239, nu ook op message_id: een tip kan niet naar een ander
-- bericht verhuizen.
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
     or new.created_by is distinct from old.created_by
     or new.message_id is distinct from old.message_id then
    raise exception 'Alleen de moderatie wijzigt status, bron of auteur van een tip';
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'member_tips_source_check';
--   -- moet 'gesprek' bevatten
