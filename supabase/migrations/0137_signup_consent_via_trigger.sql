-- De AVG-toestemming bij registratie werd nooit vastgelegd.
--
-- `0063` maakte het vinkje verplicht en de registratie-actie schreef daarna
-- privacy_accepted_at op het profiel. Die schrijfactie hing in een
-- `if (data.user)`, en daar kwam hij nooit uit: met "Confirm email" aan
-- antwoordt GoTrue op /signup met het User-object op het hoogste niveau, terwijl
-- supabase-js in `_sessionResponse()` alleen `data.user` uitleest. Dat veld
-- bestaat in dat antwoord niet, dus `data.user` is null. Gevolg: bij alle twaalf
-- leden die zich sinds 31 mei 2026 hebben aangemeld staat privacy_accepted_at
-- leeg, terwijl ze het vinkje wél hebben gezet — zonder vinkje weigert de actie.
--
-- Toestemming hoort niet af te hangen van de vorm van een API-antwoord. De
-- registratie geeft `privacy_accepted` mee in de user-metadata en de trigger die
-- het profiel aanmaakt zet het tijdstip. Dat is atomair met het aanmaken van het
-- account, dus er is geen moment meer waarop het mis kan gaan.
--
-- Bestaande profielen worden hier bewust NIET bijgewerkt: een toestemmingsdatum
-- verzinnen voor iemand die al lid is, is een AVG-administratie vervalsen. Wie
-- die twaalf alsnog wil vastleggen, doet dat als aparte, bewuste actie.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, privacy_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data->>'privacy_accepted' = 'true' then now()
      else null
    end
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
