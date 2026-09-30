-- Herinneringen voor de Sunday Race Club (fase 4, 2026-09-30).
--
-- Twee nieuwe soorten in de verzendlog van 0038, zodat elk lid ze hooguit één
-- keer krijgt:
--   src_registration  op het zondag-hoofdevent: de avond voordat de inschrijving
--                     bij MyWhoosh sluit (donderdag 03:00 GMT).
--   src_weighin       op de race: vlak voor het weigh-in-venster, voor wie in een
--                     categorie met weigh-in rijdt.
-- Verstuurd door dezelfde cron als de gewone herinneringen (/api/events/reminders).

-- De check uit 0038 heeft geen naam; hij gaat eruit op zijn definitie.
do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'event_reminder_sends'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%reminder_kind%'
  loop
    execute format('alter table public.event_reminder_sends drop constraint %I', v_constraint);
  end loop;
end;
$$;

alter table public.event_reminder_sends
  add constraint event_reminder_sends_reminder_kind_check
    check (reminder_kind in ('24h', '2h', 'src_registration', 'src_weighin'));
