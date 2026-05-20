-- WhatsApp-groepen kunnen ook gekoppeld worden aan een event (bv. een rit,
-- een race of een social). Een groep is gekoppeld aan team OF event, niet
-- aan allebei tegelijk (anders is "deze groep hoort bij ..." dubbelzinnig).

alter table public.whatsapp_groups
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists whatsapp_groups_event_idx
  on public.whatsapp_groups (event_id);

-- Voorkom dat een groep aan beide is gekoppeld.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'whatsapp_groups_scope_xor'
  ) then
    alter table public.whatsapp_groups
      add constraint whatsapp_groups_scope_xor
      check (team_id is null or event_id is null);
  end if;
end$$;
