-- Versiebeheer op de privacyverklaring.
--
-- Tot nu toe legden we alleen vast dát iemand akkoord ging, niet waaróp. Dat is
-- te weinig: toestemming geldt voor de tekst die iemand voorgelegd kreeg, en die
-- tekst is sinds de eerste versie vier keer inhoudelijk gewijzigd. Er kwamen
-- achtereenvolgens trainersinzage, terugschrijven naar Strava, live locatie plus
-- ZWBlokken, en gezondheidsgegevens bij — die laatste een bijzondere categorie
-- onder de AVG. Wie in juni tekende, heeft daar niets over gelezen.
--
-- De terugrekening hieronder is geen schatting: elke grens is het tijdstip van
-- de commit die de tekst wijzigde, en er is gecontroleerd dat geen enkel lid
-- binnen zes uur ná zo'n wissel heeft getekend. Deploy-vertraging kan de
-- toekenning dus niet hebben verschoven.
--
-- Uitkomst op het moment van schrijven: 23 leden op de eerste versie, 2 op
-- `2026-08-07`, 2 op `2026-08-18`. Alleen die laatste twee zijn actueel; de rest
-- krijgt de vraag opnieuw via PrivacyConsentDialog. Dat is de bedoeling en geen
-- bijwerking.
--
-- De kolomwaarden komen overeen met PRIVACY_VERSIONS in `src/lib/privacy.ts`.
-- Komt er een versie bij, dan hoort dat daar en niet hier: deze migratie gaat
-- alleen over wat er in het verleden is getekend.

alter table public.profiles
  add column if not exists privacy_accepted_version text;

update public.profiles
set privacy_accepted_version =
  case
    when privacy_accepted_at >= timestamptz '2026-08-18 17:41:31+02' then '2026-08-18'
    when privacy_accepted_at >= timestamptz '2026-08-07 00:08:33+02' then '2026-08-07'
    when privacy_accepted_at >= timestamptz '2026-07-30 11:05:32+02' then '2026-07-30'
    when privacy_accepted_at >= timestamptz '2026-07-28 13:00:45+02' then '2026-07-28'
    else '2026-05-31'
  end
where privacy_accepted_at is not null
  and privacy_accepted_version is null;

notify pgrst, 'reload schema';
