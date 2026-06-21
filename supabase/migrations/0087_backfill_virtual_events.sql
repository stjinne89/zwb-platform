-- Backfill voor reeds gepubliceerde Zwift-/MyWhoosh-concepten:
--   1. juiste eventtype + locatie (i.p.v. generiek 'overig'/'Online');
--   2. voor Zwift: de deterministische ZwiftPower-uitslag-URL;
--   3. gekoppelde leden (met profiel) als RSVP "ja", zodat ze net als bij
--      gewone events met avatar verschijnen.
-- Alleen events die nog op de publicatie-default ('overig'/'Online') staan
-- worden aangeraakt, zodat handmatige aanpassingen ongemoeid blijven.

update public.events e
set
  type = 'zwift',
  location = 'Zwift',
  results_url = coalesce(
    e.results_url,
    case
      when c.external_id ~ '^\d+$'
        then 'https://zwiftpower.com/events.php?zid=' || c.external_id
      else null
    end
  )
from public.external_event_candidates c
where c.published_event_id = e.id
  and c.source = 'zwift'
  and e.type = 'overig';

update public.events e
set
  type = 'mywhoosh',
  location = 'MyWhoosh'
from public.external_event_candidates c
where c.published_event_id = e.id
  and c.source = 'mywhoosh'
  and e.type = 'overig';

-- Gekoppelde leden als RSVP "ja" toevoegen (zowel Zwift als MyWhoosh). Bestaande
-- antwoorden van een lid blijven staan dankzij on conflict do nothing.
insert into public.event_rsvps (event_id, profile_id, status)
select distinct c.published_event_id, p.profile_id, 'yes'
from public.external_event_candidates c
join public.external_event_participants p on p.candidate_id = c.id
where c.published_event_id is not null
  and p.profile_id is not null
on conflict (event_id, profile_id) do nothing;
