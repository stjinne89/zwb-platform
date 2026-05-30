-- Live-chat op de liveticker. Iedereen kan aanmoedigen: leden posten met hun
-- profiel, publieke (anonieme) bezoekers met een tijdelijke gastnaam. Leden
-- kunnen een bericht als 'intern' markeren zodat het niet op de publieke
-- /live/[eventId]-pagina verschijnt.

create table if not exists public.event_chat_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null, -- null = gast
  guest_name text,                  -- gevuld als profile_id null
  body text not null,
  internal_only boolean not null default false, -- alleen voor leden (niet publiek)
  created_at timestamptz not null default now()
);

create index if not exists event_chat_event_idx
  on public.event_chat_messages (event_id, created_at);

alter table public.event_chat_messages enable row level security;

-- Goedgekeurde leden lezen alle berichten (incl. interne).
drop policy if exists "event_chat_select_approved" on public.event_chat_messages;
create policy "event_chat_select_approved" on public.event_chat_messages
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved)
  );

-- Leden posten als zichzelf (mogen internal_only zetten). Gast-posts lopen via
-- de publieke POST-route met de service-role; geen anon-INSERT-policy nodig.
drop policy if exists "event_chat_insert_own" on public.event_chat_messages;
create policy "event_chat_insert_own" on public.event_chat_messages
  for insert to authenticated with check (
    auth.uid() = profile_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved)
  );

-- Auteur of admin verwijdert (moderatie).
drop policy if exists "event_chat_delete_own_or_admin" on public.event_chat_messages;
create policy "event_chat_delete_own_or_admin" on public.event_chat_messages
  for delete to authenticated using (
    auth.uid() = profile_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Realtime: leden krijgen nieuwe berichten direct binnen op de app-pagina.
do $$
begin
  begin
    alter publication supabase_realtime add table public.event_chat_messages;
  exception when duplicate_object then null;
  end;
end$$;
