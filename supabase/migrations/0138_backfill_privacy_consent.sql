-- Toestemmingsdatum alsnog vastleggen voor wie het vinkje aantoonbaar heeft
-- gezet, maar bij wie hij door de bug uit `0137` nooit is weggeschreven.
--
-- Dit is bewust géén "vul alles wat leeg is". Op het moment van schrijven staat
-- privacy_accepted_at bij alle 35 profielen leeg, en die 35 vallen in drie
-- groepen die je uit elkaar moet houden:
--
--  1. 27 profielen die ná het live gaan van `0063` via het registratieformulier
--     zijn aangemaakt. Dat formulier weigert zonder het vinkje — geen vinkje,
--     geen account — dus hun toestemming staat vast. Alleen deze groep krijgt
--     een datum, en wel created_at: het vinkje is gezet in exact hetzelfde
--     verzoek dat het account aanmaakte. Dat is geen geschatte datum maar de
--     werkelijke.
--
--  2. 6 profielen van vóór 2026-05-31 15:30 CEST. Toen bestond het vinkje nog
--     niet; zij hebben nooit iets aangevinkt.
--
--  3. 2 profielen die via een magic link binnenkwamen. sendMagicLink() toont
--     geen privacyverklaring en geeft geen user-metadata mee, dus ook zij
--     hebben niet getekend. Ze zijn te herkennen aan het ontbreken van
--     full_name in raw_user_meta_data — signUp() zet dat veld altijd.
--
-- Groep 2 en 3 blijven leeg. Een toestemmingsdatum invullen voor iemand die
-- nooit iets is voorgelegd, is de AVG-administratie vervalsen; dat er dan een
-- gat in de registratie blijft, is de juiste uitkomst en geen probleem om weg
-- te poetsen.
--
-- Idempotent: raakt alleen rijen waar privacy_accepted_at nog leeg is, en de
-- ingevulde waarde hangt aan created_at, niet aan now().

update public.profiles as p
set privacy_accepted_at = p.created_at
from auth.users as u
where u.id = p.id
  and p.privacy_accepted_at is null
  and p.created_at >= timestamptz '2026-05-31 15:30:49+02'
  and u.raw_user_meta_data->>'full_name' is not null;

notify pgrst, 'reload schema';
