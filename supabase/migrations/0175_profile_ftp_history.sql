-- FTP-historie per lid.
--
-- TSS en IF van een gereden rit werden altijd met de húídige profiles.ftp_watts
-- uitgerekend. Sinds de FTP-test in het schema zit, schaalt elke testuitslag
-- daarmee de belasting van het hele verleden mee: +5% FTP is ~10% minder TSS
-- over alle oude ritten, en de CTL-reeks en de weekgrafiek schuiven met
-- terugwerkende kracht.
--
-- Deze tabel onthoudt vanaf welke dag welke FTP gold. Gevuld door één trigger
-- op profiles, zodat elk schrijfpad meetelt: testuitslag, correctie daarvan,
-- intervals-sync en handmatig invullen.
--
-- Startwaarde: per lid de huidige FTP vanaf 1900-01-01. Dat is precies het oude
-- gedrag, dus bij het toepassen verschuift er niets; pas een volgende wijziging
-- splitst het verleden.

create table if not exists public.profile_ftp_history (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  effective_from date not null,
  ftp_watts int not null check (ftp_watts > 0 and ftp_watts < 1200),
  created_at timestamptz not null default now(),
  primary key (profile_id, effective_from)
);

alter table public.profile_ftp_history enable row level security;

drop policy if exists "profile_ftp_history_select" on public.profile_ftp_history;
create policy "profile_ftp_history_select" on public.profile_ftp_history
  for select to authenticated
  using (public.current_user_can_train_profile(profile_id));
-- Geen schrijfpolicies: alleen de trigger (security definer) schrijft.

create or replace function public.record_profile_ftp_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  watts int;
begin
  if new.ftp_watts is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.ftp_watts is not distinct from old.ftp_watts then
    return new;
  end if;
  watts := round(new.ftp_watts)::int;
  if watts <= 0 or watts >= 1200 then
    return new;
  end if;
  -- Meerdere wijzigingen op één dag: de laatste telt.
  insert into public.profile_ftp_history (profile_id, effective_from, ftp_watts)
  values (new.id, (now() at time zone 'Europe/Amsterdam')::date, watts)
  on conflict (profile_id, effective_from) do update set ftp_watts = excluded.ftp_watts;
  return new;
end;
$$;

drop trigger if exists profiles_ftp_history on public.profiles;
create trigger profiles_ftp_history
  after insert or update of ftp_watts on public.profiles
  for each row execute function public.record_profile_ftp_history();

insert into public.profile_ftp_history (profile_id, effective_from, ftp_watts)
select id, date '1900-01-01', round(ftp_watts)::int
from public.profiles
where ftp_watts is not null and ftp_watts > 0 and ftp_watts < 1200
on conflict (profile_id, effective_from) do nothing;

-- Controle na toepassen:
--   select count(*) from profile_ftp_history where effective_from = '1900-01-01';
--   -- verwacht: gelijk aan het aantal profielen met een FTP
--   select count(*) from profiles where ftp_watts is not null;
