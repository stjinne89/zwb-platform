-- Wedstrijdverslagen standaardiseren. Tot nu toe was een verslag één vrij
-- tekstveld; leden vroegen om vaste kopjes zodat voorbereiding en uitslag
-- vergelijkbaar worden. body_md blijft bestaan en wordt bij opslaan gevuld met
-- de samengevoegde secties, zodat alle bestaande leespaden blijven werken.

-- 1) De app ging altijd al uit van één verslag per lid per event, maar er stond
--    geen unieke index op. Eerst dubbelen opruimen (oudste wint niet: de
--    nieuwste is het bijgewerkte verslag).
delete from public.event_reports a
  using public.event_reports b
  where a.event_id = b.event_id
    and a.profile_id = b.profile_id
    and a.created_at < b.created_at;

create unique index if not exists event_reports_event_profile_key
  on public.event_reports (event_id, profile_id);

-- 2) Secties.
alter table public.event_reports
  add column if not exists preparation_md text,
  add column if not exists course_md text,
  add column if not exists result_md text,
  add column if not exists lessons_md text;

-- 3) Bestaande vrije tekst wordt "verloop".
update public.event_reports
  set course_md = body_md
  where course_md is null and body_md is not null and body_md <> '';

notify pgrst, 'reload schema';
