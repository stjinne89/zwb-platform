-- ZWB DS: live raceoverzicht uit Zwifts spelersstatus per renner.
--
-- Zwift geeft de status van één renner per verzoek en staat ongeveer 45
-- verzoeken per minuut per account toe (gemeten 2026-10-17, zie
-- docs/zwb-ds-spike.md). Netlify draait meerdere instanties naast elkaar, dus
-- het budget en de laatste status per renner moeten gedeeld zijn: anders vraagt
-- elke kijker het hele veld opnieuw op en zit het account binnen een minuut op
-- de limiet.
--
-- Bewaard wordt alleen wat het overzicht nodig heeft: afstand, snelheid en
-- vermogen, geen hartslag. Na zes uur verdwijnt een status weer (in
-- claim_zwb_ds_budget). Geen policies: alleen de admin-client op de server.

create table if not exists public.zwb_ds_rider_states (
  zwift_id bigint primary key,
  checked_at timestamptz not null,
  -- Tijdstip van de status volgens Zwift; null = niet in de wereld (404).
  state_at timestamptz,
  event_subgroup_id bigint,
  event_distance_m real,
  speed_kmh real,
  power integer
);

create index if not exists zwb_ds_rider_states_checked_idx
  on public.zwb_ds_rider_states (checked_at);

alter table public.zwb_ds_rider_states enable row level security;

-- Eén rij: een emmer met verzoeken die vol loopt met 30 per minuut, tot 10.
-- Samen nooit meer dan 40 in een minuut, onder de gemeten ~45.
create table if not exists public.zwb_ds_budget (
  id smallint primary key default 1 check (id = 1),
  tokens real not null,
  updated_at timestamptz not null default now()
);

insert into public.zwb_ds_budget (id, tokens) values (1, 10)
on conflict (id) do nothing;

alter table public.zwb_ds_budget enable row level security;

-- Hoeveel van de gevraagde verzoeken de aanroeper nu mag doen (0 tot `want`).
create or replace function public.claim_zwb_ds_budget(want integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  available real;
  granted integer;
begin
  select least(10, tokens + extract(epoch from now() - updated_at) * 30.0 / 60)
    into available
    from zwb_ds_budget
   where id = 1
     for update;
  if available is null then
    return 0;
  end if;
  granted := least(greatest(want, 0), floor(available)::integer);
  update zwb_ds_budget
     set tokens = available - granted,
         updated_at = now()
   where id = 1;
  delete from zwb_ds_rider_states where checked_at < now() - interval '6 hours';
  return granted;
end;
$$;

revoke execute on function public.claim_zwb_ds_budget(integer) from public, anon, authenticated;
grant execute on function public.claim_zwb_ds_budget(integer) to service_role;
