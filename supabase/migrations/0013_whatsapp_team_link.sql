-- WhatsApp-groepen kunnen optioneel gekoppeld worden aan een team.
-- (Event-koppeling volgt later in stap 3.)

alter table public.whatsapp_groups
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists whatsapp_groups_team_idx
  on public.whatsapp_groups (team_id);
