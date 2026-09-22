# ZWB Platform — Plan & Status

## Actieve volgorde (bijgewerkt 2026-09-21)

Alleen wat nu openstaat, in volgorde. De rondes hieronder en "Bekende open
dingen" geven de details. Het bestuur overweegt een featurepauze (zie de
[gebruiksanalyse](docs/gebruiksanalyse-2026-09-17.md)); tot dat besluit er is,
gaat stabiliteit voor nieuwe features.

1. **Omnium editie 1 (11 oktober).** `0174` toepassen, seizoen `2026-27` plannen
   en publiceren, dan event-ID's, A–E-mapping, reglement, prijzen en de tiebreak
   vastzetten. De beheerketen één keer met de hand doorklikken. Details:
   [Omnium-status](docs/omnium-readiness-2026-09-15.md).
2. **Handwerk op productie.** De cron van
   `/api/strava/sync` op 1x per dag, een week meten, dan opnieuw indienen bij
   Strava (`docs/strava-api-resubmission.md`, via het formulier en niet als
   reply op de afwijzing). De Zwift-routebibliotheek één keer volledig opnieuw
   ophalen na het smoothing-besluit van `0147`, als dat nog niet is gebeurd.
   Voor het Zwift-pacingplan: `0176_event_zwift_rules` en `0177_zwift_bike_parts`
   toepassen en daarna één keer "Fietsen ophalen" op `/beheer/zwift-routes`.
   `0178_event_parent` is toegepast (2026-09-22). Nog toepassen:
   `0179_zrl_parent_team_events`, samen met de deploy van dezelfde commit. Daarna
   `0178` t/m `0183` zijn toegepast, de WTRL-teams zijn geïmporteerd en de drie
   koppelvoorstellen bevestigd (2026-09-22).
3. **Praktijktests die een mens moet doen.** iOS PWA-regressiecheck;
   `docs/training-cockpit-praktijktest.md` met een trainer en een renner, tot en
   met publicatie op Wahoo/Garmin; de eventkaart (hoogteprofiel, POI's, Street
   View, publieke `/live`); de voedingsschermen met een echt account; ZWBgame op
   een echte telefoon.
4. **Trainingskwaliteit.** De FTP-bron is gemeten en afgehandeld (2026-09-21).
   De lage wattages (duurblokken) en de FTP-historie zijn aangepakt
   (2026-09-21): `0175` toepassen, en na een paar weken de duurmeting herhalen.
   Nog open: naleving rond 105% bij blokkige workouts. Zie "Bekende open dingen".
5. **Beheer en import hardenen, als er tijd is.** Echte `activities.csv`-exports
   testen, de eventscan-cron volgen, failure modes aanvullen in `docs/runbook.md`.
   Twee open productvragen uit juni: horen POI's ook in de kalender of livehub,
   en hoe ronden we de achievementkwaliteit af (verborgen proxy- en
   future-badges, de handmatige flow)?

Standaardcheck blijft `npm run lint`, `npm run test` en `npm run build`.

**Let op, dubbele migratienummers (vastgesteld 2026-09-21 bij het samenvoegen):**
`0172` en `0173` bestaan elk twee keer. De ZRL-teamfixes
(`0172_drop_zrl_category_team_seed`, `0173_restore_roster_team_assignment_source`)
en de Zwift/buitenrit-rondes (`0172_zwift_event_cache`,
`0173_outdoor_route_suggestions`) zijn los van elkaar op verschillende branches
genummerd. Ze raken elkaar inhoudelijk niet, dus de volgorde maakt niet uit.
Hernummeren is bewust niet gedaan: de ZRL-paren zijn al met de hand op
productie toegepast, en PLAN.md verwijst op veel plekken naar de nummers. Noem
een migratie daarom met zijn volledige bestandsnaam. De volgende vrije is `0187`.

---

> **WTRL-racepass per team per ronde, 2026-09-22 — gebouwd, lokaal getest.**
> Migratie `0186_team_racepasses.sql` (nog toepassen, na `0185`).
>
> **Waarom.** De eigenaar: bij de ZRL meld je je niet aan via "Aanmelden op Zwift"
> maar met de racepass van je team, die WTRL per ronde uitgeeft. Voor ronde 1 staan
> ze ook op de racepagina van zwbcycling.nl.
>
> **Nu.**
> - Tabel `team_racepasses`: per team, per seizoen en per ronde één WTRL-link, met
>   `valid_from`/`valid_until` uit `ZRL_2026_27_ROUNDS`. Ingevuld via de sectie
>   Racepasses op `/beheer/zrl-kalender` (ronde kiezen, een veld per racend team,
>   een leeg veld wist de pass). Alleen links naar `wtrl.racing` worden geaccepteerd.
> - Op een ZRL-race is "Aanmelden op Zwift" vervangen door de knop **Racepass** van
>   het team van die race (`racepassFor` op racedatum). Op de raceweek staan de passes
>   van je eigen teams als knop, en in de lijst Teams heeft elke teamrace een chip
>   Racepass.
>
> **Bewust niet.** De passes van ronde 1 staan niet in de migratie, omdat de
>   team-id's op productie niet vastliggen; de beheerder plakt ze. Het seizoen
>   `2026/27` staat vast in de action, net als `ZRL_2026_27_ROUNDS`. Voor het
>   volgende seizoen moeten beide mee. Er is geen scraping van WTRL (hun voorwaarden,
>   zie `zrl-season.ts`).
>
> **Niet lokaal te verifiëren:** de migratie en de pagina's met echte data. Getest:
> `tsc`, ESLint en de racepass-cases in `tests/unit/race-links.test.ts`.

---

> **Raceinfo op ZRL-events: pacingplan en racelinks, 2026-09-22 — gebouwd, lokaal getest.**
> Migratie `0185_event_links.sql` (nog toepassen).
>
> **Waarom.** De eigenaar zag op de racedag geen pacingplan op de ZRL-raceweek, en wil
> per race veel meer links kwijt: Zwift-event, ZwiftPower, ZwiftRacing, recon-video's,
> ZwiftInsider en de racepagina op zwbcycling.nl. Het pacingblok hing niet aan de
> datum maar aan "dit event heeft een route", en de ZRL-import maakt raceweken en
> teamraces zonder route aan. Dus geen route, geen pacingplan.
>
> **Nu.**
> - Kaart **Raceinfo** direct onder de header (`race-info-card.tsx`). Die vervangt de
>   oude pacingkaart en de losse knop "Aanmelden op Zwift". Erin staan de knop
>   Pacingplan, Aanmelden op Zwift (alleen vóór de start) en de linkchips. Zwift,
>   ZwiftPower en ZwiftRacing worden afgeleid uit `zwift_event_id`
>   (`src/lib/events/race-links.ts`) en blijven na de start staan. Het ZwiftRacing-
>   formaat `zwiftracing.app/events/<zwift-id>` is gecontroleerd met publieke events.
> - Nieuwe tabel `event_links` (soort recon/zwiftinsider/zwb/overig, optioneel label,
>   alleen https). Het is een tabel, omdat er meerdere recon-video's per race kunnen
>   zijn. Beheer gebeurt via de sectie Links onderaan `/events/[id]/bewerk`
>   (`saveEventLinks`, vervangt het hele setje, zoals de zones). Een teamrace toont
>   zijn eigen links plus die van de raceweek.
> - Op de raceweek staan in de lijst Teams per teamrace de chips Zwift, ZwiftPower en
>   ZwiftRacing: elke divisie heeft een eigen Zwift-event.
> - Een teamrace zonder eigen route neemt de route van de raceweek over
>   (`withParentRoute` in `src/lib/events/route-source.ts`). Dat geldt voor de
>   eventpagina (kaart, Zwift-routeblok) en voor `loadForUser` in
>   `src/lib/pacing/session.ts`. Een eigen aantal rondes gaat voor.
> - Heeft de raceweek zelf geen route, dan wijst Pacingplan naar de race van je eigen
>   team, als die een route heeft. Een plan blijft per teamrace, omdat de Zwift-regels
>   en het aantal rondes per divisie kunnen verschillen.
> - De bewerkpagina geeft `zwift_event_id`, `zwift_route_id` en `laps` nu door aan het
>   formulier, dus "Gekoppeld aan Zwift-event …" verschijnt daar weer.
>
> **Bewust niet.** Recon-video's en ZwiftInsider-pagina's worden niet automatisch
> gezocht; de beheerder plakt ze. De ZRL-import vult geen links in. Dat kan later,
> als de ZWB-site een vast URL-patroon per ronde heeft. De raceweek krijgt geen eigen
> pacingplan dat de teamraces overschrijft.
>
> **Niet lokaal te verifiëren:** de migratie en de pagina met echte data. Zonder
> `0185` levert de linkquery een fout op en blijft de linklijst leeg. De rest van de
> pagina werkt dan gewoon. Getest: `tsc`, ESLint, `tests/unit/race-links.test.ts` en
> de pacing-tests.

---

> **Renner in meer subteams per raceweek, en gevarenzone per niveau, 2026-09-22 — gebouwd, lokaal getest.**
> Migratie `0184_lineup_rider_per_team.sql`.
>
> **Waarom.** De eigenaar: subteams starten op verschillende tijden, dus een renner
> kan in dezelfde raceweek voor twee teams rijden; de selectiemaker liet dat niet
> toe. En op de paraplu van de Zwiftladies (teams op B- en C-niveau) was niet te zien
> op welk niveau iemand in de gevarenzone zat.
>
> **Nu.**
> - `team_event_lineups` is uniek per (event, paraplu, team, renner) in plaats van per
>   (event, paraplu, renner); ook de index voor rosterregels. `claim_roster_entry`,
>   `link_roster_by_zwift_id` en `convert_zrl_umbrella_races` houden rekening met het
>   team. `setTeamLineup` voegt voor een tweede team een regel toe in plaats van te
>   verplaatsen (en zet ja op die tweede race); weghalen haalt alleen de ja op de race
>   van dat team weg. De plusknop is per gekozen team uitgeschakeld.
> - `WtrlRiderSummary.levels`: de status per divisie ("B", "C", "B Dev"). "Bijna te
>   sterk" / "Te sterk" staat per niveau onder de kolom, met het niveau erbij zodra de
>   pagina teams op meer niveaus heeft (`levelsVary`; paraplu's en `/teams`). Op
>   productie: Gina van Rossum "(C)" bij zMAP, Bo van Ruth "(B)" bij beide, Arja
>   Snitselaar "(C)" bij zFTP; bij B: Jos Leijten en Maarten Triebels bij zFTP, Kevin
>   Plasmans bij zMAP, elk met "(B)".
>
> **Niet lokaal te verifiëren:** de migratie. Getest: `tsc`, ESLint, de unit-suite,
> en de niveaus tegen productiedata (alleen lezen).

---

> **"Niet beschikbaar" naast een ja op de subteamrace, 2026-09-22 — gefixt, lokaal getest.**
> Geen migratie.
>
> **Melding van de eigenaar:** Jeroen Janssen stond in de selectiemaker op niet
> beschikbaar, maar zei ja op Bdev. **Gemeten (alleen lezen):** hij zei begin september
> ja op alle Bdev-races en nee op de races van de andere teams, ook die van hoofdteam B.
> `0179` zette die "nee" op de races van het hoofdteam om in "niet beschikbaar" bij
> paraplu B (week 2 t/m 6). Die nee betekende "niet voor dat team", niet "niet die
> week". Alleen Jeroen had deze tegenspraak (5 regels).
>
> **Nu.** Op de teampagina telt een "ja" op de race van een subteam als beschikbaar
> voor die raceweek, ook als bij de paraplu iets anders staat. De 5 regels zelf zet de
> eigenaar recht met SQL.
>
> **Les voor een volgende omzetting:** een "nee" op één teamrace is geen afzegging
> voor de week als hetzelfde lid in die week ja zei op een andere race.

---

> **Opstelling van de paraplu op de races van de subteams, 2026-09-22 — gebouwd, lokaal getest.**
> Geen migratie.
>
> **Melding van de eigenaar:** selecteren in paraplu B leek niet door te werken naar
> de subteams. **Gemeten (alleen lezen):** de opstellingen stonden goed, 15 regels op
> raceweek 1 onder B (5× B1, 5× B2, 5× Bdev), en de teampagina's van de subteams lezen
> dezelfde regels. Wat ontbrak: de racepagina van een subteam en de raceweekpagina
> toonden de opstelling niet (alleen RSVP's).
>
> **Nu.** De raceweekpagina toont onder elk team de opgestelde renners; de race van
> een subteam heeft een blok "Opstelling" met de renners die voor dat team zijn
> opgesteld (op de raceweek of op de race zelf), jijzelf gemarkeerd. Namen van
> renners zonder account komen uit het rooster. De query noemt de koppeling
> `profiles!team_event_lineups_profile_id_fkey`: `team_event_lineups` heeft twee
> verwijzingen naar `profiles` (`profile_id`, `selected_by`), en zonder die naam geeft
> PostgREST "more than one relationship" en blijft de lijst stil leeg (getoetst op
> productie).
>
> **Opstellen is een ja (zelfde dag, commit hieronder).** Keuze van de eigenaar:
> opgesteld worden is een "ja" op de race van dat team, ook over een eerdere "nee"
> heen. `setTeamLineup` zet de RSVP op de race van het doelteam (op de raceweek gezocht
> via `parent_event_id` + team, of de race zelf bij een team zonder subteams) en zet de
> race via `syncEventWorkout` in het trainingsschema, met een herplanning als er iets
> veranderde. Verplaatsen naar een ander subteam of weghalen haalt de RSVP en het
> blok van de oude race weg. Via `0171` word je daarmee ook lid van dat subteam.
> Renners zonder account hebben geen RSVP. Geen inhaalslag voor bestaande opstellingen
> (raceweek 1 was dezelfde avond); het geldt vanaf de volgende wijziging. Staat er nog
> geen race voor het doelteam, dan gebeurt er niets met de RSVP.
>
> **Opgemerkt op productie:** twee paraplu's voor de vrouwen: "ZRL Zwiftladies" (met
> "ZRL Zwiftladies B" en "ZRL Zwiftladies C") en "ZWB Zwiftladies" (met "Zwiftladies
> C"). "ZRL Zwiftladies" is de echte. "ZWB Zwiftladies" bleek het Club Ladder-team (op
> het kerkhof, met een actieve ladder-sync, zoals de andere drie ladderteams); alleen
> "Zwiftladies C" is dubbel en leeg. Advies en SQL aan de eigenaar gegeven: alleen
> "Zwiftladies C" verwijderen. De sessie mocht zelf niet verwijderen.

---

> **Rosternaam en account met hetzelfde Zwift-ID koppelen, plus koppelvoorstellen op naam, 2026-09-22 — gebouwd, lokaal getest.**
> Migratie `0183_link_roster_by_zwift_id.sql`.
>
> **Aanleiding.** Pim stond bij A als "niet geregistreerd" én met zijn account in de
> lijst van B. **Gemeten op productie (alleen lezen, 2026-09-22):** 35 goedgekeurde
> accounts, 27 met Zwift-ID, geen enkel Zwift-ID in een verkeerd formaat. 8 van de 27
> accounts met Zwift-ID claimden hun rosternaam nooit, en 8 ongeclaimde rosternamen
> droegen het Zwift-ID van een account (4 daarvan bij een team en dus dubbel: Pim,
> Tako Tabak, Niels Leerentveld, Maarten Smits). Van de 46 WTRL-renners waren er 23
> via Zwift-ID gekoppeld, 3 hadden een account op naam zonder Zwift-ID (Daan Mulder,
> Michiel van den Beuken, Sanneke Maas) en 20 hebben geen account. Oorzaak: claimen is
> een aparte stap die leden overslaan. Pim stond bij B door "Beschikbaar" voor een
> raceweek van B (21 september, van vóór de raceweekfix); hij is geen lid van B.
>
> **Nu.**
> - `link_roster_by_zwift_id(profiel)`: een ongeclaimde rosternaam met het Zwift-ID van
>   precies één account wordt door dat account geclaimd, met lidmaatschap van het team
>   van de naam (herkomst `wtrl` of `roster_claim`; een seed-override wint; niet bij
>   `auto_zrl_category` of `manual_excluded`) en de opstellingen gaan mee. Het profiel
>   zelf wordt niet aangepast. Draait één keer voor iedereen en via een trigger zodra
>   een profiel een Zwift-ID krijgt of wijzigt.
> - **Koppelvoorstellen** op `/beheer/wtrl-teams`: een WTRL-renner zonder account met
>   dat Zwift-ID, met precies één account van dezelfde naam dat nog geen Zwift-ID heeft
>   (`suggestProfileLinks`, naamvergelijking zonder accenten, tussenvoegsels en
>   "[ZWB]"). "Koppelen" zet het Zwift-ID op het profiel (de trigger claimt de naam) en
>   deelt de gekoppelde WTRL-teams van die renner opnieuw in. Op productie levert dit
>   nu precies Daan, Michiel en Sanneke op.
>
> **Bewust niet gebouwd.** Geen automatische koppeling op naam: twee mensen kunnen
> dezelfde naam hebben. Pims "Beschikbaar" bij B en zes oude "Niet"-opgaves van
> niet-leden (Bart bij B en Zwiftladies, Jeroen Janssen bij Zwiftladies W1–W4, van
> 1–14 september, door `0179` overgezet) zijn op verzoek van de eigenaar door hem
> zelf verwijderd met SQL (2026-09-22); de sessie mocht geen productiedata wijzigen.
>
> **Niet lokaal te verifiëren:** de migratie. Getest: `tsc`, ESLint,
> `wtrl-membership.test.ts` (13), de volledige unit-suite, en de voorstellen tegen
> productiedata (alleen lezen).

---

> **Watt/W/kg-keuze bij teams, 2026-09-22 — gebouwd, lokaal getest.**
> Geen migratie.
>
> **Waarom.** De eigenaar: de teamtabellen toonden overal watt én W/kg (ook bij zFTP
> en zMAP), dat is te veel. Dezelfde keuze als bij ZWBeter Worden.
>
> **Nu.** `teams/layout.tsx` zet de `PowerUnitProvider` (cookie `zwb-power-unit`,
> dezelfde als ZWBeter Worden) om alle teampagina's. De schakelaar staat boven de
> rennerslijst. Rostertabel (teampagina en `/teams`) en opstellingsplanner tonen één
> eenheid; sorteren volgt de gekozen eenheid. zMAP in watt is teruggerekend via het
> gewicht dat uit zFTP W en zFTP W/kg volgt (WTRL geeft zMAP alleen in W/kg).
> De planner toont FTP nu in de gekozen eenheid in plaats van altijd W/kg.
> **Bijgewerkt 2026-09-22:** zFTP en zMAP zijn twee kolommen (elk sorteerbaar); onder
> zFTP de categorie, onder zMAP het advies en "Te sterk". De teamkolom is smaller
> (`max-w-36`), er staat weinig tekst in. Op de telefoon blijft het één regel.
> **Bijgewerkt 2026-09-22 (2):** de naam kleurt **rood** als de renner te sterk is voor
> de WTRL-divisie van zijn team, en **oranje** in de gevarenzone: zFTP of zMAP (W/kg)
> binnen 5% onder de bovengrens (`divisionStatus`, `DANGER_MARGIN`). Bovengrens:
> Standard = ondergrens van de categorie erboven (A heeft er geen), Development = het
> Dev-plafond. De gevarenzone kijkt alleen naar W/kg, niet naar de wattvloer van Open.
> "Te sterk" of "Bijna te sterk" staat onder de kolom van de waarde die de grens
> nadert of overschrijdt (`metricStatus`; eerst altijd onder zMAP), zodat het niet
> alleen aan kleur hangt. Boven de W/kg-grens maar onder de wattvloer van Open is een
> waarschuwing, geen rood.
> **Bijgewerkt 2026-09-22 (3), selectiemaker per event:** de opstellingsplanner heeft
> geen kolom "Profiel" meer; beschikbaarheid is een teken (✓ ja, ? misschien, ✗ nee,
> - niet opgegeven, met het woord als tooltip en schermlezertekst). Zodra een renner op
> de pagina WTRL-gegevens heeft, toont de planner zFTP en zMAP (met "Bijna te sterk" /
> "Te sterk" per kolom en de naam in rood/oranje) in plaats van 5m, 20m en FTP; teams
> zonder WTRL-gegevens (ladder) houden die. De categorie naast de naam komt dan uit
> WTRL. De weergave staat gedeeld in `teams/_components/wtrl-cells.tsx`. Staat een renner in meerdere teams, dan telt het zwaarste. Op productie
> (alleen lezen) nu niemand rood en zes oranje: Jos Leijten, Kevin Plasmans en Maarten
> Triebels (B1), Bo van Ruth (Zwiftladies), Gina van Rossum en Arja Snitselaar
> (Zwiftladies C).
>
> **Niet lokaal te verifiëren:** weergave tegen echte data. Getest: `tsc`, ESLint,
> de volledige unit-suite.

---

> **Renners zonder account in de opstelling, 2026-09-22 — gebouwd, lokaal getest.**
> Migratie `0182_lineup_roster_entries.sql`.
>
> **Waarom.** De eigenaar: de app is nog in opbouw, veel renners hebben nog geen
> account, maar ze rijden wel. De captain moet ze kunnen opstellen, en na aanmelden
> hoort de opstelling bij hun profiel.
>
> **Nu.** `team_event_lineups` heeft `roster_entry_id` (naar `roster_entries`,
> `on delete cascade`); `profile_id` mag leeg zijn, met de check dat precies één van
> beide gevuld is en een unieke index per raceweek voor rosterregels.
> `setTeamLineup` neemt `{kind: "profile" | "roster", id}`. De opstellingsplanner
> toont de niet-geregistreerde renners van de teams op de pagina, met het label.
> `claim_roster_entry` zet bij claimen de rosterregels om naar het profiel; stond het
> profiel in dezelfde raceweek al zelf opgesteld, dan wint die regel.
> `convert_zrl_umbrella_races` (0179) neemt rosterregels mee: de oude versie kende
> alleen profielen en zou op de nieuwe check stuklopen zodra een team een eerste
> subteam krijgt. De TTT-planner slaat rosterregels over (geen vermogensprofiel).
>
> **Niet lokaal te verifiëren:** migratie en claimen tegen echte data. Getest: `tsc`,
> ESLint, de volledige unit-suite.

---

> **Niet-geregistreerde renners in de rostertabel, 2026-09-22 — gebouwd, lokaal getest.**
> Geen migratie.
>
> **Waarom.** Wens van de eigenaar: rosternamen zonder account (o.a. uit de
> WTRL-import) horen in de rennerslijst van hun team, niet in een apart blok.
>
> **Nu.** De teampagina zet de ongeclaimde rosternamen van de teams op de pagina
> in de rostertabel, met het team, de categorie (`pace_category`), de WTRL-waarden
> en het label "niet geregistreerd"; de naam linkt niet naar een ledenpagina. Het
> blok "Nog niet geregistreerd" is weg. Ze tellen niet mee in "Renners". (Eerst
> stonden ze niet in de opstellingsplanner; sinds de ronde hierboven wel.) `/teams` is niet
> aangepast: dat overzicht toont leden.
>
> **Vraag van de eigenaar, beantwoord zonder code:** A1 en C1 hoeven nu niet. A en C
> hebben bij WTRL elk één team en rijden dus zelf; maak een subteam pas als er een
> tweede team in die categorie komt (de trigger uit `0179` zet A dan om, en op
> `/beheer/wtrl-teams` koppel je het WTRL-team aan het subteam).

---

> **Afzeggers verschenen als renner bij teams, 2026-09-22 — gefixt, lokaal getest.**
> Geen migratie.
>
> **Melding van de eigenaar:** Bart, Pim en Jeroen stonden bij teams waar ze geen
> lid van zijn. Twee oorzaken. (1) De teampagina zette iedereen met een
> beschikbaarheidsopgave voor het team in de rennerslijst, ook bij "Niet" (van vóór
> `0171`, toen beschikbaar melden je nog geen lid maakte). (2) De raceweekpagina
> (ronde "ZRL: hoofdteams zijn paraplu's") toonde wie in geen enkele paraplu zit de
> knoppen van álle paraplu's; A-renners zagen zo B en de Zwiftladies en klikten
> "Niet". Daarnaast zette `0179` een "nee" op een race van een hoofdteam om in "niet
> beschikbaar" bij dat hoofdteam.
>
> **Nu.** Niet-leden staan alleen in de rennerslijst bij "beschikbaar" of
> "misschien". De raceweekpagina toont alleen je eigen paraplu's; wie in geen enkele
> zit, meldt zich aan op de race van zijn eigen team. De opgaves zelf blijven staan.
>
> **Niet opgelost door deze fix:** wie via die knoppen op "Beschikbaar" klikte, is
> via `0171` echt lid geworden van dat hoofdteam (herkomst `event_availability`). Die
> haalt een captain of beheerder met de hand weg; de seed-override houdt hem eruit.

---

> **WTRL-import deelt renners in, 2026-09-22 — gebouwd, lokaal getest.**
> Implementatiecommit `e24c5ce`, migratie `0181_wtrl_team_membership.sql`. Vervolg op de WTRL-teams hieronder.
>
> **Waarom.** De eigenaar zag dat de import (0180) alleen een aparte tabel vulde:
> niemand kwam in een team, renners zonder account kwamen niet in het rooster, en de
> waarden stonden in een tweede tabel naast de rostertabel. WTRL is leidend voor wie
> in welk team rijdt.
>
> **Nu.** Per geplakt én gekoppeld WTRL-team (`lib/teams/wtrl-membership.ts`, puur):
> - **Lid bij WTRL met ZWB-account** (Zwift-ID op het profiel, of een geclaimde
>   rosternaam met dat Zwift-ID): lid van het ZWB-team, herkomst `wtrl` (nieuw op
>   `team_members.assignment_source`). Een seed-override van een captain wint.
> - **Zonder account:** rosternaam bij dat team, herkomst `wtrl` (nieuw op
>   `roster_entries.team_assignment_source`). Bestaande namen worden hergebruikt (op
>   Zwift-ID, anders op naam) en houden hun spelling; `manual_excluded` blijft met
>   rust. `claim_roster_entry` geeft bij een WTRL-naam een lidmaatschap met herkomst
>   `wtrl` in plaats van `roster_claim`, zodat de volgende import het kan opruimen.
> - **Vertrokken bij WTRL:** lidmaatschap met herkomst `wtrl` gaat eruit; een
>   ongeclaimde WTRL-rosternaam wordt losgekoppeld (niet verwijderd). `manual`,
>   `roster_claim` en `event_availability` blijven altijd staan. Teams die niet in de
>   plak staan of niet gekoppeld zijn, raakt de import niet; een team waarvan geen
>   renners zijn gelezen, wordt niet opgeruimd.
> - **Uitgenodigd** bij WTRL telt nog niet als lid: niet toegevoegd, en een
>   WTRL-lid dat weer "uitgenodigd" wordt, gaat eruit.
> - **Eén tabel:** de rostertabel (teampagina én `/teams`) heeft een kolom
>   "zFTP · zMAP" met categorie, W, w/kg, zMAP w/kg, advies en "Te sterk"; op de
>   telefoon als regel op de rennerkaart. Niet-geregistreerde renners staan sinds de
>   ronde hierboven in diezelfde tabel. Het aparte WTRL-blok is weg. Staat iemand in twee WTRL-teams, dan telt
>   "te sterk" als hij in één ervan niet past (`summarizeWtrlRiders`).
>
> **Bekende beperking.** Een rosternaam is uniek en hoort bij één team: een renner
> zonder account die bij WTRL in B1 én B2 staat, verschijnt in het rooster van het
> laatst verwerkte team.
>
> **Privacy.** De tekst van 0180 is aangevuld met de indeling in ZWB-teams en het
> rooster voor renners zonder account; akkoord van de eigenaar 2026-09-22, geen
> nieuwe privacyversie.
>
> **Niet lokaal te verifiëren:** migratie en import tegen echte data. Getest: `tsc`,
> ESLint, `wtrl-membership.test.ts` (11) en de volledige unit-suite (1578 groen).

---

> **zFTP, zMAP en divisieadvies per renner uit WTRL, 2026-09-22 — gebouwd, lokaal getest.**
> Implementatiecommit `749958b`, migratie `0180_wtrl_rosters.sql`. Onderzoek: de ronde hieronder ("zFTP/zMAP …
> eerst meten").
>
> **Waarom.** Wens van de eigenaar: bij teams per renner zFTP, zMAP en de
> aanbevolen WTRL-divisie. **Gemeten met "Test zFTP":** `power-curve/power-profile`
> negeert `profileId` en geeft altijd het eigen profiel van het serviceaccount;
> `profiles/{id}` geeft van anderen alleen categorie, racing score en de in-game
> FTP (geen zFTP). WTRL heeft zFTP/zMAP wel, omdat elke deelnemer sinds juni 2025
> zijn Zwift-account aan WTRL koppelt (partnertoegang; Zwift geeft geen
> developer-accounts aan hobbyontwikkelaars). Keuze van de eigenaar: hij plakt de
> tekst van WTRL "My Teams".
>
> **Nu.**
> - `/beheer/wtrl-teams` (recht `teams.manage_roster`): tekst plakken, ZWB leest per
>   team TRC-referentie, seizoen, divisie en captain, en per renner Zwift-ID, status
>   (lid/uitgenodigd), zFTP (W en w/kg) en zMAP (w/kg). Per WTRL-team kies je het
>   ZWB-team (standaard de vorige keuze, anders gelijke naam). Opnieuw plakken
>   vervangt de renners van dat team. Tabellen `wtrl_teams` en `wtrl_team_riders`,
>   lezen voor ingelogde leden, schrijven via de serveractie.
> - **Teampagina:** eerst een aparte tabel per WTRL-team; sinds de ronde hierboven
>   (0181) een kolom in de rostertabel.
> - **Rekenregels** (`lib/teams/wtrl-roster.ts`), van
>   https://www.wtrl.racing/zrl/resources/: een categorie haal je met zFTP óf zMAP
>   (w/kg), bij Open plus een wattvloer (A 250, B 200, C 150 W), bij Womens zonder
>   vloer. Development: beide waarden onder het plafond van die categorie. Hoger
>   rijden mag; in een Dev-divisie moet je onder het plafond van de divisie blijven.
>   **Getoetst op de echte plak** (56 renners, 7 teams, in de scratchpad, niet in
>   de repo): de uitgerekende categorie was overal gelijk aan die van WTRL. De test
>   in de repo (`wtrl-roster.test.ts`) gebruikt verzonnen namen met echte waarden.
>
> **Bewust niet gebouwd.** Geen automatische ophaal bij WTRL (hun voorwaarden
> verbieden scraping) en geen Zwift-login per lid (tegen de Zwift-voorwaarden en we
> zouden wachtwoorden bewaren). De 3-race-regel voor opwaarderen midden in een ronde
> zit niet in "past in divisie". Geen koppeling met `profiles.zrl_category`: de
> WTRL-waarden overschrijven niets op het profiel. (Indelen in teams kwam er in de
> ronde hierboven wel bij.)
>
> **Privacytekst.** Nieuwe bron van gegevens over renners, ook van renners
> zonder ZWB-account (naam, Zwift-ID, zFTP in W en w/kg, waaruit gewicht af te
> leiden is). Tekst door de eigenaar akkoord bevonden (2026-09-22) en in `/privacy`
> gezet onder "Welke gegevens we verwerken"; geen nieuwe privacyversie.
>
> **Niet lokaal te verifiëren:** migratie en pagina's tegen echte data. Getest: `tsc`,
> ESLint, de volledige unit-suite.

---

> **ZRL: hoofdteams zijn paraplu's, 2026-09-22 — gebouwd, lokaal getest.**
> Implementatiecommits `8c06cd4` en `732f3a4` ("ZRL-paraplu: aanmelden op de
> raceweek, trigger bij eerste subteam, zFTP-probe"). Migratie
> `0179_zrl_parent_team_events.sql`. Vervolg op de hoofdevents hieronder.
>
> **Waarom.** Regel van de eigenaar: een ZRL-team met subteams (B met B1/B2, de
> Zwiftladies, en ook A en C zodra die subteams krijgen) is een paraplu. Het rijdt
> zelf geen races, maar leden melden zich er per raceweek beschikbaar en de
> captain deelt ze in bij een subteam. De import zette er toch races voor neer.
>
> **Nu.**
> - **Aanmelden** bij een paraplu gebeurt op het hoofdevent van de raceweek
>   (beschikbaarheid met `team_id` = paraplu). Kan op de teampagina en op de
>   raceweekpagina zelf ("Ben jij erbij?" per paraplu, alleen die van jou; tot de
>   fix "Afzeggers verschenen als renner" ook alle als je er in geen zat). Een
>   raceweek heeft geen RSVP. Aanmelden maakt je via `0171`
>   lid van de paraplu, zoals eerst.
> - **Teampagina** van een paraplu (en van zijn subteams): de komende zes raceweken,
>   ook als er nog geen subteamrace onder hangt, met de races van de subteams als
>   links. Beschikbaarheid en opstellingsplanner werken op de raceweek; de paraplu
>   zelf is geen doel in de planner. Teams zonder subteams houden hun eigen races.
> - **Migratie `0179`:** functie `convert_zrl_umbrella_races(team)` verhuist
>   beschikbaarheid, opstellingen en TTT-plannen van de paraplu naar de raceweek
>   (bij dubbele opgave wint de laatste), zet een RSVP op een race van de paraplu om
>   in beschikbaarheid (ja → beschikbaar, misschien → misschien, nee → niet
>   beschikbaar; een bestaande opgave wint) en verwijdert daarna de races van de
>   paraplu. Draait één keer voor alle bestaande paraplu's, en via de trigger
>   `teams_become_umbrella` opnieuw zodra een team een (eerste) subteam krijgt.
>   A en C worden dus paraplu door een subteam aan te maken, daarna importeer je de
>   races voor dat subteam.
> - **Import** (`/beheer/zrl-kalender`): paraplu's staan niet in de lijst en de
>   serveractie weigert ze.
> - **Kalender "Voor mij":** lid van een paraplu telt als eigen team voor de races
>   van zijn subteams.
> - **Meegenomen:** `setTeamAvailability` deed een upsert zonder `onConflict`, terwijl
>   de unieke sleutel `(event_id, team_id, profile_id)` is. Een andere status kiezen
>   liep daardoor waarschijnlijk op een unieke-sleutelfout; nu expliciet.
>
> **zFTP/zMAP en aanbevolen WTRL-divisie: nog niet gebouwd, eerst meten.** Wens van
> de eigenaar: per lid zFTP en zMAP via het Zwift-ID, met de aanbevolen divisie.
> De drempels staan op https://www.wtrl.racing/zrl/resources/ (Standard en
> Development, Open en Women's; gelezen 2026-09-22, het lezen van die pagina met
> de hand is geen scraping). Onbekend is of Zwift zFTP/zMAP van *andere* renners
> geeft: de officiële API bestaat niet, en voor zover bekend geeft de onofficiële
> alleen categorie en racing score, en zFTP/zMAP alleen van je eigen account.
> Keuze van de eigenaar: eerst testen. Daarvoor staat op `/beheer/event-scan` de
> knop **Test zFTP** (Zwift-ID invullen): die bevraagt met het club-serviceaccount
> `profiles/{id}` en twee `power-curve/power-profile`-varianten, en toont per
> endpoint de status, de velden over vermogen/categorie met waarde en de andere
> veldnamen zonder waarde (dus geen gewicht, leeftijd of naam). Leest alleen.
> Daarna kiezen: automatisch, zelf invullen door het lid, of allebei.
>
> **Bewust niet gebouwd.** Trainingsblokken die aan een race van de paraplu hingen,
> worden niet omgehangen: ze blijven in het schema zonder koppeling
> (`on delete set null`). Races van paraplu's met een met de hand hernoemde titel
> (zonder hoofdevent, zie `0178`) raakt de functie niet; die verwijder je met de hand.
>
> **Niet lokaal te verifiëren:** de migratie, de teampagina en de raceweekpagina
> tegen echte data, en wat Zwift teruggeeft. Getest: `tsc`, ESLint, de volledige
> unit-suite (1558 groen), met `zwift-rider-power-probe.test.ts` voor het
> weglaten van persoonsgegevens in de probe.

---

> **ZRL: één hoofdevent per raceweek, de teams eronder, 2026-09-22 — gebouwd, lokaal getest.**
> Implementatiecommit `4cce2dc` (branch `claude/zrl-events-subevents-c0df69`, nog niet gepusht).
> Migratie `0178_event_parent.sql`.
>
> **Waarom.** Wens van de eigenaar: informatie die voor elke ZRL-race geldt, moet
> nu per team worden ingevuld, want de import zette per team een eigen event neer.
> De kalender stond daardoor ook vol met dezelfde race onder vijf namen.
>
> **Nu.** `events.parent_event_id` (nullable, `on delete set null`). De ZRL-import
> op `/beheer/zrl-kalender` maakt per raceweek één hoofdevent zonder team, met de
> omschrijving (Race of Truth of "Ronde x, week y"), en hangt de teamevents eronder.
> Hoofdevents worden herkend aan de dag, teamevents aan (team, starttijd); een
> teamevent zonder hoofdevent wordt bij opnieuw importeren alsnog gekoppeld.
> De migratie groepeert de bestaande teamevents op het titelpatroon
> `ZRL <seizoen> · R<n> · W<n> · <team>`; met de hand hernoemde titels blijven los.
> - Het **teamevent** houdt alles wat per team verschilt: starttijd, Zwift-link en
>   parcours, RSVP, beschikbaarheid en opstelling. Het toont de omschrijving van het
>   hoofdevent boven zijn eigen omschrijving, en linkt terug naar het hoofdevent.
> - Het **hoofdevent** toont de teams eronder (jouw team bovenaan, gemarkeerd) en
>   heeft geen "Ben jij erbij?": een ja hoort bij een team (migr. `0171` zet je dan
>   in dat team).
> - **Kalender:** alleen het hoofdevent, met een knop per team. "Voor mij" rekent
>   het hoofdevent als passend als een van de teamevents past; de ja's van de
>   teamevents staan samen op het hoofdevent. **Dashboard:** komende events zonder
>   teamevents. **Schema** (`loadScheduleEvents`): zonder hoofdevents, zodat je daar
>   niet op het geheel ja kunt zeggen.
>
> **Bewust niet gebouwd.** Geen overerving van parcours of Zwift-regels van hoofd-
> naar teamevent: elk team heeft zijn eigen Zwift-event, en dat levert route en
> regels al (`zwift_event_id` per team). Overerving zou ook de pacingpagina raken.
> `/ritverslagen` is niet aangepast: verslagen en foto's staan op de teamevents, dus
> daar blijven die staan; een leeg hoofdevent kan er tussen staan. Geen algemene
> "subevent"-knop in het eventformulier: alleen de ZRL-import maakt hoofdevents.
>
> **Niet lokaal te verifiëren:** de migratie (geen Docker/Supabase-config), en de
> pagina's tegen echte data (geen `.env.local` in de worktree). Getest: `tsc`,
> ESLint op de gewijzigde bestanden, `tests/unit/event-sub-events.test.ts`
> (groeperen, teamlabel, hoofdevents wegfilteren, groepsfit) en de volledige
> unit-suite (1550 groen; `omnium-live` faalt alleen op de ontbrekende `.env.local`).

---

> **Pacingplan voor Zwift: format, fiets, slipstream, wegdek en powerups, 2026-09-21 — gebouwd, lokaal getest.**
> Commit `f805658`, gepusht naar `main` 2026-09-21. Migraties
> `0176_event_zwift_rules.sql` (spelregels op `events`) en
> `0177_zwift_bike_parts.sql` (fietslijst). Onderzoek en ijking:
> [zwift-race-opzet-spike](docs/zwift-race-opzet-spike.md).
>
> **Waarom.** Vraag van de eigenaar: de pacingplanner is gebouwd voor buitenritten
> en rekende een Zwift-wedstrijd als solo-inspanning met buitenfysica (CdA 0,32,
> Crr 0,005, 9 kg), zonder slipstream, fietskeuze of powerups. Keuzes van de
> eigenaar: het format is te kiezen en staat vooraf op de eventregels (wedstrijd,
> tijdrit, ploegentijdrit); fietsen uit de **volledige** ZwiftInsider-testsheet,
> hoewel daar geen licentie of API voor hergebruik bij hoort (risico genoemd,
> eigenaar koos toch); powerups tellen mee in de tijd; gravel en ander wegdek
> meenemen.
>
> **Wat er is gekomen.**
> - `src/lib/pacing/zwift-setup.ts` (puur): format, fiets, eventregels →
>   `RidePhysics`. Geijkt op de referentiefiets van de sheet (CdA 0,3191 en
>   2,42 kg in ons model bij 183 cm/75 kg; vrij gefit is de rolweerstand 0,0040,
>   Zwifts eigen asfaltwaarde). CdA schaalt met lengte en gewicht.
> - `ride-estimate.ts`: een segment mag eigen `cda`, `crr` en `massKg` hebben.
>   Zonder blijft alles gelijk; buitenritten rekenen exact als voorheen (alle
>   bestaande tests ongewijzigd groen).
> - `evaluatePlan` krijgt `ride`: per segment slipstream naar positie
>   (`PlanSegment.position`, in de groep of alleen), rolweerstand naar wegdek en
>   fietstype, en powerups (`PlanSegment.powerup`) over de eerste seconden van
>   hun stuk, naar rato binnen een segment.
> - Wedstrijd: vaste stukken `start` (700 m, 40 % van W′ over 60 s) en `sprint`
>   (laatste 300 m, 50 % van W′ over 20 s; niet als de finish op een klim ligt)
>   via `imposeFixedPieces`. Ze worden niet teruggeschaald; tot de sprint moet
>   15 % van W′ over zijn (`RACE_RESERVE_FRACTION`), anders is het plan niet
>   haalbaar. Raakt de reserve pas in de sprint op, dan zet `rebalancePlan` de
>   sprint op wat er over is. Een ander format laat start en sprint opgaan in
>   hun buurman. Een restje naast een vast stuk mag bij het opslaan korter zijn
>   dan 0,5 km: dat liet het platform zelf staan.
> - Wegdek: de vlakken van ZwiftMap (MIT, `src/lib/zwift/surfaces/`) over
>   `zwift_routes.shape`; per segment een `surface`, en een band onder het
>   profiel. De Crr-tabel staat apart (`crr.ts`) zodat de 33 kB aan vlakken niet
>   in de browserbundel komt.
> - Spelregels: `rulesSet`, `tags` en `bikeHash` van event en subgroepen
>   (`zwiftEventRules`), bewaard bij het opslaan van een event, en voor oudere
>   events één keer opgehaald zodra een lid het pacingplan opent.
> - Fietsen: `bike-sheet.ts` (puur) en `bike-sync.ts`, knop "Fietsen ophalen" op
>   `/beheer/zwift-routes`. 993 onderdelen (frames per upgradeniveau, wielen per
>   testframe). Een verboden tijdritfiets valt terug op de referentiefiets.
>   *Gerepareerd na de push (2026-09-21):* de knop gaf "De sheet gaf status
>   400". Het framestabblad heeft gid `173681512`, niet `0`; in de spike was
>   dat tabblad zonder gid opgehaald. Nagetrokken tegen de echte sheet met een
>   nep-database: 847 frame-varianten en 146 wielsets, allemaal een unieke
>   sleutel, referentie CdA 0,3191 en 2,42 kg zoals in `zwift-setup.ts`.
> - Opslag zonder planmigratie: de keuzes in `assumptions.setup`, een
>   vingerafdruk van de fysica in `assumptions.rideKey`. Een Zwift-plan van vóór
>   vandaag is één keer verouderd (`StaleReason` "opzet"), net als bij de
>   afdalingen; daarna alleen als fietslijst of spelregels veranderen.
> - Scherm: blok "Opzet" (format, frame, upgrade, wielen, ploeggrootte), per stuk
>   In de groep/Alleen en een powerupkeuze. Nieuwe actie `savePacingSetup`
>   rekent meteen door. Gedeelde plannen tonen format en fiets van de maker.
> - AI: schema per stuk met `position` en `powerup`, context `zwift` (format,
>   fiets, powerups, wegdek, vaste stukken, reserve), promptregels. `adopt.ts`
>   laat alleen geldige waarden staan.
> - `/hulp#pacing-zwift` plus zoekentry.
>
> **Lengte.** Zwift rekent de luchtweerstand met de lengte. Keuze van de
> eigenaar: de lengte uit het receptenboek (`nutrition_profiles`) gebruiken, de
> beperking "alleen voor recepten" uit de privacyverklaring halen, en **geen
> nieuwe privacyversie**, omdat de lengte al was opgegeven. Dat wijkt bewust af
> van de regel in `src/lib/privacy.ts`. De opmerking in migratie `0168` ("alleen
> gebruikt om receptingrediënten te schalen") is sindsdien niet meer waar;
> migraties zijn geschiedenis en zijn niet aangepast. De lengte gaat niet naar de
> AI en niet mee in een gedeeld plan.
>
> **Aannames, niet gemeten.** Slipstream −30 % luchtweerstand (tijdritfiets
> −15 %, `doubledraft` twee keer zoveel), draft boost ×1,5 op de besparing,
> aambeeld +10 % lichaamsgewicht, en de Zwift-nummering van powerups buiten
> 0 en 8. Start 700 m, sprint 300 m en de W′-aandelen zijn keuzes bij de bouw.
>
> **Bewust niet gebouwd.** Geen wegdek bij een .gpx-route (daar staat het niet
> in); geen wegdek in de lead-in (geen vorm); geen voorspelling van wanneer het
> veld breekt (positie kiest het lid of de AI); geen burrito, spook of pijlen
> (werken niet op je eigen tijd); geen hernoeming van opgelegde wielen, want die
> ids staan niet in `zwift-data`; geen koppeling met het TTT-plan van ZwiftGopher
> (kopbeurten volgen uit de ploeggrootte). Geen aparte commits per ronde zoals
> eerst gepland: het werk hangt zo aan elkaar dat losse stappen niet te testen
> waren.
>
> **Verificatie.** `tsc --noEmit` schoon, eslint zonder fouten, Vitest 1537
> geslaagd (nieuw: `pacing-zwift.test.ts` 37, `zwift-bike-sheet.test.ts` 7, met
> echte uitsnedes van sheet en event-API in `tests/fixtures/zwift/`).
> `tests/unit/omnium-live.test.ts` faalt in deze worktree op een ontbrekende
> `.env.local`, los van deze ronde. `npm run build` compileert; het prerenderen
> strandt lokaal op `/omnium` zonder Supabase-sleutels, zoals eerder.
> **Niet lokaal geverifieerd:** migraties `0176` en `0177` (geen Docker of
> Supabase-config), de knop "Fietsen ophalen" tegen de database, het ophalen van
> spelregels voor een bestaand event, een ingelogde pacingpagina en een echte
> AI-generatie.

> **WTRL-resultatensync uitgezet, link naar de WTRL-uitslag, 2026-09-21 — gebouwd, lokaal getest.**
> Commits `b90153a` en `a6f4e3a`, gepusht naar `main` 2026-09-21. Geen migratie. Op productie zijn de drie WTRL-bronnen (`ZWB Cycling B1`,
> `ZWB Cycling C1`, `ZWB Zwiftladies`) met de hand op `enabled = false` gezet.
> **Waarom.** Met een verse `WTRL_COOKIE` en een nieuwe deploy gaf WTRL op de
> eerste aanvraag per bron HTTP 429. Dat is een blokkade, geen echte
> rate limit: het zijn drie aanvragen per sync. De
> [WTRL-voorwaarden](https://www.wtrl.racing/terms-of-service.php) verbieden het
> aanroepen van hun endpoints van buiten wtrl.racing zonder schriftelijke
> toestemming. Ze dreigen met IP-blokkades en met het intrekken van het
> lidmaatschap van het account achter de cookie. `team_results` en
> `zrl_rider_results` waren op productie leeg: deze sync heeft nog nooit een
> resultaat opgeslagen. **Nu:** `syncTeamResults()` slaat WTRL-bronnen over en
> maakt ze niet meer automatisch aan, tenzij `WTRL_SYNC_ENABLED=true`. De
> WTRL-code blijft staan voor het geval er toestemming komt.
> **Gevonden, bewust niet gerepareerd** (pas relevant na toestemming):
> `knownWtrlCandidates()` zet B1 altijd eerst op 2025/26 Round 4 Race 4, en de
> sync stopt bij de eerste race met een resultaat. B1 kan dus nooit iets nieuws
> ophalen. Competities worden in WTRL-volgorde doorlopen, niet van nieuw naar
> oud. Zwiftladies zoekt in E-divisies, omdat `/[ABCDE]/i` de "e" uit "Women"
> pakt. **Ook gevonden, niet in deze ronde:** Club Ladder vindt geen enkel team
> op `/summary`. `fetchHeaders()` stuurt `LADDER_COOKIE` niet mee, en de pagina
> bevat de teamnamen niet. Daarnaast wist een overgeslagen bron (`SyncSkip`)
> `last_error`. Daardoor meldt de health-check `ladder_sync` groen terwijl er
> niets binnenkomt.
> **In plaats daarvan: een link naar WTRL.** De eigenaar koos ervoor om
> uitslagen niet te verwerken, ook niet met de hand. Het blok Teamresultaten op
> de teampagina linkt naar `https://www.wtrl.racing/zrl/results/`. Die pagina
> heeft geen URL per team, dus per (sub)team staat eronder wat je daar moet
> kiezen: bijvoorbeeld "Round 1 · Race 1 · Open Aqua League · Division 1". Dat
> komt uit de naam en beschrijving van het Zwift-event dat aan het ZRL-event
> van dat team hangt. Er wordt de laatst gestarte race gekozen, of anders de
> eerstvolgende. De Zwift-aanvraag gaat naar de publieke event-API en wordt 6
> uur gecachet (`src/lib/teams/wtrl-results.ts`). Een team zonder gekoppeld
> Zwift-event krijgt geen regel.
> **Bewust niet gebouwd:** de link via `events.results_url`. Het eventscherm
> heeft daar een knop die die URL ophaalt en de uitslag verwerkt, en dat mag
> bij WTRL niet. Ook geen WTRL-link op het eventscherm; de eigenaar vroeg om de
> teampagina.
> **Opgemerkt op productie:** de R1-W1-events van ZRL A en B1 wijzen allebei
> naar Zwift-event 5711304 (Open Aqua League Division 1). Dat is waarschijnlijk
> een verkeerd gekopieerd event-ID bij ZRL A.
> Getest: TypeScript, ESLint en 4 nieuwe unit-tests
> (`tests/unit/wtrl-results.test.ts`, met de echte eventnamen van ZRL 26/27).
> **Niet lokaal te verifiëren:** de teampagina in de browser (daar is een
> ingelogde sessie voor nodig) en het gedrag op productie na de deploy.

> **Zwift-eventlink: "Route niet herkend" bij ZRL 26/27, 2026-09-21 — opgelost.**
> Implementatiecommit `875c025`. Geen migratie; `zwift-data` van 1.48.6 naar 1.50.0. De eventlink van ZRL
> 26/27 Race 1 (event 5711302) gaf `routeId` 1247427185. Die route
> (Montmartre Mixer, Paris) is nieuw en stond niet in 1.48.6, dus
> `routeFromZwiftId` gaf `null`. Omdat Zwift voor dit event ook geen afstand
> opgeeft (`distanceInMeters: 0`), bleef er niets over om uit te rekenen. Test
> toegevoegd in `tests/unit/zwift-route.test.ts`. **Bewust niet gebouwd:** een
> terugval op Zwifts eigen routegegevens. Dit gebeurt opnieuw zodra Zwift routes
> toevoegt die de package nog niet kent; de remedie is dan dezelfde upgrade.
> **Niet lokaal geverifieerd:** de routesync (`/beheer/zwift-routes`) voor deze
> nieuwe route. Die haalt het profiel via Strava op en moet in productie een keer
> draaien.

> **Windweging en omwegfactor bijgesteld op echte rondjes, 2026-09-21 — gebouwd, lokaal getest.**
> Implementatiecommit `5dd7cfd`. Geen migratie.
> De eerste echte buitenrondjes lieten twee dingen zien die niet klopten. De
> eigenaar vroeg ze aan te pakken.
>
> **1. De windbelofte was onmogelijk, niet verkeerd afgesteld.** Het voorstel
> beloofde "heen tegen de wind in, terug met de wind mee". Op een *gesloten lus*
> kan dat niet: je komt terug waar je begon, dus over de hele rit is de wind
> ongeveer in evenwicht. Nagerekend op de meetkunde waren de vier benen bij kop
> 270° achtereenvolgens tegenwind, meewind, zijwind en zijwind — het laatste been
> thuis was zijwind. Alle drie de varianten kwamen daardoor op "vooral zijwind"
> uit en verloren even veel punten: een dimensie die niets onderscheidde en elk
> rondje ~17 punten kostte, puur omdat het een lus was. Het klassieke wieleradvies
> gaat over een heen-en-weerrit.
> **Nu:** we sturen op het enige wat op een lus wél stuurbaar is — welk been je
> áls laatste rijdt, het stuk waar je moe bent. Het laatste been ligt op
> `kop + 60°` (eigenschap van de driehoek, in een test vastgelegd), dus de
> koersvariant voor meewind thuis staat op `windrichting + 120`. De score kijkt
> naar het laatste kwart van de rit, met **zijwind als middenwaarde (50) in plaats
> van als straf**: een rondje dat niet beter kán komt niet meer met aftrek weg. De
> twee andere varianten eindigen op zijwind en zeggen dat ook.
>
> **2. De omwegfactor was een gok, en een verkeerde.** 1,25 gaf rondjes die ~15%
> te kort uitvielen: BRouter volgde de driehoek strakker dan aangenomen. De
> startwaarde staat nu op 1,12, maar de echte oplossing is dat hij zichzelf
> corrigeert: hoeveel een route omloopt verschilt per omgeving (stad versus
> platteland), dus één constante kan nooit overal kloppen. Na de drie varianten
> meet `correctedDetourFactor()` wat de planner werkelijk teruggaf en doet één
> correctieronde op de beste variant — alleen bij meer dan 12% afwijking, alleen
> als er tijdbudget over is, en de uitkomst vervangt de oude alleen als hij
> daadwerkelijk dichter bij de gevraagde afstand ligt. Begrensd op 0,7–2,5 zodat
> een kapotte meting geen rondje van 300 km oplevert.
>
> **Opruiming die hieruit volgde:** `OutdoorRouteJudgement` had `strongest` en
> `weakest`, die aan de buitenkant nergens gebruikt werden. Aan de Zwift-kant is
> het zwakste punt een waarschuwing in amber, maar hier is 50 het midden en geen
> klacht — zijwind hoort niet in het amber. De kaart kiest nu zelf welke
> deelscores hij toont.
> **Claims bijgesteld:** `/hulp` beloofde leden "terug met de wind mee"; dat is nu
> "het láátste stuk met de wind mee", met de uitleg erbij dat je de wind op een
> rondje niet kunt ontlopen. `docs/buitenrit-routevoorstel-spike.md` sectie 4 en
> het openstaande punt over de omwegfactor zijn herschreven.
> **Niet gemeten:** of de correctieronde in de praktijk binnen het tijdbudget
> past. BRouter is vanuit deze omgeving niet bereikbaar, dus dat blijkt pas op
> productie — de ronde slaat zichzelf netjes over als de tijd op is.
> Verificatie: 1.449 tests geslaagd (10 nieuw), `npx tsc --noEmit` schoon, ESLint
> 0 fouten en de 7 bestaande waarschuwingen, productiebuild geslaagd.

> **Drie rondjes op één kaart, en het antwoord over Wahoo en Garmin, 2026-09-21 — gebouwd, lokaal getest.**
> Implementatiecommit `e3c077d`. Geen migratie.
> Melding van de eigenaar: de buitenrondjes worden gegenereerd, maar je kunt ze
> niet zien. Klopte: de lijn stond wél in `geometry` en in de GPX-download, maar
> de loader haalde die kolom niet op en er was geen kaart. Je kon dus alleen
> beoordelen wat je niet kon bekijken.
> **Nu:** de drie voorstellen staan samen op één kaart, elk in een eigen
> jersey-kleur, met het vertrekpunt als punt. Klik een lijn en je krijgt de
> gegevens van dat rondje plus "Kies dit rondje" en de GPX-knop; de regels eronder
> dragen dezelfde kleur en doen hetzelfde. Eén kaart en niet drie kaartjes, omdat
> je niet tussen drie plaatjes kiest maar tussen drie kanten op — over elkaar heen
> zie je in één blik welk rondje welke hoek pakt. Onder elke lijn ligt een
> onzichtbare, brede trefzone: een lijn van vier pixels is op een telefoon niet te
> raken.
> De lijn wordt server-side uitgedund naar 120 punten (`lineForMap`). Opgeslagen
> blijft hij op ~600 punten, want dat is wat een GPX op een fietscomputer
> verdient; drie keer 600 punten naar de browser sturen voor één overzichtskaart
> is zonde.
> **Rechtstreeks naar Wahoo en Garmin — onderzocht, niet gebouwd.**
> *Garmin kan niet, en niet door ons:* de Courses API is precies de goede weg,
> maar het Garmin Connect Developer Program staat sinds voorjaar 2026 op pauze —
> aanvraagformulier weg, geen datum, en het eist bovendien een rechtspersoon.
> *Wahoo kan wél:* de Cloud API is self-service met OAuth 2.0 en kent een
> routes-resource. Prijs: een FIT-encoder (de API wil FIT, geen GPX, en die zit
> hier niet in), een OAuth-koppeling per lid zoals bij Strava, en het werkt alleen
> voor de Wahoo-app — niet voor de oudere ELEMNT-app, dus niet voor een oude BOLT
> of ROAM. De winst boven "open de GPX in de Wahoo-app" is één handeling.
> **Voorstel: niet bouwen tot iemand erom vraagt.** Heropent Garmin zijn
> programma, dan verandert die rekensom, want dan bedient één stuk werk beide
> merken. De GPX-weg staat nu uitgelegd op `/hulp`. Details in
> [buitenrit-routevoorstel](docs/buitenrit-routevoorstel-spike.md) sectie 8.
> **Bewust niet aangepast:** de windweging en `DETOUR_FACTOR`, hoewel de eerste
> echte rondjes lieten zien dat beide niet kloppen (zie de openstaande punten
> hieronder). De eigenaar wil dat later bekijken.
> Verificatie: 1.439 tests geslaagd (5 nieuw rond `lineForMap`),
> `npx tsc --noEmit` schoon, ESLint 0 fouten en de 7 bestaande waarschuwingen,
> productiebuild geslaagd.
> **Openstaand, met cijfers uit de praktijk:** de windscore straft élk rondje even
> hard (~17 punten) omdat een gesloten lus per definitie geen netto meewind kan
> hebben — het laatste been thuis is bij deze driehoek zijwind, niet meewind. De
> dimensie onderscheidt dus niets en drukt alleen. En de rondjes vallen ~15%
> korter uit dan gevraagd, dus `DETOUR_FACTOR` (1,25) mag omhoog.

> **Alleen fietsevents in de Zwift-spiegel, 2026-09-21 — gebouwd, lokaal getest.**
> Implementatiecommit `bbfff81`. Geen migratie.
> Melding van de eigenaar na de eerste echte sync: er staan hardloopevents in
> `zwift_events`, is dat de bedoeling? Nee.
> **De oorspronkelijke keuze was zwak.** In de vorige ronde bewaarde de sync alle
> sporten, met als argument "de spiegel blijft een spiegel, zodat een latere
> hardloopfunctie niet om een nieuwe sync vraagt". Dat is een functie die niemand
> gevraagd heeft, terwijl `defaultTrainingPrompt()` expliciet alleen op-de-fiets
> werk plant. Dezelfde speculatieve generalisatie die elders in deze rondes juist
> is weggehaald.
> **Wat het kostte, bleek pas op echte data:** ruim 40% van de kalender is
> hardlopen ("Monday Run Club" elk kwartier). Die rijen kunnen nooit voorgesteld
> worden — de matcher filtert ze weg — dus ze stonden er voor niets.
> **En één stil gevolg dat bij de bouw over het hoofd is gezien:**
> `buildPopularityIndex` vergelijkt inschrijvingen binnen hetzelfde uur van de dag,
> en deed dat tegen een verdeling waar hardloopevents in zaten. Die hebben andere
> aantallen, dus het percentiel van een fietsevent klopte niet. Nu filtert
> `mapZwiftEventToRow` de sport weg bij het bewaren, én negeert
> `buildPopularityIndex` niet-fietsevents zelf — dat laatste omdat de juistheid van
> die functie niet van een aanname over de aanroeper mag afhangen. Een test legt
> het verschil vast: zonder filter zou een rustig fietsevent tussen drukke
> hardloopevents populair lijken.
> **Onbekend telt nog steeds niet als nee:** een event zónder sportveld wordt wél
> bewaard, gelijk aan de regel in `fit.ts`.
> **Terug te draaien in één regel** als er ooit een hardloopfunctie komt; de
> kalender staat dan binnen een uur weer vol. Al bewaarde hardloop-rijen verdwijnen
> vanzelf: de sync ruimt elk uur op wat voorbij is.
> Verificatie: 1.434 tests geslaagd (2 nieuw, 1 omgekeerd), `npx tsc --noEmit`
> schoon, ESLint 0 fouten en de 7 bestaande waarschuwingen, productiebuild geslaagd.

> **Zwift-kalender gemeten op productie, en het tempo uit de omschrijving, 2026-09-21 — gebouwd, lokaal getest.**
> Implementatiecommit `18e2274`. Geen migratie.
> De knop "Test eventvenster" is op productie gedraaid. Drie dingen die we nu
> wéten in plaats van vermoeden, met gevolgen voor wat er beloofd werd:
> 1. **Zwift negeert `eventStartsAfter`/`eventStartsBefore`.** Alle 200 rijen
>    vielen buiten het gevraagde venster. `ZWIFT_EVENT_HORIZON_DAYS` doet dus
>    niets. De sync merkt dat zelf op het tweede venster, stopt daar en meldt
>    `windowsIgnored: true` — twee calls per run, precies zoals gebouwd.
> 2. **De reikwijdte is ~11 uur, niet "twee à drie".** 200 events over
>    06:45–17:45 is ongeveer 18 per uur. Dat dekt de training van vandaag en
>    vanavond, niet die van morgen. Ruimer dan bij de bouw geschat, en genoeg voor
>    waar de feature voor is: het moment waarop je kiest wat je gaat rijden.
> 3. **Velddekking:** `routeId` 100%, `signups` 100%, `description` 100%,
>    `durationInSeconds` 44%, `rangeAccessLabel` **21%**.
> **Wat dat laatste veranderde.** De intensiteitsdimensie weegt 30 — na duur de
> zwaarste — en leunde op `rangeAccessLabel`, dat er bij vier van de vijf events
> niet is. De omschrijving is er juist altijd, en organisatoren zetten het tempo
> vaker in de tekst dan in het veld. `paceWkgFromText()` leest nu "Pace: 2.0-2.5
> W/kg" uit naam, serie en omschrijving wanneer het veld ontbreekt. De eenheid is
> verplicht en de uitkomst begrensd op 0,5–7 W/kg: zonder die eis leest "3-4 laps"
> als een tempo van 3,5 W/kg, en dan meet de score onze eigen verzinsels in plaats
> van het event. Het bandveld gaat vóór de tekst — een ingevulde band is een keuze
> van de organisator, een getal in de tekst is een vondst van ons. De herkomst
> staat als `source` in de uitkomst (`band` | `tekst` | `soort` | `naam`).
> **Claims die niet meer kloppen en zijn gecorrigeerd:** `/hulp` beloofde leden
> voorstellen "voor vandaag en de eerstvolgende dagen" (nu: ongeveer de komende
> elf uur); `.env.local.example` suggereerde dat een hogere horizon zin heeft (nu:
> die knop doet niets zolang het venster genegeerd wordt); `docs/runbook.md` en
> `docs/zwift-mywhoosh-kalender-spike.md` dragen nu de gemeten getallen in plaats
> van de schatting.
> **Nog steeds niet gemeten:** of de matcher in de praktijk zinnige events bovenaan
> zet. Daarvoor moet er eerst een week gesynct zijn.
> Verificatie: 1.432 tests geslaagd (8 nieuw rond `paceWkgFromText`),
> `npx tsc --noEmit` schoon, ESLint 0 fouten en de 7 bestaande waarschuwingen,
> productiebuild geslaagd.

> **Zwift-eventsync kwam nooit langs de middleware, 2026-09-21 — gefixt, lokaal getest.**
> Implementatiecommit `98d33dd`. Geen migratie.
> Melding van de eigenaar bij het inrichten van de cron: cron-job.org kreeg
> **307 naar `/login`** in plaats van een antwoord. Oorzaak: `/api/zwift/events/sync`
> ontbrak in `PUBLIC_PATHS` (`src/lib/supabase/middleware.ts`). Een cron wordt
> zonder cookie aangeroepen, dus de middleware stuurde hem naar de loginpagina.
> Alle andere cron-routes stonden daar wél in; deze was bij de vorige ronde
> vergeten. De beveiliging zit in `checkCronSecret()` en niet in de middleware, dus
> publiek zetten verandert niets aan wie de route mag draaien.
> **Waarom dit erger is dan een gewone 403:** cron-job.org volgt geen redirects en
> meldt geen fout — hij kréég immers antwoord. De job zou dus stil nooit gedraaid
> hebben, en `zwift_events` was leeg gebleven zonder dat iets dat liet zien.
> **Vangnet in code:** `tests/unit/middleware-public-paths.test.ts` leidt de lijst
> bearer-beveiligde routes af uit de broncode (elke `route.ts` die `checkCronSecret`
> aanroept) en eist dat elk daarvan in `PUBLIC_PATHS` staat. Overtypen zou dezelfde
> fout over een jaar opnieuw mogelijk maken. Dezelfde test bewaakt de spiegelfout:
> de GPX-download van een routevoorstel en de FIT-export van een workout moeten
> juist níét publiek zijn.
> Verificatie: 1.424 tests geslaagd (10 nieuw), `npx tsc --noEmit` schoon, ESLint
> 0 fouten en de 7 bestaande waarschuwingen, productiebuild geslaagd.
> **Na deze deploy hoort de cron 403 te geven zolang `ZWIFT_EVENT_SYNC_SECRET` nog
> niet in Netlify staat** — dat is de goede volgende foutmelding, geen nieuwe bug.

> **Rondjes voor buiten bij een geplande training, 2026-09-21 — gebouwd, lokaal getest.**
> Implementatiecommit `793c046`, migratie `0173_outdoor_route_suggestions.sql`.
> Tweede helft van de wens van de eigenaar bij de Zwift-eventvoorstellen hierboven:
> stel voor buitenritten een route voor vanaf je thuisadres, meerdere opties,
> passend bij de geplande training.
> **Nu:** het lid zet een vertrekpunt op `/profiel#vertrekpunten` door een punt op
> de kaart te prikken. Bij een geplande training staat daar een knop "Stel rondjes
> voor"; die levert maximaal drie rondjes met afstand, hoogtemeters, geschatte tijd,
> wat de wind doet en een passendheidspercentage. Kiezen kan, en met GPX gaat het
> rondje naar je fietscomputer, Komoot of Strava.
> **De afstand komt uit de training, niet uit een invoerveld.** Duur en intensiteit
> plus FTP en gewicht geven het vermogen; daaruit volgt de afstand die in de
> geplande tijd past. Een drempel- of temposessie vraagt om hoogtemeters, een duur-
> of hersteltraining om vlak — dezelfde regel als `prefersClimb()` en het
> terreinoordeel aan de Zwift-kant.
> **Het snelheidsmodel is uit `zwift-match.ts` gehaald en gedeeld** (nieuw:
> `src/lib/training/ride-physics.ts`). De Zwift-matcher vraagt "hoe lang duurt deze
> rit", het routevoorstel vraagt precies het omgekeerde. Twee kopieën zouden na de
> eerste bijstelling uit elkaar lopen, en dan stelt ZWB een rondje van twee uur voor
> dat hij daarna zelf op anderhalf uur schat. Buiten krijgt een eigen straffactor
> (`OUTDOOR_SPEED_PENALTY`) voor kruisingen, verkeerslichten en wegdek. De 46
> bestaande Zwift-tests bleven na die verhuizing ongewijzigd groen.
> **Wind is waar dit beter is dan zelf een rondje verzinnen.** Het eerste voorstel
> vertrekt tegen de wind in, zodat je met de wind mee thuiskomt. Dat leunt op
> `fetchWindForecast` en `classifyWind`, die er al waren voor de eventkaart. Bij
> windstilte of zonder voorspelling zeggen we dat, in plaats van een windverhaal te
> verzinnen: de dimensie telt dan niet mee — dezelfde hernormalisatie als bij de
> Zwift-voorstellen.
> **Routeplanner: BRouter, sleutelloos.** Het onderzoek wees eerst naar GraphHopper
> omdat die een echte rondrit-stand heeft, maar die vraagt een sleutel en dan werkt
> de feature niet tot iemand een account maakt. De rondrit maken we nu zelf: drie
> keerpunten op een driehoek om het vertrekpunt, gedraaid op de gekozen windrichting.
> Dat is pure meetkunde en dus zonder netwerk te testen. GraphHopper blijft
> beschikbaar via `OUTDOOR_ROUTER=graphhopper`.
> **Anders dan de Zwift-voorstellen worden deze bewaard.** Een Zwift-voorstel is een
> sortering over data die er al ligt; een rondje kost een call naar een gratis
> externe dienst, en dat mag niet bij elke paginaweergave gebeuren.
> **Privacy — lees dit voordat je hier iets aan verandert.** Dit platform bewaarde
> tot nu toe principieel géén start- of eindlocatie van een rit; migratie `0111`
> (ZWBlokken) laat zelfs de eerste en laatste kilometer van elke rit bewust weg. Een
> vertrekpunt opslaan verschuift dat principe. Daarom: het lid wijst het zelf aan
> (geen adres, geen geocoder, dus ook geen adres naar een externe partij), de
> coördinaat wordt in de database afgerond op drie decimalen (~110 m) door een
> trigger en niet alleen in de client, RLS laat alleen het lid zelf erbij, en
> `profile_visibility` krijgt hier geen sleutel — er is geen stand waarin dit voor
> een ander zichtbaar is. Ook de GPX-download is alleen voor het lid zelf, anders
> dan de FIT-export die een trainer wél mag ophalen.
> **Geen privacyversiebump — en dat is een openstaande beslissing, geen conclusie.**
> `src/lib/privacy.ts` is niet gebumpt. Argument ertegen: het lid wijst het punt
> zelf aan, het gaat naar geen enkele externe ontvanger, het is voor niemand anders
> zichtbaar en het is grof. Argument vóór: het principe "wij bewaren geen
> vertrekpunt" verschuift hier wél. **Dit is een keuze van de eigenaar.** Wie hem
> anders maakt, zet er een versie bij in `src/lib/privacy.ts` en een alinea in
> `/privacy`.
> **Bewust niet gebouwd:** geen persoonlijke heatmap als voorkeurslaag (de data
> ligt er via `summary_polyline`, maar BRouter kiest zijn wegen al op ondergrond,
> fietspad en drukte — dat is precies waar een heatmap een benadering van is; eerst
> kijken of het zonder goed genoeg is); geen clubbrede heatmap (raakt de
> Strava-clausule van november 2024, en dat is een beslissing van de eigenaar);
> geen fietsknooppunten als bron (mooi voor een rustige duurrit, zwak voor een
> racefiets); geen terugschrijven naar Strava of Komoot (Strava kán het niet via de
> API, Komoot heeft geen publieke API — GPX dekt het); en ZWB raadt niet welk
> vertrekpunt bij welke training hoort.
> **Claim uit de vorige ronde die niet meer klopt:** het blok "Buitenritten:
> onderzocht, niet gebouwd" hierboven zei dat het bij onderzoek zou blijven en dat
> hosting de blokkade was. Dat is achterhaald: met BRouter is er geen
> hostingbesluit nodig om te beginnen. `docs/buitenrit-routevoorstel-spike.md` is
> van onderzoeksnotitie naar bouwverslag bijgewerkt.
> **Niet lokaal te verifiëren:** de migratie (geen Docker of Supabase-config hier)
> en élke echte aanroep van BRouter en Open-Meteo — de egress-policy van deze
> ontwikkelomgeving blokkeert het grootste deel van het externe web. De
> antwoordvormen van beide planners zijn daarom op vastgelegde JSON getest, niet op
> een opname. Of de rondjes in de praktijk rijdbaar en leuk zijn blijkt pas buiten;
> reken op één ronde bijstellen van `DETOUR_FACTOR` (nu 1,25) en mogelijk het
> BRouter-profiel (`fastbike` of `trekking`).
> Verificatie: 1.414 tests geslaagd (43 nieuw in `outdoor-route.test.ts`),
> `npx tsc --noEmit` schoon, ESLint 0 fouten en de 7 bestaande waarschuwingen,
> productiebuild geslaagd met placeholder-Supabase-variabelen.
> Details: [buitenrit-routevoorstel](docs/buitenrit-routevoorstel-spike.md).

> **Zwift-events als voorstel bij een geplande training, 2026-09-20 — gebouwd, lokaal getest.**
> Implementatiecommit `4d4cb47`, migratie `0172_zwift_event_cache.sql`.
> Wens van de eigenaar: koppel een passend Zwift-event aan de geplande training als
> voorstel voor indoortrainingen, met meerdere opties en een percentage van
> passendheid erbij, en weeg de populariteit van een event mee.
> **Waarom dit kon met weinig nieuw werk:** de bouwstenen lagen er al. De publieke
> Zwift-event-API wordt al bevraagd door `scanZwiftEvents()`, het `zwift-data`-pakket
> vertaalt een `routeId` al naar afstand, hoogtemeters en klimsegmenten, en het
> clubserviceaccount ziet in de member-feed al hoeveel gevolgde ZWB'ers zich op een
> event inschreven. Aan de trainingskant staan duur, intensiteit en de blokken met
> `estimateTrainingLoad`. Wat ontbrak was de brug.
> **Nu:** een uurlijkse cron (`POST /api/zwift/events/sync`, `ZWIFT_EVENT_SYNC_SECRET`)
> spiegelt de Zwift-kalender naar de nieuwe tabel `zwift_events`. Bij een geplande
> training staan op `/zwbeter-worden/schema` maximaal drie events met een
> passendheidspercentage, de reden waarom ze passen en één regel over wat er niet
> klopt ("12 min langer dan gepland"). Kiezen of negeren; kiezen is een notitie bij de
> training en verandert het schema niet.
> Het oordeel zit in `src/lib/training/zwift-match.ts`: puur, deterministisch en
> zonder database, in dezelfde vorm als `eventFitsMember` (`lib/events/fit.ts`) en
> `suggestSegmentsForBlock`. Zes dimensies met een gewicht — duur 40, intensiteit 30,
> belasting 10, terrein 8, starttijd 7, populariteit 5 — plus harde filters die een
> event helemaal wegsturen (geen fietsevent, andere dag, te lang voor je beschikbare
> minuten, race bij een duurtraining, buiten elke categorie). Een afgewezen event
> verdwijnt zonder uitleg uit de lijst; de reden zit wel als code in de uitkomst, voor
> een latere beheerdiagnose.
> **De regel die het ontwerp draagt:** het gewogen gemiddelde gaat alleen over de
> dimensies die we kénnen, hergenormaliseerd. Zonder dat zou elk group workout stil
> 30 punten verliezen puur omdat de publieke API geen vermogensband meestuurt — en
> dat is precies de eventsoort die qua vorm het dichtst bij een geplande training
> ligt. Onbekend verlaagt dus de dekking, niet de score; dezelfde regel als "onbekend
> telt nooit als 'past niet'" in `fit.ts`.
> **Eén onderscheid dat tijdens het bouwen fout zat en is rechtgezet:** een
> `rangeAccessLabel` betekent niet overal hetzelfde. Bij een race is "B, 3.2-3.9 W/kg"
> een toelatingseis op je FTP; bij een groepsrit is dezelfde notatie het tempo dat
> gereden wordt. Door elkaar halen leverde onzin op — een renner van 3,3 W/kg kreeg
> een gewone B-race als "anaeroob" gescoord. Nu: bij een race bepaalt de band alleen
> waar je mág starten, bij een groepsrit wijzen we de pacegroep aan die het tempo van
> jóúw training rijdt. Dat laatste is meteen de meest waardevolle stap: een
> duurtraining krijgt de 2.0-2.5-groep van een rit aangewezen in plaats van dat de rit
> wordt afgewezen omdat er ook een harde groep bij zit.
> **Populariteit weegt bewust het lichtst en wordt per uur van de dag vergeleken.**
> Zonder die bucket meet je vooral Europese primetime: een event om 20:00 heeft altijd
> meer inschrijvingen dan hetzelfde event om 04:00. Het clubsignaal gaat voor: rijden
> er ZWB'ers mee, dan staat dat er als feit bij.
> **Bewust niet gebouwd:** geen automatische inschrijving op een Zwift-event (daar is
> geen toegestane API voor; het clubserviceaccount is niet het lid); geen vergelijking
> met de ZWO van een group workout (de publieke API geeft het blokkenschema niet mee —
> trefwoorden uit naam en serie als terugval, en anders `null` in plaats van een gok);
> geen pace partners (dat zijn geen events); geen pacingplan per voorgesteld event
> (dat is `src/lib/pacing/` en wil per kandidaat een hoogteprofiel uit `zwift_routes`
> ophalen); geen opgeslagen voorstellen (ze worden elke keer opnieuw berekend, dus er
> kan niets verouderen); en geen MyWhoosh (dezelfde scan bestaat, maar zonder
> route-ids en zonder vermogensbanden valt er niets te matchen).
> **Afwijking van het werkplan, met medeweten van de eigenaar:** sectie 2.4 zegt "Pas
> daarna pas nieuwe trainingfeatures toe; eerst stabiliseren wat er nu is" — de
> training-cockpit praktijktest staat nog open. Deze ronde gaat daar overheen op
> verzoek van de eigenaar.
> **De beperking die je moet kennen voordat je hierop leunt:** de publieke endpoint
> geeft **maximaal 200 rijen zonder paginering**. Zonder datumvenster is dat enkele
> uren vooruit, en vaker pollen helpt niet — elke call begint weer bij "nu". De
> `eventStartsAfter`/`eventStartsBefore`-parameters zouden dat oplossen (de
> `zwift-mobile-api`-wrapper documenteert ze, ZwiftHacks toont zeven dagen), maar Zwift
> publiceert geen API-documentatie en dit is **niet geverifieerd**. De sync valt
> daarom terug op de kale upcoming-lijst en meldt dat als `windowsIgnored`. Stel het
> vast met de nieuwe knop **Test eventvenster** op `/beheer/event-scan`, en vul de
> uitkomst in in [zwift-mywhoosh-kalender-spike](docs/zwift-mywhoosh-kalender-spike.md).
> **Niet lokaal te verifiëren:** de migratie (geen Docker of Supabase-config hier; met
> de hand toepassen) en élke aanroep van de echte Zwift-API — de egress-policy van de
> ontwikkelomgeving blokkeert `zwift.com` (403 op CONNECT). De fixture onder
> `tests/fixtures/zwift/` is daarom met de hand geschreven uit de veldnamen die
> `ZwiftEventApiRow` al in productie gebruikt, niet opgenomen. Of de matcher in de
> praktijk zinnige events bovenaan zet blijkt pas uit echte kalenderdata; reken op één
> ronde bijstellen van de gewichten nadat het een week heeft gedraaid.
> Verificatie: 1.371 tests geslaagd (59 nieuw: `zwift-match.test.ts` 46,
> `zwift-event-cache.test.ts` 13), `npx tsc --noEmit` schoon, ESLint 0 fouten en de 7
> bestaande waarschuwingen, productiebuild geslaagd met placeholder-Supabase-variabelen.
> `tests/unit/omnium-live.test.ts` draait in een verse clone niet (vraagt `.env.local`);
> dat is onveranderd.
> **Buitenritten: inmiddels wél gebouwd — zie de ronde hierboven.** Bij deze ronde
> koos de eigenaar voor Zwift eerst en bleef het bij onderzoek; dat onderzoek staat in
> [buitenrit-routevoorstel-spike](docs/buitenrit-routevoorstel-spike.md). Conclusie in
> het kort: Strava kán geen routes aanmaken via de API en de Strava-heatmap is
> helemaal niet via de API beschikbaar — heatmaps zijn precies wat Strava met het
> akkoord van november 2024 bij derden wil stoppen. Op de heatmap-vraag van de
> eigenaar is het antwoord dat we er zelf al een hebben: `summary_polyline` van de
> eigen ritten staat al in `strava_activities` (de col-detector decodeert hem al), dus
> een persoonlijke heatmap kost nul extra API-calls. Clubbreed raakt die
> novemberclausule en is een beslissing voor de eigenaar. Genereren kan met BRouter of
> GraphHopper; de enige echte kostenpost is hosting, want Netlify draait geen
> routeserver. Het onderscheidende deel ligt er al: `fetchWindForecast`,
> `classifyWind` en `gpxBearing` maken "heen tegen de wind in, terug mee" mogelijk.
> Vertrekpunt wordt een punt op de kaart (keuze van de eigenaar), in een eigen tabel
> en niet op `profiles`; of daar een privacyversiebump bij hoort is nog een open
> beslissing, want dit platform bewaarde tot nu toe bewust géén start- of eindlocatie
> (zie `0111_zwblokken.sql`).

> **FTP-historie: een rit rekent met de FTP van zijn dag, 2026-09-21 — gebouwd, lokaal getest.**
> Migratie `0175_profile_ftp_history.sql` (nog niet toegepast). Open punt van
> 20 augustus: TSS en IF van elke rit werden met de húídige `profiles.ftp_watts`
> berekend. **Eerst gemeten** (alleen-lezend, anoniem): de FTP-instelling in
> intervals veranderde sinds april bij maar 2 van de 8 leden, en er zijn 3
> FTP-tests. Het grootste TSS-verschil met intervals is dus een vást verschil
> tussen profiel-FTP en intervals-FTP (5–10%, bij één lid 192 tegen 125). Dat is
> geen historieprobleem, maar volgt uit het besluit dat de profiel-FTP leidt.
> Waarom het tóch nu: sinds de FTP-test in het schema zit, schaalt elke
> testuitslag de belasting van het hele verleden mee. +5% FTP is ~10% minder TSS
> met terugwerkende kracht, en de weekgrafiek en de naleving verschuiven mee.
> **Nu:** tabel `profile_ftp_history` (`profile_id`, `effective_from`,
> `ftp_watts`), gevuld door één trigger op `profiles.ftp_watts`. Zo tellen alle
> schrijfpaden mee (testuitslag, correctie, intervals-sync, handmatig) zonder
> dat code ze apart moet melden. De startwaarde is per lid de huidige FTP vanaf
> 1900-01-01. Bij het toepassen verschuift er dus niets; pas een volgende
> wijziging splitst het verleden. Lezen: het lid en zijn trainers
> (`current_user_can_train_profile`), schrijven alleen de trigger.
> `src/lib/training/ftp-history.ts` zoekt de FTP op de Amsterdamse ritdag op,
> en `rideMetricsFromStrava` accepteert naast een getal nu zo'n resolver. Alle
> zeven rekenplekken zijn aangesloten: de belastingpagina, de coachdata, de
> naleving, de voltooiing (momentopname en koppelen), ongeplande ritten, de
> context van gisteren en de rit-samenvatting naar Strava. Waar gepland en
> gereden naast elkaar staan, gebruiken beide de FTP van die dag. Een fout bij
> het laden (ook: `0175` nog niet toegepast) valt stil terug op de huidige FTP,
> zoals voorheen. Uitleg in één zin op `/hulp`.
> **Bewust niet gebouwd:** (1) Het verleden vullen uit `intervals_activities.ftp_watts`:
> dat zou oude ritten met de intervals-FTP laten rekenen en nieuwe met de
> profiel-FTP, twee bronnen door elkaar (besluit eigenaar). (2) De testdatum als
> ingangsdatum: de trigger gebruikt de dag van de wijziging. Wie een test pas
> dagen later invult, rekent de ritten daartussen nog met de oude FTP. Dat is
> klein en houdt één bron. (3) De geplande belasting van toekomstige trainingen
> blijft de huidige FTP gebruiken, en dat is correct.
> Getest: `tests/unit/ftp-history.test.ts` (11: opzoeken, ritdag in Amsterdam,
> `rideLoadRows`, en tegen PGlite de migratie met startwaarde, trigger, "laatste
> van de dag", null en RLS). TypeScript, ESLint, de volledige suite (1.355) en de
> productiebuild met placeholder-variabelen. **Niet lokaal te verifiëren:** `0175`
> tegen productie, en de grafieken met echte data na een volgende FTP-wijziging.

> **Duurblokken op 65–75% FTP; echte zones bleken geen oplossing, 2026-09-21 — gebouwd, lokaal getest.**
> Geen migratie. Vervolg op de eFTP-meting hieronder: waar komen de "structureel
> te lage wattages" dan wel vandaan? Alleen-lezend en anoniem gemeten over ~5.600
> blokken uit trainingen van de afgelopen 60 dagen (steekproef: de API geeft max.
> 1.000 trainingen). Mediaan %FTP per intensiteit: herstel 50, **duur 63**
> (p25–p75 59–66), tempo 84, drempel 100, VO2max 116, anaeroob 144. Alleen de
> duurblokken zitten laag, onderin zone 2; de rest ligt midden in zijn band.
> Waarschijnlijke oorzaak: duur krijgt meestal RPE 4, en de RPE-tabel zegt 60–70%.
> **Echte zones meegeven (punt 2 van het open punt van 4 augustus) is bewust niet
> gebouwd.** 10 van de 11 leden met zones in intervals.icu hebben de
> standaardgrenzen 55/75/90/105/120/150, precies de banden die de AI al volgt;
> één lid heeft 60/80. De terugval op `INTENSITY_FTP_RANGE` doet er ook
> nauwelijks toe: 16 van de 5.645 blokken hadden geen getal.
> **Nu (besluit eigenaar):** een promptregel zet duurblokken op 65–75% FTP bij
> RPE 4–5; alleen warming-up, cooling-down, herstel tussen intervallen en
> hersteldagen liggen lager. De RPE-tabel (`percentRangeForRpe`) en de UI-hints
> blijven gelijk. Een promptregel raakt alleen nieuwe generaties en niet de hele
> app. **Gevolg:** de geplande belasting van duurweken stijgt licht (TSS schaalt
> kwadratisch met de intensiteit). Test in `training-targets.test.ts`.
> **Niet geverifieerd:** of het model de regel volgt; dat blijkt pas uit nieuwe
> schema's. Te herhalen met dezelfde meting (mediaan duur zou naar ~70% moeten).

> **eFTP en ramp rate kwamen nooit binnen; profiel-FTP blijft leidend, 2026-09-21 — gebouwd, lokaal getest.**
> Geen migratie. Bij het meten van "eFTP tegenover `profiles.ftp_watts`" (open
> punt van 4 augustus) bleek de eFTP bij alle zeven leden met een schema leeg.
> Oorzaak: intervals.icu geeft de eFTP per sport in `sportInfo[].eftp` en de ramp
> rate als `rampRate`, terwijl de code `eftp` en `ramp_rate` op de wellness-rij
> las. Daardoor waren de eFTP voor de AI, de eFTP-trend op `/zwbeter-worden`, de
> eFTP in de coachdata en de ramp rate overal stil `null`. De promptregels over
> ramp rate en eFTP deden dus nooit iets. **Nu:** `normalizeIntervalsWellness()`
> in `src/lib/intervals/client.ts` zet elke rij in `fetchIntervalsWellness` om
> (eFTP van `Ride`, anders de hoogste andere fietssport). Het is het enige pad
> naar dat endpoint.
> **Meting** (alleen-lezend, met toestemming van de eigenaar; ook intervals.icu
> met de sleutels van de leden): profiel-FTP tegenover eFTP was −8, −3, +1, +12,
> −5 en −10%, en één lid heeft geen profiel-FTP. De profiel-FTP ligt dus meestal
> *boven* de eFTP. De klacht "wattages structureel te laag" komt daarom niet uit
> de FTP-bron, maar waarschijnlijk uit de vaste zonebanden (punt 2 van dat open
> punt).
> **Besluit eigenaar:** de profiel-FTP blijft leidend (een testuitslag zit daar
> al in). De eFTP is alleen terugval als het profiel leeg is. Bij meer dan 5%
> verschil noemt de AI dat in de cautions, zonder de wattages aan te passen. De
> oude promptregel "stem af op de eFTP" had bij vier leden de wattages 3–10%
> verlaagd en een recente FTP-test overschreven. Tegelijk is het RPE-voorbeeld in
> de prompt rechtgezet (`5ff1076`).
> **Gevolg om op te letten:** de ramp rate bereikt de AI nu wél. De bestaande
> regels ("bij hoge ramp_rate matig je de opbouw") gaan dus voor het eerst werken.
> Tests: `intervals-wellness-normalize.test.ts` (2, met de echte veldvorm) en 2
> prompttests in `training-targets.test.ts`; TypeScript, ESLint en de volledige
> suite (1.342 tests). **Niet geverifieerd:** een echte AI-generatie met de nieuwe
> invoer, en de eFTP-trend in de browser.

> **Health-check kijkt of de WTRL-sync echt lukt, 2026-09-21 — gebouwd, lokaal getest.**
> Geen migratie. Uit de gebruiksanalyse van 17 september: de WTRL-resultatensync
> faalt sinds 3 juni met HTTP 401, terwijl `integration_health` 306 keer ok meldde.
> De probe `wtrl` vroeg alleen de homepage op. De oorzaak is een verlopen
> `WTRL_COOKIE` en niet de ontbrekende kolom uit `0173`: die zou een
> databasefout geven, geen 401. **Nu:** twee extra bronnen, `wtrl_sync` en
> `ladder_sync` (`evaluateTeamResultSync` in `src/lib/health/checks.ts`). Die
> lezen `last_error` van de actieve `team_result_sources` en worden rood zodra er
> één bron faalt, met de fouttekst erbij. Omdat ze nieuw zijn, gaat bij de
> eerste run meteen een push naar de beheerders. De bereikbaarheidsprobes
> blijven staan. Uitleg in `docs/runbook.md` §5.
> **Bewust niet gebouwd:** een drempel op ouderdom (`last_synced_at`). Hoe vaak
> de sync hoort te draaien staat nergens vast, en een verkeerde drempel geeft
> valse alarmen. ~~Nog te doen door de eigenaar: een verse `WTRL_COOKIE` in
> Netlify zetten.~~ Gedaan op 2026-09-21; WTRL antwoordde daarna met 429 en de
> WTRL-sync staat nu uit (zie de ronde hierboven).
> Getest: 2 nieuwe unit-tests, TypeScript en ESLint. **Niet lokaal te
> verifiëren:** de echte stand van `team_result_sources` in productie en of een
> nieuwe cookie de 401 oplost.

> **Omnium-beheer zag het eigen conceptseizoen niet, 2026-09-21 — gebouwd, lokaal getest.**
> Migratie `0174_omnium_manage_read_drafts.sql` (nog niet toegepast). Melding van
> de eigenaar tijdens de doorloop van PLAN.md: "het Omnium laadt het seizoen
> niet". Op productie (alleen-lezend gecontroleerd) staat seizoen `2026-27`
> gewoon, maar met `published_at` leeg en 0 edities. `/beheer/omnium`,
> `[editie]` en `[editie]/uitslagen` lezen met de RLS-client, en de leespolicies
> uit `0126`/`0128` geven ook aan ingelogde leden alleen gepubliceerde rijen vrij.
> De beheerder zag dus "Maak eerst een seizoen aan", en opnieuw aanmaken
> hergebruikte stil het bestaande seizoen (sinds `e1c3474`) dat daarna net zo
> onzichtbaar bleef. Plannen of publiceren kon nergens, want die knoppen staan
> op diezelfde pagina.
> **Nu:** `0174` voegt per tabel een alleen-lezende policy toe voor
> `current_user_has_permission('omnium.manage')` op seizoenen, edities,
> onderdelen, uitslagen en beide standen. Die komt náást de publieke policy.
> Schrijven blijft service-role-only via de serveracties, en `omnium_kit_codes`
> krijgt bewust niets. De beheerpagina logt voortaan een mislukte
> seizoensquery in plaats van hem als "geen seizoenen" te tonen.
> **Bewust niet gekozen:** de drie pagina's met `createAdminClient()` laten
> lezen, zoals `prijzen` en `renners` al doen. Dat werkt zonder migratie, maar
> zet de pagina buiten RLS. De eigenaar koos voor de policy.
> **Tot `0174` is toegepast** blijft het beheerscherm leeg. Toepassen is dus de
> eerste stap voor editie 1 (11 oktober).
> Getest: `tests/unit/omnium-manage-read.test.ts` (4 tests tegen PGlite, met de
> productiestand van een ongepubliceerd seizoen). Zonder `0174` zakt de
> beheerderstest, erna slagen alle vier. Daarnaast TypeScript, ESLint en de
> volledige suite (1.337 tests; `omnium-live.test.ts` laadt zonder `.env.local`
> niet, dat is onveranderd). **Niet lokaal te verifiëren:** de migratie tegen
> productie en het scherm met een echte beheerderssessie.
>
> **Productiestand bevestigd door de eigenaar (2026-09-21):** `0168`/`0169`
> (voeding) en `0171`–`0173` (ZRL-teams) zijn toegepast. Bart heeft zijn
> ZRL-prikkel zelf opgeruimd en het lid met de 31 events heeft opnieuw
> gepubliceerd. Nog open: de cron van `/api/strava/sync` op 1x per dag zetten
> (zie `docs/strava-api-resubmission.md`).

> **Branches opgeruimd, losse eindjes naar main, 2026-09-19 — alleen git en een testregel.**
> Geen migratie van deze ronde zelf. Alle lokale en remote branches en worktrees
> zijn tegen `origin/main` gelegd. Wat nog niet op main stond is erbij gekomen:
> de advies-geslachtfix (`0a86b3b`, zie hieronder), de ZRL-teamfixes met
> migraties `0172`/`0173` (merge van `claude/zrl-team-member-auto-add-3jznu4`),
> de gebruiksanalyse van 17 september (stond ongecommit in een worktree) en de
> e2e-smoketest van `/verhaal`, die nog op de oude kop "Van prototype naar echte
> story" wachtte; de pagina heet sinds de verhaalronde "Eerst gewoon rijden".
> **Bewust weggegooid:** `claude/duplicate-trainings-jeroen-janssen-vyudzy`
> (19 aug, filter `withoutConceptDuplicates` en losser opruimen bij publiceren).
> Het dubbele-trainingsprobleem is op 2026-08-25 langs een andere weg opgelost
> (zie "dubbele trainingen: de race tussen twee publicaties"); die branch is
> nooit gemerged en zou er nu naast komen te staan. Alle overige branches waren
> al volledig (of patch-gelijk) op main. `0172` en `0173` zijn inmiddels met de
> hand op productie toegepast (bevestigd door de eigenaar, 2026-09-21).

> **Gebruiksanalyse voor het bestuur, 2026-09-17 — alleen analyse, geen code.**
> Geen migratie. Alleen-lezende, geaggregeerde tellingen op productie. Kern:
> 18 van 35 accounts actief in 30 dagen (14 met eigen actie), aanwas gestopt
> (sep 0, juli-cohort 2/12 actief). Wat leeft draait automatisch op ritdata;
> ZWBeter Worden is diep maar smal (7 leden met schema, ~25% van de code).
> Vraag en Aanbod, Ritverslagen, Verjaardagen-sociaal, teamresultaten/TTT/
> opstellingen, klachtenlogboek en onderhoud-slijtdelen hebben 0–1 gebruiker.
> Bijvangst: de WTRL-resultatensync faalt sinds 3 juni terwijl de health-check
> ok meldt, en AI-tokengebruik van trainingsgeneraties wordt niet gelogd.
> Bewust niet gemeten: paginabezoek (bestaat niet) en inloggen per lid. Er is
> nog niets verwijderd; de voorstellen (featurepauze, menu opschonen, keuze over
> ZWBeter Worden, Omnium-deadline) liggen bij het bestuur.
> Details: [gebruiksanalyse](docs/gebruiksanalyse-2026-09-17.md).

> **ZWBgame liggend, korte parcoursen en vier standen, 2026-09-19 — gebouwd, lokaal getest.**
> Implementatiecommit `6675ba7`. Geen migratie; spelversie 3 (lopende races vervallen,
> uitslagen blijven). Verzoek van de eigenaar: horizontaal spelen op mobiel,
> parcoursen van Flamme Rouge, maximaal 5 minuten, overzichtelijker beeld en
> intuïtievere besturing. Gebouwd: vier eigen parcoursen van 3,5–4 km uit stukken
> van 250 m (vlak, tegenwind, klim, steile klim, afdaling, bevoorrading), met
> Heuvelrug als nieuw parcours; energie en vocht lopen twee keer zo snel; vier
> standen (Sparen, Meerijden, Naar voren, Aanvallen) vervangen inspanningsbalk en
> taken; een groepenbalk in beeld; liggend op een telefoon vult de race het scherm.
> Gemeten: winnaar 3:49–4:10, laatste renner hooguit 5:01; top 3 wint 41–68%.
> **Bewust niet gebouwd:** de parcoursindelingen en -namen van Flamme Rouge zelf
> (commerciële spelinhoud, en hier niet betrouwbaar bekend; de eigenaar koos voor
> eigen parcoursen in die stijl) en sneller afspelen van de tijd (koos kortere
> parcoursen). Kopwerk bestaat niet meer als aparte keuze voor de speler; Naar voren
> dekt het. **Niet gemeten:** speelgevoel en fps op een echte telefoon, en draaien
> naar liggend op iOS. Details: [ZWBgame](docs/zwbgame.md).

> **0172 viel om op productie: 0070 was daar maar half toegepast, 2026-09-19 — gebouwd, lokaal getest.**
> Implementatiecommit `2c0ebfa`, migraties `0172` (aangepast, nog niet
> toegepast) en `0173_restore_roster_team_assignment_source.sql`. Bij het toepassen van `0172`
> kwam `ERROR: 42703: column r.team_assignment_source does not exist`. De regel
> ervóór — het opruimen van lidmaatschappen met herkomst `auto_zrl_category` —
> liep wél, dus `team_members.assignment_source` bestaat daar gewoon. Van
> dezelfde migratie `0070` ontbreekt alleen de kolom op `roster_entries`.
> **Wat dat verklaart.** plpgsql zoekt kolomnamen pas op bij uitvoering, dus
> `sync_zrl_parent_roster_entries()` kon daar nooit draaien: geen enkele
> rosternaam is er ooit op categorie bij een team gezet, en er viel dus ook niets
> op te ruimen. Vervelender is de andere kant: `saveRosterEntries()` in
> `src/lib/team-results/sync.ts` schrijft `team_assignment_source` op élke naam
> die de WTRL-sync binnenhaalt en gooit bij een fout de hele sync om. Het
> bijwerken van rosters is daar dus nooit gelukt, en de knop Resultaten
> synchroniseren liep ook nog stuk op de RPC naar diezelfde functie. Twee stille
> storingen die niemand aan deze kolom had gekoppeld.
> **`0172` is aangepast** (hij was nog niet toegepast, dus dat mag): de herkomst
> van het team van een rosternaam komt nu uit `roster_entry_team_source()`, die de
> kolom via `execute` leest en `undefined_column` opvangt — bestaat de kolom niet,
> dan heeft niets ooit op categorie ingedeeld en is null het juiste antwoord. Het
> opruimen van omgeleide `roster_claim`-rijen draait alleen als de kolom bestaat.
> En `sync_zrl_parent_roster_entries()` is alsnog verwijderd, met de aanroep in
> `syncResultsNow()` en de tekst onder de knop erbij: hij is dezelfde gok op
> niveau, hij werkte in de praktijk niet, en zijn fout blokkeerde de resultaten.
> Rosternamen krijgen hun team voortaan alleen van de WTRL-sync.
> **`0173` zet de ontbrekende kolom terug**, met default `manual` in plaats van
> `auto_zrl_category` (die indeling bestaat niet meer), zodat de rostersync weer
> kan schrijven. Waar de kolom al bestaat verandert er niets aan de gegevens.
> Volgorde maakt niet uit, beide zijn idempotent en opnieuw te draaien.
> **Niet lokaal te verifiëren:** waaróm die ene kolom ontbreekt — de migraties
> gaan daar met de hand — en of er uit oudere migraties nog meer ontbreekt. Dat
> laatste is met één query te zien: controleer of `profiles.zrl_division`,
> `team_members.assignment_source`, `roster_entries.team_assignment_source` en de
> tabel `team_member_seed_overrides` bestaan; dat zijn de vier dingen die `0070`
> neerzet en waar `0171`, `0172` en de teamsync op leunen. Wel getest: 31 tests
> tegen PGlite over drie bestanden, waaronder
> `tests/unit/zrl-team-seed-partial-0070.test.ts`, dat `0070` draait en daarna die
> kolom laat vallen. Het oude `0172` zakt op alle vijf die tests, het nieuwe komt
> er doorheen.

> **Je ingeschaalde categorie maakt je geen teamlid meer, 2026-09-19 — gebouwd, lokaal getest.**
> Implementatiecommit `c19b8be`, migratie `0172_drop_zrl_category_team_seed.sql`.
> Melding van de eigenaar: er stonden Zwiftladies in ZRL B. Oorzaak is de automatische indeling uit `0070`,
> niet de aanmeldregel van gisteren: die zette elk goedgekeurd lid met categorie
> A, B of C in `ZRL <categorie>`, tenzij `profiles.zrl_division` op `women` stond.
> Die divisie werd alleen gevuld als de tekst "zwiftladies" ergens in een
> roster- of teamnaam voorkwam, dus bij elke vrouw waar die tekst ontbrak won haar
> categorie en kwam ze in ZRL B.
> **De regel is nu:** lid van een ZRL-team word je door je aan te melden voor een
> race van dat team (`0171`), door je rosternaam te claimen van een team dat WTRL
> echt zo kent, of doordat een teambeheerder je toevoegt. Een categorie zegt hoe
> hard je rijdt, niet voor wie.
> **Drie paden voegden op categorie toe, alle drie eruit:** de trigger op
> `profiles` (bij elke wijziging van categorie, divisie of goedkeuring), de knop
> Resultaten synchroniseren op `/teams` (RPC `sync_all_zrl_parent_team_memberships`,
> nu weg uit `syncResultsNow()` en uit de tekst onder de knop), en het claimen van
> een rosternaam — dat riep dezelfde sync aan én nam het team van de rosternaam
> over, terwijl `sync_zrl_parent_roster_entries()` dat team zelf ook al op
> `pace_category` kan hebben gezet. `claim_roster_entry()` neemt dat team nu alleen
> over als het níét op categorie is ingedeeld. De functies
> `sync_zrl_parent_team_membership()`, `sync_all_zrl_parent_team_memberships()` en
> `handle_zrl_parent_team_seed()` zijn verwijderd en `auto_zrl_category` is uit de
> check op `team_members.assignment_source` gehaald, zodat geen enkel pad hem stil
> terug kan zetten.
> **Opruiming, en wat er niet bij mag sneuvelen:** alle lidmaatschappen met
> herkomst `auto_zrl_category` gaan eruit, plus de `roster_claim`-rijen waarvan de
> geclaimde rosternaam zelf op categorie bij dat team was gezet. Daarna draait de
> inhaalslag van `0171` opnieuw, dus wie zich heeft aangemeld voor een race die nog
> gereden moet worden, staat er meteen weer in — de opruiming kan niemand kwijtraken
> die zich gewoon had aangemeld.
> **Bewust niet aangeraakt:** `zrl_division` blijft staan: die labelt leden, hij
> deelt ze niet meer in. (`sync_zrl_parent_roster_entries()` bleef in deze ronde
> óók staan — dat is nog dezelfde dag teruggedraaid, zie de ronde hierboven: die
> functie is alsnog verwijderd.) En er is geen automatische herindeling
> teruggebouwd in een andere vorm — dat is precies wat niet de bedoeling was.
> **Niet lokaal te verifiëren:** de migratie tegen de productiedatabase (geen
> Docker of Supabase hier; met de hand toepassen) en hoeveel lidmaatschappen de
> opruiming daar raakt — die telling is hier niet te zien. Wel getest: 13 tests
> tegen PGlite (`tests/unit/zrl-team-membership-sources.test.ts`) die eerst met de
> échte `0070` de melding naspelen (Zwiftlady met categorie B belandt in ZRL B) en
> daarna `0171` + `0172` draaien, plus TypeScript, ESLint en de build.

> **Aanmelden voor een ZRL-race maakt je lid van dat team, 2026-09-18 — gebouwd, lokaal getest.**
> Implementatiecommit `aab17ad`, migratie `0171_zrl_availability_team_join.sql`.
> Wens van de eigenaar: wie zich aanwezig meldt bij een ZRL-race hoort meteen in
> het team waar die race bij hoort. Dat gebeurde niet. Een race hangt aan één team
> (`events.team_id`, gevuld door `/beheer/zrl-kalender`), maar een aanmelding
> landde in `team_event_availability` (teampagina) of `event_rsvps` (racepagina)
> en daarmee nergens in `team_members`.
> Het rooster, de opstelling-planner en Voor mij op de kalender lezen juist dat
> laatste, dus de captain moest iedereen met de hand toevoegen; de teampagina viste
> de losse namen apart op zodat ze tenminste zichtbaar waren.
> **Nu:** een `security definer`-trigger op beide tabellen
> (`join_event_team_for_member`) voegt het lid bij Beschikbaar of Ja toe aan het team
> van de race, in dezelfde transactie als de aanmelding zelf. In de database en niet
> in de serveractie, om dezelfde reden als de categorie-seeding in `0070`: twee
> schrijfpaden naar dezelfde bedoeling, en een lid mag `team_members` niet zelf
> schrijven (RLS laat alleen beheer toe). De herkomst is een nieuwe
> `assignment_source`-waarde `event_availability`, zodat de categorie-sync uit `0070`
> — die alleen `auto_zrl_category` opruimde — deze lidmaatschappen liet staan. (Die
> sync bestaat sinds `0172` niet meer; zie de ronde hierboven.) Het
> team is dat van de ráce, niet dat van de pagina waar je stond: een hoofdteam toont
> ook de races van zijn subteams. De serveracties verversen daarom beide
> roosterpagina's. Uitleg op `/hulp` onder Teams en wedstrijden.
> **Grenzen, met reden:** alleen ZRL-races (een Ja op een social met een team eraan
> is geen toezegging aan een raceteam), alleen goedgekeurde leden (gelijk aan
> `0070`), Misschien telt niet, en afmelden haalt niemand uit een team — uit een team
> gaan doe je niet door één race te missen, dat doet een teambeheerder. Een bestaande
> captainrol blijft staan, en wie de captain uit het team haalde komt niet vanzelf
> terug: `removeMember()` legt dat vast als seed-override en die wint. De losse
> namenvangst op de teampagina blijft dus nodig, voor Misschien, voor leden die nog
> op goedkeuring wachten en voor handmatig verwijderde leden.
> **Inhaalslag:** bestaande aanmeldingen voor races die nog gereden moeten worden.
> Bewust niet verder terug: oude seizoenen alsnog in rosters omzetten vult teams van
> jaren terug opnieuw, en die opstellingen zijn allang gemaakt.
> **Bewust niet gebouwd:** geen melding bij de knop dat je nu lid bent (het rooster
> ververst en laat het zien), geen spiegeling van een Ja op de racepagina naar
> `team_event_availability` (de beschikbaarheidslijst blijft van de teampagina), en
> geen tijdgrens in de trigger zelf — "je werd niet toegevoegd want de race was al
> begonnen" is geen regel die iemand kan navertellen.
> **Niet lokaal te verifiëren:** de migratie tegen de productiedatabase (geen Docker
> of Supabase hier; met de hand toepassen) en hoeveel bestaande aanmeldingen de
> inhaalslag raakt. Wel getest: 11 tests tegen PGlite
> (`tests/unit/zrl-availability-join.test.ts`) over beide paden, de randen en opnieuw
> draaien, plus TypeScript, ESLint en de build.

> **Coach bij je trainingsdata, 2026-09-18 — gebouwd, lokaal getest.**
> Implementatiecommit `0d76d32`. Geen migratie, geen nieuwe privacyversie (zie hieronder).
> Melding van de eigenaar: gevraagd of de coach bij zijn trainingsdata kon, en de coach
> antwoordde van niet. Dat klopte: de coachchat kreeg alleen het schema, de "Let op"-regels
> en de invoer waarop dat schema was gemaakt — wat er sindsdien gereden was, kende hij niet.
> **Nu** krijgt de coach er `trainingsdata` bij (`src/lib/training/training-data.ts`): de
> laatste twaalf ritten met duur, afstand, hoogtemeters, TSS, IF, vermogen en hartslag, de
> belasting per week over twaalf weken, het rijritme van de laatste vier weken, FTP, gewicht,
> FTP-tests en het gesynchroniseerde vermogensprofiel, en CTL/ATL/TSB uit intervals.icu. De
> naleving gaat niet meer alleen als samenvatting mee maar ook per training (gepland naast
> gereden, met RPE en de opmerking van het lid). De systeemprompt is herschreven: de coach
> heeft nu twee taken, moet met de cijfers rekenen in plaats van zeggen dat hij ze niet heeft,
> en moet een leeg veld benoemen in plaats van invullen. De cijfers komen uit dezelfde bronnen
> als de Belasting- en Vermogen-pagina, zodat coach en pagina hetzelfde zeggen.
> **Eerdere keuze teruggedraaid:** de coachchat deed bewust géén live intervals.icu-call, omdat
> "de CTL/TSB die ertoe doet al in de generatie-invoer staat". Dat argument gold voor een coach
> die alleen het plan uitlegde; bij een vraag over vandaag is die CTL weken oud en presenteren
> als actueel erger dan hem niet hebben. CTL/ATL/TSB staan nergens in onze database. De call
> gebeurt nu alleen bij een koppeling met sleutels, binnen een budget van vier seconden, en
> mislukt stil naar `vorm: null`. `/api/training/chat` kreeg `maxDuration = 30`, gelijk aan de
> andere AI-routes.
> **Bewust niet gebouwd:** geen vermogens- of hartslagstreams per rit (een call per rit, en de
> prompt loopt vol), en geen zelfberekende CTL uit Strava-TSS voor leden zonder intervals.icu
> (die zou afwijken van het getal dat het lid op zijn eigen Belasting-pagina ziet).
> **Geen nieuwe privacyversie — beslissing van de eigenaar.** Ontvanger (OpenAI), doel en
> categorie veranderen niet: dezelfde soort trainingsgegevens ging al mee bij het opbouwen van
> een schema. Wat verandert is de detaillering: per rit in plaats van samengevat, inclusief de
> titel die het lid zelf aan een rit gaf. `/privacy` en `/hulp` zijn daarop aangepast zonder
> versiebump, zodat niet élk lid opnieuw hoeft te tekenen. Wie dat te ruim vindt, zet er een
> versie bij in `src/lib/privacy.ts`.
> Verificatie: 1.296 tests geslaagd (16 nieuw: `coach-training-data.test.ts` plus drie in
> `training-chat-context.test.ts`), `npx tsc --noEmit` schoon, ESLint 0 fouten en de 7 bestaande
> waarschuwingen, productiebuild geslaagd met placeholder-Supabase-variabelen.
> `tests/unit/omnium-live.test.ts` draait in een verse clone niet (vraagt `.env.local`); dat is
> onveranderd.
> **Niet geverifieerd:** de echte OpenAI-call en de intervals.icu-call (beide niet lokaal te
> draaien), dus hoe de coach in de praktijk over zijn cijfers praat en hoe vaak het
> vier-secondenbudget in productie wordt gehaald. Details: [coachchat](docs/coachchat.md).

> **Rustdag in plaats van korte hersteltraining, 2026-09-18 — gebouwd, lokaal getest.**
> Implementatiecommit `cef3857`. Geen migratie. Melding van de eigenaar: de AI
> plant vaak lichte hersteltrainingen korter dan 1,5 uur. Oorzaak: de prompt liet de
> AI het rijritme (`recentLoad.ridesPerWeek`) volgen en herstel inbouwen, maar had
> geen rustdagregel, dus werd elke hersteldag een korte `recovery`-workout. Zo'n rit
> geeft een amateur nauwelijks prikkel, telt als gemist wie hem overslaat, en een
> volledige rustdag herstelt beter. **Nu:** bij opbouwen en bijwerken van een schema
> plant de AI geen losse hersteltraining onder 90 min maar een lege dag (rustdag).
> Daarop mag het lid naar keus tot 90 min zonder intensiteit fietsen (Z1 tot lage
> Z2); die optionele rit telt niet mee in het weekvolume of het 85%-piekweekdoel,
> en de dag-aanpassing behandelt zo'n rit niet als extra belasting. Een rustdag telt
> als rijdag voor de ritmeregel. Korte duurritten (bijv. 60 min Z2 bij weinig tijd)
> en openers vóór een race of test blijven: dat is training, geen herstel. Vangnet
> in code: `dropShortRecoveryRides()` (`workouts.ts`) laat in `insertPlanWorkouts()`
> `recovery`-workouts onder `OPTIONAL_REST_RIDE_MINUTES` (90) en `rest`-workouts
> vallen; dat laatste dichtte ook een gat waarbij een `rest`-workout van ≥1 min als
> training naar intervals.icu ging. Uitleg op `/hulp` (Rustdagen in je schema).
> **Bewust niet gebouwd:** geen zichtbare rustdagrij met de optionele rit in de
> kalender of intervals.icu. Die zou als geplande workout op Garmin/Zwift en in de
> geplande belasting van intervals.icu staan, en maakt de optie weer een
> opdracht. Bij een dag-aanpassing van het lid (Aanpassen) staat het vangnet uit:
> wie zelf om een rustig halfuur vraagt, krijgt dat. **Niet geverifieerd:** of het
> model de regel in de praktijk volgt en of weken met rustdagen het 85%-doel nog
> halen; dat blijkt pas uit echte generaties.

> **ZWBgame groep bijhouden en vloeiend beeld, 2026-09-17 — gebouwd, lokaal getest.**
> Implementatiecommit `0c67f4a`. Geen migratie. Melding van de eigenaar: het beeld schokt
> en de eigen renner houdt de groep niet bij. Beeld: de 3D-scène schoof elke frame 30%
> naar de nieuwste simulatiestap (5 per seconde) en de camera liep daar ook nog achter;
> nu interpoleert de weergave over elke stap en volgt de camera exact. Groep: een volger
> kon nooit harder dan zijn directe voorganger en gaten boven 10 m gingen nooit dicht,
> dus het veld viel in de eerste minuut uiteen en een speler die in het wiel bleef zat
> na 7,5 minuut 16–44 s achter. Nu: sterkere slipstream, In het wiel rijdt gaten tot
> 150 m automatisch dicht (sneller met meer renners erachter), wie sterker is rijdt om
> een gat-latende renner heen, en iedereen start op 75%. Resultaat: 8–13 s achterstand
> op de middelste bot in dezelfde situatie; nieuwe regressietest. **Afgewogen keerzijde:**
> een compact peloton eindigt vaker in een sprint, dus de top 3 wint weer 46–66% (na de
> balansronde 35–57%). Sprintgeluk is geprobeerd en weggelaten (te weinig effect,
> onzichtbare willekeur). Niet gemeten op echte telefoons. Details:
> [ZWBgame](docs/zwbgame.md).

> **ZWBgame kwaliteiten uit platformdata, 2026-09-17 — gebouwd, lokaal getest.**
> Implementatiecommit `101f617`. Geen migratie; privacyversie
> `2026-09-17-zwbgame-kracht` (iedereen tekent opnieuw). Aanleiding: in de lobby
> stond iedereen op 100/100/100. Kwaliteiten kwamen alleen na aparte opt-in plus
> handmatige invoer, dus het veld bestond uit basisprofielen en de balansronde
> (compensatie, kaarten, knechten) deed in de praktijk niets. De eigenaar koos uit
> drie opties voor automatisch voor iedereen, boven opt-in met automatisch
> invullen en alleen een betere vindbaarheid. Nu: eigen spelprofiel >
> `rider_power_profiles` (Intervals-sync) > `profiles.ftp_watts`/`weight_kg` >
> basisprofiel. Vlak = FTP in watts, klimmen = W/kg, sprint = 15 s-vermogen. De
> sportdata-opt-in in de instellingen is vervangen door een formulier voor een
> eigen spelprofiel en een knop Platformgegevens gebruiken.
> **Bewust niet gebouwd:** een aparte opt-out voor dataverwerking (herkenbare
> deelname uitzetten haalt je uit andermans peloton; daarvoor was geen migratie
> nodig) en respecteren van per-veld profielzichtbaarheid van FTP/gewicht
> (`rider_power_profiles` is al voor alle leden leesbaar).
> **Aanvaard risico:** de platformroute filtert niet op bron; een Intervals-curve
> kan via Strava geïmporteerde activiteiten bevatten. De eerste versie sloot dat
> uit vanwege Strava's API-voorwaarden.
> Verificatie: game-, server- (met mocks), database- en privacytests, 8
> browsertests, TypeScript, ESLint en build. **Niet geverifieerd:** hoeveel leden
> echt FTP en gewicht hebben en hoe het veld er daarna uitziet. Details:
> [ZWBgame](docs/zwbgame.md).

> **ZWBgame balans en clubkleuren, 2026-09-17 — gebouwd, lokaal getest.**
> Implementatiecommit `b682351`. Geen migratie. De eigenaar
> bevestigde "gelijkwaardige kans": slim spelen kan een sterkere renner verslaan,
> bij gelijk spel wint de sterkere vaker. Het spel was te voorspelbaar (in de
> simulatie won de top 3 in 64–81% van de races, de zwakste helft nooit) en
> drinken deed er nauwelijks toe. Daarom: dagvorm ±6% per renner, wind per race,
> bots met een eigen karakter (agressie, afstand van de laatste aanval, aanvallen
> volgen, gespreide beslissingen), hydratatie die onder 40 vertraagt, en op
> voorstel van de eigenaar Flamme Rouge-achtige bonuskaarten (Rugwind, Goede
> benen, Tweede adem, Verrassingsaanval) plus knechten: het zwakste derde krijgt
> 1–3 clubgenoten uit de middenmoot die uit de wind houden, gaten dichtrijden en
> een lead-out rijden; het sterkste derde rijdt altijd alleen. Energiecompensatie
> ging van ×60 naar ×50 omdat knechten en kaarten nu meehelpen. Na afloop (vóór de
> groepsronde hierboven, die dit weer deels terugdraaide) won de
> top 3 in 35–57% van de races, de zwakste helft in 1–9%, en eindigde de zwakste
> renner gemiddeld rond plek 11–13. Spelversie 2: lopende versie-1-races zijn
> niet hervatbaar, uitslagen blijven. Interface in petrol en goud in plaats van
> limoengroen, renners in het clubshirt (wit met gouden streep, petrol chevrons,
> gouden kraag/mouwranden), witte fiets, petrol helm.
> **Bewust niet gebouwd:** negatieve kaarten of pech (lekke band, val), omdat die
> vooral frustreren zonder keuze voor de speler; waaiers bij zijwind, omdat de
> slipstreamregels daarvoor eerst positie in het peloton moeten kennen; logo's
> van sponsors op het shirt, omdat ze op deze schaal onleesbaar zijn en
> merkrechten vragen. Bot-kopmannen winnen in de simulatie vrijwel nooit (0–3%);
> knechten brengen ze wel van achteraan naar de middenmoot. Voor de speler is dat
> bewust genoeg: die kan zelf timen.
> Verificatie: 23 game-unit-tests, alle 8 browsertests (desktop en mobiel),
> TypeScript, ESLint en productiebuild; 3D-shirt visueel gecontroleerd in de lokale
> demo. Niet gemeten: speelgevoel op een echte telefoon en fps met de extra
> onderdelen. Details: [ZWBgame](docs/zwbgame.md).

> **ZWBgame, 2026-09-17 — eerste solo-versie gebouwd.**
> Bronimplementatiecommit `1dc12ae`, geïntegreerd op main-basis `1bbca1f`.
> Integratiecommit op main: `2d54ddd`. Migratie `0170` voegt afzonderlijke speltoestemming, afgeleide
> rennerprofielen en rosteruitsluitingen toe. `/zwbgame` biedt drie parcoursen,
> een instanced 3D-peloton, tactiek, voeding, hydratatie, energie-/herstelcompensatie
> (sinds de balansronde hieronder ook knechten en bonuskaarten),
> lokale raceopslag en uitslagen. Echte kracht blijft verschil maken: beter spelen
> kan een sterkere renner verslaan; gelijke winkansen bij gelijk spel zijn bewust
> geen uitgangspunt. Een eigen Intervals-spelprofiel vereist herleidbare, niet-Strava-bronnen; eigen
> metingen zijn afzonderlijke invoer. Geen Strava, wellness, multiplayer, openbaar
> klassement of GPX-parcoursen gebouwd, om de eerste solo-versie af te bakenen.
> Privacyversie `2026-09-17-zwbgame` is toegevoegd. De toen afzonderlijke
> sportdata-opt-in is later dezelfde dag vervangen door automatische
> platformkwaliteiten (zie de ronde hierboven).
> Verificatie: 34 gerichte unit/SQL/privacy-tests, 8 browserchecks op desktop- en
> mobielviewport, TypeScript, gerichte ESLint en productiebuild geslaagd.
> Migratie getest in PGlite; volgens de eigenaar op 2026-09-17 op Supabase
> uitgevoerd (niet vanuit de repo gecontroleerd). Echte
> Intervals-herkomstvelden en fysieke mobiele prestaties zijn niet geverifieerd.
> Zonder migratie blijft de ledenroute gesloten. De lokale demo werkt met
> fictieve renners (`npm run zwbgame:preview`). Push naar `main` is op verzoek
> van de eigenaar toegestaan; bestaande main-functionaliteit is behouden. Details en uitrolvoorwaarden: [ZWBgame](docs/zwbgame.md).

> **Voedingsmodule, 2026-09-17 — gebouwd; migraties toegepast (bevestigd 2026-09-21).**
> Implementatiecommit `0d0abf3`. Nieuwe tab Voeding in ZWBeter Worden: kennisbank met bronnen, receptenboek
> met porties op maat (NEVO-online 2025/9.0) en een voedingstip op Vandaag.
> Migraties `0168` en `0169` zijn lokaal alleen tegen PGlite getest; volgens de
> eigenaar staan ze inmiddels op de gekoppelde database. Zie
> de ronde "Opgeleverd — Voedingsmodule" en `docs/voeding-wielrennen.md`.

> **Coachchat in ZWBeter Worden, 2026-09-17 — opgeleverd.**
> Implementatiecommit `392a6b8`; migratie `0167` en privacyversie `2026-09-17`
> (élk lid tekent opnieuw). Een lid kan nu in de trainingsruimte vragen waarom zijn schema
> eruitziet zoals het eruitziet; een AI-coach antwoordt met het schema, de "Let op"-regels en
> de generatie-invoer als context, en de aangewezen trainer leest het gesprek terug en kan
> erin reageren. (Sinds 18 september 2026 krijgt de coach daarnaast de gereden trainingsdata;
> zie de ronde "Coach bij je trainingsdata".) Een bericht dat het lid markeert als "dit raakt mijn schema" start de
> bestaande herziening. Inzage is bewust smaller dan de rest van de trainingsmodule: alleen
> het lid en zijn gekoppelde trainers, niet iedereen met `training.manage_assignments`.
> Verificatie: 1.206 tests geslaagd, TypeScript, lint (0 fouten, 7 bestaande waarschuwingen)
> en de productiebuild. Migratie, realtime, push en de OpenAI-call zijn niet lokaal te
> verifiëren. Details: [coachchat](docs/coachchat.md).

> **ZWBeterWorden-advies op geslacht, 2026-09-17 — opgelost.**
> Implementatiecommit `0a86b3b` (cherry-pick van `3bb65a8`); geen migratie. De
> vandaag-pagina (`/zwbeter-worden`) riep `zwbeterWordenAdvice` nog aan met
> `profile.zrl_division` als tweede argument. Sinds de omzetting naar
> `profiles.sex` (2026-08-18) is dat argument het geslacht. Een divisie is
> `open` of `women`, nooit `man` of `vrouw`, dus ieder lid kreeg op die pagina
> de neutrale partnertekst, ook wie een geslacht had ingevuld. De pagina gebruikt nu `zwbStatus.advice`, dat
> `computeZwbStatus` al met `profile.sex` berekent; zo kan de pagina ook niet
> meer uit de pas lopen met de eigen status. De andere aanroepen (trainer-
> `_data.ts`, `AthleteLoadPanel`, `computeZwbStatus`) gaven al `sex` mee. Bewust
> niet gedaan: `zrl_division` uit `ProfileRow` en de selects halen; de trainer-
> data selecteert het ook en het veld is onschuldig zolang niemand het als
> geslacht leest. Nieuwe unit-test: `computeZwbStatus` kiest de partnertekst op
> geslacht en geeft een divisiewaarde de neutrale variant. Verificatie: 1.182
> tests geslaagd; `omnium-live.test.ts` laadt niet in deze worktree omdat
> `.env.local` ontbreekt. TypeScript zonder fouten buiten een verouderde
> `.next/types/validator.ts` (oude Omnium-routes); lint 0 fouten, 7 bestaande
> waarschuwingen. De pagina zelf is niet in de browser bekeken.

> **Omnium vastlopende seizoenknop, 2026-09-16 — opgelost.**
> Implementatiecommit `97232b7`; geen migratie. Het
> beheerformulier gebruikt een eigen laadstatus met foutafhandeling en een
> time-out van twintig seconden. Na succes volgt één `replace`-navigatie; de
> dubbele combinatie van transitie, `push` en `refresh` is verwijderd. Daardoor
> blijft `Bezig…` niet staan bij een Server Action-fout, trage verbinding of
> navigatie die niet afrondt. Er is bewust geen app-brede aanpassing aan andere
> formulieren gedaan: de gemelde fout zat in deze Omnium-flow. Verificatie:
> 1.181 tests geslaagd, 6 optionele live-tests overgeslagen; TypeScript, lint
> (0 fouten, 7 bestaande waarschuwingen) en de productiebuild zijn geslaagd.

> **Omnium dubbele-seizoenslug, 2026-09-16 — opgelost.**
> Implementatiecommit `e1c3474`; er is geen migratie nodig. `Seizoen
> toevoegen` hergebruikt voortaan een bestaand seizoen
> met dezelfde genormaliseerde slug en vangt ook PostgreSQL-fout `23505` af als
> twee beheerders de slug gelijktijdig aanmaken. Het formulier navigeert met de
> slug die de server teruggeeft, zodat hoofdletters en spaties geen verkeerde
> beheer-URL opleveren. Bestaande naam- en datumvelden worden bewust niet
> overschreven: een herhaalde klik mag reeds ingerichte seizoensgegevens niet
> wijzigen. Verificatie: 1.181 tests geslaagd, 6 optionele live-tests
> overgeslagen; TypeScript, lint (0 fouten, 7 bestaande waarschuwingen) en de
> productiebuild zijn geslaagd.

> **Omnium editie-1-ronde, 2026-09-15/16 — afgerond en geïntegreerd op main.**
> Main-integratiecommit `af0a1aa` (oorspronkelijke implementatiecommit
> `f104302`, basis `c5d344d`); migraties `0157` en
> `0158` zijn rechtstreeks op de gekoppelde Supabase-database toegepast omdat
> de oude CLI-migratiehistorie daar niet wordt bijgehouden. Nacontrole en een
> volledig teruggedraaide productiesmoke bevestigen startlijst/uitslag vervangen,
> renner samenvoegen, prijs toekennen, unieke kitcode-reservering en afgeschermde
> codes. De applicatie bevat nu de reglement-editor, Engelse routes plus 308's,
> Zwift-startlijsten en -uitslagen met gastenfilter, Sheet-CSV, overlay,
> prijzenbeheer, publieke winnaars en rennersamenvoeging. Verificatie: TypeScript,
> ESLint, productiebuild, 86 Omnium-tests geslaagd en 6 live-tests overgeslagen;
> 8 Omnium-E2E-tests geslaagd. Echte Zwift-meting bevestigt subgroepen A–E; het
> oude testevent gaf geen bewaarde resultaatregels meer. De historische Drive-
> bron is geïnventariseerd, maar nog niet in productie geïmporteerd: tussen de
> wedstrijdsheets en Master GC zitten handmatige naam- en leaguecorrecties die
> eerst als identiteitsmapping moeten worden beoordeeld. Productie bevat nog
> steeds 1 seizoen en 0 edities/onderdelen/renners/prijzen/kitcodes; event-ID's,
> A–E-mapping, reglement en prijzeninhoud ontbreken. De actuele main-integratie
> is opnieuw gecontroleerd met TypeScript, lint (0 fouten), productiebuild,
> 1.178 geslaagde tests (6 optionele live-tests overgeslagen) en 8 Omnium-E2E-
> tests. Op 16 september rechtstreeks naar `origin/main` gepusht; een Netlify-
> deploy is niet afzonderlijk gestart of gecontroleerd.
> Details: [Omnium-status](docs/omnium-readiness-2026-09-15.md) en
> [historische import](docs/omnium-historical-import.md).

> Levend document. Bijwerken wanneer er een fase wordt afgerond of een
> richting verandert. Bedoeld zodat zowel Claude als Codex (en eventuele
> nieuwe contributors) snel kunnen zien wat klaar is en wat de volgorde is.
>
> Update 2026-09-05: Strava wees onze aanvraag voor een hogere atletenlimiet af.
> Daarop is de integratie omgebouwd van polling naar webhooks en is
> deauthorisatie-beheer gebouwd (migraties `0148`-`0151`): `/api/strava/webhook`
> + eventwachtrij, een minuutlijkse verwerker, `POST /oauth/deauthorize` bij
> ontkoppelen/accountverwijdering, herkenning van op strava.com ingetrokken
> koppelingen, een nachtelijke opruiming met inactiviteitsbeleid, dataretentie
> bij ontkoppelen, en een app-breed rate-limit-budget. `/api/strava/sync` is
> daarmee een dagelijkse reconcile geworden in plaats van een kwartierpoll.
> Herindiening bij Strava kan pas ná deploy + een week meten; checklist in
> `docs/strava-api-resubmission.md`, bediening in `docs/runbook.md` §7.
>
> Update 2026-05-27: UI-polish + hulppagina afgerond: compactere
> app-copy, `/hulp` beginnerhub, sponsorlogo's zonder dubbele namen,
> en trainer-aanwijzing in `/training`.
> Laatst bijgewerkt: 2026-06-23 (Strava-import, training-load-grafiek,
> hulp/welkom-copy, Street View-flow en workout-preview verwerkt. Vorige
> roadmap-update 2026-06-17: testerfeedback juni 2026 verwerkt tot roadmap:
> menu-polish, achievementkwaliteit, Zwift/MyWhoosh-kalenderonderzoek,
> team/club challenges en AI-agenten. Vorige working-tree ronde 2026-06-10:
> verjaardagen-feature met opt-in en afgeschermde verjaardagsruimte per lid —
> felicitaties + foto's + een verjaardagsrondje
> (rit-uitnodiging met GPX-route) inclusief RSVP en een eigen liveticker (kaart +
> hoogteprofiel + aangemelde renners), surfacing op
> kalender en ledenprofiel, migraties `0077`-`0079`; Strava-cron-sync verlicht (dure col/ZWB-segment-
> detailcalls standaard uit, athlete-profiel-refresh overgeslagen bij cronruns);
> app-brede copy-pass die uitleg/hulptekst uit formulieren haalt en naar `/hulp`
> + privacyverklaring verplaatst, vastgelegd als nieuwe "Product copy"-conventie
> in AGENTS.md. Deze ronde is inmiddels gecommit en gemigreerd.)
>
> Update 2026-06-21: externe events (Zwift/MyWhoosh) krijgen bij publicatie een
> eigen eventtype, profielgekoppelde RSVP-deelnemers en een ZwiftPower-uitslag-
> link (migraties `0086`/`0087`). Daarnaast operationele hardening:
> integratie-health-check + alerting, een `docs/runbook.md`, en een eerste
> unit-testlaag (Vitest) voor de breekbare pure logica.
>
> Update 2026-06-22: event-pagina-upgrade + dashboard-personalisatie (gecommit
> + gepusht). Interactief hoogteprofiel én routekaart met cols/klimmen
> (categorie 4e/3e/2e/1e/HC) uit de GPX zelf berekend, in ZWB-kleuren, met
> hover-readout (afstand/hoogte/stijgingspercentage) en uitklapbare fullscreen
> (mobiel liggend, desktop recht); ook in de liveticker. Nieuw persoonlijk
> trainingsstatus-blok op het dashboard (ZWBeterWorden-advies + Fitness/Vorm/
> Herstel + eerstvolgende workout) en de clubactiviteit-link wijst nu naar
> `/stats`. ZWBeterWorden-advies kreeg 10 per-dag wisselende teksten per niveau.
>
> Update 2026-06-23: onderhoud van slijtbare onderdelen + fietsen op het
> profiel (gecommit, gepusht en gedeployd). Strava-gear-sync (`/athlete`)
> vult `strava_bikes` met de levensduur-kilometerstand per fiets; leden leggen
> op `/onderhoud` slijtbare onderdelen vast (ketting/cassette/banden/remblokken
> …) met een slijtage-range (enige/normale/hoge) of eigen km-drempel, krijgen
> een dashboardblok + push (`on_maintenance_due`) bij overschrijding. Fietsen
> verschijnen ook in de showcase op het eigen profiel en ledenprofiel, met
> foto-upload en zichtbaarheid per fiets; leden zónder Strava voegen een fiets
> handmatig toe (showcase-only, geen onderhoud). Migraties `0089`-`0091`,
> nieuwe storage-bucket `bikes`. `/hulp` + `/welkom` bijgewerkt. Tijdelijk
> diagnose-endpoint `/api/strava/debug-gear` (verwijderen na verificatie van de
> gear-sync; Strava-leeslimiet was tijdens de test bereikt).
>
> Update 2026-06-23 (b): klim-overrides per event (gecommit + gepusht).
> Admin/creator kan de automatisch uit de GPX gedetecteerde klimmen bijsturen via
> een lijst-editor met live preview op de event-pagina: hernoemen, samenvoegen
> (bv. een over-gesplitste Col du Glandon → één HC-klim), categorie kiezen
> (auto/4e/3e/2e/1e/HC), bereik aanpassen en niet-gedetecteerde klimmen handmatig
> toevoegen. Opgeslagen overrides (`event_climbs`, migratie `0092`) vervangen de
> auto-detectie overal: profiel, kaart én liveticker (incl. publieke `/live`).
> Stats blijven uit de GPX herberekend (`climbsFromRanges`).
>
> Update 2026-06-23 (c): Street View + POI's op de routekaart (gecommit +
> gepusht). De kaart heeft een versleepbare 🚶-marker die naar de dichtstbijzijnde
> route-punt snapt; een popup-link opent Google Street View op dat punt (deep-link,
> geen API-key). Daarnaast kunnen leden POI's plaatsen door op de kaart te klikken
> (water/eten/gevaar/uitzicht/info + optioneel label), die blijvend op kaart én
> hoogteprofiel verschijnen (`event_pois`, migratie `0093`; eigen POI's of als
> beheerder verwijderbaar). POI's worden ook read-only getoond in de liveticker
> (kaart + profiel), incl. de publieke `/live`-pagina.
>
> Update 2026-06-23 (d): Strava-cap-workaround, Street View-flow en training-
> dashboard afgerond (commit `e834bc1`, gepusht). Strava gear-sync is eerst
> naar max. 1x/dag gethrottled (`bfa819b`) om de API-limiet te sparen; daarnaast
> kunnen leden nu handmatig een Strava `activities.csv` importeren op
> `/achievements`, zodat late instappers of leden buiten de Strava-app-cap toch
> badges/stats kunnen vullen. `/welkom` en `/hulp` leggen de import uit en
> `/hulp` heeft een zoekfunctie gekregen. Street View opent direct zonder popup,
> gebruikt een ZWB-kleurige wielrenner-marker, linkt met route-heading uit de
> GPX en gebruikt een stabielere Google Maps deep-link. `/training` toont een
> klikbare Load/Form-grafiek (42d/90d/6m/1j/2j) op basis van intervals.icu
> wellness, met CTL/ATL/Form in ZWB-stijl, plus een compacte eerstvolgende
> workout-kaart met workout-preview. De training-UI is opgeschoond: uitleg naar
> `/hulp`, 7-dagen totaal i.p.v. 14 dagen, en "TSB" heet in de UI voortaan
> "Form".
>
> Update 2026-06-23 (e): kleine UX-/hulpronde op Samen fietsen + OwnTracks
> (lokaal, nog niet gepusht bij schrijven). Op `/live` laat een klik op een
> outdoor-rider in de riderslijst de kaart nu naar dat lid toe vliegen (zoom 14)
> i.p.v. alleen het gemiddelde midden te tonen; kaart + lijst delen daarvoor één
> client-boundary (`live-board.tsx`). `flyTo` vuurt bewust alléén op de klik en
> niet op realtime positie-updates (anders trilt/herinzoomt de kaart continu).
> Daarnaast is de OwnTracks-hulp op `/hulp` iOS-bewust gemaakt: de iOS-modi
> heten **Actie** (actief, strak spoor) en **Significant** (zuiniger, minder
> nauwkeurig) i.p.v. de Android-namen Beweging/Grootte wijzigingen, en de
> verbinding (Private HTTP + koppellink) zit op iOS achter het i-icoon
> linksboven op de kaart.
>
> Mijlpaal 2026-06-08 (echt ZWB-logo op login + alle PWA/app-icons;
> wachtwoord-reset-flow met magic-link-fallback; team-roster + ZRL-auto-seeding
> met power-selectie, beschikbaarheid en lineup-planner; automatische Strava-
> sync-cron; club-ladder-overzicht + TTT-planner (ZwiftGopher) + onboarding-
> flow `/welkom`+`/wachten`; verborgen `/brochure`-route; ZWB-segmenten met
> live timing op events + `/profiel/segments` + Strava-reconciliatie;
> vermogensprofiel/powercurve-pagina; training: ZWBeterWorden-advies, zichtbare
> plan-actie-feedback en achtergrond-AI voor "pas vandaag aan"; recordtijden
> komen nu van Strava's authoritatieve athlete-PR. Migraties t/m 0076.
> Lokaal werken is de default, push/deploy alleen op expliciet verzoek.
>
> Eerdere mijlpaal 2026-06-01: training-AI draait via OpenAI background mode met
> polling; trainer-cockpit heeft schema-verwijderen, power-ranges en repeat-
> blokken voor intervals/FIT; hersteltrend staat expliciet naast load-metrics;
> iOS PWA succesvol getest met mobiele terugknop; eerste `/verhaal`
> scrollytelling-prototype; OwnTracks meermaals in het veld getest; eerste
> Playwright e2e-smoke-suite en trainer-praktijktest toegevoegd.)

---

## Context

ZWB Cycling is een Benelux-breed online wielerteam (Zwift Racing League,
Ladder, Flamme Rouge, zomerse outdoor rides). Het ZWB-bestuur staat
achter dit platform — officieel project, geen experiment.

**Doel:** één centraal platform voor leden waar events, training, teams,
chat en kennis samenkomen. Vertrekpunt: PWA op desktop + Android + iOS.

**Stack:**
- Next.js 16.2.6 (App Router, TypeScript) op Vercel/Netlify
- Supabase (Postgres + Auth + Storage + Realtime + RLS)
- Tailwind v4 + shadcn/ui
- next-pwa + Web Push API
- Strava OAuth, intervals.icu, WTRL/Ladder scrapers (cookie-auth)
- Open-Meteo voor weer (geen key)
- Deploy: Netlify, repo: `stjinne89/zwb-platform`

---

## Status vs. oorspronkelijke fase-indeling

### Fase 1 — MVP

| # | Onderdeel | Status |
|---|---|:---:|
| 1 | Auth + ledenprofiel (magic link, Google, register-flow, admin approval) | ✅ |
| 2 | Kalender + events (RSVP, GPX, kaart, Open-Meteo wind/weer, edit) | ✅ |
| 3 | Teams-overzicht + standings (incl. graveyard-status) | ✅ |
| 4 | Materiaalzone → omgekat naar "Vraag en Aanbod" marketplace | ⤴️ |
| 5 | E2E encrypted chat (Signal/Matrix) | ⏸️ on-hold |
| 6 | PWA shell (manifest, icons, installable) | ✅ |

### Fase 2 — Integraties

| # | Onderdeel | Status |
|---|---|:---:|
| 7 | intervals.icu koppeling + coach-cockpit | ✅ |
| 8 | Strava OAuth + 5-jaars backfill (chunked, paginated) | ✅ |
| 9 | WTRL ZRL scraper | ✅ |
| 10 | Ladder scraper (ladder.cycleracing.club) | ✅ |
| 11 | Race-mate finder (filter-bar /leden + ZRL-cat naast RSVPs) | ✅ quick wins |

### Fase 3 — Engagement

| # | Onderdeel | Status |
|---|---|:---:|
| 12 | Foto-galerij per event | ✅ |
| 13 | Achievements & badges (400 badges, 38 auto-evaluators) | ✅✅✅ |
| 14 | Club-stats dashboard (maand-totalen + top 3 + 12w-sparkline) | ✅ |
| 15 | Polls | ✅ |
| 16 | Push-notificaties (incl. event-reminders 24u/2u via cron) | ✅ |
| 17 | Sponsor-zone + ledenvoordeel (samengevoegd) | ✅ |
| 18 | Contributie/merch via Mollie iDEAL | ⏸️ on-hold |

### Fase 4 — Native

| # | Onderdeel | Status |
|---|---|:---:|
| 19 | Expo/React Native app | ⏸️ on-hold |

---

## Sub-plan: Tiered Badges — alle 6 fases ✅

| Fase | Beschrijving | Status |
|---|---|:---:|
| 1 | Schema + 400-badge seed (100 codes × 4 tiers) + Badge-kast op /profiel | ✅ |
| 2 | Strava avatar-import + rijke ProfileHeader + eigen avatar-upload | ✅ |
| 3 | Eerste 3 auto-evaluators (Distance, Climbing, Long Day Out) | ✅ |
| 3b | 35 extra auto-evaluators (38 codes nu auto) | ✅ |
| 4 | Volledige Strava-backfill: chunked + resumable, batched upserts | ✅ |
| 5 | Admin manual badge-beheer + "Badges herberekenen"-knop | ✅ |
| 6 | /leden upgrade + publieke profielen + per-veld privacy | ✅ |

Auto-evaluated codes (46):
`A001 A002 A003 A004 A005 A006 A007 A008 A009 A012 A013 A014 A015 A016
A017 A018 A019 A020 A021 A026 A027 A028 A029 A030 A031 A038 A039 A041
A042 A043 A044 A045 A046 A051 A057 A071 A075 A081 A083 A084 A085 A088
A090 A095 A096`

De overige ~54 codes blijven `manual` (admin kent toe) of `future`
(wachten op power-data / komoot-koppeling / etc).

### Sub-feature: Col-detector (echt + virtueel)

Auto-award van col-badges door Strava `summary_polyline` te matchen tegen
een curated col-database (`cols` + `profile_climbed_cols`, migraties
`0040`-`0050`).

- **Detectie**: `src/lib/cols/detector.ts` — polyline decode (@mapbox/
  polyline) + **punt-tot-lijnsegment-afstand** (cruciaal: Strava's
  summary_polyline is gedecimeerd, dus punt-afstand miste toppen) +
  bbox-prefilter. Leest gepagineerd (Supabase 1000-rij-cap omzeild).
- **Echte cols (~40)**: TdF/Giro/Vuelta-klassiekers + Belgische Ardennen
  + Limburgse heuvels. Coördinaten geverifieerd tegen Wikipedia/
  latitude.to/OpenStreetMap (migraties `0047`, `0050` — veel seed-waarden
  zaten 1-7 km mis).
- **Watopia/Zwift (10)**: zelf-kalibrerend — `zwift-data` npm levert per
  klim de Strava-segment-ID, `src/lib/cols/watopia.ts` haalt de
  `end_latlng` (= KOM-top) op via de Strava segment-API (migratie `0048`).
  Draait in sync + recompute. `virtual`-flag scheidt ze van echte cols
  (A019 telt alleen echt).
- **Badges auto**: A013 Alpe Finisher, A014 Ventoux, A015 Marmotte (alle
  5 cols), A016 Dolomiti, A019 Col Collector, A095 Stelvio (echt) +
  A083 Alpe du Zwift (bronze/platinum), A090 Virtual Everesting (virtueel,
  migratie `0049`). Tijd-gebaseerde tiers (A083 silver/gold) en A082
  (routes) blijven manual.
- **/profiel/cols**: geklommen + nog-te-doen grid, times_climbed +
  eerste/laatste datum, ZWB-leaderboard per col, directe VeloViewer-links
  (`strava_segment_id`, migratie `0044`).

---

## Sub-plan: ZWB Live "Samen fietsen"

Update 2026-05-26: spoor A is omgebouwd van PWA foreground-GPS naar
OwnTracks background tracking. De browser-geolocation/wake-lock route is
verwijderd; echte outdoor posities komen nu binnen via
`/api/live/owntracks` met persoonlijke tokens. De kalender toont live
indicators op eventrijen en linkt direct naar `/live/[eventId]`.

| Spoor | Beschrijving | Status |
|---|---|:---:|
| A | Outdoor GPS-tracker via OwnTracks background tracking | ✅ |
| B | Externe LiveTrack aggregator (Garmin/Wahoo share-URL per rit) | ⏸️ skip |
| C | Indoor status-board (handmatige "Ik fiets nu"-toggle) | ⏸️ skip |
| Bonus | Event liveticker op event-pagina's + publiek deelbaar | ✅ |

Spoor B en C zijn **bewust geskipt**: OwnTracks dekt outdoor af, en het
indoor status-board is een grote bouw met onzekere adoptie. Heroverwegen
als bestuur of leden er expliciet om vragen.

De liveticker is inmiddels zichtbaar op de `/kalender`-rij (live-indicator met
link naar `/live/[eventId]`, zie de update hierboven).

---

## Buiten oorspronkelijk plan opgeleverd

<!-- zwb-segment-explorer-round -->
- **ZWB Segments: interactieve clubkaart** (2026-09-13; lokale featurecommit
  048b94f; migratie 0152): bestaande pagina omgebouwd naar
  kaart/lijst met eigen ZWB-record/podium, persoonlijke vermogen-/windinschatting,
  gedeelde selectie, filters en Strava-links. Eigenaar bevestigde toestemming.
  De eerdere collecties/Zwift staan nu op /profiel/segments/collecties; cols en
  badges behouden hun bestaande opslag. De nieuwe kaart gebruikt alle ingelezen
  ondersteunde buitenpogingen, onafhankelijk van de oude Benelux-selectielimiet.
  Atomaire pogingvervanging en een live databaseprojectie voorkomen verouderde
  tijden na gewijzigde/verwijderde/privéritten en ingetrokken koppelingen.
  Beheerscherm voor hervatbare rit-/geometriebatches, hulppagina en privacyversie
  2026-09-13; bestaande consentdialoog blijft het akkoord registreren.
  Geen algemeen leaderboard, scraping, indoorvoorspelling of verzonnen ontbrekende
  gegevens. [Werking, uitrol en beperkingen](docs/zwb-segment-explorer.md).
  Gecontroleerd: 38 gerichte tests, waaronder vijf geïsoleerde PostgreSQL-tests;
  twee hermetische Playwright-browsertests (desktop/mobiel), gerichte lint en
  volledige productiebuild geslaagd. Geen echte API-verificatie of
  veldkalibratie uitgevoerd. Gepusht op 2026-09-13 (t/m `31c4299`); migratie
  0152 dezelfde dag door de eigenaar in productie gedraaid.
<!-- /zwb-segment-explorer-round -->

<!-- zwb-segment-tiles-round -->
- **Segmentkaart: CARTO-watermerk opgelost** (2026-09-13; lokaal ongecommit,
  basiscommit ed1e230; geen migratie): CARTO bleek een API-key te vereisen,
  waardoor de eerste kaart "API key required" toonde. De segmentkaart gebruikt nu
  standaard OpenStreetMap-tegels en bijbehorende attributie. De basiskaart blijft
  licht in beide thema's, met leesbare segmentkleuren. Geen CARTO-account of sleutel
  toegevoegd: de bestaande OSM-aanpak volstaat. De eerdere provider was niet live
  gecontroleerd omdat browsertests tegelverzoeken onderscheppen; die tests bewijzen
  dus geen externe beschikbaarheid. De tegel-URL wordt nu expliciet gecontroleerd.
  Verificatie: twee browsertests en lint geslaagd; één echte OSM-tegel gaf HTTP 200
  en is visueel als kaart zonder watermerk gecontroleerd. Gecommit als `31c4299`
  en gepusht op 2026-09-13.
<!-- /zwb-segment-tiles-round -->

<!-- zwb-segment-hidden-round -->
- **Segmentklassement: alleen de eigenaar zichtbaar** (2026-09-13; `a7dba9c`; migratie 0154;
  gepusht 2026-09-13). Leesanalyse op productie: de hoofdoorzaak is dat
  alleen de eigenaar privacyversie 2026-09-13 heeft getekend — geen bug; negen leden
  met ~58.000 pogingen verschijnen na opnieuw akkoord. Daarnaast sloot het filter op
  Strava's `effort.hidden` 41% van alle pogingen uit, terwijl dat een weergavestandaard
  is en geen privacykeuze van het lid. 0154 laat dat filter vallen (simulatie: 1.745 →
  3.671 gedeelde klassementen). Privacyverklaring en `/hulp/segments` noemden
  "verborgen pogingen"; die zinnen noemen nu de echte uitsluitingen. **Bewust geen
  nieuwe privacyversie**: zelfde gegevens en ontvangers, en alleen de eigenaar had
  2026-09-13 getekend — push daarom snel, anders tekenen leden de oude zin.
  **Niet gebouwd:** Gravel/MTB meetellen (+1 klassement, wegfietsmodel past niet).
  Getest: PGlite-databasetest met 0152+0154 (verborgen poging telt, privésegment niet),
  25 gerichte tests en lint geslaagd. 0154 is niet tegen de productie-Supabase getest en
  moet door de eigenaar gedraaid worden. Details: [docs/zwb-segment-explorer.md](docs/zwb-segment-explorer.md).
<!-- /zwb-segment-hidden-round -->

<!-- zwb-segment-backfill-round -->
- **Segmentpogingen automatisch aanvullen** (2026-09-13; `49d286d`, gepusht
  2026-09-13; geen migratie). ~6.000 oude buitenritten misten segmentpogingen; via
  `/beheer/segments` was dat ~1.200 klikken en de eigenaar wil niets handmatig. De
  bestaande 5-minutenjob `/api/strava/webhook/process` vult nu bij een lege webhookrij
  binnen het resterende 8 s-budget ritten aan (nieuwste eerst). Segmentlijnen kwamen
  eerst pas daarna; sinds de ronde hieronder begint elke run met één voorrangslijn.
  Eigen krappe Strava-budget (50% kwartier / 60% dag); onvolledige ritten worden
  afgevinkt, tijdelijke fouten blijven staan, een dode token trekt niets in.
  `?segmentBackfill=0` zet het uit zonder deploy.
  **Niet gebouwd:** een aparte cron-job (handmatige inrichting en extra invocaties) en
  een voortgangsscherm (het job-antwoord toont `remaining`). Oude `/api/segments/backfill`
  en de knoppen op `/beheer/segments` blijven ongewijzigd.
  Getest: 7 unittests op de beslislogica, 59 tests in de geraakte suites, lint, en
  de databasequery's alleen-lezen tegen productie (10 leden, 6.044 open ritten). Niet
  getest: echte Strava-calls en de looptijd op Netlify; de doorloop van 4–5 dagen is
  een schatting. Details in
  [docs/zwb-segment-explorer.md](docs/zwb-segment-explorer.md).
<!-- /zwb-segment-backfill-round -->

<!-- zwb-segment-assessment-round -->
- **Segmentinschatting: eigen record, profiel bij openen, voorrangslijst**
  (2026-09-13; `71827b7`, gepusht 2026-09-13; migratie 0155). Elk segment gaf
  "Onvoldoende gegevens": geen tegenstander (de eigenaar was de enige zichtbare rijder)
  en geen enkel hoogteprofiel, omdat de vorige ronde lijnen pas na alle ~6.000 ritten
  ophaalde — die volgorde was een verkeerde keuze en is teruggedraaid. Nu: eigen PR − 1 s
  als doel zonder clubdoel ("Doel: eigen record"); ontbrekend profiel ophalen bij openen
  met de eigen koppeling; de 5-minutentaak begint elke run met één lijn uit
  `segment_geometry_priority` (meeste rijders eerst), zonder open ritten tot zes.
  **Niet gebouwd:** profiel bij openen voor leden zonder Strava-koppeling (geen token),
  en profielen voor de hele lijst in één keer (40 × 2 calls per pagina is te duur).
  Getest: 57 unittests incl. PGlite voor 0155, lint, typecheck, twee browsertests;
  de eigenaar bevestigde de inschatting bij openen in productie. 0155 gedraaid, maar
  bleek op productie te traag (timeout, daarna 0,6–3,1 s) en at de taaktijd op:
  vervangen door 0156 (`8200fc4`, gepusht 2026-09-13; smalle indexen, zelfde uitkomst) plus een afbreekgrens van 2 s
  in de taak. 0156 is niet op productie gemeten en moet door de eigenaar gedraaid worden.
  Details: [docs/zwb-segment-explorer.md](docs/zwb-segment-explorer.md).
<!-- /zwb-segment-assessment-round -->

<!-- zwb-segment-nav-round -->
- **ZWB Segments in het Club-menu** (2026-09-14; `1466e5a`, gepusht; geen migratie). Op verzoek van de
  eigenaar verplaatst van het avatarmenu naar Club, direct boven ZWBlokken: het is een
  clubklassement, geen profielinstelling. **Bewust niet gedaan:** de URL verhuizen;
  `/profiel/segments` blijft, zodat bestaande links, de profielkaart en de hulppagina
  blijven werken. Getest met een unittest op volgorde, avatarmenu en actieve groep;
  niet in de browser bekeken (het menu vereist een ingelogd lid).
  Stand privacyakkoord op 2026-09-14: 4 van 35 goedgekeurde leden tekenden 2026-09-13,
  waarvan 3 van de 10 leden met actieve Strava-koppeling.
<!-- /zwb-segment-nav-round -->

<!-- zwb-segment-kom-round -->
- **ZWB KOM en minimaal drie rijders** (2026-09-15; `ecaccab`, gepusht naar `main`
  2026-09-15; migratie `0161`, vóór de push in productie aangetroffen). Op verzoek van de eigenaar toont ZWB Segments alleen nog segmenten
  waar minstens drie ZWB'ers reden, en krijgt de snelste daar de titel ZWB KOM: op het
  eigen profiel, op de ledenpagina (onder de badge-zichtbaarheid) en als dashboardblok
  "Nieuwe ZWB KOM's" naast de nieuwste badges. In het klassement en de lijst staat rang 1
  nu als "ZWB KOM" in plaats van "Recordhouder".
  **Waarom opgeslagen en niet live:** dashboard en profielen hebben alle segmenten nodig,
  en een volledige doorloop van de pogingen liep op productie al tegen de statement
  timeout (0155). Triggers markeren segmenten vuil; de webhook-taak rekent er per run
  200 na (max. 1,5 s, `?segmentKoms=0` zet het uit). Het dashboard toont KOM's waarvan de
  recordrit in de afgelopen zeven dagen ligt, zodat de eerste doorrekening en de
  inhaalslag van oude ritten het blok niet overspoelen. Gelijke tijd = gedeelde titel.
  `zwb_segment_koms` zit ook in de data-export.
  **Niet gebouwd:** KOM op het publieke profiel en een aparte minimale-rijdersinstelling
  (vast op drie in de SQL). Pushmelding en QOM waren hier eerst ook geparkeerd, maar zijn
  dezelfde dag gebouwd in de ronde hieronder.
  **Privacytekst:** de segmentzin noemt nu de drempel en dat de titel op dashboard en
  ledenprofiel staat. Bewust geen nieuwe privacyversie: zelfde gegevens (naam, tijd,
  positie) voor dezelfde ontvangers — de eigenaar kan dat anders beslissen.
  **Claim vervallen:** "Is er geen clubdoeltijd, bijvoorbeeld omdat je een segment als
  enige ZWB'er rijdt" op `/hulp/segments` kan niet meer; aangepast.
  Getest: PGlite met 0152+0154+0155+0156+0161 (14 tests: drempel, clusters, KOM, overdracht,
  gelijke tijd, ritprivacy zonder herschreven pogingen, intrekken, akkoord, batchlimiet,
  rechten), unittests voor de taakstap, beide Playwright-segmenttests, typecheck en lint.
  **Niet getest:** 0161 tegen productie (geen lokale Supabase), de looptijd van triggers
  en refresh op echte data, en dashboard/profiel in de browser (vereist ingelogd lid).
  Zonder 0161 geven de nieuwe queries een fout en blijven de blokken leeg; de taakstap
  meldt dan alleen een fout. Details: [docs/zwb-segment-explorer.md](docs/zwb-segment-explorer.md).
<!-- /zwb-segment-kom-round -->

<!-- zwb-segment-qom-push-round -->
- **ZWB QOM en pushmelding bij winnen of verliezen** (2026-09-15; `cc3f2df`, gepusht
  naar `main` 2026-09-15; migratie `0162`, draaien ná `0161` en vóór de deploy — vóór de
  push in productie aangetroffen: `zwb_segment_koms.title`, `zwb_segment_kom_events` en
  `zwb_segment_maps.kom_computed_at` bestaan). Op verzoek van de
  eigenaar, met drie keuzes van de eigenaar: KOM blijft de snelste van iedereen, QOM is
  daarnaast de snelste vrouw (`profiles.sex`), de drempel blijft drie ZWB'ers op het segment
  (ook als zij de enige vrouw is), en leden zonder of met "zeg ik liever niet" dingen alleen
  naar de KOM mee. Titel zichtbaar op profiel, ledenpagina, dashboard ("Nieuwe ZWB KOM's en
  QOM's") en in het klassement bij de houder.
  **Pushmelding:** via een wachtrij `zwb_segment_kom_events`, verstuurd door de webhook-taak.
  Alleen bij een recordrit van ≤ 7 dagen en niet bij de eerste doorrekening, anders gaven
  0162 en de inhaalslag van oude ritten honderden meldingen. Verlies alleen bij een echt
  snellere rit. Nieuwe voorkeur "Ik win of verlies een ZWB KOM of QOM", standaard aan.
  **Privacy:** de QOM maakt het opgegeven geslacht voor leden afleidbaar. De privacytekst zegt
  dat nu. Het klassement zelf bevat geen geslacht; alleen de QOM-houder is herkenbaar.
  **Of dit een nieuwe privacyversie vraagt, is aan de eigenaar**: geslacht was tot nu toe
  alleen voor trainingsadvies en werd met niemand gedeeld.
  **Let op volgorde:** zonder `0162` faalt het opslaan van meldingsvoorkeuren (nieuwe kolom)
  en blijven de KOM-blokken leeg.
  **Niet gebouwd:** melding aan andere leden, melding bij verlies door privacy of intrekken,
  QOM-drempel per categorie.
  Getest: PGlite met 0152–0162 (18 tests, waaronder QOM open/enige vrouw/geslacht wijzigen,
  stilte bij eerste doorrekening en oude ritten, winst + verlies per titel, geen verlies bij
  gelijke tijd of verdwenen houder), unittests voor berichten en afvinken, beide
  Playwright-segmenttests, typecheck en lint. **Niet getest:** 0162 op productie, echte
  pushaflevering en dashboard/profiel in de browser.
<!-- /zwb-segment-qom-push-round -->

- **Buganalyse en overdrachtsprompt plannenboek** (2026-09-13; analyse op
  basiscommit `71724b4`; geen migraties; uitgevoerd in de ronde "bugronde
  plannenboek" bovenaan het chronologische werkplan): de 22 meldingen uit het
  gedeelde ZWBasis-plannenboek getrieerd en gericht aan de lokale code getoetst.
  [Uitvoerbare prompt](docs/bugfix-agent-prompt-2026-09-13.md) met bronnummering,
  acceptatiecriteria en onderscheid tussen code-aanwijzingen en bewezen oorzaken.
  Eigenaar kiest eerst bugs, wensen apart; wijzigen van doeltype repareren.
  De genoemde einddatum betreft de doeldatum/evenementdatum, niet de schemahorizon.
  Geen applicatiecode aangepast of bugs als opgelost verklaard: dit was een
  analyse-/overdrachtsronde. Bestaande lokale wijzigingen, waaronder de dagelijkse
  schema-aanpassingsroute, behouden. Geen iPhone-reproductie, productiegegevens,
  migratie-uitvoering of visuele screenshotverificatie; vragen over hersteldata
  en annuleren staan nog open. Wensen blijven in Drive.

- **Strava-webhooks en actief koppelingbeheer** (2026-09-05, commit `2c575b9`,
  migr. `0148`-`0151`): antwoord op Strava's **afwijzing** van onze aanvraag voor
  een hogere atletenlimiet. Die afwijzing stelde twee eisen — webhooks in plaats
  van polling, en actief beheer van stale en gedeauthoriseerde atleten — en op
  beide voldeed de app aantoonbaar niet.

  *Wat er misging.* We pollden elke 15-30 minuten `/athlete/activities` voor élke
  koppeling, ongeacht of er gereden was: ordegrootte 2.000-7.700 calls per dag,
  vrijwel allemaal leeg. De dure col- en ZWB-segmentdetailcalls stonden daarom in
  de cron op 0 — features uitgezet om het pollen te kunnen betalen. Daarnaast
  riepen we `POST /oauth/deauthorize` **nergens** aan: elk lid dat in de app
  ontkoppelde of zijn account verwijderde bleef op Strava's kant gekoppeld en
  bezette permanent een plek in onze cap, terwijl wij de rij met de token net
  hadden weggegooid. En een koppeling die op strava.com was ingetrokken werd nooit
  gemarkeerd maar wél elke cronrun opnieuw geprobeerd — precies de "stale
  athletes" uit de afwijzing.

  *Webhooks.* `GET/POST /api/strava/webhook` doet de verificatie-handshake en zet
  events in `strava_webhook_events`; hij antwoordt **altijd** 200, ook bij een
  fout aan onze kant, want een 5xx kost ons de subscription. Verwerken gebeurt
  buiten die request om, via de Netlify function `strava-webhook-process` (elke
  minuut) op `/api/strava/webhook/process` — achtergrondwerk ná het antwoord is op
  serverless niet betrouwbaar. Eén `GET /activities/{id}?include_all_efforts=true`
  per échte rit levert meteen ook de segment-inspanningen, waardoor coltijden en
  ZWB-segmenttijden gratis meekomen in plaats van elk hun eigen detailcall te
  doen. Subscriptionbeheer zit op `/beheer/strava` (aanmaken/status/verwijderen),
  want Strava valideert de callback live en dat kan alleen tegen productie.

  *Koppelingbeheer.* `strava_connections` kreeg een levenscyclus: `revoked_at`
  (de app negeert de rij) los van `deauthorized_at` (Strava weet het ook). Tussen
  die twee blijft de rij bewust staan — we hebben de token nodig om te kúnnen
  deauthoriseren. Alle vier de paden zijn afgedekt: ontkoppelen in de app,
  account verwijderen, intrekken op strava.com (webhook), en een afgewezen
  refresh-token (`invalid_grant`, nu herkend in plaats van eeuwig herhaald). De
  nachtelijke sweeper (`strava-lifecycle`, 03:40) maakt openstaande
  deauthorisaties af, ruimt op, en draait het inactiviteitsbeleid: geen ritten én
  geen login in 12 maanden → waarschuwing, na 30 dagen loskoppelen.

  *Retentie.* Bij een ingetrokken koppeling gaat de ruwe Strava-data weg
  (activiteiten, segment-efforts, gear, `strava_id`, Strava-avatar); de afgeleide
  clubdata blijft (badges, ZWBlokken, onderhoud, coltijden — die FK staat op
  `on delete set null`). De bevestigtekst bij "Ontkoppel Strava" beloofde tot nu
  toe het tegenovergestelde en is aangepast.

  *Poll wordt reconcile.* `/api/strava/sync` selecteert nu op `last_synced_at`
  (niet meer op `updated_at`, dat ook door een tokenrefresh werd aangeraakt —
  waardoor leden achteraan de rij structureel verhongerden), slaat gerevokte
  koppelingen over, en hoort **1x per dag** te draaien. Nieuw is een app-breed
  rate-limit-budget in `strava_api_usage`: we lezen de `x-ratelimit-*`-headers nu
  op elke call en bewaren de laatste meting, zodat een koud gestarte cronrun weet
  wat de vorige heeft opgemaakt. Dat was principieel onmogelijk zolang elke run
  zonder geheugen begon.

  *Nagekomen hardening (commit `6fc0bbc`).* Twee dingen die pas bij het naar
  productie brengen opvielen. (a) Het inactiviteitsbeleid sloeg bij een
  onleesbare `last_sign_in_at` stil terug op "niemand logt in", en zou dan leden
  waarschuwen die dagelijks in de app zitten maar toevallig een jaar niet hebben
  gereden; nu slaat de run het beleid over en meldt dat. (b) De
  webhook-verwerker draaide elke minuut, wat met de route erachter ~86k
  Netlify-invocaties per maand kost voor iets dat meestal niets te doen heeft —
  dat botst met de credit-conventie in AGENTS.md. Nu elke 5 minuten, nog altijd
  3 tot 6 keer sneller dan de kwartierpoll die het vervangt.

  *Nagekomen (2026-09-08, commit `572c5ca`).* Bij het opzetten van de cron-jobs
  bleek de reconcile in een timeout te lopen. Oorzaak: hij draaide per lid nog
  het volledige nawerk, inclusief `syncZwbSegmentsForUser` — en die haalt ook met
  `maxFetches: 0` de authoritatieve PR's op, tot honderd `GET /segments/{id}` per
  lid. Dat was niet alleen te traag maar ook precies het soort callvolume dat we
  in deze ronde juist wilden wegnemen. Sinds de webhooks hoort dat werk bij het
  webhook-pad, per binnengekomen rit; de reconcile slaat het nu over
  (`skipPostProcessing`), met `?full=1` als handmatige inhaalslag. Het repareren
  van coltijden bij verwijderde ritten blijft wél altijd draaien — dat is nou
  juist waarvoor de reconcile bestaat.

  *Bewust niet gebouwd.* (a) Het pollpad is niet verwijderd: bij een gemist of
  vertraagd event is de dagelijkse reconcile het enige vangnet, en dat opgeven
  vóór we webhookbetrouwbaarheid hebben gemeten is te vroeg. (b) Geen
  e-mailwaarschuwing bij het inactiviteitsbeleid — de app heeft geen
  transactionele e-mail, alleen Supabase's auth-mails; daarom staat er een teller
  "Waarschuwing verstuurd" op `/beheer/strava` zodat het bestuur die leden via
  WhatsApp kan benaderen. (c) Geen retry-met-backoff op de Strava-calls zelf: het
  budget stopt nu vóór een 429 in plaats van erna te herstellen.

  *Niet lokaal te verifiëren:* de migraties `0148`-`0151` (geen Docker/Supabase
  hier), het aanmaken van de subscription (vereist een publieke HTTPS-callback) en
  echte Strava-deliveries. Wél lokaal getest: `npm run lint`, `npm run test` (822
  tests, waarvan 52 nieuw over webhookparsing, de toestandsmachine, de
  rit-mapping en het budget), `npm run build`, plus een smoke-test tegen
  `next dev` — de handshake geeft 200 met `{"hub.challenge":...}`, een verkeerd
  verify token 403, en een POST met onbereikbare database geeft nog steeds 200.
  *Correctie (2026-09-11):* die testrun was alleen groen in een proces op UTC.
  Buiten UTC faalde de nieuwe `achievement_week`-test, door een fout in
  `weekStartDate()` die al sinds de eerste commit bestond. Zie de ronde
  "achievement_week hangt niet meer af van de klok van het proces".
  Herindieningsdossier: `docs/strava-api-resubmission.md`; bediening en
  storingsafhandeling: `docs/runbook.md` §7.

- `/community` met announcements
- `/media` met podcasts (RSS-sync), YouTube channel-sync, nieuwsbrief,
  Drive-embed
- WhatsApp link-extractor voor teams + events (auto-link via OG)
- Mobile hamburger-menu (incl. stacking-context fix via portal)
- Dark mode (`next-themes`)
- Eigen profielfoto-upload (naast Strava-foto)
- Publieke ledenprofielen met opt-in + per-veld privacy (`profile_visibility`)
- Roster-claim flow met auto-join op team
- Role-permissions systeem
- Publieke liveticker (`/live/[eventId]`) deelbaar buiten login
- OwnTracks background live tracking (`/api/live/owntracks`) met tokenbeheer
  op `/live`
- Live-indicator op `/kalender`-rijen met directe knop naar `/live/[eventId]`
- OwnTracks is meermaals in echte ritten getest en werkt goed, ook zonder de
  meest batterij-intensieve stand.
- iOS PWA-praktijktest op iPhone 16 Pro met iOS 26.5: hoofdflow werkt; extra
  mobiele terugknop toegevoegd in de app-shell omdat iOS geen Android-achtige
  systeem-terugknop heeft.
- **Privacy/AVG-bouwstenen**: eigen data-export (`/api/account/export`) en een
  accountverwijder-flow (`/profiel` → `_actions.ts`), naast de per-veld
  privacy-opt-in. Privacyverklaring op `/privacy`, securityreview in
  `docs/security-review.md`.
- **Live-data-retentie**: `live_positions`/`live_sessions` worden periodiek
  opgeruimd via de Netlify scheduled function `live-cleanup` → `/api/live/cleanup`
  (bearer `LIVE_CLEANUP_SECRET`).
- **Operationele hardening**: integratie-health-check met admin-alerting
  (`/api/health/integrations` + scheduled function) en een onderhouds-`docs/runbook.md`
  met cron-inventaris en credential-vernieuwing. Eerste Vitest-unit-tests voor de
  breekbare pure logica (uitslag-matching, col-detector, normalisatie, tijdzones).
- Publieke `/verhaal` prototypepagina: scrollytelling rond de evolutie van ZWB
  met sticky renner/fiets, hoofdstuknavigatie en gestileerde kit-evolutie
  (blauw/roze indoor-shirt -> VBTM/Tactic -> huidig Hage).
- Nav-clustering met 5 top-level slots + dropdown-menus (desktop) en
  section-headers (mobiel)
- RiderStats op `/leden/[id]`: jaar-overzicht + 12-maand-heatmap +
  discipline-verdeling + persoonlijke records + lifetime-aggregaten
- Col-detector + `/profiel/cols`-collectie (echte + Watopia/Zwift-cols,
  VeloViewer-links, ZWB-leaderboard per col)
- Event-reminders cron (24u/2u) via cron-job.org
- Training coach-cockpit op `/training`: trainerrol, expliciete opt-in per
  trainer, doelen/intake, AI-conceptschema's, trainer-review en publicatie
  naar intervals.icu. Migratie `0037`.
- UI-polish ronde (commit `7485b65`): compactere member-facing copy,
  overbodige uitleg naar `/hulp`, nieuwe gedeelde app-UI helpers,
  strakkere app-shell met subtiele jersey-vlakken, sponsorcards zonder
  dubbele namen bij logo's, en een expliciete knop "Trainer aanwijzen"
  in `/training`.
- Self-coaching in training: leden met rol `Trainer` kunnen zichzelf als
  trainer aanwijzen; migratie `0039` verwijdert de oude database-check
  `athlete_id <> trainer_id`.
- Training V2 doorbouw: bewerkbare AI-prompt per generatie, trainereditor
  voor schema/workouts/intervalblokken, gekleurde workoutblokken, rapportage
  + trainerfeedback, intervals.icu-links, FIT-downloadroute via intervals.icu,
  en dagelijkse adaptation-cron met review-drafts. Migratie `0051`.
- Training AI hardening: AI-concepten draaien via OpenAI Responses background
  mode met status-polling, zodat GPT-5.5 lang mag rekenen zonder Netlify
  request-timeouts. Migratie `0066`.
- Training planbeheer: trainers kunnen oude schema's lokaal uit ZWB
  verwijderen; workouts verdwijnen cascade mee. Gepubliceerde intervals.icu-
  events blijven daar staan.
- Workout-output verbeterd: wattage-ranges blijven native power-ranges in
  intervals/FIT (`start`/`end` in workout_doc) en compacte herhalingen zoals
  `3x8 min met 4 min herstel` worden in grafiek, intervals-description en FIT
  uitgeklapt naar losse werk- en herstelblokken.
- Trainer-cockpit hersteltrend: trainers zien hersteldata nu expliciet naast
  load-metrics, met onderscheid tussen niet gedeeld, opt-in zonder data en
  actuele status/readiness/HRV/rust-HR/slaap.
- Eerste Playwright e2e-smoke-suite toegevoegd: lokale runner start/stopt Next
  dev-server op poort 3100, test publieke pagina's en anonieme redirects naar
  `/login`.
- Praktijktest voor trainer-cockpit vastgelegd in
  `docs/training-cockpit-praktijktest.md`: inclusief waarschuwing dat publiceren
  echte intervals.icu/Wahoo/Garmin-kalenderitems maakt en advies om een kort
  weekplan te testen.
- Verborgen `/brochure`-route: deelbare scrollytelling-brochure (Landal
  Warsberg-teamweekend) met hero-beeld, bungalow-foto, plattegrond-PDF en
  sponsorlogo's. Buiten de nav, alleen via directe link.
- Wachtwoord-reset-flow: e-mail + wachtwoord naast magic link op `/login`,
  `/wachtwoord-resetten`-pagina, gehardende auth-confirm-route (betere
  foutafhandeling op verlopen/ongeldige links) en middleware die
  recovery-sessies afschermt tot het wachtwoord daadwerkelijk is gereset.
  Supabase auth-mailtemplates gedocumenteerd in
  `docs/supabase-auth-email-templates.md`.
- Team-roster + ZRL-seeding (migr. `0067`-`0070`): volledige roster-tabel per
  team, automatische seeding van ZRL-divisieteams vanuit een parent-team
  (**die seeding is in `0172` verwijderd**: een ingeschaalde categorie maakt je
  geen teamlid meer),
  beschikbaarheidsknoppen per renner, lineup-planner en power-profiel-selectie
  (sterkste renners per categorie). Event-type-categorieën (`0067`) voor
  filterbare kalender. RLS-recursie op `team_members` gefixt (`0069`).
- Automatische Strava-activiteiten-sync via cron (`/api/strava/sync`): houdt
  activiteiten actueel zonder handmatige sync, bovenop de bestaande
  knop-gestuurde backfill. Bearer-auth + toegevoegd aan `PUBLIC_PATHS`.
- Club-planning + onboarding (migr. `0071`): `/teams/club-ladder`-overzicht
  (clubbrede ladder-stand), `/teams/ttt-planner` team-tijdrit-planner met
  ZwiftGopher-import en pull-berekening, en een onboarding-flow `/welkom` +
  `/wachten` voor nieuwe leden vóór admin-approval.
- ZWB-segmenten + live timing (migr. `0072`-`0075`): eigen ZWB-segmentendatabase
  met collecties, `/profiel/segments` (persoonlijke segmenttijden +
  leaderboards), live-timing-paneel op event-pagina's (`/api/live/timing`),
  en Strava-activiteit-reconciliatie zodat dubbele/ontbrekende activiteiten
  netjes worden samengevoegd. Segment-backfill-route + sync-lib.
- Recordtijden authoritatief: PR-tijden voor cols/segmenten komen nu uit
  Strava's `athlete_segment_stats` (athlete-PR) i.p.v. de onvolledige
  activity-scan-cache — lost o.a. Alpe du Zwift (38:24) op.
- Vermogensprofiel/powercurve (migr. `0076`): `/training/vermogen`-pagina met
  powercurve-grafiek per renner, `src/lib/intervals/power-curve.ts`, gevoed via
  intervals.icu. Power-profiel ook gebruikt in team-rosterselectie.
- Training-iteratie: ZWBeterWorden-advies met 5 merkgekleurde niveaus
  (gender-variabel via ZRL-divisie), inklapbare workout-blokken + "Bekijk schema
  hier"-kaart naar intervals, "Komende workouts" toont de hele dag op datum.
  Zichtbare feedback op plan-acties (`PlanActions`: 'Bezig…', succes/fout, aantal
  niet-gepubliceerde workouts). Renner mag zijn eigen dag-aanpassing
  (afgeleid plan) zelf goedkeuren/publiceren.
- "Pas vandaag aan" crash gefixt: de renner-knop draait nu via dezelfde
  achtergrond-AI + polling als de trainer (geen synchrone 45s-call die op
  Netlify werd afgekapt). Migr. `0067_ai_generation_adaptation` voegt
  `parent_plan_id` + `adaptation_reason` toe.
- Echt ZWB-logo: login toont het transparante ZWB-wordmerk gecentreerd op een
  lichte kaart (leesbaar in light/dark), en alle PWA/app-icons (192/512 +
  maskable, apple-touch, favicons) zijn opnieuw uit het echte logo gegenereerd
  via `scripts/generate-icons.mjs`.
- Verjaardagen (migr. `0077`+`0078`): `birth_date` +
  `share_birthday`-opt-in op `profiles`. Met opt-in verschijnt de verjaardag bij
  andere goedgekeurde leden, op `/kalender` en op het ledenprofiel. Per lid een
  afgeschermde verjaardagsruimte `/verjaardagen/[id]` met felicitatieberichten
  (`birthday_messages`), foto's (`birthday_photos` + privé bucket
  `birthday-photos`, pad `<lid>/<jaar>/<uploader>/...`) en een **verjaardags-
  rondje** (`birthday_rides`, migr. `0078`): de jarige zet één rit per jaar op met
  datum/tijd/locatie/uitnodiging + optionele GPX-route (privé bucket
  `birthday-gpx`) en afstand/hoogtemeters. Owner-only beheer; lezen strikt
  RLS-gated op de opt-in. Tijdzone-correcte datums via `src/lib/birthdays.ts`
  (Europe/Amsterdam). Het verjaardagsrondje heeft een **RSVP** (migr. `0079`,
  `birthday_ride_rsvps`, zelfde ja/misschien/nee-model als events, composite-FK
  naar `birthday_rides` zodat aanmeldingen mee-cascaden) en op de dag zelf een
  eigen **liveticker**: dezelfde kaart + hoogteprofiel + renner-projectie als de
  event-liveticker (`EventLiveTicker` hergebruikt), gevoed door **alleen de
  aangemelde renners** (yes/maybe) die outdoor delen op Samen fietsen. Op andere
  dagen blijven kaart + hoogteprofiel zichtbaar via `GpxMap`/`ElevationProfile`.
  De ticker-copy is geparametriseerd (`heading`/`description`/`emptyText`) zodat
  events ongemoeid blijven; `amsterdamWallTimeToIso` zet `ride_date`+`ride_time`
  om naar een echte start-timestamp. De RSVP-UI is bewust clean gehouden: geen
  losse knoppen of uitlegtekst, maar drie klikbare status-vakken (Rijdt
  mee/Misschien/Niet) met je keuze gemarkeerd; de uitleg staat op
  `/hulp#verjaardagsrondje`.
- Strava-cron-sync verlicht: de dure detailed-activity calls
  voor col- en ZWB-segmenttijden staan in de cron standaard op 0
  (`STRAVA_SYNC_COL_SEGMENT_MAX_FETCHES` / `_ZWB_SEGMENT_MAX_FETCHES`), en het
  athlete-/avatar-profiel wordt niet meer bij elke cronrun ververst
  (`refreshAthleteInfo: false`). Houdt de frequente automatische sync licht
  binnen Strava's rate-limit; de dure backfills draaien alleen op verzoek/recompute.
- App-brede copy-pass: uitleg- en hulptekst uit formulieren
  en feature-schermen gehaald over ~64 bestanden; noodzakelijke uitleg staat op
  `/hulp` en privacy-uitleg in de privacyverklaring. Vastgelegd als harde
  conventie "Product copy" in `AGENTS.md` zodat nieuwe schermen compact blijven.
- RSVP-UI verstrakt: zowel events als het verjaardagsrondje
  gebruiken nu één klikbare status-kolom-UI (Ja/Misschien/Nee resp. Rijdt
  mee/Misschien/Niet) i.p.v. losse knoppen + aparte deelnemerslijst. Het vak met
  je keuze is gemarkeerd; uitleg staat op `/hulp` (`#verjaardagsrondje`).
- Events verwijderen: rode "Verwijderen"-knop naast
  Opslaan/Annuleer in het bewerkformulier (via een `deleteSlot`-prop zodat het
  form generiek blijft). `deleteEvent`-actie met permissie-check (creator of
  `events.manage_all`, gelijk aan de bestaande RLS-policy), bevestigingsdialoog,
  cascade-cleanup van rsvps/foto's/chat/uitslagen via de FK's en best-effort
  opruimen van GPX + de event-fotomap in storage. Redirect daarna naar `/kalender`.
- **Interactief hoogteprofiel + cols op events** (2026-06-22): klimmen worden
  **direct uit de GPX-hoogtedata** berekend (`src/lib/gpx-climbs.ts`: smoothing,
  resampling, klim-detectie met dal-tolerantie, categorie via klim-score) — geen
  Strava/VeloViewer-afhankelijkheid, dus geen segment-ambiguïteit. Een klim krijgt
  een echte col-naam zodra hij dicht bij een bekende col uit de `cols`-tabel ligt
  (hergebruikt de equirectangulaire punt-tot-lijnsegment-projectie). Het
  hoogteprofiel (`elevation-profile.tsx`) en de routekaart (`gpx-map.tsx`) tonen
  gekleurde klim-banden/segmenten in ZWB-kleuren met klikbare stats (lengte, gem.%,
  max.%, hoogtemeters, naam). Een gedeelde orchestrator (`route-section.tsx`) haalt
  de GPX één keer op en deelt de actieve-klim-state tussen kaart en profiel.
  Hoveren toont afstand · hoogte · stijgingspercentage in een readout **onder** het
  profiel (niet meer achter de categorie-badges). Beide zijn **uitklapbaar** naar
  fullscreen: het profiel draait op touch-apparaten in portret naar liggend voor
  maximaal zicht (desktop blijft recht), de kaart vult groot zonder rotatie.
  Klimmen komen ook terug in de liveticker (`event-live-ticker.tsx`), inclusief de
  publieke `/live`-pagina en de verjaardagsrit. Vitest-tests voor de
  klim-detectie/categorisatie.
- **Klim-overrides per event** (2026-06-23): admin/creator kan de auto-gedetecteerde
  klimmen bijsturen via een lijst-editor met live preview op de event-pagina
  (`climb-editor.tsx` + `route-section.tsx`): naam, categorie (auto/4e/3e/2e/1e/HC),
  start/eind-km, samenvoegen (over-gesplitste klim → één), verwijderen en handmatig
  toevoegen van niet-gedetecteerde klimmen. Opgeslagen als afstand-bereiken in
  `event_climbs` (migratie `0092`, RLS-read voor leden, schrijven via service-role
  na `guardEventManage`); de server-action `saveEventClimbs` vervangt het hele
  setje idempotent. Een nieuwe pure helper `climbsFromRanges()` herberekent de
  stats (lengte/hoogtemeters/%) uit de GPX over het bereik, met override-bare naam
  en categorie. Overrides vervangen de auto-detectie overal: profiel, kaart én
  liveticker (ook de publieke `/live`-pagina). Met unit-tests (samenvoegen,
  categorie-override, naam-voorrang).
- **Street View-knop + POI's op de routekaart** (2026-06-23): de kaart
  (`gpx-map.tsx`) heeft een versleepbare 🚶-marker die naar het dichtstbijzijnde
  route-punt snapt; de popup-link opent Google **Street View** op dat punt via een
  deep-link (`maps/@?api=1&map_action=pano&viewpoint=…`) — geen API-key/kosten, je
  loopt verder in Google. Daarnaast kunnen **alle leden POI's plaatsen** door op de
  kaart te klikken: vaste types met icoon (💧 water, 🍌 eten, ⚠️ gevaar, 📷
  uitzicht, ℹ️ info) + optioneel label. POI's verschijnen blijvend op **kaart én
  hoogteprofiel** (de kaartlocatie wordt op de route geprojecteerd voor de
  profielplaats). Opgeslagen in `event_pois` (migratie `0093`, RLS: iedereen leest,
  leden voegen eigen toe/verwijderen die; beheerder verwijdert alles via
  service-role). Server-actions `addEventPoi`/`removeEventPoi`, gedeelde types in
  `poi.ts`, kaartklik via `map-click.tsx` (`useMapEvents`), marker-iconen als
  `divIcon` (geen image-assets). Markers werken op de inline- én fullscreen-kaart.
- **Street View-flow verfijnd** (2026-06-23, commit `e834bc1`): bovenop de
  POI/Street-View-basis opent de Street View-marker nu direct zonder popup,
  gebruikt hij een ZWB-kleurige wielrenner-marker en berekent hij de kijkrichting
  uit de GPX-route (`heading` in de Google Maps deep-link). Dit voorkomt de
  dubbele klik en vermindert zwarte/verkeerd-gerichte Street View-starts.
- **Strava API-limiet ontzien + handmatige import** (2026-06-23, commits
  `bfa819b` + `e834bc1`): gear-sync (`/athlete`, fietsstanden) wordt maximaal
  1x per dag opgehaald om de leeslimiet te sparen. Daarnaast kunnen leden op
  `/achievements` een Strava-export `activities.csv` uploaden. De import parser
  (`src/lib/strava/import.ts`) normaliseert CSV/semicolon/quoted velden,
  filtert fietsactiviteiten, schrijft naar `strava_activities`, en triggert
  badge-evaluatie + week-awards. Dit geeft leden buiten de Strava app-cap of
  late instappers toch badge/stat-functionaliteit zonder live OAuth-koppeling.
  `/welkom` en `/hulp` leggen de flow uit.
- **Hulp-zoekfunctie** (2026-06-23): `/hulp` heeft een client-side zoekveld
  (`help-search.tsx`) dat routes, onderwerpen en veelvoorkomende hulpvragen
  indexeert, inclusief Strava-import, training, OwnTracks, onderhoud, Street
  View/kaart en badges.
- **Training-load-grafiek + eerstvolgende workout-preview** (2026-06-23):
  `/training` toont bij klik op Fitness/Form een ZWB-stijl grafiek voor Load,
  CTL, ATL en Form met schaalkeuze 42 dagen, 90 dagen, 6 maanden, 1 jaar en
  2 jaar (`training-load-chart.tsx`, gevoed door 730 dagen intervals.icu
  wellness). UI-copy is compact gehouden; uitleg over CTL/ATL/Form en
  hersteldata staat op `/hulp`. De metric-rij gebruikt nu 7-dagen totaal i.p.v.
  14 dagen. Onder de vijf metrics staat de eerstvolgende workout met grote
  workout-preview: ZWB-schema's gebruiken de eigen blokken; intervals.icu-events
  gebruiken `workout_doc`-stappen als aanwezig en vallen anders terug op een
  zichtbare TSS/load-preview.
- **Samen fietsen: klik-naar-rider op de kaart + iOS-OwnTracks-hulp**
  (2026-06-23, lokaal): de riderslijst en de kaart op `/live` zijn samengevoegd
  in één client-component (`live-board.tsx`) die focus-state deelt; de
  mySession-blokken (OwnTracks-paneel, start/stop) blijven server-side en komen
  via `children` binnen. Een klik op een outdoor-rider zet een `focus`-doel
  (`{sessionId, nonce}`); `LiveMap` vliegt via een `ref` op `MapContainer`
  (react-leaflet v5, `useImperativeHandle` → Leaflet-`Map`) naar de positie.
  Het `flyTo`-effect hangt alléén aan `focus` en leest de actuele positie via een
  ref, zodat realtime positie-updates de kaart niet continu laten herinzoomen.
  Alleen outdoor-riders zijn klikbaar (alleen die hebben GPS). De `/hulp`-
  OwnTracks-sectie is iOS-bewust: modi **Actie**/**Significant**/**Handmatig**/
  **Rustig** naast de Android-namen, en de verbinding zit op iOS achter het
  i-icoon linksboven; Significant/Grootte wijzigingen genoemd als zuinigere maar
  minder nauwkeurige optie.
- **Persoonlijk trainingsstatus-blok op het dashboard** (2026-06-22): bovenaan een
  blok met het **ZWBeterWorden-advies** + de metrics **Fitness (CTL)**, **Vorm
  (TSB)** en **Herstel/readiness** plus de **eerstvolgende geplande workout**.
  Alleen zichtbaar wanneer relevant (intervals.icu gekoppeld óf een geplande
  workout); de trage intervals-fetch zit in een `<Suspense>`-kind zodat de rest van
  het dashboard niet wacht. De "Training en clubactiviteit"-link wijst nu naar
  `/stats` i.p.v. `/training`. De ZWBeterWorden-advieslogica is verplaatst naar een
  gedeelde lib (`src/lib/training/zwbeterworden.ts`, met `computeZwbStatus`) zodat
  dashboard en trainingspagina één bron delen, en kreeg **10 per-dag wisselende
  tekstvarianten per niveau** (deterministisch o.b.v. de Amsterdam-datum).
- **Onderhoud van slijtbare onderdelen** (2026-06-23, migr. `0089`): nieuwe
  `strava_bikes` (fietsen + levensduur-km gesynct uit Strava `/athlete`) en
  `bike_components` (door het lid bijgehouden onderdelen). De gear-sync hangt aan
  de bestaande sync-completion (`syncStravaBikesForUser` in `client.ts`, 1 call
  per run). Onderdelen-bibliotheek met richt-km per slijtage-range
  (`src/lib/maintenance/component-types.ts`: enige/normale/hoge, overschrijfbaar
  met eigen km). Versleten km = fietsstand nu − stand bij montage (met optioneel
  "al gereden km"); status groen/oranje/rood. `/onderhoud`-pagina (toevoegen,
  vervangen=baseline reset, verwijderen), dashboardblok `maintenance-status.tsx`
  (alleen oranje/rood) en push-trigger `on_maintenance_due` (idempotent via
  `notified_at`, geëvalueerd na de sync in `src/lib/maintenance/evaluate.ts`).
  Nav-item onder de avatar-dropdown; `materiaal` blijft de marktplaats.
- **Fietsen op het profiel + handmatige fietsen** (2026-06-23, migr. `0090`+`0091`):
  per fiets een eigen foto (storage-bucket `bikes`, public-read, eigen-folder-
  RLS, gespiegeld aan `0026`) en een zichtbaarheidskeuze (`show_on_profile`,
  default tonen tenzij gearchiveerd). De sync raakt `image_url`/`show_on_profile`
  nooit aan (upsert zet alleen z'n eigen kolommen). Showcase "Mijn fietsen" op
  `/profiel` en op het ledenprofiel (`ProfileReadonlyView`), niet op het publieke
  profiel. Leden zónder Strava voegen handmatig een fiets toe
  (`source='manual'`, `profiel/_actions/bikes.ts`): naam, merk/model, optionele
  afstand + foto. Waren showcase-only omdat `/onderhoud` op `source='strava'`
  filterde; sinds Mijn garage (2026-08-18) doen ze volwaardig mee met een eigen
  kilometerteller. Helpers in `src/lib/strava/bikes.ts`.

- **ZWBlokken** (2026-08, migr. `0111`+`0112`): kaart met verkende blokken per
  lid en voor de club (`zwblokken/_components/blocks-map.tsx`), dekking per
  provincie en per Europees land (`coverage.tsx`), en een ranglijst op aantal
  blokken. Provincies waren tot 2026-09-15 alleen Nederlands; sindsdien ook
  België, Luxemburg, Duitsland en Frankrijk, met titels per gebied (zie
  "ZWBlokken-titels" in het werkplan). Nav-item, dashboard- en statsintegratie, hulpsectie met zoekindex.
  Privacyregel: start- en eindblok tellen nooit mee, plus de eerste en laatste
  kilometer. Zwift-ritten bleven tot 2026-09-15 helemaal buiten ZWBlokken;
  sindsdien hebben ze eigen blokken per Zwift-wereld (migr. `0165`, zie
  "ZWBlokken in de Zwift-werelden" in het werkplan), zonder die privacyregel.
- **Schema-herziening ZWBeter Worden** (2026-08, migr. `0113`–`0116`): het schema
  beweegt mee met het lid in plaats van één keer gegenereerd te blijven
  (`root_plan_id`, `adaptation_kind`, `origin`, `event_id`). De maand is de
  ingang; aanpassen blijft bij de trainer. Het schema bouwt naar het
  urenplafond toe in plaats van eronder te blijven hangen, een taper komt alleen
  bij een doel met één piekdag, en een clubevent komt pas in het schema als het
  lid ja zegt. Beschikbaarheid per week in `training_availability` (migr. `0115`).
  **Die weekbeschikbaarheid werd tot 2026-08-20 alleen opgeslagen, niet gepland:**
  de planner kreeg uitsluitend de week van vandaag mee. Rechtgezet, zie hieronder.
  Herstel en belastbaarheid verhuisd naar de dagpagina. **Die laatste claim
  klopte maar half:** alleen de ja-knop in het schemapaneel zette het event er
  echt in; de knop op de eventpagina schreef alleen de RSVP. Rechtgezet op
  2026-08-18, zie hieronder.
- **Profiel- en hulpronde** (2026-08, migr. `0117`): echte logo's bij de externe
  profielen, intervals.icu als eigen ID-veld, doorklik naar ZwiftPower,
  ZwiftRacing.app en Strava, en grijze knoppen met uitleg voor wat er nog
  ontbreekt. Hulpuitleg over de profielknoppen, het doeltype en het exporteren
  van een workout naar Zwift via intervals.icu.
- **Teams: kanaal als logo** (2026-08, migr. `0118`+`0119`): WhatsApp- en
  Discord-kanaal verschijnen als logo bij de teamnaam.
- **Kleinere correcties** (2026-08): power-duration curve met
  vergelijk-knoppen over de volle breedte op mobiel, weekgrafiek in Belasting die
  bij hover vertelt wat je ziet, import die afstand in meters herkent en 0
  seconden niet als oneindig snel behandelt, mobiel menu met één linkermarge, en
  een paar mobiele overloop-fixes.
- **Strava Brand Guidelines** (2026-08-18, commit `2ba430a`): de aanvraag voor
  een hogere atletenlimiet vraagt een vinkje dat de app aan de guidelines
  voldoet, en dat klopte niet. `src/components/strava-brand.tsx` bundelt nu de
  drie voorschriften: `PoweredByStrava` op elk scherm dat Strava-data toont,
  `ConnectWithStrava` (de officiële knop, met een `compact`-variant op h-7 zodat
  hij naast gewone knoppen past) en `ViewOnStrava` voor de terugverwijzing. De
  logo's in `public/strava/` zijn de onbewerkte bestanden van
  developers.strava.com. De "View on Strava"-tekst ligt vast en blijft Engels;
  de opmaak is vet in de grijstint, want de richtlijn vraagt vet, onderstreping
  óf oranje.
- **Meldingen, icons en Zwift-ID** (2026-08-18, commit `b269140`, migr. `0120`):
  icons kwamen uit een breed wordmark op een dekwit vierkant en vulden op 192px
  een kwart van de tegel; ze komen nu uit het beeldmerk in `public/icon.svg`.
  De push-badge wees naar datzelfde dekkende bestand, en omdat Android een badge
  als alfamasker tekent werd dat een massief wit blok — vandaar `badge-96.png`
  met transparante achtergrond. De root-metadata had geen `openGraph`, waardoor
  WhatsApp zelf een favicon pakte; nu een liggende 1200×630-kaart uit hetzelfde
  script. Verder een Zwift-ID-dialoog bij inloggen (`zwift_opt_out` voor wie
  niet zwift, uitstellen via sessionStorage) en pushtrigger
  `on_member_pending` naar iedereen met `members.approve` — niet alleen
  `is_admin`, anders miste de community-manager hem. Bijvangst: de
  profiel-action sloeg élke tekst op als Zwift-ID; parsers staan nu in
  `src/lib/profile/ids.ts` en worden ook server-side gebruikt.
- **Mijn garage** (2026-08-18, commit `90759a1`, migr. `0121`+`0122`):
  `/onderhoud` heet nu `/mijn-garage` (permanente redirect in `next.config.ts`).
  Fietstype per fiets (`discipline`, gegokt uit de gearnaam via
  `src/lib/maintenance/guess-discipline.ts`, correctie overleeft de sync), een
  catalogus met negentien onderdeeltypes per discipline, en een tweede
  slijtagemaat in maanden voor remvloeistof, kabels, vering en stuurlint.
  Draaiuren kunnen niet: `strava_activities` heeft geen `gear_id`. Tips-databank
  `maintenance_tips` met RLS, geshuffeld per onderdeel; ledencitaten komen via
  een WhatsApp-export op `/beheer/citaten` waar de naamkoppeling wordt
  voorgesteld maar nooit automatisch toegewezen. Elk citaat houdt zijn
  `profile_id` zodat het lid het zelf beheert onder "Mijn citaten" op zijn
  profiel. Onderbouwing in `docs/onderhoud-per-fietstype.md`; 33 tips ingezet in
  migr. `0124` (commit `0e71389`).
- **Gebruikersvoorwaarden** (2026-08-18): nieuwe publieke pagina
  `/voorwaarden` naar het model van `/privacy`, met de onderhoudsdisclaimer als
  eigen paragraaf en de afspraak over ledencitaten. Er was tot nu toe geen
  voorwaardenpagina in het project.
- **Klachtenlogboek en geslachtsveld** (2026-08-18, commit `90759a1`, migr.
  `0123`): `profiles.sex` vervangt het afleiden van geslacht uit `zrl_division`
  — dat is een wedstrijdklasse, geen fysiologie. (De vandaag-pagina gaf het
  advies tot 2026-09-17 nog `zrl_division` mee; zie bovenaan.) Nieuw logboek onder
  `/zwbeter-worden/logboek` (`symptom_logs`, opt-in via
  `symptom_tracking_enabled`, RLS alleen eigen rijen, trainers zien niets). Het
  schema krijgt één samengevat signaal mee naast readiness en TSB.
  **Bewust afgeweken van het plan:** er zou op cyclusfase gepersonaliseerd
  worden, maar fase-effecten op prestatie zijn in de literatuur inconsistent en
  zwak onderbouwd, en bij hormonale anticonceptie is een faseberekening
  betekenisloos. Klachtenlast hangt wél samen met belastbaarheid. Onderbouwing
  in `docs/training-en-cyclus.md`, vervolgvoorstel in
  `docs/voorstel-training-vrouwen.md`.
- **Ongeplande ritten in het schema** (2026-08-18, geen migratie): de
  maandweergave van `/zwbeter-worden/schema` toonde alleen wat gepland stond —
  ZWB-workouts en events uit intervals.icu. Een extra herstelrondje, een
  groepsrit of de tweede helft van een rit die onderweg in tweeën geknipt werd,
  was daar nergens te zien, terwijl die belasting in de benen wél meetelde.
  `src/lib/training/unplanned-rides.ts` draait daarom dezelfde koppeling als
  `compliance.ts`: elke geplande training claimt hooguit één rit van die dag, en
  wat overblijft komt als gestippeld blokje in de kalender, met de cijfers en
  een `ViewOnStrava`-link in het detailpaneel. Ritten die al vastgelegd aan een
  workout hangen (`training_workout_reports.paired_activity_id`) gaan er sowieso
  af; een rustdag of een als rustdag afgeschreven training claimt niets, zodat
  wie op zijn rustdag toch reed die rit ziet staan. Dezelfde voorrang voor een
  vastgelegde koppeling geldt sinds dezelfde dag ook bij het afronden van
  workouts (zie de bullet hieronder over `detectCompletedWorkouts`). Bron is `strava_activities`
  over 120 dagen, hetzelfde venster als de belastingpagina — intervals.icu geeft
  via de API niets terug voor ritten die daar via Strava binnenkwamen. Omdat de
  schemapagina nu Strava-data toont, staat er een `StravaAttribution` onder
  zodra er zo'n rit is.
  **Bewust niet gebouwd:** geen RPE/rapportage-formulier bij zo'n rit (een
  rapportage hangt aan een `workout_id`, en die is er niet), geen automatisch
  samenvoegen van twee helften tot één rit (dat zou de bron herschrijven op basis
  van een gok), en de lijstweergave blijft ongemoeid — die toont alleen wat nog
  komt, en een gereden rit is per definitie verleden tijd.
  **Correctie same-day (2026-08-18, na commit `0f0071a`):** de eerste versie
  deed precies níét waar hij voor gebouwd was. `pairedActivityIds` haalde wel de
  gekoppelde rit van de stapel, maar liet de bijbehorende wórkout gewoon
  meedoen aan het verdelen — dus claimde die er een tweede bij, en verdween
  precies de rit die zichtbaar had moeten worden. Twee Zwift-ritten op één avond
  (20 min pacer group ride, 41 min race) met één geplande training ertegenover
  leverden nul ongeplande ritten op. De parameter is nu `pairings` met
  workout-id én rit-id: de rit gaat van de stapel af én de workout doet niet meer
  mee. Regressietest met dat scenario staat in
  `tests/unit/unplanned-rides.test.ts`. Gevonden doordat het in de praktijk
  meteen opviel — de kaart toonde één rit waar er twee waren.
- **Toegezegd event met zijn echte duur in het schema** (2026-08-18, migr.
  `0125`): in Stijns schema stond de Velomedian Claudy Criquélion (167 km, 3305
  hm) als blok van 150 minuten. Diagnose: dat blok kwam helemaal niet uit het
  event. `origin='ai'`, `event_id=null`. Drie fouten onder elkaar:
  1. **Twee ja-knoppen die niet hetzelfde deden.** `setRsvp` op de eventpagina
     schreef alleen `event_rsvps`; alleen `acceptClubEvent` in het schemapaneel
     zette het blok erbij. Wie zich opgaf op de logische plek, kreeg een schema
     dat niets van het event wist. Beide knoppen lopen nu via één
     `syncEventWorkout` in `training/events.ts`: 'ja' zet het blok erin, 'nee'
     én 'misschien' halen het eruit (alleen 'ja' is een toezegging).
  2. **De planner kreeg geen cijfers.** `committedEventsForAi` gaf alleen titel,
     type en datum door. De AI kón niet weten dat het een rit van zeven uur was
     en maakte er een "gecontroleerde eventprikkel" van. Nu gaan duur, afstand
     en hoogtemeters mee, met een promptregel dat die duur een gegeven is. De
     bestaande promptregel dat events "ook als vast blok in fixedWorkouts staan"
     was in dit geval aantoonbaar onwaar en is verzacht.
  3. **`gran_fondo` en `zwift` stonden niet in `EVENT_DEFAULTS`** en vielen
     terug op `outdoor`. Toegevoegd.
  Daarnaast is het duurmodel vervangen: was 28 km/h over de afstand met de
  hoogtemeters volledig genegeerd (Marmotte 32% te laag, vlakke ritten 17% te
  hoog), nu `afstand / 34 km/h + hoogtemeters × 0,045 min`. Die twee constanten
  zijn een kleinste-kwadraten-fit op het natuurkundige model uit
  `lib/ride-estimate.ts`, gedraaid over de acht ZWB-events mét GPX; de
  ijkpunten staan als test in `tests/unit/training-events.test.ts`. Afwijking
  binnen 7% op elke echte route, behalve op een pure klimroute (14 km, 1064 hm)
  waar de vlakke term betekenisloos wordt. De DB-check op `duration_minutes`
  ging van 480 naar 720 minuten (migr. `0125`) omdat de Marmotte anders op acht
  uur werd afgekapt; `MAX_ADJUST_MINUTES` blijft wél op 480 — een tráining van
  twaalf uur bestaat niet. **Niet lokaal te verifiëren:** migratie `0125` is niet
  gedraaid (geen Docker/Supabase-config hier).
  Bestaande schema's repareren zichzelf niet: het foute blok staat al
  gepubliceerd. Daarom toont het eventpaneel nu "In schema zetten" bij een event
  waar je ja op zei maar dat geen blok heeft — één klik zet het erin en laat het
  schema eromheen herzien.
  **Bewust niet gebouwd:** geen serverside GPX-schatting per lid (dat vraagt
  GPX-parsing bij elke plan-run en werkt alleen bij events mét route; de
  eventpagina blijft de plek voor het precieze antwoord), en geen automatische
  reparatie van bestaande schema's tijdens het renderen — dat zou een tweede
  blok naast het AI-blok zetten zonder dat iemand erom vroeg.
  **Vervolg (2026-08-18): losse workouts bereikten intervals.icu nooit.** Het
  eventblok stond na "In schema zetten" wél in ZWB (443 min, AI-blok van 150
  netjes superseded) maar bleef op `publish_status='pending'` met een lege
  `intervals_event_id`. Oorzaak: `syncEventWorkout` hangt het blok aan het
  lópende basisplan, terwijl de herziening die erna draait een níéuw afgeleid
  plan publiceert en via `pushPlanWorkoutsToIntervals` alleen díéns workouts
  doorzet. Het blok viel tussen die twee plannen in en werd nooit gepusht.
  Dezelfde fout zat in `planOwnRide`: een zelf ingeplande rit belandde om
  precies dezelfde reden nooit op de fietscomputer. Allebei pushen nu direct na
  het invoegen met `pushWorkoutToIntervals`. Daarnaast draagt `ScheduleEvent` nu
  `inIntervals`, zodat het eventpaneel "Naar intervals.icu" aanbiedt bij een blok
  dat wel in ZWB staat maar niet is doorgezet — zonder die knop was er geen enkele
  weg terug voor een blok dat blijft hangen, want de RSVP-knop op de eventpagina
  negeert een klik op de al gekozen optie (`if (s === active) return`).
- **Vastgelegde rit-koppeling telt ook bij het afronden mee** (2026-08-18, geen
  migratie): dezelfde fout die bij de ongeplande ritten is gerepareerd zat ook in
  `detectCompletedWorkouts` (`src/lib/training/completion.ts`). Die lus riep voor
  elke workout opnieuw `pickRideForWorkout` aan, ook voor workouts die via
  `training_workout_reports.paired_activity_id` al aan een rit hingen, en vulde
  de `used`-set niet vooraf met die vastgelegde ritten. Een al bevestigde
  training kon daardoor bij een volgende detectieronde een ándere rit van die dag
  opeisen dan de rit in haar eigen rapportage. Geschreven werd er niets — de
  `isNew`/`isEmptySnapshot`-poortjes hielden dat tegen — maar de rit was wel
  verbruikt, en een tweede training kon zo zonder rit achterblijven en (bij een
  lege momentopname) zelfs teruggedraaid worden naar 'gepland'. De koppeling
  wordt nu vooraf uitgerekend in de pure, exporteerbare `pairWorkoutsWithRides`:
  alle vastgelegde `paired_activity_id`'s gaan er eerst af, een workout mét
  koppeling houdt zijn eigen rit en wordt niet opnieuw gematcht, en de
  herberekening van een lege momentopname gebruikt die rit. Staat de vastgelegde
  rit niet meer in `strava_activities`, dan blijft de workout zonder rit in
  plaats van er stilzwijgend een andere bij te zoeken. Getest in
  `tests/unit/training-completion.test.ts` met twee ritten en twee trainingen op
  één dag; de oude lus zakt op beide nieuwe gevallen.
  **Bewust niet gebouwd:** geen reparatie achteraf van rapportages die in het
  verleden een verkeerde rit hebben opgeslagen — er is geen betrouwbare manier om
  te zien of `paired_activity_id` ooit fout is gezet of gewoon een handmatige
  keuze was.
- **ZRL-racekalender per ronde vullen** (2026-08-18, geen migratie): nieuw
  beheerscherm `/beheer/zrl-kalender` achter `teams.manage_roster`, dat per
  gekozen team een hele ZRL-ronde in `events` zet. WTRL verbiedt scrapen en het
  aanroepen van hun endpoints van buiten hun domein zonder schriftelijke
  toestemming; dat hoeft ook niet, want de kalender is een patroon. ZRL rijdt op
  dinsdag, een ronde is een reeks opeenvolgende weken, en de eerste race van elke
  ronde is een Race of Truth. `src/lib/teams/zrl-season.ts` leidt daar de hele
  ronde uit af, met de regels in `tests/unit/zrl-season.test.ts`. Er is geen
  migratie nodig: `events.type` kent `'zrl'` al sinds migr. `0001`. Het vullen is
  idempotent op (team_id, start_at) — er is geen unieke index op dat paar, dus de
  bestaande races worden eerst opgehaald in plaats van een upsert te doen.
  **Bewust niet gebouwd:** geen koppeling met WTRL zelf (hun voorwaarden), en
  geen automatisch bijstellen als WTRL een tijd verschuift — opnieuw draaien vult
  alleen aan, het verplaatst niets.
- **Sync- en importrij leesbaar op een telefoon** (2026-08-18, geen migratie): op
  het dashboard stonden de syncknoppen en de CSV/GPX-import naast elkaar. Ze
  wrapten onder elkaar op een smal scherm, maar hielden hun uitlijning — knoppen
  links, importrij rechts — en het bestandsveld kapte door een vaste max-breedte
  zijn eigen bijschrift af tot "geen be...ecteerd". Onder `sm` staan beide
  groepen nu onder elkaar en allebei links, en het bestandsveld krijgt een eigen
  regel: naast de knop zou het op 390px op 132px uitkomen, nog smaller dan de
  max-breedte die het probleem gaf. Vanaf `sm` geldt de oude maat.
  In hetzelfde blok: de link in "Laatst opgehaald" op
  `/zwbeter-worden/belasting` heette "Nu synchroniseren" maar wees naar
  `/dashboard` en kwam dus bovenaan het dashboard uit, terwijl de knop verderop
  staat. Hij heet nu "Naar Strava-sync" — gelijk aan "Naar herstel-instelling"
  ernaast — en springt via `#strava-sync` naar het kaartje met de sync-knop.

---

## Chronologisch werkplan vanaf 2026-06-23

### Opgeleverd — lege weken en dubbele ZRL door het automatische dagvoorstel

**2026-09-22.** Geen migratie. Lokaal gecommit, niet gepusht.

**Aanleiding.** Jeroen Janssen en Stijn hadden op 21 september een lege week,
en Bart had op 22 september de ZRL twee keer als training. Productiedata is
alleen gelezen: `training_ai_generations`, `training_plans`, `training_workouts`
met `superseded_by_plan_id`, en Barts intervals.icu-kalender.

**Oorzaken, gemeten.**
- **Twee actieve basisplannen per lid.** Een nieuw basisplan archiveerde het
  vorige niet. Jeroen had `0b04a9a0` (approved, t/m 30 sep) naast `146f4482`,
  en Stijn had `6c7965a4` (approved, t/m 1 okt) naast `55a5f761`. Bart had
  hetzelfde tot `29da37f5` op 21 sep afliep. De cron nam elk basisplan, dus elk
  lid kreeg twee dagvoorstellen per dag. Het voorstel van het oude plan werkte
  met het oude doel.
- **Het dagvoorstel wiste zijn hele bereik.** Sinds `201d816` (8 sep) wordt een
  dagvoorstel via `createPlanFromAiGeneration` automatisch gepubliceerd.
  Daarvóór was het een concept. `pushPlanWorkoutsToIntervals` gaf elk plan met
  `adapt_from_date` een bereik tot zijn `end_date`, en die einddatum kiest de AI.
  Het voorstel van Stijns oude plan (21 sep, bereik 21 sep – 1 okt, één
  training) streepte 24–28 sep weg. Dat van Jeroen (bereik 21–29 sep) streepte
  vijf trainingen weg, en op 22 sep nog eens drie (bereik 22–30 sep). Alle tien
  dagvoorstellen sinds 13 sep met een bereik van meer dan één dag deden dit.
  Van de 68 dagvoorstellen sinds 13 sep zijn er 68 gepubliceerd.
- **Vaste afspraken werden gekopieerd.** De cron gaf de ZRL mee in
  `currentPlan` en in `fixedWorkouts`. Met `minWorkouts: 1` en "geef een
  voorstel voor vandaag" gaf de AI de race terug als training van de dag.
  `insertPlanWorkouts` blokkeerde alleen dagen met een test, een geschrapte of
  een gereden training. Het clubevent wordt nooit vervangen, dus er kwam een
  kopie naast (Bart en Jeroen, 22 sep).
- **Een verwijderd schema liet events achter in intervals.icu.** Het verwijderen
  van een plan nam de workouts mee (cascade), maar niet hun events. Bart
  verwijderde het voorstel met de dubbele ZRL en haalde het event zelf weg; zijn
  kalender van 21–23 sep is nu schoon.

**Wat er veranderde.**
- `onePlanPerProfile` en `pickActiveBasePlan` (`active-plan.ts`): de cron neemt
  per lid alleen het lopende schema. Gepubliceerd gaat voor goedgekeurd;
  daarbinnen telt het meest recent bijgewerkte, dezelfde regel als
  `activeBasePlan`.
- `archiveOtherBasePlans`: bij goedkeuren of publiceren van een basisplan, en
  bij het automatisch publiceren van een zelfgemaakt basisplan, gaan de andere
  lopende basisplannen van dat lid naar `archived`. Alleen de status verandert;
  workouts van het oude plan blijven waar het nieuwe ze niet vervangt.
- `publishRange` (`publish.ts`): alleen `plan_update` krijgt een bereik. Een
  dagvoorstel vervangt alleen de dagen waarop het zelf een training zet. Dit
  maakt de eerdere claim in deze sectie ongeldig dat "een bijgewerkt schema"
  met `adapt_from_date` altijd alles vanaf die datum vervangt: dat geldt nu
  alleen voor een herziening.
- Een dagvoorstel waar na filteren geen training overblijft, wordt geen plan
  (`createPlanFromAiGeneration` geeft `null`). De cron logt `skipped` en
  `generation_no_change`. Het dagvoorstel heeft `minWorkouts: 0`, en de prompt
  staat een lege lijst toe.
- `insertPlanWorkouts` blokkeert ook dagen met een geplande eigen rit of
  clubevent. De cron, "pas vandaag aan" en de herziening geven vaste afspraken
  niet meer mee in `currentPlan` of `remainingWorkouts`; ze staan al in
  `fixedWorkouts`. Er is een promptregel bij: een dag met een fixedWorkout geef
  je nooit terug.
- `removePlanEventsFromIntervals`: `deleteTrainingPlan` haalt eerst de events van
  nog niet gereden workouts uit intervals.icu. Lukt dat niet, dan blijft het
  schema staan, zodat het spoor naar die events niet kwijtraakt.

**Bewust niet gebouwd.**
- Een dagvoorstel kan geen training meer schrappen. Een rustdag van de AI viel
  al weg in `dropShortRecoveryRides`, en werkte vóór deze ronde alleen doordat
  het bereik de dag toevallig mee wiste. Schrappen via het voorstel vraagt om
  een eigen veld in het antwoord. Het lid kan een training zelf verwijderen.
- Het dagvoorstel is niet teruggezet naar een concept dat het lid zelf toepast.
  Automatisch doorzetten blijft, maar dan veilig.
- Geen opschoning van de lege en overbodige voorstelplannen van de afgelopen
  weken. Hun workouts zijn vervangen, dus het lid ziet ze niet.
- Het verwijderen van een basisplan zet de `parent_plan_id` van zijn afgeleide
  plannen op null, waarmee ze zelf als basisplan gaan tellen. Dat is gezien en
  niet aangepakt. `onePlanPerProfile` houdt de cron daarbij wel op één schema
  per lid.

**Nog met de hand op productie**, want archiveren vanuit deze sessie werd
geweigerd: de oude plannen `0b04a9a0` (Jeroen Janssen) en `6c7965a4` (Stijn) op
`archived` zetten. Zolang deze code niet live staat, maakt de cron er elke nacht
weer een dagvoorstel voor. Jeroens week van 22–28 sep mist sinds 22 sep 05:00
de training van 27 sep, en 24 en 26 sep zijn ingekorte versies op basis van het
oude doel. "Schema bijwerken" op zijn lopende schema herstelt dat.

**Niet lokaal geverifieerd.** Typecheck en lint zijn schoon. Nieuwe tests staan
in `active-base-plan.test.ts` en `training-prompts.test.ts`. Twee tests falen in
deze worktree om een reden die hier los van staat: `zwift-route` omdat
`node_modules` zwift-data 1.48.6 heeft terwijl `package.json` om 1.50 vraagt, en
`omnium-live` omdat er geen `.env.local` is. De cron, het publiceren en het
verwijderen van een schema zijn niet tegen productie gedraaid. Controleer na
deploy dat er per lid hoogstens één `daily`-generatie per dag bijkomt, en dat
`training_workouts.superseded_by_plan_id` van een dagvoorstel alleen dagen raakt
waarop dat voorstel zelf iets zet.

### Opgeleverd — Zwift-event: aanmeldknop en parcours op de eventpagina

**2026-09-21.** Geen migratie.

**Waarom.** Stijn wilde dat een kalenderevent met een gekoppelde Zwift-eventlink
leden rechtstreeks naar de aanmeldpagina op Zwift stuurt, en dat het parcours te
zien is, zoals de kaart bij een buitenrit met een .gpx. Tot nu toe linkte alleen
de titel naar `external_url`, en die kan ook een andere site zijn. Het parcours
van een Zwift-route stond alleen in het pacingplan.

**Wat er is gekomen.**
- Een knop **Aanmelden op Zwift** in de kop van de eventpagina. Die verschijnt
  zodra `events.zwift_event_id` gevuld is en het event nog niet begonnen is. Hij
  linkt naar `zwiftEventUrl(zwift_event_id)` en hangt dus niet af van wat er in
  `external_url` staat.
- Een blok **Parcours** (`_components/zwift-route-section.tsx`) voor events met
  een `zwift_route_id` en zonder eigen .gpx. Het blok toont de routenaam, de
  wereld, het aantal ronden en de afstand, met daaronder de routevorm en een
  hoogteprofiel over lead-in en alle ronden, met de klimmen als band. De data
  komt uit `loadPacingRoute`, dezelfde bron als het pacingplan. Alleen voor
  ingelogde leden, want `zwift_routes` is alleen leesbaar voor `authenticated`.
- `RouteShape` is verhuisd van `pacing/_components` naar `events/[id]/_components`,
  omdat de eventpagina en het pacingplan hem nu allebei gebruiken.

**Bewust niet gebouwd.** Geen Leaflet-kaart voor Zwift. Er bestaat geen
kaartlaag voor Watopia en de andere werelden. Een echte kaart zou daarom de
route over lege oceaan bij de Salomonseilanden tekenen. Dit is hetzelfde besluit
als bij het pacingplan (zie `route-shape.tsx`). Heeft een Zwift-event ook een
eigen .gpx, dan blijft de bestaande GPX-kaart staan en vervalt het Zwift-blok.

**Niet lokaal geverifieerd.** Typecheck en lint zijn schoon. De pagina is niet
in de browser bekeken met een echt gekoppeld Zwift-event, omdat daarvoor een
ingelogde sessie tegen de database nodig is. Een route waarvan het profiel nog
niet is opgehaald (`profiel-ontbreekt`) toont geen parcoursblok.

### Opgeleverd — Voedingsmodule: kennisbank, recepten op maat en een tip op Vandaag

**2026-09-17, commit `0d0abf3`.** Migraties `0168` (tabellen + RLS) en
`0169` (seed, gegenereerd). Nog niet toegepast op de gekoppelde database.

**Waarom.** Stijn wilde voeding als onderdeel van ZWBasis. Het moest drie dingen
worden: een kennisbibliotheek met actuele, navolgbare bronnen, een receptenboek
dat zich aanpast aan lichaam, komende trainingen en herstel, en een tip op
Vandaag. Keuzes van Stijn vooraf:
- Een tab in ZWBeter Worden, geen eigen hoofdmenu.
- Samengestelde recepten met NEVO-waarden, geen AI-recepten.
- Gewicht én lengte gebruiken.
- Alles in één ronde.

**Onderzoek.** `docs/voeding-wielrennen.md`, met alle bronnen en per richtlijn de
drempel die in de code staat.
- De ruggengraat is het *UCI Sports Nutrition Project*: het positiestandpunt uit
  2026 plus de onderliggende reviews.
- Daarnaast: ACSM/AND/DC 2016, IOC REDs 2023, IOC supplementen 2018, de
  ISSN-standpunten, en reviews over koolhydraten tijdens de rit (Morton et al.
  2026, tot 120 g/u), darmtraining en eiwit.

**Wat er is gekomen.**
- **Pure logica in `src/lib/nutrition/`:**
  - `library.ts`: 14 artikelen in 5 categorieën, elk met bronnen en een
    bewijslabel.
  - `day-type.ts`: dagtypes rust, licht, matig, zwaar, lang en wedstrijd, op duur
    en intensiteit.
  - `targets.ts`: g/kg per dag, per moment en per uur op de fiets, plus
    Mifflin-St Jeor.
  - `scale.ts`: receptschaling op rol (`kh_bron`/`eiwit_bron`/`vast`), met elke
    factor tussen 0,5 en 2.
  - `tips.ts`: negen regels in vaste volgorde.
  - `recipes.ts`: recepten kiezen en schema/ritten omzetten naar sessies.
  - `labels.ts`: client-veilige constanten.
- **Tab Voeding** (`src/app/(app)/zwbeter-worden/voeding/`):
  - Overzicht met dagdoelen, tip, drie recepten en de kennisbank.
  - Artikelpagina met bronlinks.
  - Receptenlijst met filters voor moment en dieet. Die staan alleen in de URL.
  - Receptpagina met "jouw portie vandaag" of de standaardportie en de
    NEVO-bronvermelding.
  - Eigen recepten maken, bewerken en verwijderen, met ingrediënten uit NEVO.
- **`NutritionTodayCard` op Vandaag, onder de core-kaart.** Die gebruikt
  `memberWorkouts`, de Strava-ritten van de pagina en
  `zwbStatus.readiness`/`recoverySummary`. Geen extra schema-queries.
- **Data:**
  - `nutrition_foods`: heel NEVO, 2.328 producten, ongewijzigd, lege waarden
    `null`.
  - `nutrition_recipes` en `nutrition_recipe_ingredients`: 24 clubrecepten.
    Eigen recepten zijn privé; clubrecepten schrijven vraagt
    `training.create_plans`.
  - `nutrition_profiles`: lengte, alleen voor het lid zelf.
- **Seed-generator.** `scripts/nutrition/generate-seed.mjs` leest het NEVO-csv en
  `standard-recipes.json`. Het NEVO-bestand zelf staat niet in de repo. Bij een
  nieuwe NEVO-versie maak je een nieuwe migratie; `0169` pas je niet aan.
- **Profiel.** Veld "Lengte (cm)", opgeslagen in `nutrition_profiles`. Staat de
  tabel er nog niet, dan blokkeert een leeg lengteveld het opslaan niet.
- **`/hulp#voeding`**, een zoekterm in hulp, en een regel in `/privacy`.
- **Tests:**
  - `nutrition-logic`: dagtypes, doelen en schaling.
  - `nutrition-tips`: volgorde, alle 9 tips, bestaande artikelen, en in 28 dagen
    × 10 scenario's geen tekst die om minder eten vraagt.
  - `nutrition-migration` (PGlite): tellingen, idempotentie, checks en RLS voor
    goedgekeurd, niet-goedgekeurd, eigenaar en ander lid.

**Afwijkingen van het goedgekeurde plan.**
- **Lengte staat in `nutrition_profiles`, niet op `profiles`.** `profiles` is voor
  elk ingelogd lid leesbaar (`profiles_select_authenticated`, 0001), dus een kolom
  daar is via de API voor iedereen op te vragen.
- **Geen `estimateWorkoutKj`.** De dagbanden in de bronnen zijn in uren en zwaarte
  geformuleerd, niet in kJ. Een kJ-drempel zou een eigen verzinsel zijn, en een
  helper die niets gebruikt hoort er niet in.
- **Heel NEVO geseed in plaats van ~80 producten.** Anders zijn eigen recepten
  nauwelijks te maken.

**Bewust niet gedaan.**
- **Geen AI-recepten of AI-tips.** Die kunnen macro's en richtlijnen verzinnen.
  Dit volgt dezelfde lijn als core/mobiliteit en de pacing-prompt.
- **Geen vetpercentage, geen kcal-doel, geen afvalfunctie, geen eetdagboek.** Het
  IOC REDs-consensusstuk waarschuwt juist voor die focus in de wielersport. Een
  vetpercentage is bovendien gezondheidsinformatie (AVG art. 9).
- **Geen opgeslagen dieetvoorkeur.** "Glutenvrij" of "lactosevrij" kan een
  aandoening verraden; het filter leeft alleen in de URL.
- **Geen voedingsregels per cyclusfase.** Het effect op prestatie is gemiddeld
  triviaal en verschilt sterk per persoon (McNulty et al. 2020).
- **Geen beheerscherm voor clubrecepten.** RLS staat het toe; de 24 recepten komen
  voorlopig uit de seed.
- **Geen supplementadvies per lid en geen merken.**
- **Geparkeerd, voor het plannenboek:** zweettest-calculator, boodschappenlijst,
  darmtrainingsschema.

**Nieuwe privacytekst, geen eigen privacyversie.** Lengte en eigen recepten
zijn alleen voor het lid zelf zichtbaar. Er gaat niets naar andere leden of
derden. De tekst valt onder versie `2026-09-17`, die de coachchat dezelfde dag
invoerde. Wie die versie tekende vóór deze push, zag de regel over lengte nog
niet. `src/lib/privacy.ts` vraagt bij een "nieuwe categorie gegevens" wel een
nieuwe versie. **Stijn beslist**: een extra versie laat elk lid opnieuw tekenen.

**Beperkingen en niet geverifieerd.**
- **Migraties.** `0168` en `0169` zijn alleen tegen PGlite getest.
- **Inhoud.** Artikelteksten en clubrecepten zijn niet door een (sport)diëtist
  nagekeken.
- **UCI-positiestandpunt.** Dat zat achter een betaalmuur; de getallen komen uit
  de open onderliggende reviews en de eerdere consensus.
- **Eigen vertalingen.** De verdeling van koolhydraten over maaltijden (25/20/30/10%)
  en de dagtype-drempels (60/90/180 min) zijn eigen vertalingen, zie het
  onderzoeksdocument.
- **Schermen niet in de browser bekeken.** Inloggen kan alleen met een account,
  en de tabellen bestaan nog niet in de gekoppelde database.
- **Vandaag-tip en ritten.** De tip kijkt naar ZWB-workouts en Strava-activiteiten
  van vandaag. Events die alleen in intervals.icu staan, tellen niet mee als
  geplande rit.

**Verificatie.** 1.214 tests geslaagd (33 nieuw voor voeding), 6 optionele
live-tests overgeslagen. TypeScript is schoon buiten verouderde
`.next`-types; eslint op de gewijzigde bestanden is schoon; de productiebuild is
geslaagd.

### Opgeleverd — coachchat in ZWBeter Worden

**2026-09-17, commit `392a6b8`.** Migratie `0167` (`training_chat_messages`,
functie `current_user_in_training_chat`, `notification_preferences.on_training_chat`).
Nieuwe privacyversie `2026-09-17`, dus élk lid tekent opnieuw.

**Waarom.** De redenering achter een schema stond alleen in `training_plans.summary`, als
"Let op"-regels die `PlanCautions` bij de eerstvolgende workout toont. Dat is
eenrichtingsverkeer: wie leest dat er negentig minuten staat omdat woensdag maar een uur
beschikbaar is en wil weten waarom het dan niet naar donderdag schuift, loopt dood. En wie
iets wéét wat het schema zou moeten weten — twee weken ziek, een doel dat verschuift — kon dat
alleen indirect kwijt via de beschikbaarheidsschuifjes. `plan-cautions.tsx` noemde zichzelf
niet voor niets "bewust tijdelijk".

**Wat er is veranderd.**
- Eén doorlopend gesprek per lid. Het lid vraagt, een AI-coach antwoordt met het eigen schema
  als context, en de door het lid aangewezen trainers lezen mee en kunnen erin reageren.
  Pagina's: `/zwbeter-worden/coach` (lid) en `/zwbeter-worden/trainer/coach` (trainer, via
  `trainerContext()` zodat een id uit de URL nooit rechtstreeks in een query gaat). Eén gedeeld
  component `_components/coach-chat.tsx`, gemodelleerd op de live-chat van een event: realtime
  als gedebouncede ping → refetch, met poll als terugval.
- `src/lib/training/chat-context.ts` bouwt de context uit loaders die `draft.ts` al gebruikt.
  *(Niet meer volledig waar sinds 18 september 2026: de context bevat sindsdien ook de gereden
  trainingsdata uit `training-data.ts`, en doet daarvoor één live intervals.icu-call met een
  tijdbudget. Zie de ronde "Coach bij je trainingsdata" bovenaan.)*
  Het scharnierpunt is `training_ai_generations.prompt_summary`: de invoer die het model zág
  toen het de keuzes maakte. Zonder dat stuk kan de coach herhalen wát er is besloten, niet
  waaróm. `athleteName` gaat eruit voordat het opnieuw naar OpenAI gaat.
- Het antwoord loopt in de achtergrond (`background: true` + bewaard `response_id`, zoals de
  schema-generaties). De POST zet meteen een lege coach-rij met `status='pending'`; de
  eerstvolgende GET vult hem. Zolang er iets openstaat pollt de client elke 3 s in plaats van
  elke 20 s. Een netwerkfout laat de rij staan; pas na vijf minuten wordt hij `failed` met een
  leesbare regel, zodat er nooit een bel blijft staan te denken.
  `startTrainingPlanDraftBackground()` was niet te hergebruiken (die dwingt het plan-`json_schema`
  af), vandaar `startCoachAnswerBackground()` / `retrieveCoachAnswerBackground()` ernaast in
  `ai.ts`.
- Vinkje "Dit raakt mijn schema" roept `requestReplan()` aan en bewaart de uitkomst in
  `replan_result`. Het lid leest wat er werkelijk gebeurde: herzien, meegenomen bij de
  volgende ronde, geen lopend schema, schema ligt stil, of niet gestart.
- Kostenrem: 25 coach-antwoorden per lid per dag via `rateLimitHit`. Boven de limiet komt het
  bericht er wél in — de trainer leest het — alleen het AI-antwoord blijft uit. Zelfde motief
  als de vijf-minuten-cooldown in `replan.ts`.
- `canCoach()` is uit `zwbeter-worden/_actions.ts` verhuisd naar
  `src/lib/training/coach-access.ts`, omdat de route hem ook nodig heeft. Daarnaast
  `activeTrainersOf()` voor de regel "leest mee: …" boven het gesprek en voor de meldingen.
- Rennerkiezer van de trainer toont per renner hoeveel leden-berichten er staan ná het laatste
  trainer-bericht. Eén extra query in `loadRiders()`, die in de layout draait en dus één keer
  per laadbeurt.
- Nieuwe meldingsvoorkeur `on_training_chat`, los van `on_training_plan`.
- `/hulp#trainingsruimte` krijgt een blok over wat de coach wel en niet doet; de
  privacyverklaring een alinea over het gesprek, en de OpenAI-ontvangerregel is gecorrigeerd nu
  het lid zelf tekst typt. De chat is toegevoegd aan de data-export — die lijst is expliciet,
  niet automatisch.

**Bewust niet gedaan.**
- **Inzage voor `training.manage_assignments`.** Dit is de enige tabel in de trainingsmodule
  die niet op `current_user_can_train_profile()` leunt maar op een eigen
  `current_user_in_training_chat()`. Schema's en belasting zijn cijfers; een chat is vrije
  tekst waarin gezondheid en privéomstandigheden voorbijkomen, en de privacyverklaring belooft
  dat die bij het lid en zijn aangewezen trainer blijven. Bestuur en communitybeheer lezen dus
  niet mee.
- **Leesbevestiging per trainer.** Zou bij meerdere trainers een tweede tabel kosten; de teller
  in de rennerkiezer doet hetzelfde werk zonder extra opslag.
- **Automatische opschoning** zoals de jaargrens op `event_chat_messages`. Een gesprek over de
  opbouw van een seizoen hoort een seizoen te overleven.
- **Bijlagen, draad per schema of per workout, en de coach zelf in het schema laten schrijven.**
  Redenen in [docs/coachchat.md](docs/coachchat.md).
- **`athleteName` uit de schema-generaties zelf halen.** Opgevallen tijdens deze ronde:
  `draft.ts` stuurt de naam mee terwijl de privacyverklaring "geen directe
  identificatiegegevens waar vermijdbaar" belooft. De chat haalt hem eruit voordat de invoer
  opnieuw wordt verstuurd, maar de generaties zijn niet aangepast — dat verdient een eigen
  beslissing.

**Verificatie.** 1.206 tests geslaagd (1.181 bestaand + 25 nieuw); `npx tsc --noEmit` schoon;
lint 0 fouten en de 7 bestaande waarschuwingen; productiebuild geslaagd met beide nieuwe
pagina's en `/api/training/chat` erin.
`tests/unit/training-chat-migration.test.ts` draait `0037` + `0167` echt tegen PGlite en
controleert de toegangsregel: lid en gekoppelde trainer lezen het gesprek, een niet-gekoppelde
trainer en `training.manage_assignments` niet, met als tegenproef dat bestuur `training_plans`
wél gewoon leest. Een coach-antwoord is door niemand te verwijderen.

**Niet lokaal geverifieerd.** De migratie tegen de echte Supabase-database (er is hier geen
Docker- of Supabase-config; de PGlite-test dekt de SQL, niet de productiedatabase), de
realtime-publicatie, de pushmeldingen en de OpenAI-achtergrondcall. De suite
`tests/unit/omnium-live.test.ts` en de productiebuild vragen een `.env.local` die in een verse
clone niet bestaat; de build is daarom met placeholder-Supabase-variabelen gedraaid. Niet
gepusht en niet gedeployd.

Details: [docs/coachchat.md](docs/coachchat.md).

### Opgeleverd — segment-inhaalslag sneller: 20 s per run

**2026-09-16, commit `cd0e422`.** Geen migratie.

**Waarom.** Na de historie-inhaalslag stonden er 8.083 buitenritten zonder
segmentdetails. Gemeten tempo: ~30 ritten per uur, oftewel 11 dagen. Niet het
Strava-budget was de rem (333 van 4.000 op die dag), maar de klok: de cron-run gaf de
stap 8 s, goed voor 1 tot 5 ritten.

**Wat er is veranderd.**
- `RUN_BUDGET_MS` in `/api/strava/webhook/process` van 8 s naar 20 s. De aanname dat
  Netlify rond 10 s afkapt bleek niet te kloppen: een handmatige aanroep liep 29 s en
  gaf gewoon 200. Elke stap kijkt zelf naar de klok, dus een langer budget verlengt
  alleen nuttig werk.
- `MAX_ACTIVITIES_PER_RUN` in de segment-inhaalslag van 20 naar 60; dat is de
  wachtrij die we ophalen, niet wat we per se ophalen.
- De budgetgrenzen blijven 50% van het kwartier en 60% van de dag, op verzoek van de
  eigenaar. Daarmee is ~2.400 ritten per dag het plafond.

**Gemeten na de deploy (2026-09-16, 07:05–07:11 UTC).** 345 ritten per uur tegen 30
daarvoor: 30 à 33 per run in plaats van 1 à 5. Kwartierbudget 112 van 400, dus de
grens van 50% (pauze bij 200) knelt niet.

~~**Verwachting bijgesteld: ~3 dagen, niet ~2.** Bij 60% van de daglimiet passen er
2.400 per dag.~~ **Rechtgezet op 2026-09-19:** die 2.400 was gerekend op de verkeerde
limiet, zie hieronder.

**Incident: Strava's leeslimiet (2026-09-19, commit `b719a79`).** Op 19-09 lag de hele
webhookverwerking vanaf 09:50 UTC stil: nieuwe ritten van leden kwamen niet binnen, en
de inhaalslagen stonden ook stil.
- **Oorzaak.** Strava gaf op elk ritdetail een 429, terwijl onze boekhouding pas op
  2.032 van de 4.000 stond. `readRateLimitUsage` las alleen `x-ratelimit-*`, de
  algemene limiet. Strava heeft daarnaast een krappere leeslimiet
  (`x-readratelimit-*`), en bijna al ons verkeer is lezen.
- **Hoe mijn wijziging het veroorzaakte.** De segment-inhaalslag mocht tot 60% van
  4.000 = 2.400 aanroepen gaan, boven de leeslimiet. Met 8 s per run werd dat nooit
  gehaald; met 20 s wel. Waarschijnlijk gebeurde dit al op 16, 17 en 18 september:
  telkens 1.350 à 1.400 segmentritten, en met het overige verkeer komt dat rond de
  2.000. Dan bleven nieuwe ritten van leden tot middernacht UTC liggen.
- **Leeslimiet: 2.000 per dag**, bevestigd door de eigenaar op 2026-09-19. Dat past
  bij de 429 op 2.032 algemene aanroepen.
- **Reparatie.** `readRateLimitUsage` leest beide paren en kiest per venster het paar
  dat het dichtst bij zijn limiet zit. Zo volgt elke budgetgrens (segment- en
  historie-inhaalslag, sync) automatisch de krapste limiet; zonder leesheaders
  verandert er niets.
- **Nieuwe verwachting.** Bij 60% van de leeslimiet pauzeren de inhaalslagen rond
  1.200 aanroepen per dag voor de hele app. Na het overige verkeer blijft er ongeveer
  600 per dag voor segmentdetails over; met 3.012 open ritten is dat ~5 dagen.
  Langzamer dan gehoopt, maar de ritten van leden krijgen weer voorrang.

### Opgeleverd — ZWBlokken in de Zwift-werelden

**2026-09-15, commit `f8eba4a`, gepusht naar `main` 2026-09-15 (19:31 UTC).** Migratie `0165` (`profile_zwift_blocks`, view `club_zwift_blocks`,
`strava_activities.zwift_blocks_processed_at`). Geen nieuwe privacyversie.

**Waarom.** Stijn wilde Watopia en de andere Zwift-werelden in ZWBlokken. Zwift-ritten
bleven tot nu toe bewust buiten de kaart.

**Onderzoek (productie, alleen gelezen).**
- **Bronnen.** 10.916 `VirtualRide`-rijen, waarvan 9.361 herkenbare Zwift-ritten met
  een routelijn. Maar 1 Zwift-rit viel buiten een bekende wereld. `zwift-data` kent
  12 werelden met grenzen.
- **Werelden op echte coördinaten.** Acht werelden liggen op echte plekken: London,
  New York, Richmond, Innsbruck, Yorkshire, Paris, Bologna en Scotland. Daarom een
  **eigen tabel**: in `profile_blocks` zou een Zwift-rondje echte Londense blokken
  kleuren en meetellen voor dekking en titels buiten.
- **Blokgrootte.** Op zoom 14 is Watopia 36 blokken en Crit City 1. De punten van de
  routelijn liggen mediaan 60 m uit elkaar (p90 ~220 m). **Zoom 16** (~600 m)
  gekozen, na Stijns keuze uit 16, 17 of hetzelfde als buiten.
- **Club op zoom 16** (dry-run met de nieuwe code): Watopia 321, France 310,
  New York 127, London 109, Makuri 85, Innsbruck 61, Yorkshire 44, Paris 36,
  Scotland 34, Richmond 29, Bologna 22, Crit City 4.
- **Het actiefste lid heeft per wereld al bijna alles.** Watopia 302/321,
  London 107/109, Innsbruck 61/61. Voor fanatieke Zwifters zijn de werelden op
  zoom 16 dus vrijwel vol, en bij volle werelden beslist "wie het eerst had" de
  titel.
- **Noemer.** `zwift_routes.shape` dekt niet elke weg: Watopia 160 van 320
  club-blokken. De noemer is daarom routevormen ∪ club-blokken ("bekende wegen"), en
  komt in de praktijk bijna uit op de club-blokken.

**Besluiten (Stijn).**
- Zoom 16.
- Titels per wereld, met dezelfde regels als buiten: Koning, Koningin of Vorst, en
  bij gelijkspel wie het eerst had.
- Privacy: alleen de tekst aangepast, **geen nieuwe privacyversie**.
  - De verklaring beloofde "Zwift- en andere indoorritten blijven volledig buiten
    deze kaart". Die zin is vervangen.
  - Reden van Stijn: een virtuele Zwift-locatie zegt niets over waar iemand woont
    of is.
  - Dat wijkt af van eerdere rondes, waar een zichtbaar nieuw gegeven een nieuwe
    versie kreeg.

**Wat er is gekomen.**
- `src/lib/zwblokken/zwift.ts` (puur): `ZWIFT_WORLDS` uit `zwift-data`,
  `zwiftWorldAt` (grenzen + ~2 km marge), `isZwiftRide` en `zwiftBlocksForRide`
  (zoom 16).
  - `isZwiftRide` is strikt op "zwift" in apparaat, external-id of naam, zodat
    MyWhoosh, Rouvy en FulGaz eruit vallen.
  - `zwiftBlocksForRide` doet geen start/eind-maskering.
- `src/lib/zwblokken/zwift-sync.ts`: `syncZwiftBlocksForUser`, met een eigen cursor.
  - `writeBlocks` (in `sync.ts`, gedeeld met de buitenblokken) zet bij oude ritten
    uit de historie-inhaalslag ook hier de vroegste datum.
  - Aangehaakt in `runPostSyncForProfile` (stap `zwblokken`, dus ook het webhookpad)
    en in `afterPage` van de historie-inhaalslag.
  - Eenmalige backfill: `/api/zwblokken/backfill?zwift=1`.
- `src/lib/zwblokken/zwift-query.ts`: blokken per wereld (eigen en club), de stand
  voor titels (`zwift:<wereld>` via `titles.ts`), `roadBlocksFromShapes`,
  `knownRoadCounts` en `fetchRouteLines`.
- `/zwblokken`:
  - Schakelaar **Buiten | Zwift**, alleen zichtbaar als er Zwift-blokken zijn.
  - Wereldkiezer, stats (blokken, dekking, hele club), titelchips en de kaart.
  - De kaart heeft geen OSM-ondergrond maar een effen vlak met routelijnen
    (`/api/zwblokken/zwift-roads`, per wereld). `blockZoom` zit nu in `BlocksMap`,
    `BlocksLayer` en `BlockClick`.
  - Dekkingstabel per wereld (`CoverageTable`, geëxporteerd uit `coverage.tsx`) en
    een ranglijst per wereld.
  - Een klik op een blok gaat met `?world=`.
  - De ledenkiezer toont nu ook leden met alleen Zwift-blokken.
- `/hulp#zwblokken`, `/privacy` en runbook bijgewerkt.

**Bewust niet gebouwd.**
- **Andere platforms** (MyWhoosh, Rouvy, FulGaz, Kinomap): samen <100 ritten, en Rouvy
  en FulGaz rijden over echte plekken.
- ~~**Zwift-kaartbeelden als ondergrond**: auteursrecht van Zwift.~~ **Rechtgezet
  op 2026-09-15:** alsnog gebouwd op verzoek van de eigenaar, zie "Minimap als
  ondergrond" hieronder.
- **Zwift-blokken in de buitentotalen**, buitentitels, statistieken of het dashboard.
- **Zoom 17**, ondanks de bijna volle werelden. Dat was de keuze van Stijn; mocht de
  uitdaging te klein blijken, dan is een ander zoomniveau een migratie plus opnieuw
  rekenen (`zwift_blocks_processed_at = null`).

**Verificatie.**
- Nieuw `tests/unit/zwblokken-zwift.test.ts`: wereldherkenning met echte
  coördinaten, platformfilter, zoom-16-blokken zonder maskering, noemer, en titels
  per wereld.
- De dry-run tegen productie gaf dezelfde aantallen als het onderzoek.

**Uitrol (2026-09-15).**
- `0165` is door de eigenaar gedraaid. De tabel, de view en de kolom zijn vóór de
  push alleen-lezend gecontroleerd.
- De backfill `?zwift=1&limit=1&maxActivities=1000` liep in 17 aanroepen van 1 tot
  7 s, allemaal HTTP 200.
- Resultaat: 8.469 Zwift-blokken, 0 `VirtualRide`-ritten onverwerkt.
- Nageteld per wereld: de club-blokken zijn **exact gelijk aan de dry-run**
  (Watopia 321 … Crit City 4).
- Twee profielen hadden wel `VirtualRide`-ritten, maar geen herkenbare
  Zwift-routelijn, en kregen 0 blokken.

*Niet geverifieerd:*
- De Zwift-kaart is niet in een ingelogde browser bekeken.

**Correctie: blokken buiten de wereld (2026-09-16, commit `c741dc7`).** Na de eerste
uitrol stond New York op 16.741 clubblokken (moest 127 zijn) en daalden andere werelden.

**Oorzaak.** `zwiftBlocksForRide` begrensde de blokken niet tot de wereld, terwijl een
routelijn daar wel buiten kan komen:
- het event "#32 Circus" (22-05-2021) start in New York en springt naar London. De
  supercover-DDA vulde alle blokken op de rechte lijn ertussen: een spoor van ruim
  16.000 blokken over de Atlantische Oceaan;
- een **Climb Portal** legt een echte klim (Puy de Dôme, Tourmalet) op zijn echte
  coördinaten, ver buiten de wereld waarin je rijdt.

In productie ging het om 30 van de 6.856 ritten met een wereld.

**Waarom andere werelden daalden.** De primaire sleutel van `profile_zwift_blocks` is
`(profile_id, z, x, y)`; `world` staat er niet in. Een spoor dat door een andere wereld
liep, overschreef dus het wereldlabel van bestaande blokken. Londense blokken kregen zo
het label `new-york`.

**Oplossing (in twee stappen).** Eerst alleen een begrenzing op de wereldgrens uit
zwift-data plus 2 km. Dat bleek te krap: Watopia zakte naar 279 en France naar 225,
want die grenzen zijn krapper dan de werelden nu zijn. Gemeten in productie ligt echt
gereden weg tot ~10 km buiten de grens (France 3.155 punten, Watopia 799), terwijl de
rommel meer dan 50 km buiten de wereld ligt.

De uiteindelijke regels:
- `splitOnJumps` knipt de route bij elke sprong van meer dan 10 km, zodat de
  supercover-DDA geen spoor meer trekt. Normale punten liggen vrijwel altijd onder de
  kilometer; in productie waren er 9 sprongen boven de 10 km, allemaal van dit soort.
- `blockInWorld` houdt daarna alleen blokken binnen de wereldgrens plus 15 km.
- `blockCentre` staat nu in `grid.ts` en wordt gedeeld met `regions.ts`.

Vergeleken op dezelfde productiedata verandert er in tien van de twaalf werelden niets.
Alleen New York (16.467 → 105) en Makuri (485 → 94) verliezen blokken, en die lagen
allemaal op de twee sprongen — ook de blokken vlak bij de grens.

**Opruimen in productie (2026-09-16).** Op verzoek van de eigenaar alles gewist en
opnieuw opgebouwd, want de blokken zijn volledig uit de ritten af te leiden.
- `profile_zwift_blocks` leeggemaakt (25.104 rijen) en `zwift_blocks_processed_at` +
  `zwift_world` teruggezet voor alle 11.832 Zwift-ritten. In één PATCH liep dat op een
  statement timeout (HTTP 500), dus per lid in stukken van 500.
- Daarna `?zwift=1` doorgerekend: 16 aanroepen.
- **Eén les:** mijn controle of de nieuwe code al live was, keek of er blokken meer dan
  2 km buiten de zwift-data-grens lagen. De vorige versie hanteerde een marge van
  0,02° — net iets méér dan 2 km — dus die test gaf een vals positief. Eén lid
  (964 ritten) werd daardoor nog met de strenge versie doorgerekend en miste 19
  France-blokken. Opnieuw doorgerekend.
- **Eindcontrole:** alle 118 combinaties van lid en wereld komen exact overeen met een
  losse herberekening uit de ritten; 0 blokken buiten hun wereldgrens; 0 onverwerkte
  Zwift-ritten. Clubblokken: Watopia 320, France 313, London 117, New York 105,
  Makuri 94, Innsbruck 61, Yorkshire 44, Paris 36, Scotland 34, Richmond 29,
  Bologna 22, Crit City 4.
- Alle titels staan nu op **Vorst**: niemand heeft privacyversie `2026-09-15` getekend,
  dus het geslacht telt nog niet mee.

**Kilometers beslissen bij gelijke blokken (2026-09-15, commit `12c4749`, migratie
`0166`).** Stijn wilde de Zwift-titel over te nemen houden als meerdere leden een
wereld (bijna) vol hebben.
- **Regel in de Zwift-werelden:** meeste blokken; bij gelijk aantal de meeste
  kilometers in die wereld; bij ook gelijke kilometers wie het eerst had.
  - Kilometers winnen nooit van meer blokken.
  - **Buiten blijft het "wie het eerst had"**: daar is niet om gevraagd, en provincies
    raken zelden vol.
- **Waar de kilometers vandaan komen.** De Zwift-sync legt per rit
  `strava_activities.zwift_world` vast. De view `zwift_world_distances` telt
  `distance_m` op per lid en wereld.
- **Code.** `pickRulers` kreeg een optionele `tieBreak`. De ranglijst per wereld
  sorteert op blokken en dan kilometers, en toont de kilometers.
- **Migratie `0166` zet `zwift_blocks_processed_at` terug** voor Zwift-ritten zonder
  wereld. Daarna moet `/api/zwblokken/backfill?zwift=1` opnieuw: blokken en datums
  blijven gelijk, de wereld komt erbij.
  - **`0166` moet vóór de deploy draaien.** De sync schrijft `zwift_world`, en zonder
    die kolom faalt de Zwift-stap. De buitenblokken merken daar niets van.
- **Effect (alleen gelezen, met de nieuwe functies).** Gelijke toppers in vier
  werelden:
  - Richmond: Karen 739 km vóór Tako 645 km;
  - Yorkshire: Bart 1.061 km vóór Femke 1.048 km;
  - Bologna: 9 leden gelijk, Femke 161 km;
  - Crit City: 9 leden gelijk, Karen 264 km.

**Minimap als ondergrond (2026-09-15, commit `b5c4262`).** Stijn zag de blokken op een
effen vlak en wilde een echte kaart. Hij had drie opties:
- Zwifts eigen minimap;
- OpenStreetMap voor de acht werelden op echte plekken;
- een zelf getekende wegenkaart uit clubritten.

Hij koos **Zwifts minimap**.
- **Bron.** `zwift-data` heeft per wereld een `imageUrl` op `cdn.zwift.com`, bedoeld
  voor precies de `bounds` die we al gebruiken. Alle 12 gaven HTTP 200, 0,1 tot
  2,9 MB per wereld. `img-src` in de CSP staat `https:` toe.
- **Uitlijning.** Lokaal gecontroleerd met echte clubritten over het beeld
  (Leaflet-testpagina):
  - Watopia en London vallen op de wegen;
  - met de echte club-blokken erover: London past precies;
  - **Makuri Islands** is ouder dan de wereld: de nieuwere wegen in het noordoosten
    liggen op het plaatje in zee;
  - **Watopia** idem: een deel van de gereden blokken ligt noordelijk buiten het beeld,
    op de effen achtergrond.
- **Hoe het werkt.**
  - `ImageOverlay` in de `tilePane` onder de blokkenlaag, met attributie
    "Kaart © Zwift".
  - Het beeld wordt rechtstreeks van Zwifts CDN geladen, niet gekopieerd. Alleen
    `https://cdn.zwift.com/` wordt doorgegeven.
  - Laadt het beeld niet, dan haalt `ZwiftView` alsnog de routelijnen op
    (`/api/zwblokken/zwift-roads`).
- **Kanttekening.** Het beeld is van Zwift en valt niet onder een licentie; de
  MIT-licentie van `zwift-data` dekt alleen de gegevens. Community-kaarten
  (zwiftmap.com) werken net zo. Alleen ingelogde leden zien het. Blijft het CDN-adres
  niet bestaan, dan valt de kaart terug op de lijnen.

### Opgeleverd — volledige Strava-historie, geleidelijk opgehaald

**2026-09-15, commit `ac59813`, gepusht naar `main` 2026-09-15.** Migratie `0164`
(twee kolommen op `strava_connections`). Die heette eerst `0163`, maar botste met de
rit-koppelronde. Hij is als `0163_strava_history_backfill.sql` in productie gedraaid
en bij het samenvoegen hernummerd. Beide migraties zijn idempotent
(`add column if not exists`), dus opnieuw draaien onder het nieuwe nummer is
onschadelijk. De kolommen staan in productie; dat is vóór de push gecontroleerd.

**Waarom.** Bart miste ZWBlokken. De oorzaak: een eerste Strava-sync haalt maar vijf
jaar terug op (`syncStravaActivitiesForUser`). Barts oudste rit in de database was van
6 juni 2021, drie dagen na die grens. Alles daarna was verwerkt (647/647
buitenritten). In productie (alleen gelezen) zaten 8 van de 10 goedgekeurde, actieve
koppelingen precies tegen die grens aan. De eigenaar wil de volledige historie voor
iedereen, zonder dat de Strava-budgetten in één keer opgaan.

**Besluiten (met de eigenaar afgestemd).**
- Oude ritten doen overal mee, **ook in ZWB Segments**. Hun segmentdetails komen
  later via de bestaande segment-inhaalslag. Daardoor kunnen KOM's en QOM's
  verschuiven, met pushmeldingen "titel verloren".
- Badges worden per lid pas beoordeeld als diens historie compleet is. Daarop volgt
  hooguit één melding.

**Wat er is gekomen.**
- `src/lib/strava/history-backfill.ts` (`runStravaHistoryBackfill`):
  - Per run hooguit **drie** `GET /athlete/activities?before=…&per_page=100`
    (`MAX_PAGES_PER_RUN`). Eerst was dat één; zie "Opgevoerd naar drie pagina's"
    hieronder. Een lid dat klaar is, maakt plaats voor het volgende in dezelfde run.
  - Bij geweigerde tokens nog hooguit twee pogingen extra.
  - Dezelfde budgetgrens als de segment-inhaalslag: 50% van het kwartier, 60% van
    de dag.
  - Neemt geen nieuwe pagina als er minder dan 3,5 s over is (eerst 4 s, bij één
    pagina per run).
- De cursor staat per koppeling in `history_before` en schuift naar de oudste
  activiteit van de pagina.
  - Ook als dat geen fietsrit is; anders blijft hij hangen op hardloopjes.
  - Start bij de oudste API-rit van dat lid, niet bij CSV-rijen: die kunnen ouder
    zijn en de tussenliggende jaren overslaan.
- Een onvolle pagina betekent klaar. Eerst draaien cols, ZWBlokken en milestones
  (`runPostSyncForProfile`), daarna pas `history_complete_at`. Valt de run
  halverwege om, dan kost dat de volgende run één lege pagina.
- Vangnet: komt een volle pagina oud-naar-nieuw terug, dan stopt de stap zonder
  cursor.
  - Dat Strava met alleen `before` de nieuwste eerst geeft, is gangbaar maar niet
    gedocumenteerd.
  - Een verkeerde volgorde zou jaren overslaan en het lid als klaar markeren.
- Rijen via het nieuwe gedeelde `stravaActivityRow` (`client.ts`), dezelfde functie
  als de gewone sync.
- Aangehaakt in `/api/strava/webhook/process`: na de wachtrij en de KOM-stap, vóór de
  segment-inhaalslag, die anders elke run tot de rand vult. Uitzetten met
  `?historyBackfill=0`. Zonder `0164` geeft de stap `no_migration` en doet hij niets.
- **ZWBlokken `first_seen_at`.** `processBatch` liet een bestaand blok altijd zijn
  datum houden (`ignoreDuplicates`). Dat klopte alleen zolang ritten op volgorde
  binnenkwamen. Oude ritten komen nu ná de recente binnen. Een oudere datum
  overschrijft nu de bekende (`splitByExisting`). Anders telt "nieuw dit jaar" een
  blok uit 2014 mee en klopt het gelijkspel van de titels niet.
- `/hulp#strava-import`: de koppeling haalt eerst vijf jaar op, daarna geleidelijk
  de rest. De oude claim "met activities.csv haal je je volledige historie binnen"
  als enige route is weg.
- Runbook §cron: de stap uitgelegd.

**Bewust niet gebouwd.**
- **Geen aparte cron-job.** Meeliften op de 5-minutenjob, zoals de
  segment-inhaalslag. Dat is hooguit 36 overzichtscalls per uur.
- **De vijfjaarsgrens van de eerste sync blijft staan.** Die sync draait interactief
  en tegen de functie-timeout. De rest volgt via deze stap.
- **Geen routelijn voor CSV-/GPX-imports.** Die ritten leveren nog steeds geen
  ZWBlokken op. Dat is een apart gat voor leden zonder koppeling.
- **Geen UI-voortgang.** De voortgang staat in de cron-JSON.

**Kanttekeningen.**
- **Badgemeldingen tussendoor.** Het webhookpad beoordeelt badges bij elke nieuwe
  rit. Uploadt een lid tijdens de inhaalslag een rit, dan kan er tussendoor al een
  badgemelding komen.
- **Weekbadges van oude weken.** `awardCompletedAchievementWeeks` (cron finalize)
  rekent over alle weken, dus straks ook over oude weken van vóór ZWB. Dat gold al
  voor de vijf jaar. Die functie leest zonder paginering, dus mogelijk niet alle
  rijen; niet aangepast.
- **Segmentdetails.** Elke oude buitenrit kost één detailcall in de
  segment-inhaalslag (nieuwste eerst). Onder de budgetgrens duurt dat dagen tot
  weken.

**Verificatie.**
- `tsc --noEmit` zonder fouten, eslint schoon, `npm run build` geslaagd, Vitest
  1139 geslaagd.
- Nieuw `strava-history-backfill.test.ts` (13 tests):
  - cursor en afronden, afronding in de juiste volgorde, lege pagina;
  - lid zonder sync, geweigerde tokens met plafond;
  - budget, deadline, rate limit, geen migratie, verkeerde volgorde.
- Nieuw `zwblokken-first-seen.test.ts`.
- Alleen gelezen in productie: het filter `raw->>import_source=is.null` werkt.

*Niet geverifieerd:*
- Hoeveel pagina's en detailcalls de hele historie kost, is niet gemeten.

**Eerste uur in productie (alleen gelezen, 18:10–18:58 UTC).**
- Om 18:10 kwam de eerste cursor. De volgorde van Strava klopte: het vangnet sloeg
  niet aan en de cursor schoof elke run verder.
- Het eerste lid in de rij (op profiel-id) ging in ~10 runs van juni 2021 terug naar
  maart 2019. Daarbij kwamen 611 oude fietsritten binnen, allemaal met blokken
  verwerkt, en 2.618 blokken kregen een datum van vóór juni 2021.
- Budget: dag 1.049/4.000, kwartier 6/400.
- Schatting bij één pagina per run:
  - ~29 pagina's per extra jaar historie voor de acht leden tegen de grens, gemeten
    aan fietsactiviteiten per jaar;
  - in de praktijk ~1,5× zoveel, want Strava levert ook hardloop- en
    wandelactiviteiten mee;
  - samen ruim 3 uur per extra jaar, dus bij 5 jaar extra per lid ~18 uur.

**Opgevoerd naar drie pagina's (2026-09-15, commit `13c6dfe`).** Op verzoek van de
eigenaar, omdat ZWBlokken anders een dag of langer op zich liet wachten en het budget
ruim bleef.
- `MAX_PAGES_PER_RUN = 3`. Tijd en budget worden per pagina opnieuw gecontroleerd.
- Een lid dat klaar is, maakt in dezelfde run plaats voor het volgende.
- De segment-inhaalslag krijgt daardoor minder van de 8 s per run.
- Hoeveel pagina's er echt in een run passen, hangt af van de looptijd van Strava en
  de blokberekening. Dat is niet gemeten. Mogelijk worden het er soms twee.

### Opgeleverd — het lid koppelt zelf een rit aan een training

**2026-09-15, commit `4ea87ba`, gepusht naar `main` 2026-09-15** (in één deploy met
de historie-inhaalslag). Migratie `0163`
(`strava_activities.training_excluded_at`), draaien vóór de deploy — vóór de push in
productie aangetroffen. **Niet lokaal
getest:** er is geen Docker of Supabase-config; de databasekant is alleen met de
stub in `tests/unit/reassign-ride.test.ts` bewaakt, de UI niet in een browser gezien
(geen `.env.local` in deze worktree).

**Waarom.** ZWBeter Worden koppelt een rit automatisch aan de training van die
kalenderdag. Zit dat ernaast, dan kon het lid dat alleen in het bevestigscherm
herstellen, alleen vóór bevestigen en alleen naar een andere open training. Een rit
losmaken ("dit was geen training") of een ongeplande rit aan een gemiste training
hangen kon niet.

**Besluiten (met de eigenaar afgestemd).**
- Alle drie de correcties: verhuizen naar een andere training, een ongeplande rit
  koppelen, en loskoppelen.
- **Wijzigen mag altijd**, ook na bevestigen en na trainerfeedback. De feedback
  blijft op de oude rij staan, zonder rit, cijfers en `athlete_confirmed_at`, zodat
  die niet in de beoordelingsrij van de trainer blijft hangen.

**Wat er veranderde.**
- `relinkRide` (completion.ts) vervangt `reassignRideToWorkout` en redeneert vanuit
  de rit. Verhuizen neemt RPE, gevoel, opmerking, bevestigmoment en zonetijden mee;
  CTL en gereedscore blijven die van de oorspronkelijke momentopname. Een rit zonder
  momentopname krijgt nieuwe waarden via `loadSnapshotContext`, dat uit
  `detectCompletedWorkouts` is gehaald. Doelen blijven `reassignCandidates`: open,
  geen rust of clubevent, in de week tot en met de ritdag.
- Loskoppelen zet `training_excluded_at` vóór het loslaten; weer koppelen haalt de
  markering weg. `pickRideForWorkout` slaat gemarkeerde ritten over. Daarmee slaan
  `pairWorkoutsWithRides` (detectie en naleving) en `unplannedRides` ze ook over; die
  laatste toont de rit dan als ongepland.
- De markering komt via `markExcludedRides`, een aparte query, en niet via
  `STRAVA_RIDE_COLUMNS`. Draait `0163` nog niet, dan koppelt alles zoals voorheen
  en faalt alleen loskoppelen, in plaats van elke ritquery.
- UI: in de maandkalender (`/zwbeter-worden/schema`) staat bij een gereden training
  en bij een ongeplande rit **Hoort bij** (`RideLinkForm`). Het bevestigscherm kreeg
  de keuze **Geen training**. Uitleg staat op `/hulp#rit-koppelen`.
  `loadUnplannedRides` heet nu `loadScheduleRides` en geeft ook dag en naam per rit.

**Bewust niet gebouwd.**
- **Ruilen in één stap.** Als twee trainingen elkaars rit hebben, gaat dat in drie
  stappen: loskoppelen, verhuizen, koppelen. Dankzij de markering koppelt de detectie
  tussendoor niets verkeerd terug.
- **Een training die later gepland staat als doel.** Afvinken zou hem stilletjes uit
  het schema halen.
- **Koppelen door de trainer.** Daar is niet om gevraagd; de action accepteert
  alleen het lid zelf.
- **De AI-dagcontext** (`yesterdayContextFrom`) kijkt nog naar de langste rit van
  gisteren, ook als die losgekoppeld is. Het is echte belasting, dus die hoort de AI
  te zien. Alleen de vergelijking met de training van gisteren is dan scheef.
- **De Strava-samenvatting** (`summary-writer`, `pickPlannedWorkout`) wordt geschreven
  bij binnenkomst van de rit en kijkt niet naar latere correcties.

**Nazorg 2026-09-15: rit verdween na loskoppelen.** Commit `a27e5a4`, gepusht
naar `main` 2026-09-15. Geen migratie. De eigenaar koppelde een rit los en wilde een andere rit
van die dag aan dezelfde training hangen. Die rit was toen uit de kalender
verdwenen. De oorzaak: `unplannedRides` liet elke training die niet op
rustdag stond ter plekke een rit van die dag opeisen, ook een training op
`planned`. Na het loskoppelen stond de training weer op gepland en eiste hij de
andere rit op. De kalender toonde de training als "Niet gereden" en de rit nergens.
Nu claimt alleen een training op `completed` zonder vastgelegde rit nog ter
plekke. Een training op gepland verbergt geen ritten meer; die staan als
ongepland met **Hoort bij** tot de detectie ze vastlegt. Dezelfde fout trof al
eerder gereden trainingen buiten het detectievenster van 7 dagen: die stonden als
niet gereden met hun rit onzichtbaar. Die ritten zijn nu ook zichtbaar.
*Niet veranderd:* `detectCompletedWorkouts` (bij de Strava-sync en bij het openen
van Vandaag) koppelt een vrije rit van die dag nog steeds aan een training die weer
op gepland staat, met de pushmelding "Bevestig je training". Een training
blijvend "niet gereden" laten, ook als er die dag nog een rit is, vraagt een
markering op de training. Die keuze ligt bij de eigenaar.

**Nazorg 2026-09-15 (2): in Strava verwijderde rit.** Commit `5873bbd`, gepusht naar `main` 2026-09-15.
Geen migratie. Melding van de eigenaar: Bart verwijderde in Strava een
rit die aan zijn training hing. De rit ging weg uit `strava_activities`, maar
`training_workout_reports.paired_activity_id` bleef ernaar wijzen en de training
bleef op `completed`. De kalender toonde **Hoort bij** alleen als de rit
gevonden werd. De andere rit kon er ook niet aan, want de training gold als
bezet. Er was geen weg terug.
- `releaseDeletedRides` (completion.ts) laat zulke trainingen los: rit, cijfers en
  `athlete_confirmed_at` gaan weg, de training gaat naar gepland. RPE, gevoel,
  opmerking en trainerfeedback blijven staan. Vaak is de verwijderde rit een
  dubbele upload; koppelt de detectie of het lid de rit die bleef, dan staat die
  beleving al ingevuld. Een rapportage zonder enige invoer verdwijnt. De helper
  controleert zelf dat de rit echt weg is.
- Aangeroepen op drie plekken:
  - in `runPostSyncForProfile` met `removedActivityIds`, vóór de detectie. Dat
    dekt de webhook-delete en de reconcile-sync;
  - in `detectCompletedWorkouts` als zelfherstel voor koppelingen die al wezen
    (Barts geval), met daarna één herhaalde run;
  - in `relinkRide`: loskoppelen van een verwijderde rit kan, en een training met
    een verwijderde rit is een geldig doel. De andere rit gaat er dus in één
    stap aan.
- `relinkRide` overschrijft de beleving van de doeltraining niet meer als er geen
  bevestigscherm en geen oude rapportage is (ongeplande rit).
- Kalender: `loadScheduleRides` geeft `deleted` terug (gekoppelde id's buiten het
  venster die niet meer bestaan, max. 200). Zo'n training toont **Hoort bij** met
  "Verwijderde rit", en telt als kandidaat bij de andere ritten. Een
  `metrics_json` zonder `plannedTitle` telt niet meer als momentopname.
*Bewust niet:* `purgeStravaDataForProfile` (ingetrokken Strava-koppeling) laat
trainingen niet los. De ritgeschiedenis gaat dan in één keer weg, en alle gereden
trainingen op niet gereden zetten wist de clubhistorie die de retentieregel juist
wil houden. Wel herstelt de detectie de laatste 7 dagen bij het volgende bezoek.
Oudere trainingen tonen "Verwijderde rit" met de optie los te koppelen. Niet
lokaal getest tegen de database; alleen met de stub in
`tests/unit/reassign-ride.test.ts`.

### Opgeleverd — ZWBlokken-titels: Koning(in) van een land, Gouverneur van een provincie

**2026-09-15, commit `5c686aa`, via merge naar `main` gepusht 2026-09-15** (in één
deploy met de KOM/QOM-ronde en de zonetijdenronde). Geen migratie. Wel een nieuwe
privacyversie (`2026-09-15`); die dekt ook de QOM-zin in `/privacy`, maar de QOM-titel
zelf vraagt in `0162` nog steeds alleen `>= '2026-09-13'`.

**Waarom.** ZWBlokken moest spannender worden voor alle leden. Wie in een land de
meeste blokken heeft, wordt Koning of Koningin, en in een provincie Gouverneur.
Klaar zodra per land en per provincie zichtbaar is wie de titel heeft.

**Besluiten (met de eigenaar afgestemd).**
- **Maatstaf.** Aantal verschillende blokken in het gebied, geen kilometers.
  - De data lag er al: `profile_blocks.country/province`, zie `0112`.
  - Het beloont verkennen, niet steeds hetzelfde rondje.
- **Titel.** Een land geeft Koning (`sex='man'`), Koningin (`'vrouw'`) of **Vorst**
  (leeg of `zeg_ik_liever_niet`). Een provincie geeft altijd Gouverneur.
- **Gelijkspel.** De titel blijft bij wie het aantal het eerst bereikte. Dat moment
  is het laatste `first_seen_at` van dat lid in de regio. Overnemen kan alleen met
  strikt meer blokken.
- **Provincies** nu ook buiten Nederland:
  - België: 10 provincies plus Brussel.
  - Luxemburg: de 3 districten die Natural Earth levert.
  - Duitsland: 16 deelstaten.
  - Frankrijk: de 13 Europese regio's, geen departementen en geen overzeese
    gebieden.
- **Toestemming.** De titel verraadt het opgegeven geslacht aan andere leden, en dat
  was nieuw.
  - Daarom een nieuwe privacyversie, en een tekst in het ZWBlokken-item van
    `/privacy`.
  - Wie `2026-09-15` nog niet tekende, blijft Vorst: `sexForTitle`,
    `TITLE_SEX_CONSENT_VERSION`.
  - De titel zelf (wie de meeste blokken heeft) viel al onder de bestaande
    ZWBlokken-toestemming. Die per-lid-dekking was al zichtbaar.

**Wat er is gekomen.**
- `scripts/build-zwblokken-regions.mjs` levert provincies per land.
  - Nederland blijft onvereenvoudigd, de buurlanden krijgen `TOLERANCE`.
  - Franse departementen worden per `region_cod` samengevoegd door hun ringen achter
    elkaar te zetten. Dezelfde even-oddregel geldt voor teller en noemer.
  - Namen in het Nederlands (`name_nl`, met correcties voor Antwerpen en Brussel;
    Franse regio's uit een vaste lijst).
  - `regions.json` is 1,65 → 2,04 MB en heeft 62 → 105 regio's. De bestaande 62 zijn
    byte-gelijk gebleven.
  - Provincies tellen per land op tot binnen 0,1 % van het land. Frankrijk wijkt
    af, want het land telt de overzeese gebieden mee.
- `regionForBlock` zoekt een provincie alleen binnen het land van het blok. Een
  grensblok in Nederland krijgt dus nooit een Belgische provincie.
- Nieuw `src/lib/zwblokken/titles.ts` (puur): `addBlock`, `pickRulers`,
  `rulerTitle`, `sexForTitle`, `countryOfProvince`.
- `fetchBlockCounts` heet nu `fetchClubStandings`.
  - Dezelfde ene scan levert ook de stand per regio.
  - Nieuw is een vaste sortering op `(profile_id, x, y)`. Zonder die sortering kon de
    paginering rijen overslaan of dubbel tellen, en dat gold ook al voor de oude
    telling.
- `/zwblokken`:
  - Per gebied een regel met kroon- of landmark-icoon en de titelhouder, in goud als
    dat het geselecteerde lid is.
  - De provincietabel is per land opgesplitst ("Deelstaten in Duitsland").
  - Onder de stats staan chips met de titels van het geselecteerde lid. Namen die
    dubbel voorkomen krijgen een landcode: "Gouverneur van Limburg (BE)".
  - Alleen goedgekeurde leden dingen mee.
- `/hulp#zwblokken` legt de titels uit. De zoekwoorden zijn uitgebreid.

**Bewust niet gebouwd.**
- **Grotere blokken.** Titels vergelijken leden onderling. Een groter blok
  verandert nauwelijks wie wint en geeft alleen meer gelijkspel. Het zou vooral de
  dekkingspercentages sneller laten stijgen, en dat is een ander doel. Geparkeerd.
- **Kilometers als maatstaf.** Daarvoor is een nieuwe berekening over alle polylines
  nodig, plus opslag. En het beloont het vaste thuisrondje.
- **Provincies voor andere landen.** Spanje, Italië en Oostenrijk hebben ook
  clubblokken, maar er is om deze vijf landen gevraagd.
- **Titel zelf kiezen.** Dat vraagt een migratie. Het geslacht uit het profiel
  volstaat.

**Stand in productie (alleen gelezen, 2026-09-15).**
- 40.777 blokken van 10 leden. De scan kost ~3,3 s vanaf lokaal; die scan draaide
  al bij elke paginaweergave.
- Er zijn 28 titels vergeven, waarvan 16 aan één lid.
- Of titels andere leden prikkelen, moet in de praktijk blijken. Dat was de open
  vraag van deze ronde.

**Uitrol.** Na de deploy stonden de gouverneurs in BE/LU/DE/FR nog leeg: bestaande
blokken hadden de oude indeling (alleen NL-provincies). De regio-backfill heeft op
2026-09-15 in productie gedraaid via
`POST /api/zwblokken/backfill?regions=1&maxRows=5000&offset=…`, in 9 aanroepen
(40.862 rijen). Blokken zonder provincie daarna, alleen gelezen:

| Land | Blokken | Zonder provincie vóór | Na |
|---|---|---|---|
| NL | 21.866 | 10 | 10 |
| BE | 2.681 | 2.681 | 1 |
| LU | 381 | 381 | 0 |
| DE | 4.134 | 4.134 | 0 |
| FR | 6.184 | 6.162 | 0 |

De overgebleven blokken liggen op een grens, waar de land- en provinciegrens uit
Natural Earth niet precies samenvallen. Nieuwe ritten krijgen de provincie vanzelf
via de sync. Een nieuwe `regions.json` vraagt voortaan dezelfde backfill. Tot een lid de nieuwe privacyversie tekent,
blijft diens landstitel Vorst.

**Verificatie.**
- `tsc --noEmit` zonder fouten, eslint schoon op de geraakte bestanden, en
  `npm run build` geslaagd.
- Vitest: 1098 geslaagd. Eén suite (`omnium-live.test.ts`) kon niet laden omdat de
  worktree geen `.env.local` heeft; dat staat los van deze ronde.
- Nieuw `zwblokken-titles.test.ts`. `zwblokken-regions.test.ts` is uitgebreid met
  buurlandprovincies, samengevoegde Franse regio's, de landgrens en de sommen per
  land.
- De dekkingstabel is server-side gerenderd met testdata.
- *Niet geverifieerd:* de pagina is niet in een ingelogde browser bekeken.

### Opgeleverd — gemeten tijd per Zwift-zone bij gereden trainingen (wens 16, deel 2)

**2026-09-15, commit `3621a71` op `main`, gepusht 2026-09-15.** Geen migratie; de zonetijden staan in `metrics_json.zoneTimes`.

**Waarom.** Het tweede deel van Jeroens vraag: bij een voorbije training ook de
gereden zones zien, niet alleen de geplande opbouw uit R3. Stap 0 (eigenaar,
alleen lezen, 15 september) liet op 300 `intervals_activities` zien:
- 154 activiteiten via Strava, zonder vermogen;
- 146 rechtstreeks via Garmin, Wahoo of OAuth, waarvan 106 met `icu_zone_times`;
- die `icu_zone_times` gaan over de eigen zones van het lid (Z1–Z7 + SS).

De eigenaar koos om de watt-stream zelf in te delen in de zes Zwift-zones, gelijk
aan de blokkleuren uit R4.

**Wat er is gekomen.**
- `src/lib/training/zone-times.ts` (puur, ook in de browser):
  - `zoneSecondsFromStream`: 1 Hz of volgens de tijdreeks; uitval telt niet, een
    gat van meer dan 10 s is een pauze;
  - `plannedZoneSeconds`: op het midden van elk blokdoel;
  - `pickIntervalsActivity`: lokale start binnen 10 min, rijtijd binnen 15 %,
    Strava-stubs uitgesloten, dichtstbijzijnde start wint.
- `zone-times-fill.ts` (server): `fillZoneTimes` haalt voor hooguit drie gereden
  trainingen met vermogensmeter uit de laatste 14 dagen de streams op via
  `fetchIntervalsActivityStreams` (nieuw in `client.ts`).
  - Het resultaat komt in de momentopname als `{source: "intervals", intervalsId,
    ftpWatts, seconds[6]}`.
  - Na 2 dagen zonder passende activiteit, of bij een stream zonder vermogen:
    `{source: "none"}`.
  - Draait via `after()` na het verversen van intervals-activiteiten in
    `loadIntervalsSnapshot`, zodat de pagina er niet op wacht.
- `WorkoutMetricsPanel` toont per zone een balk met gereden minuten, een streep
  voor de geplande minuten en "gereden / gepland". Zonder data staat er "Geen
  zonedata". Het paneel krijgt de blokken van de kalender, de
  "Afgewerkt en gemist"-lijst en de beoordelingsstapel.
- `/hulp#tijd-per-zone` plus zoekentry.
- Privacyverklaring: de vermogensmeting wordt opgehaald, alleen de seconden per
  zone worden bewaard.

**Bewust niet gebouwd.**
- Geen Strava-streams als terugval: dat kost budget onder de atletenlimiet.
- Geen `icu_zone_times` van intervals.icu: andere zones dan de blokken.
- Niet opnieuw indelen na een FTP-wijziging: `ftpWatts` staat erbij.
- Geen aanvulling voor trainingen ouder dan 14 dagen.
- **Geen nieuwe privacyversie.** De vermogensdata kwam al binnen via de
  intervals-koppeling en gaat naar dezelfde ontvangers (lid en trainer); nieuw is
  alleen de afgeleide seconden per zone. Dat is een inschatting die de eigenaar kan
  herzien.

**Verificatie.** `tsc --noEmit` zonder fouten, lint zonder fouten, Vitest volledig
groen (1093 geslaagd). Nieuw `zone-times.test.ts`: zonegrenzen, uitval en pauzes,
tijdstappen, geplande seconden, koppeling (Strava-stub, afwijkende rijtijd of
start, dichtstbijzijnde). `next build` compileert; het prerenderen strandt lokaal
op de Omnium-pagina's zonder Supabase-sleutels (niet door deze ronde).

*Niet geverifieerd:*
- **Vorm van de stream.** De test in stap 0 is niet gelopen (de eigenaar had in
  die selectie geen ritten buiten Strava). De client leest daarom zowel een lijst
  als een object met streams.
- **`after()` op Netlify.** Of het na het antwoord blijft draaien, is niet
  gecontroleerd.
- **Ingelogd.** Geen ingelogde weergave bekeken.

### Opgeleverd — gewenste eindtijd ook naar het AI-voorstel (wens 7, deel 2)

**2026-09-14, commit `32a01b0` op `main`, gepusht 2026-09-15.** Geen migratie.

**Waarom.** De eigenaar wilde de doeltijd niet alleen rekenkundig verwerken, maar
ook aan de AI meegeven. De promptregel "Noem geen verwachte finishtijd" en een
`goal` die de knop nooit invulde, hielden dat tegen.

**Wat er is gekomen.**
- **Doorgeven.** `GenerateButton` stuurt de opgeslagen `summary.targetTime.seconds`
  mee als `targetSeconds`. De API-route accepteert 60 s tot 24 uur, en
  `startPacingDraft` geeft het door aan `buildPacingContext`.
- **Basisvoorstel op tijd.** `buildPacingContext` zet het basisvoorstel voor de
  AI eerst met `fitPlanToTime` op de doeltijd. De AI krijgt dan
  `targetTime: {seconds, reachable, fastestSeconds}`.
- **Prompt.** Nog steeds rekent de AI zelf geen tijden. Nieuw:
  - bij een `targetTime` hetzelfde totaal slimmer verdelen, niet zwaarder of
    lichter maken;
  - een onhaalbare tijd noemen in `risks`, met de snelste haalbare tijd.
- **Overnemen.** `pollGeneration` leest de doeltijd terug uit `prompt_summary`
  (`targetSecondsFromPromptSummary`). Na `adoptGeneratedPlan` zet
  `fitPlanToTime` de AI-verdeling op die tijd: de vorm blijft, het niveau schuift.
  - Wijkt de AI meer dan 3 % af (`AI_TARGET_DEVIATION`), dan komt er een notitie.
  - Het plan krijgt `summary.targetTime`.
- `/hulp#pacing-eindtijd` noemt het.

**Bewust niet gebouwd.** Geen apart doeltijdveld naast de AI-knop: de tijd komt
uit het plan, zodat er één plek is om hem op te geven. Geen kolom voor de
doeltijd op `event_pacing_generations`: `prompt_summary` bevat de invoer al.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, `npm run build`
geslaagd, Vitest volledig groen (1003 geslaagd). Nieuw in
`pacing-target-time.test.ts`: doeltijd teruglezen uit de AI-invoer, promptregels,
en een AI-verdeling op tijd zetten met behoud van de verhouding klim/vlak.
*Niet geverifieerd:* geen echte AI-generatie gedraaid (kost geld en vraagt een
ingelogde sessie); hoe het model met de nieuwe regel omgaat, is dus niet bekeken.

### Opgeleverd — pacingplan voor een gewenste eindtijd, rekenkundig (wens 7, deel 1)

**2026-09-14, commit `c3a4a63` op `main`, gepusht 2026-09-15.** Geen migratie; het doel staat in de bestaande jsonb `summary`.

**Waarom.** Jeroen vroeg of het plan een voorstel kan maken vanuit een gewenste
eindtijd. Het model rekende alleen de andere kant op, van vermogen naar tijd. De
eigenaar koos voor een rekenkundige omkering, en daarna de doeltijd ook naar de AI
(volgende ronde).

**Wat er is gekomen.**
- `src/lib/pacing/target-time.ts`: `fitPlanToTime` zoekt één vermenigvuldiger op
  de gewone stukken van het huidige plan. De verhoudingen blijven gelijk;
  neutralisaties en afdalingen blijven staan.
  - Na elke stap gaat het plan door `rebalancePlan`.
  - Eerst zoekt het de hoogste vermenigvuldiger die ná terugschalen nog haalbaar
    is. Daaruit volgt de snelste haalbare tijd.
  - Daarna bisectie op de tijd tot binnen 30 s, waarbij het beste resultaat wordt
    vastgehouden.
  - Een doel sneller dan de snelste haalbare tijd geeft het snelste haalbare plan
    met `reachable: false`. Een doel langzamer dan het rustigste plan telt als
    haalbaar.
- `parseTargetTime` leest "5:30", "5.30", "5u30" en losse minuten.
- `fitStoredPlanToTime` bewaart het resultaat met
  `summary.targetTime = {seconds, reachable, fastestSeconds}`. De bron, de
  AI-strategie en een oude routesnapshot blijven staan.
  - Herberekenen en een handmatige bewerking houden het doel vast.
  - De pagina toont "Doel …, plan …" en bij een onhaalbaar doel de snelste
    haalbare tijd.
- `planForTargetTime` (serveractie) en `TargetTimeForm` (u:mm-veld). Bij een plan
  met eigen doelen vraagt het formulier eerst om bevestiging.
- `/hulp#pacing-eindtijd`.

**Gevonden tijdens het bouwen.** Een plan dat ver boven CP ligt, krijgt
`rebalancePlan` (hoogstens 8 rondes) niet altijd binnen de reserve. "Zo hard
mogelijk en dan terugschalen" was daarom geen betrouwbaar snelste plan; het zoeken
gaat op haalbaarheid. `rebalancePlan` zelf is niet aangepast.

**Bewust niet gebouwd.** Geen per-stuk optimalisatie (bijvoorbeeld meer op de
klim, minder op het vlak voor dezelfde tijd): dat is een optimalisatieprobleem met
eigen aannames, en de vorm van het plan is aan het lid of de AI. Wind en
slipstream blijven buiten het model. *Achterhaald (21 september 2026):* bij een
Zwift-event rekent het plan wel met slipstream; zie "Pacingplan voor Zwift".
Wind blijft erbuiten.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, `npm run build`
geslaagd, Vitest volledig groen (1000 geslaagd). Nieuw `pacing-target-time.test.ts`:
tijden lezen, sneller en langzamer binnen de marge met behouden verhoudingen,
onhaalbaar met een haalbaar snelste plan, neutralisatie ongemoeid, duurvermogen
maakt het snelste plan langzamer. *Niet geverifieerd:* het formulier niet
ingelogd in de browser gebruikt; geen echt event doorgerekend.

### Opgeleverd — pacingplan: zelf knippen en samenvoegen (wens 6, deel 3)

**2026-09-14, commit `c7d67a3` op `main`, gepusht 2026-09-15.** Geen migratie.

**Waarom.** Het derde deel van Jeroens vraag naar extra stukken. De indeling lag
vast bij het voorstel: `savePacingPlan` nam bewust alleen `{index, targetWkg}`
aan. Wie halverwege een lang vlak stuk wilde versnellen, kon dat niet.

**Wat er is gekomen.**
- `src/lib/pacing/edit.ts` (puur):
  - `applySplit` knipt op het 100 m-raster, minstens 0,5 km van beide randen;
    labels worden "X (1)"/"X (2)".
  - `applyMerge` voegt twee gewone stukken samen met een afstandsgewogen doel;
    het accent blijft alleen bij gelijke accenten.
  - Hoogstens `MAX_EDIT_PIECES` (30) stukken.
- `validateEditedPlan` op de server:
  - de stukken sluiten aan van 0 tot de finish, elk minstens 0,5 km;
  - doelen tussen 0,5 en 12 w/kg (afdaling vanaf 0), labels ≤ 60 tekens;
  - het accent volgt uit de grootste overlap (minstens de helft), de inspanning
    uit `effortFor` (nu geëxporteerd), de toelichting uit een gelijk oud stuk;
  - vaste stukken komen via `imposeFixedPieces` uit de route, niet uit de invoer.
- `savePacingPlan` neemt de hele lijst aan.
- `imposeFixedPieces` maakt van een vast stuk dat niet meer bij de route past
  eerst een gewoon stuk, zodat er geen gat valt.
- De editor krijgt per stuk "Knippen" (km-invoer, geen slepen) en "Samenvoegen
  met volgende".
  - "Gewijzigd" vergelijkt de hele indeling in plaats van per index.
  - Het inspanningslabel loopt mee met de schuif.
  - De editor rekent nu met het duurvermogensmodel, zoals de server: eerder
    konden tijd en haalbaarheid op het scherm afwijken van wat werd opgeslagen.
- `/hulp#pacing` en de melding bij herberekening: bij een gewijzigde route
  vervallen de eigen knippen.

**Bewust niet gebouwd.** Grenzen verslepen in het profiel: lastig raken op een
telefoon, en een km-invoer doet hetzelfde. Eigen knippen overnemen op een
gewijzigde route (`carryTargetsOver` houdt alleen gelijke stukken). Labels
hernoemen.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, `npm run build`
geslaagd, Vitest volledig groen (993 geslaagd). Nieuw `pacing-edit.test.ts`:
knippen op het raster, randen, maximum, samenvoegen met gewogen doel en accent,
geen vaste stukken samenvoegen, validatie (gat, overlap, te kort, finish gemist,
te veel stukken), gemanipuleerd neutraal stuk, begrenzing. *Niet geverifieerd:*
de editor niet ingelogd in de browser bediend (geen testaccount).

### Opgeleverd — pacingplan: afdalingen als eigen stuk (wens 6, deel 2)

**2026-09-14, commit `4adb09f` op `main`, gepusht 2026-09-15.** Geen migratie.

**Waarom.** Jeroen vroeg hoe het plan met afdalingen omgaat. Het antwoord was:
slecht. Een afdaling lag in een tussenstuk op ongeveer 0,94×CP×fractie. Het model
trapte daar dus door, met een ondergrens van 0,3×CP (en 0,5 w/kg bij opslaan). Dat
kostte kJ, liet W′ trager herstellen en won nauwelijks tijd tegen de grens van
79 km/u. De eigenaar koos om afdalingen een eigen stuk te geven waarop uitrollen
mag, en de snelheidsgrens van 79 km/u te laten staan.

**Wat er is gekomen.**
- `detectDescents` in `route-profile.ts` zoekt lange afdalingen: minstens 1 km,
  gemiddeld −4 % of steiler. Een afdaling begint bij −3 % en loopt door zolang het
  daalt (≤ −2 %), met hooguit 200 m vlakker ertussen. Een klim of neutralisatie
  breekt hem af. `withDescents` draait in de loader, ná de zones.
- `PlanSegment.kind: "descent"` met standaarddoel 0. In `evaluatePlan` geldt dat
  doel waar het steiler dan −3 % daalt. Op vlakkere stukjes binnen de afdaling
  geldt minstens `DESCENT_FLAT_CP_FRACTION` (0,4×CP), zodat het model niet naar
  wandeltempo zakt. Uitrollen kost geen kJ en W′ herstelt vanzelf sneller (Skiba).
- `imposeNeutralPieces` heet nu `imposeFixedPieces` en knipt ook afdalingen in elk
  plan. Een eigen doel op dezelfde afdaling (±50 m) blijft staan.
- `clampPlan` legt geen ondergrens op een afdaling, de schuif begint daar bij 0 en
  `savePacingPlan` accepteert 0.
- `wkgBySegment` negeert afdalingen en neutralisaties als terugval: een gat in het
  plan kreeg anders 0 W.
- Snapshot en `planLayoutMatchesRoute` kennen de afdalingen.
- De AI krijgt `descents` mee, met een promptregel.
- `/hulp#pacing-afdalingen`.

**Gevolg voor bestaande plannen.** Elk plan op een route met een lange afdaling
wordt één keer verouderd, omdat zijn snapshot geen afdalingen kent. Dat is bedoeld:
de verwachte tijd en de reserve klopten daar niet. Er verandert niets tot het lid
zelf opnieuw doorrekent.

**Bewust niet gebouwd.** Geen lagere snelheidsgrens voor technische afdalingen,
geen bochten of remmen: keuze van de eigenaar. `/hulp` noemt dat de verwachte tijd
daar optimistisch is. Geen aparte band voor afdalingen in het profiel.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, `npm run build`
geslaagd, Vitest volledig groen (982 geslaagd). Nieuw `pacing-descent.test.ts`:
detectie over een vlak stukje heen, korte afdaling genegeerd, zone breekt af,
0 W op steil en ondergrens op vlak, geen wandeltempo, sneller W′-herstel, geen
ondergrens bij rebalance, gat niet op 0 W, basisvoorstel, eigen doel behouden,
verouderd. *Niet geverifieerd:* de drempels niet op echte GPX-routes nagerekend
(ruis in GPX-hoogtes kan meer of minder afdalingen opleveren); geen ingelogde
pacingpagina.

### Opgeleverd — pacingplan: neutralisatie telt mee (wens 6, deel 1)

**2026-09-14, commit `d715f34` op `main`, gepusht 2026-09-15.** Geen migratie.

**Waarom.** Jeroen vroeg of het pacingplan naast de neutralisatie ook andere
stukken kan hebben. Bij het uitzoeken bleek dat de neutralisatie zelf niet eens
meetelde: `event_zones` (0095) werd alleen op kaart, profiel en liveticker
getekend. Het pacingplan rekende die kilometers als gewoon rijden, met een doel
dat je daar niet kunt rijden. De eigenaar koos voor 30 km/u, begrensd op
0,70×CP.

**Wat er is gekomen.**
- `route-loader.ts` laadt de zones voor GPX- én Zwift-events in
  `PacingRoute.neutralZones`, via `normalizeNeutralZones` (binnen de route, op
  volgorde, zonder overlap).
- `evaluatePlan` rekent op elk 100 m-segment in een zone met `neutralWatts`: het
  vermogen voor `NEUTRAL_SPEED_KMH` op die helling (`wattsForSpeed` in
  `ride-estimate.ts`), hooguit `NEUTRAL_MAX_CP_FRACTION`×CP. Dat geldt ook voor
  een plan zonder neutraal stuk. De zone kost dus geen W′; de kJ tellen mee voor
  duurvermogen.
- `imposeNeutralPieces` knipt de zones als vaste stukken (`kind: "neutral"`) in
  elk plan: basisvoorstel, AI-voorstel (`adopt.ts`), herberekening en een
  overgenomen clubplan. Clamp en rebalance slaan die stukken over, en
  `savePacingPlan` negeert een doel erop.
- `routeSnapshot` bewaart de zones. `planLayoutMatchesRoute` maakt een plan
  verouderd als de zones veranderen. Een plan van vóór vandaag wordt dat alleen
  op een route die nu zones heeft; dat is bedoeld, want zijn tijd klopte niet.
- De editor toont een neutraal stuk zonder schuif ("Geneutraliseerd · ca.
  30 km/u") en kleurt de zone cyaan in het profiel. De AI krijgt `neutralZones`
  mee, plus een promptregel om daar niets op te leggen.
- Nieuwe `/hulp#pacing` (er stond nog niets over pacing in de hulp) plus
  zoekentry.

**Bewust niet gebouwd.** Geen snelheid per zone door de beheerder: dat vraagt een
migratie op `event_zones` en de eigenaar koos één vaste waarde. De rit-weerweergave
op de eventpagina (`RouteWeather`) kent de zones niet; die toont een schatting met
het vlakke equivalent als w/kg. Afdalingen en eigen knippen volgen in de volgende
rondes.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, `npm run build`
geslaagd, Vitest volledig groen (974 geslaagd). Nieuw `pacing-neutral.test.ts`:
`wattsForSpeed`, zones normaliseren, tijd ≈ 5 km / 30 km/u, geen W′-verbruik,
begrenzing op een helling, knippen en snippers, geen mutatie, basisvoorstel en
AI-voorstel, en verouderd door zones. *Niet geverifieerd:* geen ingelogde
pacingpagina in de browser; geen echte event-zones uit productie doorgerekend.

### Opgeleverd — krachtreeksen in het core-spoor (wens 19)

**2026-09-14, commit `5843017` (hernummerd in `df27e28`) op `main`, gepusht 2026-09-15.** Migraties `0159` (checks verruimen) en `0160` (conceptinhoud).
Eerst gebouwd als `0157`/`0158`, maar die nummers zijn bezet door de Omnium-ronde
(`0157_omnium_entrants_results`, `0158_omnium_award_kit`, 14 september nog alleen
in de working tree op `codex/omnium-editie-1`). Hernummerd vóór iets gedraaid was.

**Waarom.** Jeroen vroeg of er naast core ook krachttraining kan komen die
helpt voor specifieke doelen. De eigenaar koos om die in het bestaande
core- en mobiliteitsspoor te zetten, los van het fietsschema en zonder
belastingberekening, om dezelfde redenen als in `0109`.

**Wat er is gekomen.**
- `0159` verruimt de checks: categorie `kracht`, regio `been`, doel `kracht`.
- `0160` (idempotent) zet zeven oefeningen met eigen gewicht of een traptrede
  (squat, split squat, step-up, eenbenig bruggetje, kuitheffen, eenbenige
  deadlift, muurzit) in drie series van 20-30 minuten: *Kracht: basis*,
  *Kracht voor klimmen* en *Kracht: eenbenig*. Het haalt alleen de items van die
  drie series leeg, niet die uit `0110`.
- Figuren in `src/components/mobility/figures/kracht.ts`.
- `recommendStrength()` in `mobility.ts`: alleen op een dag zonder training of
  rit, minstens drie dagen na de vorige krachtsessie en hooguit twee per zeven
  dagen, anders de serie die het langst geleden is. `recommendSeries` neemt
  krachtseries niet meer mee in de rustdagrotatie. `CoreTodayCard` toont kracht
  als tweede regel ("Of kracht: …"); op `/zwbeter-worden/core` is die serie ook
  gemarkeerd. De bibliotheek kent de categorie Kracht en de seriebouwer het doel
  Kracht. Een krachtsessie telt mee in de weekteller van het spoor.
- `/hulp#kracht` plus zoekentry, met de expliciete zin dat hier geen extra watt
  van te verwachten is.

**Bewust niet gebouwd.** Krachttraining als sessie in het fietsschema of naar
intervals.icu (`WeightTraining`): dat raakt belasting, naleving en de AI-prompt,
en de eigenaar koos het niet. Geen zwaar krachtwerk met halters: dat vraagt
begeleiding, en daar zou een app-schema ten onrechte een belofte over doen. De
promptregel die off-bike werk uit het fietsschema houdt, blijft staan.

**Uitrol.** `0159` en `0160` zijn op 2026-09-15 door de eigenaar in productie gedraaid (inhoud daarmee goedgekeurd); de verificatiequery is hier niet gezien. De code werkt zonder de migraties: zonder `0160` bestaan er gewoon
geen krachtseries. **`0159` mag altijd; `0160` pas nadat de eigenaar de
oefeningen, doseringen en teksten heeft goedgekeurd** (conceptinhoud, niet door
een fysiotherapeut of trainer nagekeken). Let op: `0110` opnieuw draaien haalt
ook de krachtitems weg; draai daarna `0160` opnieuw.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, `npm run build`
geslaagd, Vitest volledig groen (963 geslaagd). Nieuw: `recommendStrength` en de
rotatie in `mobility.ts`-tests, figuurdekking voor `0160`, en
`mobility-strength-migration.test.ts` die `0109`, `0110`, `0159` en `0160` in
PGlite draait (aantallen, idempotent, checks). *Niet geverifieerd:* de migraties
tegen de productie-Supabase; de figuren en de kaart niet in de browser bekeken
(geen ingelogde sessie).

### Opgeleverd — schakelaar Watt / W/kg in de trainingsruimte (wens 13)

**2026-09-14, commit `e9b57d5` op `main`, gepusht 2026-09-15.** Geen migratie.

**Waarom.** Jeroen vroeg om W/kg. De eigenaar koos een schakelaar tussen Watt en
W/kg die overal in ZWBeter Worden geldt: FTP-kaarten en testuitslagen,
workoutdoelen en gereden trainingen.

**Wat er is gekomen.**
- `src/lib/training/power-unit.ts` (puur): `formatPower` ("265 W" / "3,19 W/kg")
  en `convertPowerText`, dat alleen wattages in een doeltekst omrekent
  ("225-240w" → "2,8-3,0 W/kg"). Percentages van FTP blijven percentages: dat is
  geen wattage. Zonder bruikbaar gewicht blijft het watt.
- `src/components/power-unit.tsx`: `PowerUnitProvider` in de layout van
  ZWBeter Worden leest de cookie `zwb-power-unit` (per apparaat, geen migratie) en
  het eigen gewicht; `PowerUnitToggle` staat naast de hulplink en schrijft de
  cookie, zonder herladen. `<Power>` en `<PowerText>` tonen de waarde.
  `<PowerWeight>` zet op de trainerpagina's (overzicht, schema, beoordelen per
  item) het gewicht van het lid, want W/kg hoort bij de renner en niet bij de
  kijker.
- Toegepast op: eFTP op de cockpit en in het traineroverzicht; FTP, 5 min, 20 min
  en CP op `vermogen` (met het gewicht van die pagina, dat uit intervals.icu kan
  komen); `ftp-test-card`, `ftp-test-history`, `ftp-test-planner`; blokchips in
  `workout-blocks` en `block-editor`; de doelregel, gemiddeld vermogen en NP in
  `workout-metrics-panel`, bij een losse rit in `member-calendar` en NP in
  `activity-load-panel`. De powercurve volgt dezelfde keuze.
- `WorkoutMetricsSnapshot.weightKg`: een momentopname legt vanaf nu het gewicht
  van die dag vast (ook bij het verhangen van een rit, waar het oude gewicht
  voorgaat).
- `/hulp#watt-wkg` plus zoekentry; privacyverklaring: de keuzecookie en het
  bewaarde gewicht bij een afgeronde training.

**Bewust niet gebouwd.** Geen profielinstelling (zou een migratie vragen en is
per apparaat goed genoeg). Oudere momentopnames en testuitslagen krijgen geen
achteraf-gewicht: ze rekenen met het huidige gewicht, en `/hulp` zegt dat.
Invoervelden (testuitslag, blokdoelen in de editor) blijven in watt. Het
dashboard buiten ZWBeter Worden blijft watt. **Geen nieuwe privacyversie:** de
trainer zag het gewicht al (W/kg-powercurve op het trainerscherm); het bewaarde
gewicht bij een training is hetzelfde gegeven voor dezelfde ontvanger. De eigenaar
heeft dat op 2026-09-15 bevestigd.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, `npm run build`
geslaagd, Vitest volledig groen (953 geslaagd); nieuw `power-unit.test.ts` en het
gewicht in `training-completion.test.ts`. *Niet geverifieerd:* de schakelaar niet
ingelogd in de browser gebruikt (geen testaccount); de cookie is dus niet
end-to-end getest.

### Opgeleverd — zonekleuren zoals in Zwift (wens 12)

**2026-09-14, commit `6cb47f3` op `main`, gepusht 2026-09-15.** Geen migratie.

**Waarom.** Jeroen vroeg om de zonekleuren van Zwift. `INTENSITY_COLORS` had een
eigen palet dat ongeveer een zone naast Zwift lag (duur groen, drempel oranje,
anaeroob paars), terwijl de meeste leden hun workouts in Zwift rijden.

**Wat er is gekomen.**
- `ZWIFT_ZONES` en `zwiftZoneForPct()` in `workouts.ts`: zone 1 grijs < 60%,
  2 blauw < 76%, 3 groen < 90%, 4 geel < 105%, 5 oranje < 119%, 6 rood.
- `INTENSITY_COLORS` volgt die zones (herstel 1, duur 2, tempo 3, drempel 4,
  VO2max 5, anaeroob 6). Race krijgt zone 5; rust wordt lichtgrijs `#cbd5e1`, zodat
  het niet op zone 1 lijkt. Daarmee volgen de kalenderblokjes, de "Gereden in"-stip
  en het dashboard vanzelf.
- `blockColor()`: een blok in de balk en de blokeditor kleurt op het midden van
  zijn vermogensdoel, niet op zijn label. De grenzen van `intensityFromPct`
  (55/76/91/106/121) zijn bewust niet aangepast: de AI en de intervals-classificatie
  hangen eraan. Een blok op 90% heet dus "Tempo" maar kleurt geel; `/hulp#zonekleuren`
  zegt dat.
- Een rit zonder vermogensmeter in de maandkalender was grijs en is nu een
  gestippeld blokje zonder vulling.
- Dode `_components/workout-list.tsx` verwijderd (werd nergens geïmporteerd).

**Bewust niet gebouwd.** De nalevingspillen (te licht oranje, te zwaar rood) zijn
niet omgekleurd: ze hebben een tekstlabel. Geen Z-nummers of legenda in de
schermen zelf; de uitleg staat in `/hulp`.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, Vitest volledig
groen (947 geslaagd), nieuw in `workouts-intensity.test.ts`: zonegrenzen, kleur
per intensiteit, blokkleur op doel. *Niet geverifieerd:* de kleuren niet in de
app bekeken (geen ingelogde sessie; ook de losse kleurproef kon hier niet als
screenshot). De hexwaarden zijn de gangbare Zwift-kleuren en niet tegen Zwift zelf
vergeleken; de leesbaarheid van geel in licht thema is nog door de eigenaar te
beoordelen.

### Opgeleverd — voorbije trainingen tonen hun geplande opbouw (wens 16, deel 1)

**2026-09-14, commit `3ef9a33` op `main`, gepusht 2026-09-15.** Geen migratie.

**Waarom.** Jeroen wilde bij trainingen uit het verleden net als bij komende
trainingen de zones zien, samen met RPE en gevoel. De blokken werden al voor elke
training geladen (`schema/page.tsx`), maar `WorkoutDetail` in
`member-calendar.tsx` tekende ze alleen zolang de training nog gepland was. Bij
een geweest of gemist exemplaar moest je raden welke opbouw er stond.

**Wat er is gekomen.** De blokkenbalk staat nu ook bij voorbije trainingen, boven
de cijfers en het rapportageformulier. Hetzelfde bij de trainer: in "Afgewerkt en
gemist" (`completed-workouts.tsx`, `CompletedWorkoutItem.blocks`) en in de
beoordelingsstapel (`review-queue.tsx`; `beoordelen/page.tsx` haalt daarvoor
`structure_json`, `intensity` en de FTP van het lid op). `/hulp` noemt het bij
"Feedback na een training".

**Nog niet gebouwd (volgt).** De gemeten tijd per zone uit intervals.icu is deel 2
van deze wens; die ronde begint met een controle van de intervals-velden in
productie.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, `npm run build`
geslaagd, Vitest volledig groen; nieuw in `completed-workouts.test.ts`: de
geplande opbouw van een gemiste training. *Niet geverifieerd:* geen ingelogde
schermen in de browser (geen testaccount).

### Opgeleverd — jaarplan: event en mikpunt als één regel (wens 9)

**2026-09-14, commit `3c5a955` op `main`, gepusht 2026-09-15.** Geen migratie.

**Waarom.** Jeroen zag de Marmotte twee keer in de lijst onder de jaarplanbalk:
als mikpunt én als clubevent waarvoor hij zich had aangemeld. `SeasonList` zette
mikpunten en events los in één gesorteerde lijst; precies de events waar een lid
naartoe werkt, stonden dus dubbel.

**Wat er is gekomen.** Pure `seasonListRows()` in `src/lib/training/season.ts`
bouwt de regels. Een mikpunt op een event dat in de lijst staat, gaat op in de
eventregel: eventlink, type, "je doet mee"/"misschien", en de prioriteitkeuze,
notitie en prullenbak van het mikpunt. De prullenbak haalt alleen het mikpunt
weg. Koppelen gaat op event-id, niet op datum (eventdatum is een UTC-dag,
`target_date` een Amsterdamse); de regel staat op de mikpuntdatum. Een mikpunt
zonder zichtbaar event (verwijderd, afgemeld, buiten het venster) blijft een los
mikpunt. De trainerweergave toont de prioriteit als tekst. `/hulp#jaarplan` en
de zoekindex bijgewerkt.

**Bewust niet gebouwd.** De balk erboven (`season-band.tsx`) houdt zijn aparte
banen voor mikpunten en events: daar is het overzicht per soort juist de
bedoeling, en Jeroens melding ging over de lijst.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint schoon, Vitest volledig
groen (943 geslaagd), nieuw in `season.test.ts`: samenvoegen, datumverschil rond
middernacht, losse mikpunten, sortering. *Niet geverifieerd:* de lijst niet
ingelogd in de browser bekeken (geen testaccount).

### Opgeleverd — onterechte waarschuwing "FTP-test op zijn plaats" (wens 11/18)

**2026-09-14, commit `9c26a6b` op `main`, gepusht 2026-09-15.** Geen migratie. Eerste ronde uit de wensen van Jeroen
(plannenboek 6, 7, 9, 11/18, 12, 13, 16, 19); de volgorde en keuzes van de
eigenaar staan per ronde hieronder.

**Waarom.** Jeroen kreeg de melding dat hij geen FTP-test had, ook toen die er
wel was. `ftpTestedOn` werd alleen gevuld in `buildTrainingInput` (nieuw schema
en schema bijwerken). De input van "Pas vandaag aan" en die van de dagelijkse
herziening (`/api/training/adaptations/daily`) bouwden het profielblok zelf en
lieten het veld weg. De promptregel in `adaptiveDailyPrompt` ("geen test of
ouder dan acht weken → benoem in cautions") zette daardoor bij elke dag- en
dagelijkse aanpassing een "Let op"-regel in het schema.

**Wat er is gekomen.** `profileForAi()` in `ftp-test.ts` bouwt het profielblok
voor alle drie de flows, met de laatste test via `loadFtpTests(…, 1)`.
`TrainingAiInput.profile.ftpTestedOn` is niet meer optioneel en de input van de
dagelijkse route is getypeerd, zodat een vierde flow het veld niet meer kan
vergeten.

**Bewust niet gebouwd.** De eigenaar koos om bij deze wens alleen de valse
melding op te lossen: een lid plant nog steeds zelf geen test (dat blijft de
trainer, zie de FTP-testronde van 2026-08-20). Geen filter dat de waarschuwing
achteraf uit AI-uitvoer haalt: dat zou op tekst matchen. Een lid dat nooit een
test deed (FTP uit intervals.icu of het profiel) krijgt de waarschuwing terecht.
*Opgemerkt, niet opgelost:* `canCoach` geeft `true` als trainer en lid dezelfde
persoon zijn (`zwbeter-worden/_actions.ts`), dus `planFtpTest` is voor jezelf
aanroepbaar; alleen de UI houdt dat tegen.

**Verificatie.** `tsc --noEmit` zonder fouten, eslint op de gewijzigde bestanden
schoon, Vitest volledig groen (939 geslaagd), nieuw: `profileForAi` in
`ftp-test.test.ts`. *Niet geverifieerd:* geen echte generatie. Schema's die al
een onterechte "Let op"-regel hebben, houden die tot de volgende aanpassing of
herziening; of die daarna echt wegblijft, is pas in productie te zien.

### Opgeleverd — oude readiness stuurt niet meer, en geen tweede training op een gereden dag

**2026-09-14, commit `efb0e62` op `codex/zwb-segments-map`, lokaal, niet
gepusht.** Geen migratie.

**Aanleiding (melding Bart, 13 september).** "Na het syncen van mijn slaapscore
kwam er wel een lange training, maar de oude werd niet vervangen: die staat op
1200 %, de nieuwe op niet gereden." Productiedata (alleen gelezen), za 12
september, Nederlandse tijd:

- 11:04 — "pas vandaag aan" met 180 min en gevoel fris. De AI kreeg readiness
  **30, "Readiness laag"**, status `fatigued` mee en gaf een herstelrit van 30
  min. Die 30 was de Polar-score van **11 september** (2 = poor); die van de 12e
  (6 = very good) was nog niet binnen. `summarizeWellness` nam de nieuwste
  readiness van hoogstens 7 dagen oud als actueel, en de wellnesskopie wordt pas
  na 6 uur ververst.
- 11:12–14:00 — Bart reed 167 min. De rit werd om 14:10 gekoppeld aan de
  herstelrit van 30 min: 1200 %.
- 22:10 — dezelfde aanvraag, nu met readiness 90. De AI zag geen training meer
  op de 12e (de gereden stond niet in `currentPlan`, en ritten van vandaag gingen
  niet mee) en zette er een VO2max-sessie van 180 min op.
- `retireSupersededWorkouts` liet de gereden training terecht staan (gereden is
  geschiedenis), dus kwam de nieuwe ernaast.

**1 — readiness van een eerdere dag.** `WellnessSummary` heeft
`readinessDate` en `readinessCurrent`. Een meting van het apparaat telt alleen
op de dag zelf. Een oudere meting blijft zichtbaar ("Readiness van vandaag nog
niet binnen; laatste meting …"), maar zet `state` niet meer en weegt niet mee in
`summarizeTrainingReadiness`. Een afgeleide readiness (Garmin e.d.) is een
weektrend en blijft tellen zolang hij binnen `READINESS_MAX_AGE_DAYS` valt. De
referentiedag van `summarizeWellness` is nu een Amsterdamse dag in plaats van
UTC. De AI krijgt beide velden mee via het gedeelde `wellnessInputForAi`, en de
basisprompt zegt niet voorzichtiger te plannen op een readiness met
`readinessCurrent: false`. Dit geldt dus ook voor de herstelkaart en het
ZWBeterWorden-niveau: 's ochtends vóór de sync bepaalt de readiness van gisteren
het advies niet meer. De eerdere zin in de bugronde hieronder (melding 20,
"oude readiness vervalt na `READINESS_MAX_AGE_DAYS`") klopt nog voor de
weergave, niet meer voor het advies.

**2 — verse hersteldata bij "pas vandaag aan".** `wellnessForAi(…, { fresh:
true })` haalt altijd bij intervals.icu op (`refreshWellnessIfStale` met
`force`). Alleen in die flow: één call per aanvraag van het lid. De cron en de
schemagenerator houden de grens van 6 uur.

**3 — ritten van vandaag.** `buildTodayRides` (adapt-context) geeft de
Strava-ritten van de Amsterdamse dag met duur en TSS, als `todayRides` in de
invoer van zowel "pas vandaag aan" als het dagvoorstel van de cron. De dagprompt
zegt dan niets meer voor vandaag te plannen. Als harde grens blokkeert
`insertPlanWorkouts` nu ook dagen met een training op `completed`, naast
testdagen en overgeslagen dagen. Dat geldt voor elke generatie: ook een
herziening zet geen training meer naast een gereden training.

**Bewust niet gebouwd.** De rit achteraf aan de nieuwe training koppelen en de
gereden training laten vervangen: de 1200 % klopt, want er stond 30 min gepland
toen hij reed. Een dag met twee geplande sessies waarvan er één gereden is,
krijgt bij een herziening ook geen tweede meer; dat komt in de schema's nu niet
voor. Een aanvraag na een rit vandaag kan een schema zonder workouts opleveren;
daar komt geen aparte melding voor.

**Opruimen bij Bart: gedaan** (Bart zelf, bevestigd 2026-09-21). De ZRL-prikkel van 12 september
(`5be7b204…`, origin `member`, gepubliceerd als intervals-event `135690915`)
staat nog als gepland. Het opruimscript op productie is niet gedraaid
(geweigerd door de permissiecontrole). Besluit eigenaar: Bart verwijdert hem zelf
in de app. Omdat hij origin `member` draagt, wist `removePlannedWorkout` hem
helemaal en vraagt het een herziening aan.

**Verificatie.** Vitest volledig groen (1019 geslaagd, 6 overgeslagen), nieuw:
`wellness` (Polar-score van gisteren stuurt niet, die van vandaag wel,
`force`), `today-rides` (Amsterdamse dag rond middernacht), `training-prompts`.
`tsc --noEmit` en eslint schoon. *Niet geverifieerd:* geen echte AI-generatie
met de nieuwe invoer, geen ingelogde dagpagina, en de blokkade op gereden dagen
alleen via typecheck (de query zelf draait niet lokaal).

### Opgeleverd — pacingplan: hellingen, indeling en doorrekenen na klimwijziging

**2026-09-13, commit `f98c994` op `main`, gepusht.** Geen migratie.

**Aanleiding.** Stijn vond de indeling vreemd, en Jeroen had op dezelfde
Marmotte 2027 een heel ander plan. Productiedata (alleen gelezen): Stijns plan is
het basisvoorstel (25 stukken, Glandon in 7 delen van 3,6 km met 7 keer 1,85
w/kg, daarna 42 en 48 km vlak op één regelaar). Jeroens plan is een AI-voorstel
(13 stukken). Ook de renner verschilt: CP 302 W op 94 kg tegen 248 W op 83 kg.
Jeroens melding "klimmen aangepast, indeling blijft" was melding 5 uit de
bugronde hieronder: hij voegde de klimmen op 1 september samen, na zijn eerste
AI-plan. Na die deploy liet hij een nieuw voorstel maken, en dat staat op de
4 cols.

**1 — hellingen van GPX-klimmen 100× te hoog.** `gpx-climbs` geeft
`avgGradient` in procenten, `PacingAccent` verwacht rise/run.
`pacingRouteFromGpx` nam het getal ongewijzigd over. Gevolgen: de AI kreeg
`avgGradientPct: 478.9` voor de Glandon mee (2016,8 in de eerste generatie), het
basisvoorstel zag elke GPX-klim als steiler dan 8 % en gaf er altijd 20 % extra
opslag op, en de uitleg luidde "à 478,9%". Nu gedeeld door 100. De
tempoberekening zelf rekende al goed: die gebruikt de gradiënten van de
100-meterstukken. Zwift-routes hadden de fout niet. De testfixture gebruikte de
foute eenheid en is rechtgezet.

**2 — indeling van het basisvoorstel.** Een klim wordt niet meer in stukken van
hoogstens 4 km geknipt, maar in hoogstens drie delen van ongeveer 5 km. Elk deel
heeft een rol en een eigen doel: begin ×0,96, midden ×1, slot ×1,04 op het
klimdoel. Labels zijn "Col du Glandon (begin/midden/slot)" in plaats van
"(1/7)". Bij meer dan 24 stukken wordt steeds het kórtste buurpaar samengevoegd:
eerst vlakke stukken, daarna delen van dezelfde klim. Het oude uitdunnen nam het
eerste vlakke paar en smeedde zo hele vlakke stukken aaneen. Op de echte
Marmotte-GPX nagerekend: 24 stukken, elke col in 3 delen, langste vlakke stuk
14 km.

**3 — "Opnieuw doorrekenen" na een klimwijziging.** De indeling komt dan uit het
basisvoorstel. De strategie en risico's van een AI-plan bleven er toch boven
staan, en de bron bleef "ai". Nu (`recomputedOrigin`): bij een nieuwe indeling
vallen strategie, risico's en generatie-id weg, en een AI-plan heet
basisvoorstel. Een handmatig plan blijft handmatig. De notitie zegt dat het
AI-voorstel bij de oude klimmen hoorde.

**Bewust niet gebouwd.** Bestaande plannen worden niet automatisch
herberekend: geen plan verandert onder een lid vandaan (zie "Verversen"). Plannen
en AI-voorstellen die met de foute hellingen zijn gemaakt, blijven staan tot het
lid zelf doorrekent of een nieuw voorstel vraagt. De hellingfix maakt ze niet
"verouderd", want de indeling en de aannames zijn niet veranderd. Doelen van een
AI-plan meenemen naar de nieuwe indeling op basis van overlap is ook niet
gebouwd; alleen stukken die exact gelijk bleven houden hun doel.

**Verificatie.** Vitest volledig groen (1011 geslaagd, 6 overgeslagen), nieuw of
aangepast: `pacing-route-profile` (eenheid), `pacing-plan` (rollen, klim van
25 km, gespreid uitdunnen op een Marmotte-achtig profiel), `pacing-layout`
(`recomputedOrigin`). `tsc --noEmit` schoon op de pacingbestanden, eslint schoon.
Het basisvoorstel is lokaal doorgerekend op de productie-GPX van de Marmotte
(alleen gelezen). *Niet geverifieerd:* geen ingelogde pacingpagina in de
browser, geen echte AI-generatie met de gecorrigeerde hellingen.

### Opgeleverd — bugronde plannenboek (meldingen Jeroen, 4–13 september)

**2026-09-13, commit `d69eb63` op `main`, gepusht (t/m `31c4299`).** Migratie
`0153`, dezelfde dag door de eigenaar in productie gedraaid (niet lokaal getest). Opdracht: [docs/bugfix-agent-prompt-2026-09-13.md](docs/bugfix-agent-prompt-2026-09-13.md);
nummers hieronder zijn die uit het Drive-plannenboek. Eerst bugs, wensen apart.

**1 — RPE-vraag leek willekeurig.** `loadPendingReview` koos de onbevestigde
rapportage met de nieuwste `updated_at`. Die volgorde verschoof bij elke
herberekende momentopname en elke opgeslagen opmerking; stond er een rapportage
zónder momentopname bovenaan, dan viel het scherm helemaal weg. "Later" sloot
alleen de dialoog, dus bij elke navigatie of verversing kwam hij terug. Nu kiest
`pickPendingReview` (completion.ts) de nieuwste nog niet bevestigde, gekoppelde en
niet vervangen training uit de afgelopen week. "Later" geldt per training voor de
rest van de sessie (`sessionStorage`); de link uit de pushmelding opent altijd.
*Open vraag aan eigenaar:* wanneer mag een uitgestelde vraag terugkomen? Een
herinnertijd is productbeleid en is dus niet verzonnen.

**14 en 17 — verschoven training, verkeerde vergelijking, "extra sweet spot".**
Drie breuken in dezelfde keten:
- `complianceForWorkouts` negeerde `paired_activity_id` en koppelde puur op
  kalenderdag. Hij gebruikt nu `pairWorkoutsWithRides` (verhuisd naar
  compliance.ts), inclusief koppelingen van workouts buiten het venster
  (`loadRidePairings`). Een rit telt precies één keer; dezelfde rit twee keer in de
  invoer ook. `WorkoutCompliance` kreeg `actualDate`/`actualName`.
- `buildYesterdayContext` nam de langste rit van gisteren en vergeleek die met de
  training van gisteren, gefilterd op het basisplan-id (dagaanpassingen wonen in
  afgeleide plannen). Nu: profiel en datum, een vastgelegde koppeling gaat voor,
  `actualCountsFor` zegt voor welke training van een andere dag de rit telde, en
  `recentlyMissed` geeft de net gemiste trainingen mee. De dag- en
  bijwerkprompt zeggen dat een verschoven training geen extra training is en dat
  een gemiste training nooit belasting oplevert; herstel na werkelijke belasting
  mag wel.
- Het bevestigscherm toont nu de werkelijk gereden rit (naam, dag, duur, km) en
  laat het lid kiezen welke training het was: de gekoppelde of een nog open
  training uit de week tot en met de ritdag. `reassignRideToWorkout` (sinds
  2026-09-15 opgegaan in `relinkRide`, zie "het lid koppelt zelf een rit") verhuist rit,
  momentopname (opnieuw tegen de gekozen training gerekend; CTL/gereedscore van
  de ritdag blijven) en RPE/gevoel/opmerking; de oude training gaat terug naar
  gepland. Volgorde claim → schrijven → loslaten, met terugdraaien bij een
  schrijffout; trainerfeedback op de oude rij blijft staan.
- In de maandkalender staat een gemiste training gedimd: historie, niet
  achterstallig. Er is niets verwijderd.
*Bewust niet gebouwd (toen):* "dit was geen enkele geplande training". Dat vraagt
een blijvende markering, anders koppelt de detectie hem terug. **Op 2026-09-15 na
akkoord van de eigenaar alsnog gebouwd** (migratie `0163`, `relinkRide`). Ook geen
automatische conclusie "verschoven" zonder bevestiging: de AI krijgt de gemiste
training alleen als mogelijkheid.

**15 — veel automatische schema-updates.** De oorzaak (dagcheck die nooit iets
vond) was al opgelost in `1839204`. Wat openstond: twee overlappende runs komen
allebei door `handledToday` en zetten allebei een betaalde generatie uit.
Migratie `0153` legt een unieke index op `training_ai_generations
(parent_plan_id, adapt_from_date) where adaptation_kind = 'daily'` (vanaf
2026-09-14, want 11–13 sep bevat tientallen dubbelen). `startBackgroundAdaptation`
meldt een 23505 als `duplicate` vóór de OpenAI-call; de route telt dat als
`already_started`, niet als mislukt. De daggrens van dagcheck en noodrem is een
Amsterdamse dag, gelijk aan `adapt_from_date` (met UTC kon een run tussen 0 en 2
uur 's nachts een tweede voorstel voor dezelfde dag geven). `plan_update` valt
buiten de index. Afronden van generaties was al idempotent (unieke
`training_plans.ai_generation_id`), dus ook de pushmelding gaat één keer.

**22 — gevoel verdwijnt na opslaan.** Weergaveprobleem dat tot dataverlies
leidde. React zet een formulier na een `<form action>` terug, en een `<select>`
neemt een gewijzigde `defaultValue` bij een update niet over
(react-dom `updateOptions` alleen bij mount). Na opslaan stond "-" in beeld terwijl
de database "zwaar" had; een tweede keer opslaan (bijvoorbeeld na een opmerking)
schreef `null`. Gereproduceerd in een tijdelijk harnas met de dev-server
(Chromium), daarna verwijderd: oud patroon toont "-" en wist bij tweede opslag,
nieuw patroon houdt "zwaar", ook na verversen. Beide formulieren (rapportage en
bevestigscherm) versturen nu zelf in een transition, zodat ook bij een fout de
invoer blijft staan; de select krijgt een `key` op het opgeslagen gevoel. Een
onbekende gevoelwaarde is een fout. Een bevestiging die geen rij raakt is geen
succes meer.

**2 — gewijzigd doeltype.** Het doel wérd opgeslagen, maar: na een mislukte of
geblokkeerde generatie was `planUpdate.changed` bij de volgende poging leeg (het
doel stond al op de nieuwe waarde), het formulier toonde zonder verversen de oude
keuze en stuurde die bij een nieuwe poging mee, en de prompt noemde alleen uren,
dagen en datum als geldend terwijl `goal.title` en de oude samenvatting het oude
doel noemden. Nu: `changedSinceSchedule` vergelijkt met de invoer van de generatie
waar het lopende schema uit komt, het formulier ververst na elke respons, het
doeltype wordt gevalideerd, en de prompt wijst `goal.type` aan als enige bron en
zegt de opzet om te bouwen.

**3 — gewijzigde doeldatum.** Een leeg datumveld hield door `??` de oude datum
vast; nu wist het de datum. De prompt onderscheidt doeldatum en schema-einde:
piek/taper op de nieuwe doeldatum als die binnen de periode valt, daarna herstel
en onderhoud; ligt hij erna, geen taper. Een bijgewerkt schema eindigt nooit vóór
de gevraagde periode (`planUpdateEndDate`), zodat publiceren alle oude workouts
tot dat einde vervangt. Formulier: "Targetdatum" heet "Doeldatum" en de kop toont
tot wanneer het schema loopt. *Bewust niet gebouwd:* de schemahorizon automatisch
verlengen naar een latere doeldatum (AI-uitvoer is begrensd op 42 workouts, en
horizon ≠ doeldatum). Voorleggen aan de eigenaar.

**10 — annuleren doet raar.** Niet gereproduceerd; de melding is te vaag.
Annuleren vóór verzenden deed al geen request. Aangepast: na annuleren schuift de
ingeklapte kaart terug in beeld (op een telefoon stond je anders ineens verderop)
en verdwijnt een oude resultaatmelding. Tijdens een lopende generatie blijft
annuleren uit: een fetch afbreken stopt de servertaak niet. *Vraag:* wat gebeurde
er precies, en was er al een generatie gestart?

**4 — meerdere menu-opties actief.** `isActiveHref` matchte ook subroutes. Nieuw
`activeHrefIn`: per lijst (desktop, mobiel paneel inclusief profiel en beheer,
tabbalk) is alleen de meest specifieke link actief; een groep licht op als de
actieve link erin zit. Querystrings tellen niet (usePathname).

**5 — samengevoegde klimmen nog in oude indeling.** De routelader las
`event_climbs` al; het plan zelf bleef de oude stukken houden en een GPX-route
heeft geen routesync-tijd die dat verraadt. `route_snapshot` bewaart nu ook de
km-grenzen per klim; `planLayoutMatchesRoute` herkent samenvoegen (ook bij plannen
van vóór deze ronde, via het aantal klim-id's) en verleggen. Het plan heet dan
verouderd; "Opnieuw doorrekenen" deelt in op de huidige klimmen en houdt de eigen
doelen op stukken die gelijk bleven. Schuifregelaars opslaan maakt de oude
indeling niet stil "actueel" meer. *Beperking:* een event met zowel Zwift-route
als GPX gebruikt de Zwift-accenten; `event_climbs` telt daar niet.

**8 — Marmotte als C-doel, niet te wijzigen.** De signalering "zet als C-doel"
maakt een mikpunt op een event; opnieuw toevoegen gaf "gelukt" zonder iets te
doen, en er was geen bewerkmogelijkheid of eventkeuze. Nu: prioriteit per mikpunt
wijzigen in de lijst, en bij *Mikpunt toevoegen* een clubevent kiezen (titel en
datum van het event, gelezen met de sessie van het lid). Bestaat het mikpunt al,
dan wordt de prioriteit bijgewerkt en volgt een herziening. Alleen eigen rijen.
Niet gedaan: bug 9 (event en mikpunt als één regel) was hiervoor niet nodig.

**21 — Voor mij verbergt aanmeldingen.** `MemberFit` kende alleen afmeldingen. Nu
houden een RSVP "ja", "beschikbaar" voor een teamrit en een plek in de opstelling
(`team_event_lineups`) een event onder Voor mij, ook buiten interesse, team of
grenzen. Een "nee" wint. "Misschien" telt niet als aanmelding (ongewijzigd;
*vraag* aan eigenaar of dat zo moet). Toegang blijft RLS: het filter maakt niets
zichtbaar dat niet al in de lijst stond.

**20 — hersteldata.** Keten intervals → wellness → gereedscore → herstelkaart
nagelopen; geen aantoonbare fout gevonden (ontbrekend blijft `null`, oude
readiness vervalt na `READINESS_MAX_AGE_DAYS`; sinds 14 september telt een
readiness van een eerdere dag niet meer mee in het advies, zie hierboven). Niets gewijzigd. *Vraag:* welke
waarden ontbreken, van welk apparaat, op welk scherm, en staat de opt-in aan?
Verificatiestap: `intervals_connections.wellness_opt_in` en de laatste
wellness-dagen van dit lid in intervals.icu bekijken.

**Hulp.** `/hulp` (kalender: aanmeldingen onder Voor mij; jaarplan: event kiezen
en prioriteit wijzigen) en de zoekindex bijgewerkt.

**Verificatie.** Vitest volledig groen (993 geslaagd, 6 overgeslagen), nieuw:
`nav-active`, `shifted-workout`, `reassign-ride`, `daily-adaptation-concurrency`
(twee echt gelijktijdige runs tegen een stub met de index uit `0153`, gemockte
OpenAI), `plan-update-goal`, `season-target-event`, `pacing-layout`, uitgebreid
`event-fit`. `tsc --noEmit` schoon op eigen code, eslint op gewijzigde bestanden
schoon, `npm run build` geslaagd. Playwright-smoke: 16 geslaagd, 1 faalt al
(`/verhaal` zoekt een kop die niet meer in de code staat). *Niet geverifieerd:*
geen iPhone/PWA, geen WebKit (niet geïnstalleerd), geen ingelogde schermen in de
browser (geen testaccount), geen productiedata, geen echte generatie. Migratie
`0153` is door de eigenaar gedraaid; of de verificatiequery's onderaan de
migratie zijn gecontroleerd, is hier niet vastgesteld.

**Deploy-volgorde.** Code en `0153` zijn onafhankelijk: zonder index werkt de
code, zonder de databasegrendel.

### Opgeleverd — de adaptatie-cron zette elk kwartier een nieuw voorstel uit

**2026-09-13, commit `1839204` op `main`, gepusht.** Geen migratie.

**Waarom.** Het OpenAI-verbruik schoot vanaf 11 september omhoog. Productiedata
(alleen gelezen): `training_ai_generations` met `adaptation_kind = 'daily'` ging
van 1 per dag naar 53 (11 sep), 45 (12 sep) en 47 (13 sep), bijna allemaal voor
drie leden, allemaal `gpt-5.5` met ~8k tekens invoer. Elke kwartierrun van
`/api/training/adaptations/daily` startte opnieuw een voorstel voor hetzelfde
schema; elk werd een gepubliceerd plan (145 in drie dagen) dat het vorige
verving, met een pushmelding erbij. Dat verklaart ook Barts zestien versies per
dag. Herzieningen (`plan_update`, 1-5 per dag) en pacing (1 generatie) waren
niet veranderd.

**Oorzaak.** De dagcheck keek in `training_adaptation_runs`, en commit `201d816`
liet de route bij het uitzetten een rij met `status = 'queued'` schrijven om die
check te bezetten. De CHECK-constraint uit migratie `0051` staat alleen
`completed`, `skipped` en `failed` toe; de insert werd geweigerd en de fout niet
gelezen. Het viel pas op na `2bf527d` (11 sep): daarvóór at het ophalen het hele
runbudget op en werd er zelden iets gestart, en de cron ging toen van elk uur
naar elk kwartier.

**Wat er veranderde.**
- De dagcheck (`handledToday`) kijkt nu ook naar `training_ai_generations`: een
  `daily`- of `plan_update`-generatie met dit schema als `parent_plan_id` sinds
  middernacht (sinds de bugronde plannenboek: Amsterdamse middernacht, eerst
  UTC). Die rij wordt vóór de OpenAI-call geschreven en bestaat dus
  altijd. `.maybeSingle()` is `.limit(1)` geworden; dat brak bij twee rijen.
- De `queued`-inserts in `training_adaptation_runs` zijn weg, want ze zijn nooit
  gelukt. Het spoor van een uitgezette generatie is de generatierij zelf.
- Noodrem: hoogstens `TRAINING_ADAPTATION_MAX_PER_DAY` (standaard 25)
  dagvoorstellen per dag (inmiddels een Amsterdamse dag) over alle leden samen. Is die op, dan meldt de
  route `daily_cap_reached`. Herzieningen tellen niet mee.

**Bewust niet gedaan.**
- Geen migratie die `queued` toestaat: een check op de generatierij heeft geen
  schemawijziging nodig en werkt dus direct na deploy. Een migratie is hier
  bovendien niet lokaal te testen.
- Geen goedkoper model voor het dagvoorstel. `OPENAI_TRAINING_MODEL` geldt voor
  alle trainingsflows, en of een kleiner model goede voorstellen maakt is niet
  getoetst. Na deze fix gaat het om een paar calls per dag.
- De 145 overbodige plannen zijn niet opgeruimd. Hun workouts zijn op één na
  allemaal vervangen (`superseded_at`), dus het lid ziet ze niet meer.

**Niet lokaal geverifieerd.** Typecheck en lint zijn schoon. De cronroute zelf
draait tegen productie en is hier niet uitgevoerd. Controleer na deploy in
`training_ai_generations` dat er per schema hoogstens één `daily` per dag bijkomt.

**Cronfrequentie.** Stijn heeft de job op cron-job.org op 13 september van elk
kwartier eerst naar elke 12 uur gezet en daarna naar elk uur. Elke 12 uur had een
prijs: dezelfde run haalt ook de achtergrondgeneraties op, dus een
dagvoorstel staat er pas een run later, tot 12 uur na het starten. Per dag
zouden er hoogstens 6 gestart worden. Met de fix is elk uur veilig: de dagcheck
en de noodrem bepalen het aantal AI-calls, niet de frequentie.
Openen van de schemapagina maakt een eigen hangende generatie wel direct af.

Deze sectie is het actieve werkplan. De volgorde is gebaseerd op de huidige
staat van `PLAN.md`, de commit/deploy-geschiedenis t/m `e834bc1`, en de
operationele risico's die nu het meest waarschijnlijk bijten. De oudere
"roadmap forward" hieronder is vanaf nu vooral historisch naslagwerk.

### Opgeleverd — achievement_week hangt niet meer af van de klok van het proces

**2026-09-11, commit `86b8457` (niet gepusht).** Geen migratie, geen backfill.

**Waarom.** `tests/unit/strava-ingest.test.ts` ("zet achievement_week op de
maandag van die week", sinds `2c575b9`) faalde op een dev-machine in
Europe/Paris: de week kwam uit op zondag. De test had gelijk, de code niet.
`weekStartDate()` in `src/lib/strava/client.ts` zette de datum op lokale
middernacht (`setHours`/`getDay`/`setDate`), maar elke aanroeper maakt er met
`toISOString()` een UTC-datum van. In UTC+2 wordt maandag 00:00 lokaal dan
zondag 22:00 UTC, en dus de zondag. De fout zat er sinds de eerste commit
(`edd3cbd`). Hij viel niet op omdat productie en de cloud-testomgeving in UTC
draaien.

**Wat er is veranderd.** `weekStartDate()` rekent nu in UTC
(`setUTCHours`/`getUTCDay`/`setUTCDate`). Alles wat de week afleidt loopt
via deze ene functie, dus de fix geldt overal:
- schrijvers van `strava_activities.achievement_week`: het webhookpad
  (`activityRowFromDetail`), de reconcile (`client.ts`) en de CSV/GPX-import
  (`import.ts`, twee plekken);
- lezers via `currentAchievementWeek()`: de weekbadge-toekenning
  (`awardCompletedAchievementWeeks`, `.lt("achievement_week", …)`) en de
  "deze week"-cijfers op `/achievements` (`.eq("achievement_week", …)`).
In SQL wordt de week nergens afgeleid.

**Gevolg voor bestaande data: geen.** Omdat productie in UTC draait, deed de
oude code daar precies hetzelfde als de nieuwe. Alleen een lokale `next dev`
buiten UTC schreef zondagen weg en vond geen ritten van de lopende week, en
alleen dáár verandert iets.

**Bewust niet gebouwd.** De week van het lid (`start_date_local`) in plaats van
UTC. Voor een Nederlandse rit tussen maandag 00:00 en 02:00 lokaal kiest UTC nog
de week ervoor. Overstappen zou bestaande weken verschuiven en een backfill van
`strava_activities` plus een herberekening van `achievement_awards` vragen, voor
een grensgeval van twee uur per week. Dat is een productkeuze, geen bugfix.

**Tests.** Nieuw: `weekStartDate` onder `process.env.TZ` Europe/Amsterdam en
America/Los_Angeles, op de weekgrens (zondag 23:59:59Z, maandag 00:00Z en
03:00Z). Tegen de oude code falen die ook in een UTC-proces, terwijl de
bestaande test daar slaagde; dit is dus de vangrail die ontbrak.

**Verificatie.** De volledige Vitest-run (72 bestanden, 848 geslaagd),
`npx tsc --noEmit` en eslint op de gewijzigde bestanden zijn groen, lokaal in
Europe/Paris.

### Opgeleverd — feedbackronde 11 september 2026 (overzicht)

Stijn leverde vijf punten aan. Na diagnose is de volgorde afgesproken en zijn
alle vijf opgeleverd, elk als eigen ronde hieronder: **5** FTP-test, **3**
badges door het bestuur, **4** een geplande test verdringt de training van die
dag, **2** geplande trainingen handmatig verwijderen, **1** beschikbaarheid die
het schema echt bijwerkt. Weekbadges handmatig toekennen hoort er uitdrukkelijk
*niet* bij. Niets is gepusht.

De diagnose die de rondes stuurde (productiedata, alleen gelezen):

- **Badges (3).** Het bestuur heeft `achievements.finalize` al. De beheerpagina
  toont alleen milestonebadges die `auto` zijn of met `custom_` beginnen; de 216
  handmatige milestonebadges uit de catalogus staan niet in de keuzelijst.
- **Test verdringt training (4).** `planFtpTest` zet de test erbij en laat het
  opruimen van de training van die dag over aan een AI-herziening. Die kan
  worden overgeslagen (cooldown, genegeerd schema) of blijft hangen. Bij Bart
  stond de test op 10 september bovendien dubbel: een tweede kopie kwam via de
  workout-bibliotheek, die `test_type` van het sjabloon overneemt.
- **Beschikbaarheid (1).** Drie oorzaken. Een ingevulde week gaat voor de
  standaardweek zonder dat het formulier dat laat zien (Stijn zette zijn
  standaardvrijdag op 0, maar de week van 7 september had een eigen rij met
  vrijdag 195 min). Een achtergrondgeneratie wordt pas verwerkt als de browser
  van het lid pollt; Stijns herziening van 11 september 09:35 bleef op
  `in_progress`. En beschikbaarheid is een plafond, geen doel (zie de
  promptregel in `workouts.ts`), dus een dag op 120 min maakt een training van
  90 min niet langer. Voorstel: dagen op 0 en te lange trainingen direct en
  deterministisch bijsnijden, de herziening server-side afmaken, eigen
  weekinvulling zichtbaar maken met "terug naar standaard", en een lid de duur
  van een geplande training zelf laten aanpassen.
- **Terzijde.** Bart heeft per dag tot zestien vervangen versies van dezelfde
  training: er draaien veel meer generaties dan nodig. Onderzocht en verholpen op
  13 september, zie "de adaptatie-cron zette elk kwartier een nieuw voorstel uit".

### Opgeleverd — beschikbaarheid werkt het schema echt bij, en de duur zelf aanpassen

**2026-09-11, commit `ffce4b8` op `main` (niet gepusht).** Geen migratie.

**Waarom.** Stijn kreeg zijn vrijdagen niet vrij en de trainingen van vandaag en
morgen niet op twee uur. Drie oorzaken (zie het overzicht hierboven): een eigen
weekrij ging onzichtbaar voor de standaard; een herziening werd alleen afgemaakt
als de browser openbleef, of 's nachts; en beschikbaarheid was voor de AI een
aanwijzing, geen grens.

**Wat er is gekomen.**
- `fitScheduleToAvailability()` (nieuw, `availability-fit.ts`) draait bij elk
  opslaan, ook als er niets veranderde: AI- en trainerworkouts op een dag met 0
  minuten vervallen meteen (`retireWorkoutRows()`, nu geëxporteerd, ook uit
  intervals.icu), en een te lange training wordt ingekort. Eigen ritten,
  clubevents en tests blijven staan. Horizon twaalf weken.
- `insertPlanWorkouts()` past dezelfde grens toe op elke AI-uitvoer
  (`minutesForDate()`), behalve bij een dag-aanpassing: daar geeft het lid zelf
  op hoeveel tijd het vandaag heeft.
- `resizeBlocks()` in `workouts.ts` zet een training op een andere duur zonder
  de kern te raken: inrijden, uitrijden en duurblokken (`recovery`/`endurance`)
  geven mee, en alleen als de kern niet past schaalt alles.
- `settleOwnReplans()` in `replan.ts`, aangeroepen bij het openen van
  `/zwbeter-worden/schema`: maakt een hangende generatie van het lid af, of start
  een blijven liggend verzoek (met dezelfde remmen als `requestReplan()`).
- Het formulier toont met een stip welke week een eigen invulling heeft, zegt bij
  een week of die de standaard volgt, en heeft **Terug naar standaard**
  (`resetWeekAvailability()`).
- **Duur aanpassen** bij elke geplande training (niet bij tests en clubevents),
  in de lijst en in het detailpaneel van de maandweergave
  (`setWorkoutDuration()`). De training krijgt daarna origin `member`, zodat een
  herziening hem niet terugzet; hij toont dan het label *Eigen rit*.
- `Verwijder` staat nu ook in het detailpaneel van de maandweergave, de
  standaardweergave van het schema.

**Bewust niet gebouwd.** Meer beschikbaarheid maakt een training niet vanzelf
langer: beschikbaarheid blijft een plafond (de promptregel in `workouts.ts`
blijft staan), en langer rijden is een keuze per training. Bij het opslaan van
de standaardweek worden eigen weekrijen niet overschreven; die zijn bewust
ingevuld. Geen herziening na *Duur aanpassen*: dat kost een generatie voor een
keuze die het lid al gemaakt heeft.

**Claims die niet meer kloppen.** De hulptekst beloofde al dat een training
"daarbinnen blijft"; dat was tot nu toe alleen een verzoek aan de AI. En "dan
gebeurt het de volgende ochtend alsnog" is nu "bij het openen van je schema, of
uiterlijk de volgende ochtend".

**Niet lokaal te verifiëren.** Het afmaken van een echte achtergrondgeneratie
en het inkorten van gepubliceerde workouts in intervals.icu zijn niet
doorlopen: dat vraagt een ingelogde sessie en schrijft naar productie. Het
schema van Stijn is dus nog niet bijgewerkt; dat gebeurt bij de eerste keer dat
hij na een deploy zijn beschikbaarheid opslaat of zijn schema opent.

**Verificatie.** `npx tsc --noEmit`, gerichte eslint en de volledige
Vitest-run (853 geslaagd, 6 overgeslagen; nieuw: `workout-resize.test.ts` en
`minutesForDate` met Stijns weken) zijn groen.

### Opgeleverd — geplande trainingen zelf verwijderen

**2026-09-11, commit `501a384` op `main` (niet gepusht).** Geen migratie.

**Waarom.** Een lid kon alleen een eigen rit verwijderen (`removeOwnRide`), en
voor vandaag een rustdag nemen. Een voorgestelde training op een andere dag
bleef staan, hoe graag het lid die dag ook vrij wilde.

**Wat er is gekomen.** `removePlannedWorkout()` vervangt `removeOwnRide()`. Een
eigen rit verdwijnt zoals voorheen helemaal, met een herziening eromheen. Een
voorgestelde training (AI, trainer, test) krijgt `status = 'skipped'`, net als
een rustdag, en gaat uit intervals.icu. De knop **Verwijder** (met bevestiging)
staat bij elke geplande training van vandaag of later, zowel onder *Mijn
trainingen* als in de schemalijst. Een dag met een geschrapte training blijft
vrij: `insertPlanWorkouts()` slaat die dag over (`dropWorkoutsOnBlockedDays()`,
de verbrede opvolger van `dropWorkoutsOnTestDays()`, nu in `availability.ts`).
Uitleg op `/hulp`.

**Bewust niet gebouwd.** Geen herziening na het schrappen van een voorgestelde
training: dat kost een generatie en zou de training alleen naar een andere dag
schuiven. Een clubevent gaat nog steeds via de events, zodat je antwoord en je
schema gelijk lopen. Er is geen knop om een geschrapte training terug te zetten.

**Bekende rand.** Een geschrapte dag blokkeert ook een dag-aanpassing
("Aanpassen") voor diezelfde dag: wie vandaag een rustdag neemt en later toch
wil rijden, krijgt van de AI niets meer voor vandaag.

**Verificatie.** `npx tsc --noEmit`, gerichte eslint en de volledige
Vitest-run (845 geslaagd, 6 overgeslagen) zijn groen. Niet in de browser
doorlopen (geen ingelogde sessie).

### Opgeleverd — een geplande test verdringt de training van die dag

**2026-09-11, commit `ba91bc6` op `main` (niet gepusht).** Geen migratie.

**Waarom.** Plande Stijn een FTP-test, dan bleef de training die al op die dag
stond staan. `planFtpTest` liet het opruimen over aan de AI-herziening erna, en
die wordt overgeslagen bij de cooldown of een stilliggend schema, of blijft op
`in_progress` hangen. Daarnaast zag de planner een test uit de
workout-bibliotheek niet als vast blok: die draagt origin `ai`, en
`loadFixedWorkouts()` keek alleen naar `member`/`event`.

**Wat er is gekomen.**
- `clearDayForTest()` in `publish.ts` verklaart de andere trainingen van die
  dag meteen vervallen en haalt ze uit intervals.icu. Dat gebeurt met dezelfde
  regels als een herziening (`supersedableWorkouts()`): een eigen rit,
  clubevent, andere test of gereden training blijft staan. De opruimlus uit
  `retireSupersededWorkouts()` is daarvoor apart gezet als `retireWorkoutRows()`.
  Aangeroepen door `planFtpTest`, en door `addWorkoutFromTemplate` en
  `replaceWorkoutFromTemplate` als het sjabloon een test is.
- `insertPlanWorkouts()` zet geen AI-training meer op een dag met een test
  (`dropWorkoutsOnTestDays()`), ook als de AI dat toch voorstelt. In
  `createPlanFromAiGeneration()` staat de gevraagde test daarom nu vóór de
  workouts van het plan.
- `loadFixedWorkouts()` neemt elke workout met een `test_type` mee als vast blok.

**Bewust niet gebouwd.** Een eigen rit of clubevent op de testdag blijft
staan: dat is een afspraak van het lid, en de vraag ging over de voorgestelde
training. Oude dubbele tests in de database (Bart, 10 september) zijn niet
opgeruimd: dat is geschiedenis, en de uitslagkaart telt ze sinds de vorige
ronde als één.

**Verificatie.** `npx tsc --noEmit`, gerichte eslint en de volledige
Vitest-run (845 geslaagd, 6 overgeslagen) zijn groen. Niet in de browser
doorlopen (geen ingelogde sessie).

### Opgeleverd — bestuur kan alle milestonebadges toekennen

**2026-09-11, commit `92c70d5` op `main` (niet gepusht).** Geen migratie.

**Waarom.** Het bestuur kon niet elke badge toekennen. Het recht
(`achievements.finalize`) had het al; de beheerpagina filterde de keuzelijst
met `isBadgeVisibleInVault()`, dezelfde regel als de kluis van een lid. Daardoor
ontbraken precies de 216 handmatige catalogusbadges (54 achievements × vier
tiers, zoals *New Rider Mentor*, *Wind Warrior*, *FTP Milestone*): badges die
níet automatisch kunnen en dus juist met de hand moeten.

**Wat er is gekomen.** `/beheer/achievements` toont alle milestonebadges, in
twee groepen: *Handmatig* bovenaan, *Automatisch* eronder (een automatische
badge toekennen blijft mogelijk, bijvoorbeeld voor een rit buiten Strava om).
Toekennen en intrekken zelf zijn niet veranderd.

**Bewust niet gebouwd.** Weekbadges handmatig toekennen: afgesproken dat dat
niet hoeft. De kluis van leden blijft zoals besloten in juni: een handmatige
badge is daar pas zichtbaar als iemand hem heeft.

**Verificatie.** `npx tsc --noEmit` en gerichte eslint zijn groen. De pagina
zelf is niet in de browser doorlopen: lokaal is er geen ingelogde sessie.

### Opgeleverd — FTP-test: uitslag blijft invulbaar, beste minuut uit intervals.icu

**2026-09-11, commit `8b2c9fc` op `main` (niet gepusht).** Geen migratie.

**Waarom.** Bart de Groot deed op 3 en 10 september een ramptest en kon de
uitslag nergens kwijt. Oorzaak: het invulveld verscheen alleen bij een test op
`status = 'planned'`, maar `detectCompletedWorkouts()` zet een workout op
`completed` zodra er een Strava-rit aan hangt, precies wanneer je de test hebt
gereden. Dat treft iedereen die zijn test synchroniseert, niet alleen Bart.
Daarnaast wilde Stijn dat het systeem het beste minuutvermogen zelf oppakt, en
een vaste volgorde voor de FTP: test, dan intervals.icu, dan het profiel.

**Wat er is gekomen.**
- `pickFtpTestState()` in `ftp-test.ts`: een test wacht op een uitslag zolang
  er geen `training_ftp_tests`-rij bij hoort, ongeacht de workoutstatus. Eén
  test per dag (die van het lid gaat voor op een bibliotheekkopie), geschrapte
  tests tellen niet, en een test van vóór de laatste uitslag is ingehaald.
  Barts test van 10 september verschijnt daardoor weer.
- `fetchIntervalsDayPowerCurve()` haalt de powercurve van één dag op
  (`curves=r.<dag>.<dag>`; het formaat is op 11 september met Stijns koppeling
  gecontroleerd: 481 W over 60 s op 10 september). `suggestFtpTestResult()`
  vult daarmee het invulveld: beste 60 s bij een ramptest, beste 20 min bij de
  20-minutentest. Het lid kan het overschrijven.
- **Test invullen** op de FTP-kaart, voor een test die buiten het schema om is
  gereden (datum en soort vrij, niet in de toekomst). De kaart staat daarom
  altijd op de schemapagina.
- FTP-voorrang: de powerprofiel-sync (`teams/_actions.ts`) laat
  `profiles.ftp_watts` met rust zodra het lid een testuitslag heeft. De
  FTP-tegel op `/zwbeter-worden/vermogen` volgt dezelfde volgorde. Een
  handmatige profielwaarde blijft de terugval en loopt mee met elke nieuwe test.

**Bewust niet gebouwd.** Geen Strava-streams als bron voor de beste minuut:
de gekoppelde rit komt uit `strava_activities` zonder vermogensdata, en nog een
Strava-call per test weegt niet op tegen de API-limiet. Zonder intervals.icu
typt het lid zelf. De eFTP-tegel op het ZWBeter Worden-overzicht blijft een
eFTP-trend en is niet omgezet naar de testwaarde. Een test verloopt niet: een
oude uitslag houdt het profiel vast tot de volgende test, zoals afgesproken.

**Claims die niet meer kloppen.** "Alles wat nog op 'planned' staat wacht per
definitie nog op een uitslag" (comment in `_data.ts`, en de ronde van 0131) is
vervangen. De "bekende wrijving" met `auto_sync_physique` is opgelost.

**Verificatie.** `npm run build`, `npx tsc --noEmit`, gerichte eslint en de 15
tests in `tests/unit/ftp-test.test.ts` (waaronder Barts situatie) zijn groen.
Het invullen zelf is niet in de browser doorlopen: lokaal is er geen ingelogde
sessie, dus `/zwbeter-worden/schema` eindigt op de loginpagina.

**Samengevoegd met de correctieronde (merge van 11 september).** Op `main` was
intussen "Testuitslag corrigeren of verwijderen" (`6ea2dc4`) geland. Daarvan is
de profielregel aangepast aan de nieuwe voorrang: `profileFtpAfterChange()` zet
het profiel na een correctie of verwijdering op de nieuwste overgebleven test,
ook als er een ingetypt getal of een eFTP uit intervals.icu stond (voorheen
bleef dat staan). `overwrittenByIntervals` betekent nu: er is geen test meer en
het profiel volgt intervals.icu, dus de sync neemt de FTP weer over. De melding
op *Mijn vermogen* is daarop aangepast.

### Opgeleverd — clubevents inklapbaar op de schemapagina

**2026-09-07, commit `9071f23` op branch
`claude/clubevents-collapsible-training-sv5pno`.** Geen migratie.

**Waarom.** In een ZRL-seizoen vallen er tientallen races binnen dezelfde
schemaperiode, en elke race is een eigen regel met twee knoppen in het blok
"Clubevents in je schemaperiode". Op de telefoon vulde dat blok schermen achter
elkaar en duwde het alles wat eronder staat — het ritformulier, de FTP-test, de
eigen schema's — buiten beeld. Gevraagd door de eigenaar, met een screenshot
waarop na Beschikbaarheid alleen nog ZRL-races volgen.

**Wat er is gekomen.** `EventChoice` gebruikt nu de gedeelde `CollapsibleCard`
(native `<details>`) in plaats van een eigen `<section>` met vaste kop — dezelfde
vorm als "Mijn trainingen" en "Mijn ZWB-schema's" op diezelfde pagina. De kaart
staat standaard dicht; de vraag blijft in de kop staan als subtitel: hoeveel
events nog een klik nodig hebben ("3 nog te beantwoorden"), of dat ze allemaal
beantwoord zijn. Die teller telt precies de regels die ook een actieknop tonen —
alles behalve een 'ja' dat én in het schema én in intervals.icu staat — dus
"allemaal beantwoord" betekent hier ook echt dat er niets meer te doen is.
`CollapsibleCard` kreeg daarvoor een optionele `icon`-prop, zodat de
kalendermarkering in de kop blijft staan zoals bij Beschikbaarheid.

Twee keuzes die het gedrag bepalen:

- **Standaard dicht, niet "open zolang er iets openstaat".** Juist in het geval
  waarin het knelt — begin van een ZRL-seizoen, nog niets beantwoord — zou zo'n
  regel de kaart altijd openzetten en verandert er niets aan het probleem. De
  teller in de kop is het signaal; één tik opent de lijst.
- **De stand wordt niet onthouden.** `<details>` houdt open/dicht vast binnen de
  pagina, ook na een herziening (`router.refresh()` raakt het `open`-attribuut
  niet), maar na een navigatie staat de kaart weer dicht.

**Bewust niet gebouwd.** Geen opslag van de stand per lid (localStorage of
profiel): dat is een voorkeur die je pas wilt bewaren als meer kaarten erom
vragen, en het maakt van een presentatiecomponent een stateful onderdeel. Geen
filter of paginering binnen de lijst — de kaart is nu dicht, dus de lengte
erbinnen knelt niet meer; dát is wel de plek om te kijken als er straks gevraagd
wordt om alleen de eigen ZRL-categorie te tonen. Aan de keuzelogica zelf (RSVP,
blok in het schema, doorzetten naar intervals.icu) is niets veranderd.

**Claims die niet meer kloppen.** Geen, wel een nuance bij de ronde van
2026-08-20: daar staat dat het lid "in de keuzemodule ziet dat die dag opnieuw
wordt ingevuld". Die melding staat binnen de kaart. Op het moment zelf klopt dat
nog steeds — je klikt in de open lijst — maar wie daarna inklapt, klapt de
melding mee weg.

**Verificatie.** `npx tsc --noEmit`, eslint op de gewijzigde bestanden, de
volledige Vitest-run (822 tests, 70 bestanden) en `npm run build` zijn groen. De
kaart is niet in een draaiende app bekeken: daar is hier geen Supabase voor.

### Opgeleverd — een verkeerd ingetypte testuitslag corrigeren

**2026-09-03, commit `6ea2dc4` op branch `claude/ftp-ramptest-edit-delete-3opo4k`.** Geen migratie.

**Waarom.** De uitslag van een FTP-test is handinvoer: het lid typt na de
ramptest zijn hoogste minuutvermogen in. Eén cijfer ernaast en het loopt door tot
in de wattages van elke training — `recordFtpTest()` zet `profiles.ftp_watts` en
daar hangt `blockToPowerTarget()` aan. De historie op `/zwbeter-worden/vermogen`
was tot nu toe read-only, dus de enige uitweg uit een typefout was een nieuwe
test doen. Kwam als feedback van een lid, met een ramptest van 554 W → 416 W FTP
in beeld.

**Wat er is gekomen.** Elke regel in het blok FTP-tests heeft nu een potlood en
een prullenbak (`_components/ftp-test-history.tsx`, clientonderdeel; de
serverpagina levert alleen de rijen). Bewerken opent de regel als klein formulier
met datum, testvorm en gemeten vermogen, met de afgeleide FTP live ernaast.
Verwijderen vraagt een bevestiging. Twee Server Actions,
`correctFtpTestResult()` en `removeFtpTestResult()`, en twee functies in
`src/lib/training/ftp-test.ts` (`updateFtpTest()`, `deleteFtpTest()`).

Vier beslissingen die het gedrag bepalen:

- **De FTP blijft afgeleid.** Hij volgt uit meting × protocolfactor, net als bij
  het opslaan; hij is dus geen invoerveld. Anders kun je een regel achterlaten
  waarin de omrekenfactor niet meer klopt, en juist die ruwe waarde bewaren we om
  een oude test opnieuw te kunnen uitrekenen.
- **Het profiel volgt alleen mee als het aan déze test hing**
  (`profileFtpAfterChange()`, puur en getest). Stond er een getal in dat het lid
  zelf intypte of dat uit intervals.icu komt, dan mag een correctie in de
  historie dat niet stilzwijgend overschrijven. Hing het er wel aan, dan zakt het
  profiel terug naar de nieuwste test die overblijft.
- **Verwijderen zet de testworkout terug op `planned`.** `loadFtpTestState()`
  leest "afgerond" als "uitslag is er"; een afgeronde test zonder meting zou
  nergens meer om een uitslag vragen. Gevolg: na verwijderen staat op de
  schemapagina weer het invulveld voor die test.
- **Herzien alleen als de FTP echt verschuift.** Een correctie in de datum van
  een oude test verandert geen enkel wattage, en elke herziening is een
  AI-generatie die geld kost. `requestReplan()` draait dus alleen bij
  `profileChanged`.

**Bewust niet gebouwd.** De FTP is niet los invulbaar (zie hierboven). Een
trainer kan de uitslag van een lid niet corrigeren: de acties draaien op
`auth.uid()` en `/zwbeter-worden/trainer/vermogen` toont de historie niet — de
RLS-policies uit `0131` staan het wel toe, dus dat kan later zonder migratie.
Verwijder je je enige test, dan blijft `profiles.ftp_watts` staan op de waarde
van die test: leeghalen is schadelijker dan een verouderd getal, want elk wattage
hangt eraan. Het lid krijgt in plaats daarvan de zin dat het profiel die waarde
aanhoudt en zelf aan te passen is. Het blok FTP-tests staat nog altijd binnen de
intervals.icu-tak van de pagina, dus een lid zonder koppeling ziet zijn historie
niet en kan dus ook niets corrigeren; dat losmaken viel buiten deze ronde.
`note` is nog steeds nergens in te vullen of te tonen.

**Claims die niet meer kloppen.** In de ronde van 2026-08-20 stond dat de
uitslagen "als lijst" op `/zwbeter-worden/vermogen` staan; die lijst is nu ook de
plek waar je ze corrigeert of verwijdert.

**Niet lokaal te verifiëren.** Er is hier geen database, dus de update en delete
zelf, de terugval op de nieuwste overgebleven test en het terugzetten van de
workoutstatus zijn niet tegen Postgres gedraaid. Alleen de beslisregel
(`profileFtpAfterChange`) is unit-getest.

**Verificatie.** `npm run build`, `npx tsc --noEmit`, eslint op de gewijzigde
bestanden en de volledige Vitest-run (770 tests, 66 bestanden) zijn groen.

### Opgeleverd — mobiele rapportagefeedback en ZRL-specificiteitsbewaking

**2026-09-01, commit `ec3eb4b` op `main`.** Geen migratie.

**Waarom.** Op het mobiele rapportageformulier gaf de knop na een tik geen
zichtbare status. De Server Action werkte voor mobiel en desktop hetzelfde, maar
de returnwaarde werd door beide formulieren genegeerd; daardoor waren succesvol
opslaan en een fout voor het lid visueel niet te onderscheiden. Bij Jeroen
Janssen bleek daarnaast niet de ZRL-categorie maar de doelcontext bepalend: zijn
lopende schema was gekoppeld aan `base_fitness`, er lagen geen ZRL-races in de
schemahorizon en het schema bevatte daardoor geen VO2max-prikkel.

**Wat er is gekomen.** De twee rapportageformulieren gebruiken nu één mobiel
geschikt formulier met een grotere opslaanknop en zichtbare statussen voor
bezig, opgeslagen, fout en opnieuw gewijzigd. De opslag en autorisatie zelf zijn
niet veranderd. Voor ZRL krijgt de trainingsprompt een expliciete regel: in een
normale opbouwweek hoort één VO2max-, anaerobe of raceprikkel; een vaste race
telt mee en herstel of concrete vermoeidheid mag de prikkel vervangen mits dat
in `cautions` wordt uitgelegd. Na generatie wordt een ZRL-schema dat over de
hele looptijd geen enkele van die prikkels bevat alsnog deterministisch
gesignaleerd. Op de schemapagina ziet een ZRL-teamlid bovendien wanneer het
lopende doel geen ZRL-doel is; bij een ZRL-doel worden ontbrekende racecontext
en een gevulde komende twee weken zonder specifieke prikkel zichtbaar.

**Bewust niet gebouwd.** Jeroens doel, wedstrijden en schema zijn niet
automatisch aangepast: teamlidmaatschap bewijst dat hij ZRL rijdt, maar niet
welke races hij rijdt of dat extra belasting nu veilig is. De signalering
blokkeert daarom ook geen publicatie. Eerst hoort het doel bewust op ZRL gezet,
de racekalender gevuld en deelname gekozen te worden; daarna kan een trainer het
resterende schema laten herzien. Er is geen databasewijziging nodig.

**Claims die niet meer kloppen.** De planner vertrouwt niet meer uitsluitend op
de vrije AI-uitkomst voor ZRL-specificiteit: een volledig ZRL-schema zonder
VO2max-, anaerobe of raceprikkel krijgt nu altijd een waarschuwing. De oude
stelling dat de rapportageknop "niet werkt op mobiel" is niet als technische
platformfout bevestigd; het aantoonbare probleem was ontbrekende terugkoppeling.

**Verificatie.** `npm run build`, `npx tsc --noEmit`, gerichte eslint en 12
gerichte Vitest-tests zijn groen. De volledige Vitest-run kwam tot 819 geslaagde
tests en faalde op twee verwachtingen in `zwift-route-streams.test.ts`; die horen
bij gelijktijdige, niet in deze commit opgenomen Zwift-routewijzigingen van een
andere agent. De lokale mobiele browser bereikte zonder ingelogde sessie alleen
de loginpagina, dus een echte save met persoonsgegevens is niet uitgevoerd.

### Opgeleverd — Voor mij negeerde je eigen "nee"

**2026-09-01, commit `add643e` op `main` (nog niet gepusht).** Geen migratie.

**Wat er mis was.** Het Voor mij-filter uit `a12210c` liet events staan waar je
al "nee" op had geantwoord. De kalender bevroeg `event_rsvps` wel, maar alleen
voor de "ja"-avatars van *andere* leden en voor de live-telling; je eigen
antwoord kwam nergens in de fit-logica voor. Daarmee bleef precies het duidelijkste
signaal ongebruikt: een lid dat zich al had afgemeld kreeg het event alsnog
voorgeschoteld als "passend voor jou".

**De oplossing.** `eventFitsMember()` kent een vijfde reden, `declined`, en die
staat vóór alle andere. De volgorde is nu: een expliciete "nee" (het lid heeft
het letterlijk gezegd, over dit ene event), dan een feit (ander team), dan een
keuze (interesses), dan een schatting (afstand en hoogtemeters). Zo krijgt het
lid altijd de hardste verklaring te zien in de "n verborgen"-regel.

**Onder Alles blijven die events staan.** Je "nee" verbergt ze in Voor mij, niet
in de kalender zelf — anders kun je nooit meer van gedachten veranderen. `/hulp`
zegt dat er expliciet bij.

**`declinedEventIds` is een verplicht veld** op `MemberFitInput`, geen optionele
met een lege standaard. Een vergeten signaal is precies hoe deze bug ontstond;
nu weigert TypeScript een aanroep die het weglaat.

**Verificatie.** `npm run build`, `tsc --noEmit`, eslint en de Vitest-suite zijn
groen; `tests/unit/event-fit.test.ts` groeide van 11 naar 14 tests, waaronder
twee die deze regressie afdekken (een "nee" verbergt het event, en een "nee"
weegt zwaarder dan een ander team). Niet in een browser gecontroleerd: migratie
`0143` draait hier niet.

### Opgeleverd — "Voor mij" op de kalender

**2026-09-01, commit `a12210c` op `main`.** Migratie `0143`.

**Waarom.** De kalender toonde iedereen dezelfde lijst: elk aankomend event van
de hele club, inclusief ZRL-ritten van teams waar je niet in zit en gran fondo's
van 220 km die voor de meeste leden geen realistische keuze zijn. Wie de
kalender opende moest die selectie zelf in zijn hoofd maken, elke keer opnieuw.

**Wat er is gekomen.** Een filter op `/kalender` met twee knoppen — `Alles (n)`
en `Voor mij (n)` — via `?voor=mij`, in dezelfde chip-stijl als `/materiaal`.
Verjaardagen blijven in beide standen staan: die dragen geen geschiktheids-
signaal en horen bij het clubleven, niet bij de keuze welke rit je rijdt.

**Twee soorten signalen, bewust gescheiden** (`src/lib/events/fit.ts`):

- *Interesse* is wat het lid zelf aanvinkt: een nieuwe sectie Interesses op
  `/profiel` met een vinkje per eventtype uit `EVENT_TYPES`. Niets aangevinkt
  betekent "alles interessant" — we raden interesse nooit, want een lid dat daar
  nooit komt mag geen halve kalender krijgen.
- *Geschiktheid* leidt ZWB af: hoort het event bij een team waar je in zit
  (`events.team_id` tegen `team_members`), en past de omvang van de rit. Het
  plafond voor afstand en hoogtemeters komt uit het profiel, en anders uit je
  langste rit en zwaarste klimdag van de afgelopen 365 dagen (`strava_activities`,
  `CYCLING_SPORTS`, geen woon-werk), plus 20 procent marge (`FIT_HEADROOM`).
  Onder vijf ritten (`MIN_RIDES_FOR_CEILING`) zegt die geschiedenis te weinig en
  blijft het plafond leeg.

**De regel die het eerlijk houdt: onbekend telt nooit als "past niet".** Een lid
zonder Strava-koppeling en zonder ingevulde grenzen wordt nergens door
weggefilterd behalve door zijn eigen interesses. Dat is geen detail maar de
kern: de app zit tegen de Strava-atletenlimiet aan, dus niet elk lid kán
koppelen, en die leden mochten geen uitgeklede kalender krijgen. Een event
zonder afstand in de database valt om dezelfde reden nooit af.

**Wat er zichtbaar is.** Onder de knoppen staat wat er verborgen is en waarom,
geteld per reden ("3 verborgen · Buiten je interesses (2) · Langer dan je grens
(1)"). Verbergt het filter niets en heeft het lid ook geen voorkeuren, dan staat
er een link naar `/profiel#interesses` in plaats van een identieke lijst.
`/hulp` legt de werking uit; in het formulier zelf staat geen uitleg (conventie
Product copy).

**Zwaarste reden wint.** De volgorde in `eventFitsMember()` is niet
willekeurig: team is een feit, interesse een keuze, omvang een schatting. Zo
krijgt het lid de meest harde verklaring te zien.

**Migratie `0143`** voegt `event_type_interests text[] not null default '{}'`,
`fit_max_distance_km` en `fit_max_elevation_m` toe aan `profiles`. Bewust
*geen* check-constraint op de eventtypes: die lijst is al twee keer uitgebreid
(`0067`, `0086`) en een constraint zou bij de derde keer stil de profielopslag
breken — de server-action valideert tegen `EVENT_TYPE_VALUES`.

**Volgorde bij deploy: eerst `0143`, dan de code.** `/profiel` haalt de drie
nieuwe kolommen op in één `select` met de rest van het profiel; draait de code
voor de migratie, dan faalt die hele query en staat het profielformulier leeg.
De kalender zelf is wel veilig: die valt bij een mislukte profiel-query terug op
"geen voorkeuren" en toont dus gewoon alles.

**Niet gebouwd, en waarom.** Geen filterchips per eventtype naast de Voor
mij-knop: dat is een tweede filtermodel naast de interesses die het lid al op
zijn profiel zet, en twee modellen voor hetzelfde gaan uit elkaar lopen. Geen
match op ZRL-categorie: events kennen geen categorie-eis, alleen leden hebben
`zrl_category`, dus daar valt niets tegen af te zetten. Geen filter op regio of
afstand tot de startplaats: `events.start_lat/lon` is er wel, maar `profiles.region`
is vrije tekst ("Tilburg", "Antwerpen") zonder coördinaten, dus dat zou raden
worden.

**Niet lokaal verifieerbaar.** Migratie `0143` is niet gedraaid (geen Docker of
Supabase-config in deze repo). `npm run build`, `npx tsc --noEmit`, eslint en de
volledige Vitest-suite (815 tests, waarvan 11 nieuw in
`tests/unit/event-fit.test.ts`) zijn wél groen. De kalender is niet in een
browser gecontroleerd: zonder de migratie bestaan de kolommen niet en zou dat
niets bewijzen.

**Nog op te lossen (buiten deze ronde).** Er staan twee migraties met nummer
`0140`: `0140_training_season.sql` (gecommit) en `0140_zwift_routes.sql`
(untracked). Dat moet rechtgezet worden vóór de volgende deploy.

### Opgeleverd — jaarplanning boven het trainingsschema

**2026-08-31, branch `claude/training-yearly-planning-3e88rl`.** Migratie `0140`.

**Waarom.** Het trainingsdeel kende precies één horizon: een doel met één
`target_date`, waar `buildTrainingInput()` de planperiode uit afleidde. Daarboven
zat niets. Een lid kon nergens kwijt dat het in juli twee weken weg is, dat de
gran fondo in mei het echte mikpunt is en de ZRL-ronde in maart wordt meegepakt,
of dat er een winterstop aankomt. Voor amateurs is dat juist de laag die telt:
hun jaar wordt niet gestuurd door een piek maar door vakanties en drukke weken.
Een schema dat daar niets van weet plant een opbouwblok dwars door de vakantie,
het lid haalt het niet, en de nalevingslogica concludeert vervolgens dat het
schema te zwaar was — precies de verkeerde conclusie.

**Wat er is gekomen.** `/zwbeter-worden/jaarplan`: een seizoensbalk van twaalf
maanden (een maand terug, elf vooruit) met vier banen — schema's, rustperiodes,
mikpunten en clubevents — plus een maandlijst eronder en een blok signaleringen
bovenaan. Migratie `0140` voegt `training_season_targets` (mikpunt met datum en
prioriteit a/b/c, optioneel gekoppeld aan een event en aan het doel dat ervoor
is gemaakt) en `training_season_periods` (periode met kind `rust` of `rustig`)
toe. RLS spiegelt `training_availability`: lezen mag het lid én zijn trainer,
schrijven alleen het lid zelf. De trainer heeft een eigen leesweergave op
`/zwbeter-worden/trainer/jaarplan`.

**Hoe het het schema stuurt.** `seasonPlanForAi()` (nieuw
`src/lib/training/season-data.ts`) hangt de jaarplanning als veld `seasonPlan` in
`TrainingAiInput`, en `defaultTrainingPrompt()` kreeg er zeven regels bij: een
A-mikpunt is een piekdag met taper, B alleen de dag ervóór licht, C verandert
niets; `rust` betekent niet plannen en er geen opbouwblok doorheen leggen;
`rustig` is de helft van het weekvolume zonder sleutelsessies; na meer dan tien
dagen rust begin je lager en bouw je in twee weken terug op. Omdat
`adaptiveDailyPrompt()` en `planUpdatePrompt()` op `defaultTrainingPrompt()`
voortbouwen gelden die regels ook daar; beide kregen daarnaast één eigen regel.
Elke wijziging in de jaarplanning vraagt via `requestReplan()` een herziening
aan, net als een gewijzigde beschikbaarheid.

**Waarom niet via `training_availability`.** Een rustperiode wegschrijven als
weekrijen met 0 minuten was de goedkopere route — dat mechanisme bestaat al en de
prompt gehoorzaamt het hard. Toch niet gedaan: het overschrijft de
beschikbaarheid die het lid zelf invulde (en moet die bij verwijderen weer
terugzetten), een vakantie valt niet netjes op maandagen, en `rustig` is er niet
in uit te drukken zonder een verzonnen minutenaantal. Het is bovendien geen
beschikbaarheidsvraag maar een periodiseringsvraag, en periodisering leeft in dit
project in de promptregels.

**Het vangnet.** Omdat sturing via de prompt loopt, is de signalering bewust
deterministisch: `seasonWarnings()` in `src/lib/training/season.ts` is pure
logica over datums, met zeven gevallen die elk een knop dragen die ze oplost —
trainingen in een rustperiode (→ herziening), twee A-doelen binnen 21 dagen (→ er
één op B), een A-doel zonder doel of zonder schema, een schema dat meer dan 7
dagen vóór een A-doel stopt, een toegezegd event dat nog geen mikpunt is, een
event midden in een rustperiode, en een jaar zonder enkele rustperiode (tip).
Gedekt door `tests/unit/season.test.ts` (26 tests), inclusief grenswaarden,
schrikkeljaar en zomertijd.

**Claim die niet meer klopt.** Het `/hulp`-artikel `#doeltype` stelde dat er bij
`base_fitness`, `ftp` en `rebuild` géén taper komt. Dat geldt nu alleen zolang er
geen A-mikpunt in de planperiode ligt; de alinea is bijgesteld en er staat een
nieuw artikel `#jaarplan` naast, met een regel in de zoekindex.

**Verder aangeraakt.** `loadScheduleEvents()` kreeg een optionele
`limit`-parameter (standaard 50, ongewijzigd voor de bestaande drie aanroepers);
twaalf maanden events passen niet in die limiet. `createTrainingGoal()` accepteert
een verborgen `season_target_id` en legt daarmee de koppeling terug vast, zodat de
waarschuwing "A-doel zonder schema" verdwijnt zodra het doel er is.

**Bewust niet gebouwd.**
- *Geen deterministische jaarperiodisering* die zelf blokken over twaalf maanden
  genereert. De periodisering leeft in promptregels; een tweede motor ernaast
  geeft twee waarheden die uit elkaar gaan lopen.
- *Geen container-tabel* `training_season_plans`. Die zou het lid dwingen eerst
  een jaarplan aan te maken voordat het één vakantie kan invullen, terwijl het
  venster gewoon uit de datums volgt.
- *Geen trainingsblok uit een `misschien`.* `syncEventWorkout()` houdt vast dat
  alleen `ja` een toezegging is; op de tijdlijn zichtbaar maken is genoeg.
- *Geen bewerkrecht voor de trainer.* Spiegelt `training_availability`: de agenda
  en de vakanties zijn van het lid.
- *Geen seizoensgrafiek van CTL/FTP.* Zonder FTP-historie (zie "Bekende open
  dingen") zou die misleiden; dat blijft een eigen ronde.

**Niet lokaal te verifiëren.** Migratie `0140` is hier niet gedraaid — er is geen
Docker/Supabase-config in deze repo. De tabellen, constraints en RLS-policies zijn
pas op productie te controleren. Let op de gaten `0126`-`0130` en `0134`: die zijn
door de Omnium-ronde bezet (tot 2026-09-14 alleen in de working tree), vandaar `0140` en niet `0134`.

**Volgorde.** Deze ronde ging vóór punt 2 van de actieve lijst (de
training-cockpit praktijktest), die daar zegt "pas daarna nieuwe trainingfeatures
toe". Dat was een expliciete keuze van de eigenaar; punt 2 blijft staan en schuift
niet naar achteren.

**Verificatie.** `npm run lint` (0 errors), `npm run test` (52 bestanden, 586
tests), `npx tsc --noEmit` en `npm run build` — alle vier groen. Beide nieuwe
routes staan in de build-output. Niet gedeployed.

### Opgeleverd — de melding bij een wachtend lid, en claimen vanuit de Zwift-vraag

**2026-08-25, working tree op `e25a5f5`.** Migratie `0137`.

**Waarom.** De beheerder kreeg nooit een melding als er iemand op goedkeuring
wachtte, terwijl andere pushberichten wél aankwamen. Aan de ontvangkant klopte
alles: hij is de enige admin, heeft een `notification_preferences`-rij met
`on_member_pending = true` en drie geldige abonnementen. De melding werd dus
nooit verstuurd.

**De oorzaak.** De verzendcode hing in een `if (data.user)` na
`supabase.auth.signUp()`, en daar kwam hij nooit uit. Staat *Confirm email* aan
— bij ons het geval, `mailer_autoconfirm: false` — dan antwoordt GoTrue op
`/signup` met het User-object op het hóógste niveau. supabase-js leest in
`_sessionResponse()` alleen `data.user`, en dat veld bestaat in dat antwoord
niet: `user = data.user ?? null` levert dus `null`. Geen foutmelding, registratie
werkt gewoon, blok overgeslagen.

De verklikker die dit hard maakte, staat in hetzelfde blok: de AVG-toestemming
werd daar één regel eerder weggeschreven. Bij álle 35 profielen stond
`privacy_accepted_at` leeg, ook bij de 29 die zich ná `0063` (31 mei 2026)
hebben aangemeld, terwijl de registratie zónder dat vinkje weigert. Dat blok
heeft dus nooit gedraaid. (In een eerdere versie van deze notitie stond
"twaalf"; dat kwam uit een lijst van alleen de nieuwste profielen en was fout.)

**Wat er staat.** De melding hangt niet meer aan `data.user` — die had het id
ook helemaal niet nodig, alleen de naam die al in de body stond. De tag is
daarop gebaseerd in plaats van op het id; bewust geen e-mailadres, want een tag
reist mee naar het toestel van de beheerder. De lege `catch` logt nu, want
precies dat zwijgen heeft dit maanden verborgen gehouden.

De toestemming loopt via `0137`: de registratie geeft `privacy_accepted` mee in
de user-metadata en `handle_new_user` zet er `privacy_accepted_at` mee. Dat is
atomair met het aanmaken van het account, dus het hangt niet langer af van de
vorm van een API-antwoord.

**Bestaande profielen alsnog bijgewerkt (`0138`).** Eerst bewust niet gedaan —
een toestemmingsdatum invullen voor iemand die al lid is, is een
AVG-administratie verzinnen, en dat is een keuze van de eigenaar en geen
bijvangst van een bugfix. Op zijn verzoek is het daarna wél gebeurd, maar alleen
waar de toestemming vaststaat. De 35 lege profielen vallen in drie groepen:

- **27 via het registratieformulier, ná het live gaan van `0063`.** Dat
  formulier weigert zonder vinkje, dus geen vinkje betekent geen account. Zij
  krijgen `created_at` als datum — het vinkje is gezet in exact hetzelfde
  verzoek dat het account aanmaakte, dus dat is de wérkelijke datum en geen
  schatting.
- **6 van vóór 2026-05-31 15:30 CEST.** Toen bestond het vinkje niet.
- **2 die via een magic link binnenkwamen** (Bart, Willem Bouwman).
  `sendMagicLink()` toont geen privacyverklaring en geeft geen user-metadata
  mee; ze zijn te herkennen aan het ontbreken van `full_name` in
  `raw_user_meta_data`, dat `signUp()` altijd zet.

Die laatste acht blijven leeg. Een gat in de registratie is hier de juiste
uitkomst: het zegt precies wat er is gebeurd. Gedraaid op 2026-08-25 met de
service-role, uitkomst gecontroleerd — 27 gevuld, 8 leeg, precies de bedoelde
verdeling. `0138` legt dezelfde update vast en is idempotent (alleen waar de
kolom leeg is, en de waarde hangt aan `created_at`, niet aan `now()`).

**En die acht alsnog vragen.** Een gat laten staan is eerlijk, maar het blijft
een gat: acht leden gebruiken de app zonder vastgelegde toestemming.
`PrivacyConsentDialog` in de app-layout vraagt het hun alsnog, met dezelfde
zin als op het registratieformulier en een link naar `/privacy`.
`acceptPrivacyStatement()` zet dan `now()` — híér is dat wél de juiste datum,
anders dan bij de backfill, want het lid tekent op dat moment.

Bewust niet blokkerend, met een "Later" die één sessie geldt en daarna opnieuw
vraagt. Toestemming moet vrij gegeven zijn; wie de app pas in mag ná het
vinkje, geeft die niet vrij, en dan is de handtekening minder waard dan het
gat dat je ermee dichtte. Wél zonder ontsnapping: er is geen "niet meer vragen",
zoals het Zwift-ID die met *Ik zwift niet* wel heeft.

De Zwift-ID-dialoog is ondergeschikt gemaakt aan deze: twee dialogen over elkaar
heen is geen keuze meer. `privacy_accepted_at` komt uit de bestaande
profielquery van de layout, dus er is geen query bijgekomen.

**Versiebeheer op de verklaring (`0139`).** Vastleggen dát iemand tekende is te
weinig; het gaat om waaróp. De tekst is sinds mei vier keer inhoudelijk
gewijzigd — trainersinzage, terugschrijven naar Strava, live locatie plus
ZWBlokken, en gezondheidsgegevens — dus wie in juni tekende heeft over dat
laatste niets gelezen, en dat is een bijzondere categorie onder de AVG.

`PRIVACY_VERSIONS` in `src/lib/privacy.ts` is de enige plek die bijgewerkt hoeft
te worden als de tekst verandert. Eén regel erbij laat élk lid opnieuw tekenen,
dus dat is bewust een knop met gevolgen; de comment zegt er expliciet bij dat
het alleen bij een inhoudelijke wijziging mag, niet bij een herformulering.
`privacyConsentIsCurrent()` vergelijkt op gelijkheid en niet op "nieuwer dan",
zodat een teruggedraaide tekst ook opnieuw wordt voorgelegd.

`0139` rekent per lid terug welke versie destijds gold, op de commit-tijdstippen
van die vier wijzigingen. Gecontroleerd dat geen enkel lid binnen zes uur ná een
wissel heeft getekend, dus deploy-vertraging kan de toekenning niet verschoven
hebben. Gedraaid op 2026-08-25, uitkomst gecontroleerd: 23 op de eerste versie,
2 op `2026-08-07`, 2 op `2026-08-18`, 8 nooit getekend — geen enkele rij met een
datum maar zonder versie. **33 van de 35 leden krijgen dus de vraag.** Dat is de
bedoeling en geen bijwerking.

De migratie is bewust apart gepusht (`971dded`), vóór de code. De layout
selecteert de nieuwe kolom, en PostgREST laat een select in zijn geheel falen op
een onbekende kolom; dan valt `profile` terug op `null` en ziet elk lid zijn
e-mailadres in plaats van zijn naam.

De pagina zelf zei "Laatst bijgewerkt: 31 mei 2026" terwijl er vier wijzigingen
overheen waren gegaan. Die datum komt nu uit dezelfde versielijst, dus hij kan
niet opnieuw gaan afwijken.

**Bewust niet gebouwd.** Geen changelog van wat er per versie veranderde. Dat
klinkt behulpzaam, maar het vraagt onderhouden copy naast de verklaring zelf en
staat op gespannen voet met de afspraak om uitleg in de verklaring te houden en
niet in het scherm. Wie wil weten wat er veranderd is, leest de verklaring.

**Zwift-ID: claimen op de plek van de vraag.** Een nieuw lid kreeg de dialoog
"Je Zwift-ID ontbreekt" terwijl zijn regel al klaarstond op `/leden`. Die
dialoog toont nu eerst de ongeclaimde ledenlijst-regels die op zijn naam lijken,
met "Dit ben ik" per regel; het invoerveld staat eronder als tweede weg.
`claim_roster_entry` zet het Zwift-ID uit die regel meteen op het profiel, dus
daarmee is de vraag beantwoord. Alleen regels mét een Zwift-ID worden
voorgesteld — zonder zou de claim de vraag niet oplossen en kwam de dialoog bij
de volgende pagina terug. De matching is `looksLikeMe()` uit
`lib/text/normalize.ts`, dezelfde als de claimlijst op `/leden`, zodat een lid
op beide plekken hetzelfde ziet. Op de huidige gegevens krijgen 13 van de 14
leden die deze dialoog nu zouden zien een directe claim aangeboden.

De query draait alleen als de vraag ook echt gesteld wordt; deze layout draait
op elke pagina en mag er niet standaard een query bij krijgen.

**Verificatie op productie (2026-08-25).** Migratie `0137` is niet lokaal te
draaien (geen Docker of Supabase-config), maar is op productie gedraaid en
daarna getoetst met een wegwerpregistratie via het echte formulier op
`zwb-platform.netlify.app`. Uitkomst: het profiel kreeg `privacy_accepted_at`
gelijk aan `created_at`. Daarmee staan twee dingen vast — de trigger uit `0137`
werkt, en de deploy met deze ronde is live. De wegwerpgebruiker is meteen daarna
verwijderd (`auth.admin.deleteUser`, profiel volgt via `on delete cascade`);
profielentelling terug op 35, geen resten, niets meer in de goedkeuringslijst.

**Tweede oorzaak: de dynamische imports.** De melding kwam ook na die
wegwerpregistratie niet aan, terwijl er 38 minuten eerder wél een
`on_training_plan`-push was bezorgd (Jeroens plan van 16:47 UTC, tegen de
registratie van 17:25). De bezorgketen is daarna los getoetst door met de
productie-VAPID-sleutels dezelfde payload en dezelfde trigger rechtstreeks naar
zijn drie abonnementen te sturen: drie keer HTTP 201, en de melding kwam aan.
Sleutels, ontvangerselectie, abonnementen, payload en service worker deugen dus
allemaal — de registratiecode bereikte `webpush` simpelweg niet.

In de gebouwde output was te zien waarom het daar misging: de drie
`await import(...)`-regels worden door Turbopack runtime-chunkresolutie
(`await a.A(677521)`), en die landde in de `catch`. Overal élders in de app
worden dezelfde modules statisch geïmporteerd, en daar werkt de push wel. Ze
staan nu ook hier bovenaan als gewone import; in de build is `a.A(...)`
vervangen door een directe verwijzing. Een server-only module in een
`"use server"`-bestand heeft niets te winnen bij lui laden.

**Zodat dit niet nóg eens stil wegvalt.** De uitkomst gaat als bron
`signup_notification` naar `integration_health`, dus hij staat op het
statusblok van `/beheer/event-scan`: hoeveel er bezorgd zijn, of er
VAPID-variabelen ontbraken, of dat niemand het recht `members.approve` heeft.
Deze melding is maanden weggevallen zonder één spoor; een lege `catch` is daar
de directe oorzaak van geweest.

**Nog niet aangetoond.** Dat de melding nu écht aankomt is niet getest: een
tweede wegwerpregistratie liep op Supabase's eigen e-maillimiet ("email rate
limit exceeded"), en daarna is bewust gekozen om op een echte aanmelding te
wachten in plaats van te forceren. Wat vaststaat is dat de dynamische imports
uit de build verdwenen zijn en dat de bezorgketen los is bewezen. De
eerstvolgende aanmelding schrijft zelf een regel in `integration_health`, dus
het antwoord staat dan op `/beheer/event-scan` — ook als het weer misgaat, en
dan mét reden.

`npm run build`, `tsc`, `eslint` en de Vitest-suite (621 tests) zijn groen.

### Opgeleverd — dubbele trainingen: de race tussen twee publicaties

**2026-08-25, working tree op `4b6eaee`.** Geen migratie.

**Waarom.** Een lid meldde opnieuw dubbele trainingen in zijn maandkalender,
elke dag van de komende twee weken twee blokken. In de database stond niets
dubbels: precies één actieve workout per dag. Het tweede blok kwam uit de derde
bron van `calendarItems` — een event uit intervals.icu dat
`externalIntervalsEvents()` niet als het onze herkende. Twee dingen wezen dat
aan: het venster liep exact veertien dagen ver (`fetchIntervalsEvents`), en het
tweede blok was altijd groen, want een extern event draagt geen intensiteit en
`colorFor()` valt dan terug op `endurance`.

**De oorzaak.** Twee herzieningen liepen tegelijk. Om 20:42:27 vuurde een
wijziging in de beschikbaarheid via `requestReplan()` een generatie af; zes
seconden later drukte dezelfde persoon op *Schema bijwerken*, dat rechtstreeks
naar `startPlanUpdate()` gaat en dus om de cooldown van `requestReplan` heen
liep. Beide werden een plan, drie seconden na elkaar. Het nieuwste markeerde de
workouts van het oudste als vervangen om 20:44:41, maar dat oudste plan stond
op dat moment nog te pushen: zijn lus schreef om 20:44:48 alsnog een
`intervals_event_id` terug op rijen die ZWB al vervangen had. Die events bleven
in intervals.icu staan zonder dat een actieve workout ze nog kende.

Het gold voor 85 workouts van drie leden, en bij alle 85 lag `updated_at` ná
`superseded_at` — zonder uitzondering dezelfde race.

**Wat er staat.** `pushOneWorkout()` weigert een vervangen rij op twee plekken:
vóór de call (dan ontstaat het event niet eens) en in de update die de uitkomst
wegschrijft, met `.is("superseded_at", null).select()`. Lukt die claim niet, dan
wordt het zojuist geplaatste event meteen weer gewist. Alleen die tweede is
waterdicht. `PushResult` heeft er een veld `skipped` bij: overgeslagen is geen
fout, want een nieuwer schema heeft het overgenomen.

`retireSupersededWorkouts()` markeert nu eerst en wist daarna, in plaats van
andersom. Andersom bleef er een event achter wanneer een oudere publicatie
tussen het lezen en het wissen in nog een nieuw event-id op de rij zette. En
`intervals_event_id` wordt alleen leeggemaakt als het wissen echt lukte:
blijft het id staan, dan is het event vindbaar voor een volgende opruiming.
Voorheen ging de kolom ook bij een mislukking op `null` en was het spoor weg.

`preparePlanUpdate()` weigert een tweede herziening zolang er één loopt, dus op
de gedeelde voorbereiding waar zowel de knop, `requestReplan()` als de cron
langskomen. Alleen generaties jonger dan `STALE_GENERATION_MINUTES` tellen mee,
zodat een blijven hangen generatie het bijwerken niet voorgoed blokkeert. Dat
getal stond in twee bestanden en woont nu in `draft.ts`; de dagelijkse cron
importeert het.

`startPlanUpdate()` maakt de rij in `training_ai_generations` nu áán vóór de
call naar OpenAI en vult response-id en model erna aan. Andersom was de grendel
lek: het aanmelden van een achtergrondgeneratie duurt tot vijftien seconden en
pas daarna verscheen de generatie in de tabel — precies breed genoeg voor de
zes seconden van 24 augustus. Mislukt het aanmelden, dan sluit de rij meteen op
`failed`, anders houdt hij de grendel een kwartier dicht.

**Opruiming.** `scripts/cleanup-orphan-intervals-events.mjs` wist de events van
alle rijen met een `superseded_at` én een `intervals_event_id`. Droogloop
standaard, echt wissen met `--apply`. Gedraaid op 2026-08-25: 85 opgeruimd, 0
mislukt. Daarna gecontroleerd tegen de live API van alle twaalf gekoppelde
leden — nul overgebleven events met een `zwb-`-prefix die ZWB niet herkent. Wat
er nog aan vreemde events staat is echt van de leden zelf (eigen workouts en
plannen in intervals.icu), en dat hoort de kalender te tonen.

**Bewust niet gebouwd.** Geen zelfherstellende opruimstap in de dagelijkse cron
en geen filter op de `zwb-`-prefix in `externalIntervalsEvents()`. Beide waren
voorgesteld als vangnet, maar met de grendel erop hoort er niets meer te
ontstaan; een vangnet dat nooit aanslaat verbergt vooral of de fix werkt. Het
script blijft staan voor als het tóch terugkomt.

Ook niet: `intervals_external_id` per lid+datum in plaats van per plan, zodat
intervals.icu zelf zou overschrijven. Dat botst met de unieke index uit `0051`
en maakt twee trainingen op één dag onmogelijk.

**Niet lokaal te verifiëren.** De race zelf niet: die vraagt twee gelijktijdige
publicaties tegen een echte intervals.icu. Wel afgedekt met
`tests/unit/publish-race.test.ts`, dat de drie gevallen naspeelt tegen een
supabase-stub — en dat op de oude code alle drie faalt. `npm run build` niet
gedraaid; `tsc`, `eslint` en de volledige Vitest-suite (621 tests) zijn groen.

**Los daarvan aangetroffen: het verlopen event-id.** Bij het lid in kwestie
stonden 31 actieve workouts op `publish_status='published'` met een
`intervals_event_id` die in intervals.icu niet meer bestond; bij de andere elf
gekoppelde leden klopte het één op één. Vermoedelijk heeft hij zijn kalender
daar zelf leeggemaakt na het dubbele-blokken-gedoe — ZWB volgt bij
`syncWorkoutDatesFromIntervals()` bewust alleen datumverschuivingen en negeert
verwijderingen. Zijn schema stond daardoor nergens op zijn fietscomputer, en hij
kwam er ook niet uit door opnieuw te publiceren: `upsertIntervalsWorkoutEvent()`
deed een PUT op een id dat 404 gaf en `pushOneWorkout()` telde dat als mislukt.

`upsertIntervalsWorkoutEvent()` laat bij een 404 op de PUT het opgeslagen id nu
los en maakt het event opnieuw aan; de aanroeper legt het nieuwe id vast. Een
gewone publicatie repareert zo'n verlopen verwijzing daarmee vanzelf, en de knop
*Opnieuw publiceren* staat er al voor een gepubliceerd schema. Een 404 op de
aanmaakroute zelf blijft gewoon een fout — geen herhaling.
`tests/unit/intervals-upsert.test.ts` dekt de vier gevallen af.

**Gedaan (bevestigd 2026-09-21).** Het lid heeft opnieuw gepubliceerd. Oorspronkelijk: de 31 events van dat lid waren nog niet teruggezet; dat vroeg
één klik op *Opnieuw publiceren* op zijn schema, en dat is niet iets om namens
hem te doen.

### Opgeleverd — iteratielijst ZWBasis: training, intervals en garage

**2026-08-24, working tree op `b97aba7`.** Geen migratie.

**Waarom.** De iteratielijst van een lid bracht zes kleine fouten aan het licht
die samen vooral verwarrend gedrag gaven: het intervals-ID stond op de verkeerde
plek uitgelegd; hersteldata kreeg een verzonnen tijdstip van 00:00 en de
dagelijkse bijstelling liep vóór de meting van die dag; één afwijkende
beschikbaarheidsweek kon door de planner als nieuw patroon worden gelezen; het
bijwerkformulier vroeg dubbel om beschikbare dagen; de vrije trainingsopmerking
bereikte de planner niet; en het dashboard rekende stuurlint nog in kilometers
terwijl Mijn garage al maanden gebruikte.

**Wat er staat.** `/hulp` wijst voor Athlete ID en API-key naar Settings →
Developer Settings. Datum-only hersteldata toont alleen *vandaag/gisteren* en
nooit meer 00:00. De Netlify-job draait voortaan om `30 8 * * *` (09:30 winter,
10:30 zomer), zodat intervals.icu de hersteldata van de huidige dag doorgaans
al heeft. De schema-prompt zegt expliciet dat een uitzondering voor één week
niet naar dezelfde weekdag in andere weken mag lekken; de gegevensvorm uit
`0131` bleef ongewijzigd en had die scheiding al. Het dubbele veld
*Beschikbare dagen* is uit *Schema bijwerken* verwijderd: de schuifbalken erboven
zijn de enige bron.

RPE en gevoel gingen al via `compliance` naar de planner; nu gaat ook
`athlete_report` mee. De dagelijkse bijstelling krijgt alle drie bovendien bij
`yesterday`, zodat concrete feedback bij de eerstvolgende aanpassing kan wegen
zonder één losse opmerking meteen tot een compleet ander schema te maken.
`MaintenanceStatus` op het dashboard gebruikt nu dezelfde `wearProgress()` als
Mijn garage, inclusief maanden, montagedatum, eigen drempel en de kilometerstand
van een handmatige fiets. Daarmee kan een pas gemonteerd stuurlint niet meer door
de oude kilometerfallback op *Vervangen* springen.

**Bewust niet gebouwd.** Geen polling totdat intervals.icu een dagmeting
publiceert: de API geeft geen betrouwbaar verschijnmoment en herhaald ophalen
zou voor ieder gekoppeld lid extra externe calls geven. De ochtendrun is de
kleinste voorspelbare correctie; een pagina die het lid later opent haalt de
actuele waarden nog steeds live op. Ook geen nieuw beschikbaarheidsmodel of
databasecorrectie: `default + weeks[]` uit migratie `0131` was al de juiste
bron, de resterende fout zat in de interpretatieruimte van de planner.

**Verificatie.** Gerichte Vitest-regressies voor herstelweergave, prompts,
naleving, beschikbaarheid en onderhoud zijn groen (60 tests); ook de volledige
suite (614 geslaagd, 6 overgeslagen), TypeScript, productie-build en ESLint zijn
groen. ESLint meldt alleen 23 bestaande waarschuwingen in brochure-/hulpscripts
en oude `.claude`-worktrees, geen fouten. De gewijzigde Netlify-tijd is pas na
een deploy operationeel en is daarom lokaal niet end-to-end te verifiëren.

### Opgeleverd — Geplande belasting kwadratisch, uit het doel van het blok

**2026-08-20, working tree.** Geen migratie.

**Waarom.** Jeroen reed een tempo-workout van 75 min volledig in ERG-mode op
Zwift — dus per definitie precies volgens plan — en kreeg "Te zwaar · 123% van
gepland" te zien. Geen incident maar een rekenfout: `estimateTrainingLoad`
telde `minuten × IF` op (lineair), terwijl de gereden kant
(`trainingStressScore`) TSS kwadratisch berekent, zoals TSS is gedefinieerd
(een uur op IF x levert x² × 100). Beide getallen heetten "TSS" en werden in
`loadPercentage` op elkaar gedeeld.

De twee schalen kruisen elkaar alleen bij IF 0,6. Daarboven kwam de planning
structureel te laag uit, en dus het nalevingspercentage te hoog: tempo +30%,
drempel +58%, VO2max +92%, anaeroob +117%. Dat het nooit opviel komt doordat de
enige testcase 60 minuten duur was — precies het ene punt waar lineair en
kwadratisch hetzelfde antwoord geven.

De schade zat niet alleen in het label. `publish.ts` stuurt deze schatting als
geplande belasting naar intervals.icu, `projectCtl` op de trainerpagina voedt er
de CTL-projectie mee, en `avgLoadPct` gaat mee in de AI-prompt — waar de regel
"structureel te zwaar zónder hoge RPE betekent dat het schema te voorzichtig is,
verhoog duur en volume" precies verkeerd om vuurde voor ieder lid dat zijn
drempel- en VO2max-sessies netjes reed.

**Wat er staat.** `estimateTrainingLoad(blocks, ftpWatts)` rekent nu
`minuten/60 × IF² × 100`, en de IF komt uit het doel van het blok zelf ("80%",
"210-235w") via het bestaande `powerRangePercentForBlock`. Zonder leesbaar doel
valt hij terug op het midden van `INTENSITY_FTP_RANGE` — dezelfde band die
`blocksToWorkoutDoc` naar intervals.icu en de fietscomputer stuurt, zodat de
schatting rekent met het wattage dat het lid werkelijk voorgeschreven krijgt.
De eigen factorentabel binnen de functie is weg; die tweede, lagere schaal naast
`INTENSITY_FTP_RANGE` wás het probleem.

Wattage-doelen worden gedeeld door de FTP die je meegeeft, niet door de FTP van
het moment waarop het schema is gemaakt: 210w is een zwaardere sessie geworden
als de FTP sindsdien is gezakt, en dat hoort de belasting te zien. Alle vijf de
aanroepers geven nu een FTP mee (`compliance`, `completion`, `publish`,
`summary-writer`, trainer-overzicht); zonder FTP blijft een wattage-doel
onleesbaar en geldt de band van de intensiteit.

Effect op het nalevingspercentage van een sessie die exact volgens plan is
gereden:

| workout | oud | nieuw | loadPct oud |
| --- | --- | --- | --- |
| Duur 90' @68% | 54 | 69 | 128% |
| Tempo 75' (het geval van Jeroen) | 50 | 62 | 124% |
| Drempel 2×20, 75' | 56 | 80 | 143% |
| VO2max 5×4, 60' | 43 | 62 | 144% |

**Wat bewust niet is gebeurd.** De nalevingsband (`COMPLIANCE_LOW` 80,
`COMPLIANCE_HIGH` 115) blijft ongewijzigd. Ook met een correcte kwadratische
blok-som komt een perfect in ERG gereden workout rond de 105% uit: een gereden
rit meet TSS via het genormaliseerd vermogen over de héle rit, en NP is een
vierdemachtsgemiddelde, dat bij blokkig werk boven het kwadratische gemiddelde
van de losse blokken ligt. Dat is echte natuurkunde, geen fout — TrainingPeaks
heeft hetzelfde. Een expliciete variabiliteits-opslag van ~5% op de planning is
eerlijker dan de band oprekken, maar dat is een keuze over hoe streng het
oordeel moet zijn en die hoort niet in een bugfix.

Ook niet aangeraakt: dat ZWB alle historie omrekent met de húdige
`profiles.ftp_watts`, terwijl intervals.icu de FTP gebruikt die gold op de dag
van de rit. TSS schaalt kwadratisch met FTP, dus 5% FTP-verschil geeft 10%
TSS-verschil met terugwerkende kracht over de hele grafiek. Dat is de grootste
resterende bron van TSS-verschillen tussen ZWB en intervals; daarna komen
Strava's `weighted_average_watts` als NP (intervals rekent NP zelf uit de
stream) en `moving_time` versus de volledige activiteitsduur. Vraagt een eigen
ronde, want het betekent een FTP-historie bijhouden.

**Niet lokaal verifieerbaar.** De doorwerking naar intervals.icu (de
`trainingLoad` die `publish.ts` meestuurt) is niet getest — daarvoor is een
echte koppeling nodig. Bestaande, al gepubliceerde workouts houden daar hun oude
lagere waarde tot ze opnieuw worden gepusht.

### Opgeleverd — GPX downloaden vanaf de event-pagina

**2026-08-20, working tree.** Geen migratie.

**Waarom.** De GPX van een event was alleen te zien (kaart + hoogteprofiel),
niet te pakken. Wie de route op zijn fietscomputer wil zetten, moest het bestand
elders vandaan halen of erom vragen in de groep.

**Wat er staat.** Onder de kaart en het hoogteprofiel staat een download-icoon
(alleen als het event een GPX heeft), zowel in `RouteSection` als in de
liveticker van een event dat vandaag is — gedeeld component
`_components/gpx-download-link.tsx`. Het icoon stond eerst in de event-header
naast de deel-knoppen; daar was de link naar de route niet te leggen, want de
kaart staat een halve pagina lager. Het linkt naar een tweede
signed URL van dezelfde storage-bucket, aangemaakt met `download: <titel>.gpx`,
zodat Supabase `Content-Disposition: attachment` meestuurt en de browser het
bestand opslaat onder een herkenbare naam in plaats van de opaque storage-key.
De bestaande signed URL voor kaart/profiel blijft ongewijzigd — die wordt met
`fetch()` gelezen en mag geen attachment-header krijgen.

Bewust geen aparte route of eigen API-endpoint: de bucket is privé en de
bestaande RLS-policy ("event-gpx read authenticated") bepaalt al wie een signed
URL krijgt. Een eigen endpoint zou die check dupliceren.

**Niet gebouwd.** Geen downloadknop bij het verjaardagsrondje
(`/verjaardagen/[id]`), dat een eigen GPX-pad heeft — daar is nog geen vraag
naar. Ook niet op de publieke `/live/[eventId]`: de bucket is privé en leest
`authenticated`, en een download-URL daar zou de GPX buiten het ledenbestand
brengen. Geen teller of logging van downloads.
### Opgeleverd — opvolging van de doorlichting ZWBeter Worden

**2026-08-20, working tree.** Migratie `0135`. Rapport:
https://claude.ai/code/artifact/76570493-518f-4ef0-a6f7-8ced2c1ebb00

Een doorlichting van het werkelijke gebruik (33 leden, 79 generaties, acht weken
trainingen) leverde vier dingen op die niet met bouwen maar met meten aan het
licht kwamen. Dit is de opvolging; het plan staat in
`.claude/plans/maak-een-plan-gebaseerd-spicy-snowflake.md`.

**1. De dagelijkse cron heeft nooit gedraaid.** `training_adaptation_runs` was leeg —
nul rijen, terwijl elke aanroep daar schrijft. De runbook noemde een "externe
cron" die nooit is ingesteld. Daardoor bestonden de dagvoorstellen niet en draaide
het vangnet voor blijven liggen herzieningen (vorige ronde gebouwd) evenmin. Nu
een Netlify-functie in de repo (`netlify/functions/training-adaptations.mjs`,
per 2026-08-24 `30 8 * * *`), zelfde patroon als de live-cleanup en de health-check. De eigenaar
moet `TRAINING_ADAPTATION_SECRET` nog als env-variabele zetten; zonder die
variabele stopt de functie met een duidelijke melding.

**2. Een kwart van de AI-generaties liep vast.** 20 van de 79 stonden nog op
`queued`/`in_progress`, de oudste achttien dagen. Oorzaak: een
achtergrondgeneratie wordt pas een schema als iemand hem ophaalt, en dat deed
alleen de browser van het lid. `pollAiDraft` is gesplitst — de binnenkant heet nu
`finishAiGeneration(admin, generatie)` en werkt zonder sessie; `pollAiDraft` doet
de rechtencheck en roept hem aan. De cron maakt per nacht maximaal tien
achterstallige generaties af. Een generatie die niet meer op te halen is én ouder
dan een dag, wordt op `failed` gezet: OpenAI bewaart een achtergrondantwoord niet
eeuwig, en zonder die afsluiting zou de cron elke nacht dezelfde tien hopeloze
rijen proberen.

**3. De helft van de trainingen wordt niet gereden — en het systeem bleef
herzien.** 50 van de 56 achterstallige trainingen hadden die dag geen enkele rit.
Uitgesplitst vallen leden in twee groepen: vier rijden hun schema grotendeels,
drie raken het niet aan. Voor één van die drie draaiden twaalf generaties en zes
herzieningen bij nul gereden trainingen. Nieuw: `planIsBeingIgnored()` in
`compliance.ts` (puur, getest) en `planIsIgnored()` in `replan.ts`. Vier ongereden
trainingen op rij en `requestReplan` slaat over met reden `ignored`; de dagelijkse cron
doet hetzelfde, anders doet de nacht alsnog wat de dag weigert. Het verzoek blijft
in `training_replan_requests` staan, dus zodra het lid weer rijdt gaat het door.
In plaats van de stille herziening krijgt het lid één vraag op zijn schemapagina
(`plan-check-card.tsx`): *klopt dit schema nog?*, met knoppen naar het
bijwerkformulier en naar zijn doel.

**4. Beschikbaarheid was optioneel, en juist de twee leden zonder ingevulde
beschikbaarheid hadden de opvallendste schema's.** Zonder minuten per dag kent de
planner alleen dagen. De schuifbalken zitten nu ook in het doelformulier
(`availability-grid.tsx`, gedeeld met de kaart op de schemapagina); zonder ingevulde
tijd wordt het doel geweigerd. `available_days` wordt daaruit afgeleid in plaats
van los aangevinkt — die kolom blijft bestaan omdat oudere schema's erop leunen.
De standaardweek wordt alleen aangevuld, nooit overschreven: wie zijn
beschikbaarheid al had ingesteld, houdt die.

**5. Vijf van de twintig doelen waren dubbelklikken**, telkens twee seconden na de
vorige, één lid met drie identieke. Het formulier had een kale knop. Nu een
`useFormStatus`-knop die zichzelf uitschakelt, plus een weigering aan de serverkant
van een identiek doel binnen vijf minuten. Migratie `0135` ruimt de bestaande
kopieën op — alleen die zonder schema, want aan een doel met een plan hangt een
verwijzing.

**Naloper (`0136`).** `0135` gedraaid op 2026-08-20: twintig doelen werden er
achttien, maar er bleven drie dubbelen staan. De aanname klopte niet — het schema
hangt in de praktijk aan de *tweede* rij, want de trainer maakt het aan vanuit de
doelenlijst en pakt daar de onderste. `0135` bewaart altijd de oudste, dus bleef
die als doel zónder schema naast het echte staan. `0136` haalt zo'n wees weg als
er een identieke rij mét schema naast staat; is er in een reeks geen enkele rij
met een schema, dan blijft alles staan.

**6. 55 beoordelingen, 2 reacties van een trainer.** Bij het uitzoeken bleek het
reactieveld al te bestaan; de wrijving zat in de vindbaarheid. Elke trainerstab
werkte op één renner tegelijk (`?athlete=`), dus je moest elk lid apart aanklikken
om te ontdekken dat er iets wachtte. `/zwbeter-worden/trainer/beoordelen` gaat nu
over álle toegewezen leden, oudste eerst, met de naam van het lid per regel, en de
telbadge op die tab telt iedereen bij elkaar op.

**Niet lokaal te verifiëren.** Migratie `0135` is niet gedraaid (geen Docker of
Supabase-config). De cron zelf evenmin: dat vraagt een deploy plus de
env-variabele. Wel gecontroleerd met een leesquery dat de tien oudste
vastgelopen generaties precies de rijen zijn die de cron zou oppakken, en dat ze
allemaal een `openai_response_id` hebben. `npm run build`, `tsc`, `eslint` en de
volledige Vitest-suite (605 tests) zijn groen.

**Bewust niet in deze ronde.** Core, logboek en het zelf inplannen van ritten
(2, 0 en 3 gebruiken) — het core-advies staat sinds vandaag op het dashboard en
dat is de lopende meting; over vier weken opnieuw tellen. En de dertien doelen
zonder schema: een wachtrij op het trainerscherm is de logische stap, maar dat
scherm is deze ronde al verbouwd — eerst kijken of trainers de nieuwe wachtrij
gebruiken.

### Opgeleverd — de planner ziet nu hóé een lid zijn uren rijdt

**2026-08-20, working tree.** Geen migratie.

**Aanleiding.** Een lid meldde dat ze alleen nog lange trainingen kreeg. Bij het
uitzoeken bleek er niets stuk: haar doel is een bergrit van acht uur, haar
plafond staat op 15 uur per week, ze heeft geen beschikbaarheid ingevuld (dus
geen enkel plafond per dág), en ze rijdt zelf 19,8 uur per week. Alle regels
wezen dezelfde kant op.

Maar één ding zag de planner niet: ze rijdt die 19,8 uur in **13 ritten per
week** van gemiddeld 91 minuten. Hij kreeg alleen het weektotaal en goot dat in
drie blokken van gemiddeld 220 minuten. Twee leden met precies hetzelfde
weektotaal — de een zes keer een uur, de ander twee keer drie uur — kregen tot nu
toe hetzelfde schema.

**Wat er is veranderd.** `recentLoad` draagt nu ook `ridesPerWeek`,
`avgDurationMinutes` en `longestRideMinutes`, berekend in de pure
`summarizeRecentRides()` in `ride-metrics.ts` (met tests). De prompt kreeg twee
regels: verdeel het weekvolume over ongeveer evenveel dagen als het lid zelf
rijdt en houd de gemiddelde sessie in de buurt van wat het gewend is; en gebruik
`longestRideMinutes` als vertrekpunt voor de lange rit — daar mag één rit per
week overheen groeien als het doel dat vraagt, maar niet twee of drie in dezelfde
week.

**Tweede correctie in dezelfde functie.** `buildRecentLoad` telde élke
Strava-activiteit mee, ook hardlopen en wandelen. Dat is het getal waar de
ondergrens van een opbouwweek op rust ("plan nooit onder wat het lid al uit
zichzelf rijdt"), dus een hardloopblok tilde het fietsvolume op. Nu gefilterd op
`CYCLING_SPORTS`, dezelfde lijst die de rest van het platform gebruikt.

**Detail dat de data opleverde.** Er zijn leden met ritten zónder duur
(handmatig ingevoerd). Die tellen wel als rit maar niet in het gemiddelde; anders
zou zo'n lid "drie ritten van nul minuten per week" heten en zou de planner zijn
sessielengte dáárop afstemmen.

**Niet aangeraakt.** Het lid in kwestie had geen beschikbaarheid ingevuld, en dát
is de knop die haar het snelst helpt: met minuten per dag blijven doordeweekse
sessies kort en gaat het lange werk naar het weekend. Dat is bestaande
functionaliteit, geen nieuwe code.

### Opgeleverd — core-advies op het dashboard, met weekreeks

**2026-08-20, working tree.** Geen migratie.

**Waarom.** Het core-spoor stond alleen op zijn eigen pagina's en in een klein
blok op Vandaag. Wie via het dashboard binnenkomt — en dat is de meeste leden —
zag er niets van, en dan bestaat het in de praktijk niet.

**Wat er staat.** Op desktop naast de trainingsstatus (3fr/2fr; op mobiel onder
elkaar): de serie die vandaag wordt geadviseerd, met de eerste vijf oefeningen en
hun sets/herhalingen erbij. Een serietitel alleen zegt niet waar je aan begint,
en dit is op het dashboard het enige wat een lid van het core-spoor ziet.

Dezelfde loaders en dezelfde `recommendSeries()` als het blok op Vandaag, plus
het bestaande `loadDayContext()` — er kunnen dus geen twee verschillende
adviezen naast elkaar ontstaan. `recommendSeries()` is generiek gemaakt zodat hij
teruggeeft wat je erin stopt (mét items), in plaats van de kale `MobilitySeries`.

**De reeks.** Weken, geen dagen: het doel is twee sessies per week, dus een
dagteller breekt bij een correct uitgevoerd programma elke dag. `weeklyStreak()`
bestond al, maar zette de teller op nul zodra de lópende week het doel nog niet
had gehaald — elke maandagochtend "nog geen reeks" bij iemand die het al een
maand volhoudt, precies het tegenovergestelde van wat een teller moet doen. De
lopende week telt nu pas mee als hij vol is, maar breekt de reeks niet meer. Dat
werkt door op de core-pagina, die dezelfde functie gebruikt; daar was het net zo
goed verkeerd.

Naast de reeks staat de voortgang van deze week ("1 van 2 deze week"), zodat er
altijd iets concreets staat, ook bij een reeks van nul.

### Opgeleverd — ZWBasis en een groet op de klok van het lid

**2026-08-20, working tree.** Geen migratie.

**ZWB Home heet ZWBasis.** Voorlopige uitkomst van de naampoll; stond op één
plek in de code (de titel van het dashboard), dus dit is een naamswijziging van
één regel. Komt er uit de poll alsnog iets anders, dan is het weer één regel.

**Groet op het uur.** Het dashboard opende met "Hoi Bart"; dat is nu
"Goedemorgen, Bart" / "Goedemiddag" / "Goedenavond" / "Goedenacht", met de
gewone Nederlandse grenzen (6, 12, 18, 0 uur) in `src/lib/greeting.ts`.

Belangrijker dan de tekst is wélke klok telt. De server draait in UTC en weet de
tijdzone van het lid niet, dus die kán het niet goed hebben. Daarom rendert de
server het Nederlandse uur — goed voor verreweg de meeste leden, en identiek aan
wat de browser bij hydratie verwacht — en zet de client het daarna om naar de
eigen tijdzone (`_components/greeting.tsx`). Zonder die volgorde krijg je ofwel
een hydratiewaarschuwing, ofwel een dashboard dat een tel lang zonder groet
staat. Wie het dashboard open laat staan ziet de groet meeschuiven: er wordt elke
minuut gekeken of het uur is gewisseld.

`PageHeader.eyebrow` accepteert daarvoor nu een `ReactNode` in plaats van alleen
een string; verder verandert er niets aan die component.

**Bewust niet gedaan.** *De tijdzone in het profiel opslaan.* De browser weet hem
al en er is geen enkele andere plek die hem nodig heeft; een kolom die je bij
elke verhuizing moet bijhouden levert hier niets op.

### Opgeleverd — de "Let op"-regels bij de eerstvolgende workout

**2026-08-20, working tree.** Geen migratie.

**Waarom.** Vraag van een lid: "Ik heb vandaag en morgen 120 minuten beschikbaar
en krijg 90 en 60 voorgeschoteld, waar komt dat vandaan?" Het antwoord stond er
al — in de cautions van zijn schema: *"De eerste dagen zijn bewust rustiger
vanwege vermoeidheidssignalen"* en *"De weekbeschikbaarheid telt op tot 9 uur en
ligt onder het doelplafond van 12 uur"*. Alleen leven die regels in de
samenvatting van het schéma, en een lid dat naar zijn dag kijkt komt daar nooit.
Niet de duur was het probleem, maar dat de redenering onvindbaar was.

**Hoe.** `training_plans.summary` is één tekstveld waarin de omschrijving en de
cautions (elk met "Let op: " ervoor) zijn samengevoegd. `plan-summary.ts` haalt
ze er weer uit — en gebruikt hetzelfde `CAUTION_PREFIX` dat
`createPlanFromAiGeneration()` bij het samenstellen gebruikt, zodat het formaat
op één plek staat. De Vandaag-pagina toont ze onder de blokken van de
eerstvolgende workout, op `plan_id` van díe workout: een herziening draagt haar
eigen cautions, en dat is de generatie die deze dag heeft bepaald.

`memberCautions()` filtert eerst de regels die over de herplanning zelf gaan
("Herplanning is beperkt tot ...", "Concept ter review door de trainer") en kapt
af op vier. In de praktijk levert een generatie er zes tot acht op, met de
administratie bovenaan; zonder die filter duwt die het echte antwoord uit beeld.
Getest tegen letterlijke regels uit schema's van 19 en 20 augustus.

**Bewust tijdelijk.** Dit is de goedkope manier om mee te kijken of de
opbouwregels in de praktijk niet te streng uitpakken, over meerdere leden en
situaties heen. Zit dat vertrouwen er, dan kan het blok er in één keer uit:
`plan-cautions.tsx` weg, de `loadPlanCautions()`-aanroep uit
`zwbeter-worden/page.tsx` en klaar. `plan-summary.ts` mag blijven staan.

**Wat daarbij opviel.** De AI schrijft in cautions soms de namen van zijn eigen
invoervelden op: *"Er zijn geen gewijzigde randvoorwaarden in
planUpdate.changed"*, *"Omdat goal.type base_fitness is ..."*. Voor een lid is
dat onleesbaar. Eén promptregel ("noem in titel, samenvatting en cautions nooit
de namen van de invoervelden; schrijf voor het lid") lost dat bij de bron op;
bewust niet in deze ronde meegenomen, omdat die elke generatie raakt en deze
ronde juist buiten de AI moest blijven.

**Niet gebouwd, wel overwogen.** *Een korte "waarom" per workout laten
meegenereren.* Dat is het echte antwoord op de vraag van het lid — een zin onder
de titel, per training. Maar het raakt het antwoordschema van élke AI-flow en de
publicatie, dus dat is een eigen ronde. Eerst kijken of de schema-brede regels
al genoeg verklaren.

### Opgeleverd — logboek alleen voor vrouwelijke leden

**2026-08-20, working tree.** Geen migratie.

**Waarom.** Het klachtenlogboek is geschreven rond de cyclus: buikpijn, stemming,
de eerste dag markeren, cycluslengte die vanzelf volgt. Voor een man staan daar
vragen die niet over hem gaan, en dat maakt de rest van het logboek ook minder
serieus. Liever niets tonen dan iets tonen dat niet klopt.

**Hoe.** Een nav-item kan nu `onlyForSex` dragen (`_components/nav-config.ts`);
`filterNavForPermissions()` krijgt daarvoor het geslacht uit het profiel mee, in
het hoofdmenu én in de tabbalk van ZWBeter Worden. Alleen `sex = 'vrouw'` ziet
het item: wie niets heeft ingevuld of 'zeg ik liever niet' koos dus ook niet.
De pagina zelf controleert het opnieuw — een verborgen tabje is geen slot, en een
bookmark komt er anders gewoon uit. `/hulp#logboek` en de zoekindex zeggen nu
voor wie het is.

**Wat er bewust bleef staan.** Een lid dat het logboek eerder aanzette ziet op
die pagina nog de knop om het uit te zetten. Die knop bestaat nergens anders, en
zonder deze uitzondering zou zijn klachtensignaal voor altijd naar de planner
blijven gaan zonder dat hij er nog bij kan. Bestaande logregels laten we staan;
ze zijn van het lid zelf.

**Bewust niet gebouwd.** *Een mannenversie van het logboek.* Dat is een eigen
ronde: andere vragen (slaap, stress, belasting, blessuregevoel) en een eigen
onderbouwing, niet dezelfde lijst met de cyclusvragen eruit geknipt. Zolang die
er niet is, is verbergen eerlijker dan half tonen. Zie ook `docs/training-en-cyclus.md`
voor waarom er op klachten wordt gestuurd en niet op cyclusfase.

### Opgeleverd — beschikbaarheid per week, dagelijks vangnet + FTP-test in het schema

**2026-08-20, commit `3360f6b`.** Migraties `0131`-`0133`.

**Beschikbaarheid: de bug.** Werkte een lid zijn schema bij, dan paste de
planner álle toekomstige weken aan op de beschikbaarheid van déze week — ook
wanneer er voor volgende week iets anders was ingevuld. Oorzaak was één
argument: `availabilityForAi(admin, id, today)` laadde via `loadAvailability()`
precies één week (de rij van die maandag, anders de standaardrij), en
`TrainingAiInput.availability` was één platte `minutesByDay`. De promptregel
"plan op een dag nooit langer dan dat aantal minuten" gold daarmee voor elke
week tot de doeldatum. Erger nog: het opslaan van de beschikbaarheid van
*volgende* week trapte via `requestReplan()` een herziening af waarvan de input
die wijziging niet bevatte — een generatie die niets kon veranderen, en de
5-minuten-cooldown was op.

**Opgelost** met `loadAvailabilityRange(admin, profileId, from, to)`: één query
over het hele planvenster, teruggegeven als `{ default, weeks[] }` — alleen de
weken met een eigen rij, de rest valt op de standaardweek terug. De AI-input
heeft die vorm nu ook, en de prompt zoekt per workout de week op waarin de datum
valt. Alle drie de aanroepers geven een bereik mee: nieuw schema tot de horizon,
bijwerking tot de einddatum, dag-aanpassing tot het einde van deze week. Tests
in `tests/unit/availability.test.ts`.

**FTP-test: waarom.** De FTP was een getal dat je één keer bij je profiel
intypte en dat daarna nooit meer werd gemeten, terwijl élk wattage in een
workout eraan hangt (`blockToPowerTarget`). Een schema van acht weken rekende de
laatste weken dus met een waarde die het lid allang voorbij was — te laag, en
dus zonder prikkel. Kwam als feedback van een lid.

**Wat er is gebouwd.** Twee protocollen in `src/lib/training/ftp-test.ts`: een
ramptest (40 min, FTP = 75% van het hoogste minuutvermogen) en een
20-minutentest (65 min, FTP = 95% van het gemiddelde). Ruwe meting én afgeleide
FTP gaan de historie in (`training_ftp_tests`), want de omrekenfactor is een
afspraak en geen natuurwet. Drie ingangen:

- **Inplannen door de trainer**, op het schema-tabblad van het lid
  (`trainer/_components/ftp-test-planner.tsx`). De test wordt een workout met
  `origin 'member'` en `test_type`, dus hij overleeft elke herziening en de
  planner werkt eromheen. Eén openstaande test tegelijk. *Stond in de eerste
  versie van deze ronde bij het lid zelf; op 2026-08-20 verplaatst omdat wánneer
  je meet een keuze in de opbouw van het schema is, niet in de dag.*
- **Als basis van een nieuw schema**: keuze in het AI-conceptformulier van de
  trainer. De workout kan daar nog niet bestaan — er is nog geen plan om hem aan
  te hangen — dus hij gaat als vast blok mee in de AI-input en wordt pas bij het
  aanmaken van het plan een echte rij (`ftp_test_type`/`ftp_test_date` op de
  generatie-rij, `insertFtpTestWorkout()`).
- **Uit de workout-bibliotheek** (migratie `0133`), voor wie de test liever
  zelf ergens in de week zet. `training_workout_templates` kreeg daarvoor een
  `test_type`: zonder die kolom zou een test uit de bibliotheek een zware rit
  zijn zonder uitslagvraag. De twee bestaande standaardrijen ('Ramp-test',
  'FTP-test 20 min' uit `0107`) zijn vervangen door precies de protocollen uit
  de code, zodat er niet twee bijna-gelijke tests naast elkaar staan.
  'Test 2x8 min' blijft: dat is een andere test, geen FTP-meting.
- **De uitslag**, bij het lid op zijn eigen schemapagina
  (`_components/ftp-test-card.tsx`). Die schrijft de meting weg, zet
  `profiles.ftp_watts` en vraagt een herziening aan, zodat de wattages van de
  resterende weken op de nieuwe FTP staan. Dát is de hele reden dat een test in
  het schema staat. Dit blijft bewust bij het lid: het reed de test en kent het
  getal; het is geen beslissing maar een waarneming.

De prompt kreeg twee regels: hoe je om een `kind: 'ftp_test'` heen plant (dag
ervoor licht, dag erna geen sleutelsessie), en dat een FTP ouder dan acht weken
in `cautions` benoemd hoort te worden — de AI plant zelf nooit een test, hij
signaleert alleen dat er één nodig is, en die keuze ligt bij de trainer. `profile.ftpTestedOn` gaat daarvoor mee
in de input. Uitslagen staan als lijst op `/zwbeter-worden/vermogen` — sinds 2026-09-03 ook
te corrigeren en te verwijderen — en komt de
profiel-FTP uit een test, dan noemt de FTP-tegel die datum als bron. Uitleg op
`/hulp#ftp-test`, met zoekindex-regel.

**Bekende wrijving (opgelost 2026-09-11).** Staat het profiel op *bijhouden
vanuit intervals.icu* (`auto_sync_physique`), dan overschreef de eerstvolgende
vermogenssync de testwaarde met de eFTP van intervals. Sinds de ronde "FTP-test:
uitslag blijft invulbaar" hierboven gaat een test voor: de sync laat de FTP met
rust zodra het lid een testuitslag heeft. De waarschuwing bij het opslaan is weg.

**Dagelijks vangnet.** Bij het opslaan van je beschikbaarheid vraagt het lid
al meteen een herziening aan, maar die kan zijn overgeslagen: de cooldown van
vijf minuten in `replan.ts`, een achtergrondgeneratie die niemand ophaalde
(alleen de browser van het lid pollt `/api/training/ai-draft/[id]`), of een
mislukte call. De comment in `replan.ts` beloofde dat zo'n wijziging "bij de
eerstvolgende herziening" meekwam, maar niets vroeg die herziening dan alsnog
aan — een lid dat vier keer aan de schuifbalken zat, verloor de laatste drie
wijzigingen tot het toevallig iets anders deed. Die belofte klopt nu wel.

De dagelijkse cron (`/api/training/adaptations/daily`) draaide alleen voor leden met
een Strava-rit van de afgelopen dag, en gebruikte de dagprompt — die de verdere
toekomst juist met rust laat en een gewijzigde wéék dus niet kan verwerken. Hij
kijkt nu eerst of de beschikbaarheid nieuwer is dan de laatste keer dat het
schema die verwerkte (`availabilityNeedsReplan()` in `replan.ts`, vergeleken met
het aanmaken van het basisplan en de laatste geslaagde `plan_update`-generatie;
een dagaanpassing telt niet mee). Zo ja, dan draait er een volledige herziening
in plaats van het dagvoorstel — die kijkt naar dezelfde signalen en beslaat
meer, dus twee generaties voor één lid zou verspilling zijn.

Die herziening loopt **synchroon** (`runPlanUpdateNow()`, gedeeld met
`startPlanUpdate()` via `preparePlanUpdate()`): een achtergrondgeneratie moet
door iemand worden opgehaald voordat er een schema uit komt, en tijdens de automatische run kijkt
er niemand mee. Het resultaat wordt direct doorgevoerd, net als overdag — geen
voorstelkaart. Maximaal vijf per run, zodat de route niet tegen de
functietimeout loopt; wie er vandaag buiten valt is de volgende ochtend aan de beurt,
want de wijziging blijft nieuwer dan de laatste herziening.

Bijvangst: `saveWeekAvailability` schreef ook wanneer er niets was veranderd. De
touch-trigger zette `updated_at` dan vooruit, en daar leest de cron aan af of er
werk is — twee keer op Opslaan drukken zou zo elke nacht een generatie hebben
gekost. Nu slaat hij een ongewijzigde opslag helemaal over.

**Vangnet voor álle wijzigingen, niet alleen beschikbaarheid** (migratie `0132`).
De tijdstempel-afleiding hierboven werkt voor een gewijzigde rij, maar niet voor
een verdwenen rij: `syncEventWorkout()` **verwijdert** het blok als een lid zich
afmeldt, en `removeOwnRide()` (sinds 2026-09-11 `removePlannedWorkout()`) doet
hetzelfde met een eigen rit. Aan wat er niet
meer is valt niets af te lezen. Daarom legt `requestReplan()` het verzoek nu
zelf vast in `training_replan_requests` — één rij per lid, nieuwste reden wint,
zodat vier wijzigingen op één avond samen één herziening opleveren. De rij
verdwijnt in `createPlanFromAiGeneration()` zodra er een herziening uit is
gekomen, en alleen als het verzoek ouder is dan die generatie: wijzigde het lid
iets terwijl de AI werkte, dan zat dat niet in de invoer en blijft het verzoek
staan. De cron leest eerst dat verzoek en gebruikt de reden ervan in het
bijgewerkte schema; de afleiding op beschikbaarheid blijft ernaast staan als
terugval voor verzoeken die nooit zijn vastgelegd of van vóór `0132` dateren.

Faalt de herziening structureel — schema afgelopen, geen doel meer — dan wordt
het verzoek weggehaald in plaats van elke nacht opnieuw een poging te kosten. Een
mislukte AI-call laat het verzoek juist staan.

Daarbij twee gaten dichtgetrokken die er los van stonden: **afmelden voor een
clubevent vroeg helemaal geen herziening aan**, niet vanaf de schemapagina
(`declineClubEvent`) en niet vanaf de eventpagina (die replande alleen bij
`inserted`). Het blok verdween uit het schema en de vrijgekomen dag bleef leeg
liggen, terwijl de planner er juist omheen had gepland. Beide vragen nu een
herziening aan bij `removed`, en het lid ziet in de keuzemodule dat die dag
opnieuw wordt ingevuld.

**Bewust niet gebouwd.**
- *De uitslag ook in het beoordelingsvenster van een workout.* Twee invulplekken
  voor één meting geeft dubbele uitslagen; bovendien verschijnt dat venster
  alleen als er een Strava-rit aan te koppelen valt, en dan zou een lid zonder
  koppeling nergens terechtkunnen.
- *De AI zelf een test laten inplannen.* Hij kan geen `test_type` zetten, dus het
  zou een gewone zware workout worden zonder uitslagvraag. Hij benoemt het in
  `cautions`; de trainer kiest.
- *De trainer ook de uitslag laten invullen.* Kan technisch (de RLS van
  `training_ftp_tests` laat een trainer met `training.manage_assignments` toe),
  maar twee invulplekken voor één meting geeft dubbele uitslagen. Pas doen als
  blijkt dat leden hun uitslag laten liggen.
- *Meer dan drie weken in het beschikbaarheidsformulier.* De reeks ondersteunt
  het nu wel, maar vijf tabjes passen niet op een telefoonscherm. Pas doen als
  iemand er echt om vraagt.

**Niet lokaal te verifiëren.** Migraties `0131` (`test_type` op
`training_workouts`, `ftp_test_type`/`ftp_test_date` op
`training_ai_generations`, tabel `training_ftp_tests` met RLS), `0132` (tabel
`training_replan_requests`, bewust zonder schrijf-policies: alleen de
service-role zet en wist die rij) en `0133` (`test_type` op
`training_workout_templates` plus de twee FTP-tests in de bibliotheek, waarbij
de oude 'Ramp-test' en 'FTP-test 20 min' worden verwijderd) zijn niet gedraaid:
er is hier geen Docker of Supabase-config. Ook de dagelijkse herziening is niet end-to-end gedraaid —
daar hoort een cron-aanroep met een OpenAI-call bij; de logica eromheen is wél
getest (`tests/unit/replan.test.ts`). `npm run build`, `npx tsc --noEmit`,
`eslint` en de volledige Vitest-suite (575 tests) zijn groen.

Eén regel die daarbij hoort: een workout met `test_type` wordt door
`supersedableWorkouts()` nooit meer vervangen. Een test uit de bibliotheek draagt
`origin 'ai'` en zou anders bij de eerstvolgende herziening verdwijnen — met een
uitslagvraag zonder training als resultaat.

### Spike — uitslagen uit de Zwift-API (uitkomst: ja, voor drie van de vier)

**2026-08-20.** Geen code, geen migratie. Volledig verslag in
`docs/omnium-zwift-api-spike.md`.

**Conclusie.** Met het bestaande ZWB-club-serviceaccount geeft
`GET /api/race-results/entries?event_id={id}` de uitslag van een Zwift-event als
JSON: `rank`, `profileId` (de Zwift-ID), `eventSubgroupId` (de categorie) en
`activityData.durationInMilliseconds` — de tijd in **milliseconden**. Getest op
een echt afgelopen event; de nummers 1 en 2 scheelden daar 322 duizendsten.

Dat maakt de drie problemen uit de proefdraai op editie 7 in één klap
irrelevant: geen verschilnotatie meer om te parsen, precisie in milliseconden, en
renners op Zwift-ID in plaats van op naam. De inschrijvers per subgroep zijn
apart opvraagbaar (draait al in productie voor de kalender), dus de gastenvraag
is er ook mee opgelost: wie niet is ingeschreven valt eruit vóór het scoren.

**Wat er niet uit komt.** `segment-results` geeft 400/406 in elk wire-formaat, en
`type=SEGMENT` wordt genegeerd. De **Sprint Quali** (snelste tijd op een
KOM-segment) heeft dus geen bron; de **tussensprints van de Crit Royale** staan
per definitie in geen enkele uitslag. Die twee blijven handwerk — twee momenten
per uitzending in plaats van vier.

**Nog niet bewezen:** of de uitslag al tijdens het event binnendruppelt. Er stond
geen live event om op te testen; te bevestigen op de eerstvolgende clubrit.

**Gevolg voor de planning.** De plak-import blijft nodig als terugval en als
route voor de Sprint Quali, dus die is geen weggegooid werk. De volgende stap was
een `omnium/zwift-results.ts`; die is gebouwd in de editie-1-ronde (`af0a1aa`).

### Proefdraai Omnium op editie 7 (2025/26)

**2026-08-20; gecommit 2026-09-14.** Migratie `0134`.

**Wat.** De motor tegen een échte editie gelegd: uitslagen uit de Drive-sheet van
Race 7 door `parseOmniumResults` → `scoreParsedRows`, en het resultaat vergeleken
met de GC-tab van diezelfde sheet, die vorig seizoen met de hand is gescoord.
Vastgelegd als `tests/unit/omnium-race7.test.ts`, want dit is het enige materiaal
waarmee de puntenmotor tegen een uitkomst uit de praktijk te leggen valt.

**Uitkomst: 16 van de 17 renners exact gelijk**, over alle vier de onderdelen én
het totaal. De ene afwijking is de nieuwe tiebreak-regel zelf: Ángel Jiménez en
Radlrainer finishten in de Scratch op dezelfde weergegeven tijd, de oude sheet
brak dat op regelvolgorde, `tiePolicy: "high"` geeft ze allebei 18.

**Drie dingen die dat aan het licht bracht.**

(1) *De tijdkolom van ZwiftPower werd niet gelezen.* Een uitslag geeft één
absolute tijd voor de leider en daarna "+4.187s". Die cel viel niet onder
"tijd" en belandde daarmee in de **naam**: de renner heette "Jake Johnson 22:42
+4.126s" en er werd geen enkele tijd opgeslagen. Dat de punten desondanks
klopten was toeval — zonder tijd valt `rankWithinLeague` terug op de
regelvolgorde. Opgelost met `expandTimeDelta` + `applyDeltas` in
`parse-results.ts`: het verschil wordt herkend, en leiderstijd + verschil geeft
de echte tijd per league.

(2) *De tijdkolommen waren `int`.* In de Crit Royale van league A stonden acht
renners op "22:42" met 0,6 seconde ertussen — tussen de zevende en achtste zat
één duizendste. Als `int` werden dat acht keer 1362. De punten worden vóór het
opslaan berekend en klopten dus nog, maar de opgeslagen uitslag kon het niet
navertellen. `0134` zet `time_seconds` en `segment_seconds` op `numeric(9,3)`;
`standings.ts` en `public-data.ts` zetten die waarde nu om, want PostgREST
levert numeric als string.

(3) *Een niet-ingeschreven rijder verschuift de punten van iedereen eronder.*
Twee gasten reden de crit van editie 7 mee. De oude sheet haalde ze er vóór het
scoren uit; de import kent `omnium_entrants` alleen op de startlijstpagina en
scoort iederéén die in de plak staat. Met de gasten erin klopt nog maar 9 van de
17. Dat is een regelvraag, geen bug: **telt een gast mee of niet?** Tot dat
besluit er is legt de test het huidige gedrag vast.

**Nog open.** De weergegeven achterstand is boven de minuut in mm:ss ("+01:01"),
dus daar zijn de duizendsten wél weg; drie renners in league D staan zo op
dezelfde tijd terwijl ze het niet waren. Zolang de bron dat niet fijner geeft,
kan de motor daar niets aan doen — de vraag is of een plak met een expliciete
plaatskolom dan vóór de tijd moet gaan.

**Niet gedaan.** De keten is nog niet tégen de database gedraaid: parse → opslaan
→ stand → tiebreak loopt via `saveOmniumResults`, en dat schrijft in de
productiedatabase. De tabellen bestaan inmiddels wel (`0126`-`0130` zijn
gedraaid). Dat is de volgende stap, met een testeditie die niet gepubliceerd
wordt.

### Opgeleverd — ZWB Omnium als platformmodule (rondes 1–5)

**Ronde 1 (datamodel + puntenmotor) opgeleverd 2026-08-19, gecommit
2026-09-14.** Migraties `0126`-`0130`.

**Waarom.** Het Omnium draaide op een losse statische site (bron in OneDrive,
geen git, live op zwbomnium.netlify.app). Eén editie stond daar verspreid over
zeven HTML-bestanden zonder bron van waarheid, met minstens negen handmatige
bewerkingen per ronde. Het gevolg was zichtbaar: `rules.html` stond nog op
editie 3 terwijl de rest op editie 7 zat, en `index.html`, `rules.html` en de
eventpagina's noemden alle drie andere routes. Punten werden met de hand vanuit
ZwiftPower in Google Sheets gescoord en het seizoensklassement matchte renners
op naam. Vanaf 2026/27 komt daar een YouTube-uitzending en prijzen per
categorie bij; die opzet schaalt niet op handwerk.

**Nieuw format 2026/27.** Zes edities in plaats van wekelijks: elke tweede
zondag van de maand van oktober tot en met maart, 11:00 Nederlandse tijd,
voorbeschouwing 10:30. Data: 11 okt, 8 nov, 13 dec 2026 en 10 jan, 14 feb,
14 mrt 2027. Onderbouwing: dinsdag valt af omdat de ZRL daar rijdt (en in
oktober en maart is er geen enkele vrije dinsdag — het Omnium botste vorig
seizoen frontaal met de ZRL), donderdag om de WTRL TTT, zaterdag om de Zwift
Insider Tiny Races die hetzelfde format hebben. Overdag in plaats van 's avonds
omdat negentig minuten op intensiteit daar beter valt; 11:00 opent het veld
naar Azië en Oceanië en laat Noord-Amerika bewust vallen. Editie 4, 5 en 6
lopen naast Tour de Zwift en Zwift Games — week-lange etappevensters, dus een
aandachtsconflict en geen agendaconflict.

**Datamodelkeuzes.** `events` wordt hergebruikt voor één kalenderrij per editie
(90 minuten) plus de recon; de vier onderdelen leven in
`omnium_edition_events` en zijn nadrukkelijk géén losse kalenderitems, anders
vult de ledenkalender zich maandelijks met vier bijna identieke rijen.
`event_results` is bewust **niet** hergebruikt: dat contract is "één gescrapete
positie per deelnemer", terwijl de Omnium per renner en onderdeel ook punten,
status, segmenttijd, FAL-sprintpunten en een league nodig heeft — en die tabel
is op `authenticated` afgeschermd waar Omnium-uitslagen juist publiek moeten
zijn. De vorm van `zwift_rider_results` (migratie `0068`) is wel overgenomen.
`omnium_riders` is nieuw omdat een deelnemer zónder ZWB-profiel over edities
heen dezelfde persoon moet blijven; zonder stabiele identiteit is een
seizoens-GC niet betrouwbaar, en dat is precies waar het handwerk vandaan komt.

**RLS.** Nieuw patroon naast de bestaande twee: `anon` mag lezen, maar alleen
waar `published_at is not null`. Anders dan `/live` (overal
`createAdminClient()`) en `/profielen` (security-definer RPC's uit `0029`),
omdat de Omnium bedoeld-publieke content is; een echte anon-policy houdt
`revalidate` bruikbaar en zet de service-role niet in het pad van een pagina
die extern verkeer trekt. Schrijven blijft service-role-only.
`omnium_kit_codes` heeft **geen enkele leespolicy** — kitcodes zijn geheimen.

**Sportieve beslissingen (vastgesteld met Stijn).** Het reglement zegt
"40, 38, 36 … aflopend tot 1 punt", wat bij stappen van twee nooit op 1
uitkomt; opgelost met `tail: 1` bij Prologue en Scratch (elke finisher buiten
de tabel krijgt één punt) en `tail: 0` bij Sprint Quali en Crit Royale. Bij een
gelijke positie krijgen beide renners de hoogste punten (`tiePolicy: "high"`).

**Nog te bevestigen vóór editie 1:** de tiebreak. Die bestond niet en met
prijzen per categorie kan dat niet meer. Voorstel staat in
`src/lib/omnium/scales.ts` als data: per editie punten → Crit Royale →
overwinningen → countback → gedeelde plaats; per seizoen punten → aantal
edities → overwinningen → countback → laatste editie → gedeelde plaats.
Achteraf een tiebreak invoeren die een gepubliceerde uitslag wijzigt is erger
dan geen tiebreak.

**Bewust niet gebouwd in deze ronde.** Geen UI — de motor eerst, omdat dat het
enige is dat lokaal hard te bewijzen valt. Geen ZwiftPower-scraping (staande
ToS-keuze); de plak-import wordt de productieroute en de Zwift-API krijgt een
spike met open uitkomst, getest op editie 1 zelf. Geen import van de
GC-sheet van vorig seizoen: die is afgeleid, en hem overnemen zou juist de
fout verstoppen die de herberekening moet vinden.

**Niet lokaal geverifieerd.** De migraties `0126`-`0130` zijn niet gedraaid —
er is geen lokale Supabase en geen Docker. Ze zijn alleen op leesbaarheid en
idempotentie beoordeeld. Datzelfde geldt voor het anon-RLS-gedrag en voor de
afscherming van `omnium_kit_codes`; beide moeten na deploy handmatig worden
nagelopen. Wel groen: `npm run test` (527 tests, waarvan 45 nieuw),
`npx tsc --noEmit`, `npm run lint` en `npm run build`.

**Ronde 2 (beheerscherm + seizoensplanner + editiegenerator) opgeleverd
2026-08-19, gecommit 2026-09-14.** Geen migraties.

Nieuw: `/beheer/omnium` met seizoenskeuze, een seizoensplanner die de zes
concept-edities in één keer neerzet, en een editielijst met publiceren. Plus
`/beheer/omnium/[editie]` om per editie de titel, slug, intro, YouTube-URL,
recon en de vier onderdelen (route, wereld, afstand, rondes, duur, pauze,
Zwift-event-ID, tussensprints) te vullen, met live preview van de vier
starttijden. Menu-item in `ADMIN_NAV` achter het nieuwe recht `omnium.manage`.

**Drie keuzes die afwijken van het bestaande ZRL-patroon, met reden.**
(1) `importZrlRound` dedupliceert in code omdat er geen unieke index is; hier
zijn die er wel, maar een blinde upsert zou het handwerk van de beheerder
overschrijven. Daarom leest `planSeasonEditions` eerst wat er staat, vult
alleen aan, en schuift bestaande edities hooguit in tijd — titel, slug en
routes blijven. (2) Alle schrijfacties lopen via `createAdminClient()`, omdat
de Omnium-tabellen geen write-policy hebben; het recht wordt daarvoor op de
RLS-client gecheckt in `requireOmniumAccess`. (3) Publiceren maakt het
kalenderitem aan (van de voorbeschouwing tot het einde van de Crit Royale);
**depubliceren verwijdert dat kalenderitem bewust niet**, want daar kunnen al
RSVP's en chatberichten aan hangen en een zichtbaarheidsknop mag geen data
weggooien.

**Bewust niet in deze ronde.** Geen pushnotificatie of Discord-bericht bij
publiceren — dat is ronde 7, en een publieke post hoort een expliciete knop met
preview te zijn. Geen uitslagenscherm; dat is de volgende ronde. Geen
uitlegtekst in de formulieren, conform de copy-conventie.

**Niet geverifieerd.** `npm run build` registreert `/beheer/omnium` en
`/beheer/omnium/[editie]`, en `tsc`, `eslint` en de 527 tests zijn groen. Maar
de schermen zijn **niet in een browser doorlopen**: zonder sessie stuurt de
middleware door naar `/login`, en de tabellen `omnium_*` bestaan nog niet omdat
de migraties `0126`-`0130` niet gedraaid zijn. Eerste echte test is dus na het
toepassen van die migraties: seizoen aanmaken → plannen → editie vullen →
publiceren → controleren dat het kalenderitem klopt en dat een uitgelogde
bezoeker een concept niet ziet.

**Los opgemerkt:** Next.js 16.2.6 waarschuwt dat de `middleware`-conventie
verouderd is en `proxy` heet. Raakt `src/middleware.ts` en
`src/lib/supabase/middleware.ts`, staat los van het Omnium. (Op 2026-09-21
bewust geparkeerd; zie "Bekende open dingen".)

**Ronde 3 (plak-import + klassement) opgeleverd 2026-08-19, gecommit
2026-09-14.** Eén migratiewijziging: `0128` kreeg alsnog `wins` en
`positions` op `omnium_edition_standings` (zie hieronder). `0128` was nog
nergens toegepast, dus dat kon in het bestaand blijven.

Nieuw: `src/lib/omnium/parse-results.ts` (tolerante parser), `import.ts` (brug
naar de puntenmotor), `standings.ts` (herberekenen en bewaren), en
`/beheer/omnium/[editie]/uitslagen` met per onderdeel plakken → voorbeeld →
opslaan, plus de stand per league en een herbereken-knop. Dit vervangt het
handmatig scoren in Google Sheets.

**De parser sorteert kolommen op hun vorm, niet op hun plaats.** Hij kiest zelf
het scheidingsteken (tab, puntkomma, dubbele spatie, komma — komma als laatste
omdat namen er zelf een kunnen bevatten), herkent tijden, statussen
(DNF/DNS/DSQ), Zwift-ID's en leagues, en vult een losse kleur aan tot de
gepaarde league: "RUBY" wordt `DIAMOND-RUBY`. Wat hij niet snapt komt als
melding terug in plaats van stil te verdwijnen. Vier invoervormen:
finishvolgorde, segmenttijd, kant-en-klare critpunten, en sprint-/finishblokken
waarbij de motor de FAL-punten zelf uitdeelt.

**Drie correcties op eerdere aannames.**
(1) De CSV van de oude Google Sheet heeft een lege Team-kolom. De
regelsplitser gooide lege tokens weg — prima voor geplakte uitslagen, fataal
voor een CSV, want dan schuift elke puntenkolom een plaats op. Er is nu een
aparte `splitCsvRow` die lege cellen behoudt en quotes aankan.
(2) De seizoenstiebreak telt overwinningen *per onderdeel* en doet een
countback op de beste klasseringen, maar die informatie stond niet in
`omnium_edition_standings`. Zonder `wins` en `positions` zou de GC-tiebreak
stilzwijgend editie-rangnummers hebben vergeleken — iets anders dan wat er in
het reglement staat. Kolommen toegevoegd aan `0128`.
(3) `scoreStoredEdition` draait de crit-nulregel eerst terug en past hem dan
opnieuw toe. Zonder die reset blijft een renner die eenmaal op nul is gezet
daar staan, ook nadat zijn ontbrekende uitslag alsnog is ingevoerd — precies
het scenario van een avond waarop de onderdelen los binnenkomen.

**Ontwerpkeuzes.** De preview gebruikt exact dezelfde rekenweg als het opslaan
(`scoreParsedRows`); een preview met een eigen berekening is niets waard, want
dan bevestig je iets anders dan je ziet. Opnieuw importeren van een onderdeel
vervangt (delete + insert) in plaats van te upserten, zodat een gecorrigeerde
uitslag geen renners laat staan die er niet meer in horen. Renner-matching gaat
eerst op Zwift-ID, dan op genormaliseerde naam, en nooit fuzzy — dezelfde
terughoudendheid als `zwb-detection.ts`. `matched_via` legt per resultaat vast
welke van de twee het was; dat is straks het verschil tussen een harde match en
een die bij de historische import nagelopen moet worden.

**Bewust niet in deze ronde.** Geen `mergeRiders`-UI: de server action bestaat
en wordt automatisch na een samenvoeging doorgerekend, maar het scherm ervoor
heeft pas zin bij de historische import, want daar ontstaan de dubbelen. Geen
sheet-CSV-importknop om dezelfde reden — de parser kan het al
(`parseSheetCsv`), de UI volgt bij ronde 11.

**Niet geverifieerd.** 553 tests groen (73 nieuw), `tsc`, `eslint` en
`npm run build` schoon, en de drie routes staan in de buildoutput. Maar net als
ronde 2 is er **niets in een browser doorlopen**: geen sessie en de
`omnium_*`-tabellen bestaan nog niet. De hele keten plakken → voorbeeld →
opslaan → stand is dus nog nooit tegen een echte database gedraaid; dat is de
generale repetitie die vóór 11 oktober moet gebeuren.

**Ronde 4 (publieke `/omnium`-pagina's) opgeleverd 2026-08-19, gecommit
2026-09-14.** Geen migraties.

Nieuw: `src/app/omnium/` met een eigen Engelstalige layout en de pagina's home,
`regels`, `inschrijven`, `klassement`, `[editie]`, `[editie]/uitslag` en
`[editie]/startlijst`. Plus `src/lib/omnium/public-data.ts` als leeslaag en
`src/lib/supabase/public.ts` als derde Supabase-client. `/omnium` staat in
`PUBLIC_PATHS` en de menu-link wijst niet langer naar zwbomnium.netlify.app maar
naar `/omnium`.

**Waarom een derde Supabase-client.** `server.ts` leest cookies en maakt de
route daarmee per definitie dynamisch; `admin.ts` zou de service-role in het pad
van publiek verkeer zetten. `createPublicClient()` leest als `anon`, valt dus
precies binnen de policies die alleen gepubliceerd materiaal vrijgeven, en maakt
de pagina's cachebaar. Resultaat in de buildoutput: `/omnium`,
`/omnium/inschrijven` en `/omnium/regels` zijn statisch met 5 minuten
revalidate.

**Twee dingen die de React-compiler-lintregels afdwongen, en allebei terecht.**
`Date.now()` mag niet tijdens het renderen van een servercomponent worden
aangeroepen; "welke editie is de eerstvolgende" hoort sowieso in de leeslaag en
staat nu in `loadFeaturedEdition`. En `LocalTime` gebruikt
`useSyncExternalStore` in plaats van een effect met `setState`, wat de
canonieke manier is om na hydratie iets anders te tonen dan op de server.

**Fout die het browseronderzoek blootlegde.** De leeslaag negeerde de
query-error en gaf bij een mislukte query hetzelfde lege resultaat als bij "nog
niets gepubliceerd". Een ontbrekende tabel of een te strakke RLS-policy zou er
dus uitzien als een normale lege pagina — de stilste manier om een storing te
missen. Elke loader logt nu `[omnium] … mislukt` met de databasefout.

**Geverifieerd in de browser, tegen de draaiende dev-server:** `/omnium` en
`/omnium/klassement` laden **zonder login** (dus `PUBLIC_PATHS` klopt), de
metadata-template werkt (`Season standings — ZWB Omnium`), de Engelstalige nav
rendert, en er zijn geen consolefouten. Verder 553 tests, `tsc`, `eslint` en
`npm run build` groen, met alle tien Omnium-routes in de buildoutput.

**Niet geverifieerd.** De e2e-assertie dat `/omnium`, `/omnium/klassement` en
`/omnium/regels` zonder login laden is toegevoegd aan
`tests/e2e/smoke.spec.ts`, maar **kon niet gedraaid worden**: Next 16 weigert
een tweede dev-server voor dezelfde map, en er draaide er al een op poort 3000.
Die is niet afgesloten omdat het niet mijn proces is. Draai
`npm run test:e2e -- --grep omnium` zodra die server uit staat. De inhoud van
die assertie is wel handmatig bevestigd (zie hierboven). Verder is er nog geen
enkele pagina met échte data gezien: er is nog geen gepubliceerd seizoen, dus
alles toont de lege staat.

**URL-keuze besloten op 14 september.** De publieke routes worden Engels:
`/omnium/rules`, `/omnium/standings`, `/omnium/register`,
`/omnium/[editie]/results` en `/omnium/[editie]/startlist`. De Nederlandse
paden krijgen permanente redirects zodat gedeelde links blijven werken.
Deze omzetting staat in de afgeronde lokale ronde van 15 september; deploy volgt
pas na de ontbrekende productie-inrichting.

**Generale repetitie tegen de echte database, 2026-08-19.** De migraties
`0126`-`0130` zijn door Stijn toegepast. Daarna is de hele keten één keer
doorlopen met een gemarkeerd testseizoen, dat na afloop weer is verwijderd
(gecontroleerd: nul testrenners, nul uitslagen, nul kalenderitems, nul
kitcodes). Vastgelegd als `tests/unit/omnium-live.test.ts`, standaard
overgeslagen en te draaien met `OMNIUM_LIVE=1`; met `OMNIUM_KEEP=1` blijft de
data staan om de publieke pagina's te bekijken.

Daarmee is alles bevestigd wat eerder in dit document als "niet lokaal te
verifiëren" stond:

- Het schema klopt: zes edities × vier onderdelen komen door alle constraints.
- De puntenmotor levert tegen echte data exact de verwachte stand
  (116 / 113 / 98 / 0) met de juiste rangorde.
- De crit-nulregel werkt end-to-end: een renner die alleen de Crit Royale reed
  staat op 0 met `points_raw` 12 en `voided_reason = 'no_other_race'`.
- **De anon-RLS klopt**: een uitgelogde bezoeker ziet de gepubliceerde editie
  wel en de vijf concept-edities niet — ook zichtbaar op de publieke
  seizoenskalender, die maar één ronde toont.
- **`omnium_kit_codes` is voor niemand leesbaar** behalve de service-role.
- `/omnium`, `/omnium/klassement` en `/omnium/regels` geven 200 zonder login;
  de e2e-assertie draait nu wél (`npm run test:e2e -- --grep omnium`). Die kon
  eerder niet omdat Next 16 geen tweede dev-server voor dezelfde map toestaat.

**Twee fouten die alleen door het bekijken van de gerenderde pagina naar boven
kwamen, allebei gerepareerd:**
(1) De geparseerde tijd bereikte de database nooit. `ScoredResult` had wel
`timeSeconds` maar geen `timeText`, dus de tijdkolom op de uitslagpagina bleef
leeg — bij een tijdrit is dat precies de informatie waar het om gaat. `timeText`
loopt nu door parser, motor, opslag en herberekening heen.
(2) De Crit Royale stond in willekeurige volgorde wanneer de bron alleen punten
geeft en er dus geen klassering is. De publieke uitslag sorteert nu aflopend op
punten als tweede sleutel.

**Wat hiermee nog niet getest is:** de beheerschermen zelf. Het aanmaken van een
seizoen is via het formulier gelukt (het seizoen `2026-27` staat in de database),
maar plannen, een editie vullen, publiceren en uitslagen plakken zijn nog niet
door een mens doorgeklikt — het integratiescript spiegelt de databasestappen van
die server actions, maar niet de React-kant. Dat blijft over voor Stijn.

**Ronde 5 (livestream-basis) opgeleverd 2026-08-19, gecommit 2026-09-14.** Geen migraties.

Nieuw: `/omnium/[editie]/live` met de stream-embed, de aftelling naar de
voorbeschouwing en de start, een voortgangsbalk van vier onderdelen
(gescoord / nog te komen) en de meelopende stand per league. Plus de
componenten `Countdown` en `AutoRefresh`, en een aftelling en "Watch live"-link
op de homepage en de editiepagina.

**Verversen zonder realtime.** De stand verandert vier keer per uitzending — na
elk afgerond onderdeel — dus een websocket zou niets toevoegen. De pagina heeft
`revalidate = 15` en de client pollt elke 20 seconden. Gevolg: hoeveel kijkers
er ook zijn, de database ziet één query per cachevenster.

**Aftelling zonder effect-cascade.** Zowel `Countdown` als `LocalTime` gebruikt
`useSyncExternalStore`. Een effect met `setState` zou hier een cascade-render
zijn en wordt door de React-lintregels afgekeurd; de serversnapshot zorgt er
bovendien voor dat server en client hetzelfde eerste beeld renderen.

**Geverifieerd tegen de echte database**, via het integratiescript met
`OMNIUM_KEEP=1` en daarna in de browser:
- Volledige editie: vier onderdelen "Scored", stand 116 / 113 / 98 / 0.
- **De tussenstand-situatie waar de pagina voor bedoeld is**: met de Crit
  Royale eruit toont de pagina drie keer "Scored", één keer "To come", de
  banner "After 3 of 4 events" en een herberekende stand (98 / 96 / 88) waarin
  Anna leidt — de Crit draait dat later nog om. De renner die alléén de Crit
  reed verdwijnt dan terecht uit de stand.
- De aftelling loopt, met de voorbeschouwing precies dertig minuten vóór de
  eerste start.

Het integratiescript is uitgebreid met een assertie voor die voorlopige stand en
is nu herhaalbaar (het ruimt een vorige run zelf op). Testdata na afloop
gecontroleerd verwijderd.

**Bewust niet in deze ronde.** De OBS-overlay staat volgens de fasering in ronde
8, samen met het commentatoren-draaiboek. Dat blijft zo, maar het is het
overwegen waard om hem naar voren te halen: voor de eerste uitzending op
11 oktober is een browserbron met de stand in beeld waarschijnlijk waardevoller
dan de publieke live-pagina.

**Daarmee stond de oorspronkelijke livestream-basis.** Dit dekt niet het op
14 september aangeleverde uitgebreidere editie-1-plan: Zwift-startlijst en
uitslagen, overlay, prijzen, historie en productie-inrichting ontbreken daar nog.
Ook moet de beheerketen met de hand worden doorlopen. Het oude integratiescript
spiegelt de databasestappen van de oorspronkelijke server actions, niet de React-kant.

**Volgende rondes (stand 2026-09-21):** Zwift-uitslagen, startlijst via
Zwift-entrants, overlay en prijzen zijn gebouwd in de editie-1-ronde (`af0a1aa`).
Nog open: communicatie, historische import en het uitfaseren van de oude site. De
productie-inrichting staat in "Actieve volgorde" bovenaan.

**Review en commit, 2026-09-14.** Rondes 1–5 en de proefdraai stonden bijna vier
weken alleen in de working tree, terwijl `0126`-`0130` en `0134` al in productie
gedraaid waren: een verloren werkmap had de code gewist waar de database op rekent.
Gecommit als `c5d344d` en gepusht 2026-09-14; daarmee staat het Omnium live. Tegen de huidige code opnieuw gecontroleerd:
`tsc`, `eslint`, 74 Omnium-tests (6 live-tests standaard overgeslagen) en
`npm run build` groen, met alle elf routes. Beveiliging nagelopen: alle zeven
beheeracties roepen `requireOmniumAccess` aan; RLS staat op alle tabellen;
`omnium_kit_codes` heeft geen policy; de live-test schrijft alleen met
`OMNIUM_LIVE=1`; `omnium.manage` staat in productie bij board en community_manager,
gelijk aan `DEFAULT_ROLE_PERMISSIONS`.
**Bewust behouden, bevestigd op 14 september:** `omnium_riders` is voor `anon`
volledig leesbaar (`using (true)`), inclusief Zwift-ID en renners die alleen in
een concept-editie staan. Dit is volgens het aangeleverde plan de keuze van Stijn.
**Keuzes bevestigd in het plan van 14 september:** gasten zonder inschrijving
voor het onderdeel tellen niet mee; zonder beschikbare startlijst telt iedereen
mee met een melding. Publieke URL's worden Engels, Nederlandse paden verwijzen
permanent door. `omnium_riders` blijft publiek leesbaar. De basis stond volgens
de aangeleverde productiestatus al live met het Club-menu op `/omnium`.
Tiebreakbevestiging en productie-inrichting blijven open; zie de status van
15 september bovenaan. De nieuwe implementatieronde is nog niet gedeployd.
`package-lock.json` (npm-bijeffect) en de mappen `output/`, `outputs/` en
`.claude/` zijn bewust niet meegecommit.

### Opgeleverd — pacingplan bij events (rondes 1–6)

**2026-08-31.** (Inmiddels gecommit en live.) Migraties `0144` en `0145`. Nieuwe bestanden:
`src/lib/events/zwift-route-streams.ts`, `src/lib/events/zwift-route.ts`,
`src/lib/events/zwift-route-sync.ts`, `src/app/(app)/beheer/zwift-routes/`,
`tests/unit/zwift-route-streams.test.ts`, `tests/unit/zwift-route.test.ts`,
`docs/zwift-routeprofiel-spike.md`, de twaalf modules in `src/lib/pacing/` met
hun tests (`pacing-cp`, `pacing-w-prime`, `pacing-durability`,
`pacing-route-profile`, `pacing-plan`, `pacing-similarity`, `pacing-adopt`,
`pacing-stale`, `pacing-share`), `/events/[id]/pacing` met zijn componenten en
acties, en de twee API-routes onder `src/app/api/events/[id]/pacing/`. Gewijzigd: het
eventformulier en zijn actions, de bewerkpagina, `external-scan.ts` (`routeId` in
`ZwiftEventApiRow`) en de beheernavigatie.

**Wat en waarom.** Een lid dat inschrijft op een event weet niet met welk vermogen
het moet rijden. Er stond al een ruwe temposchatting in het weerblok van de
eventpagina (`RouteWeather`: één basis-w/kg-slider plus een override per klim),
maar die vertrekt van een generieke `FTP × 0,72`, kent de anaerobe reserve van het
lid niet, kijkt niet naar eerdere ritten en wordt nergens bewaard. Het doel is een
**pacingplan per lid per event**: voorstel uit routeprofiel + eigen data
(vermogenscurve, CP/W′, vorm, vergelijkbare ritten uit het verleden mét
verwijzing), accenten gelegd door de AI binnen door ons opgelegde grenzen, en
daarna zelf bij te schuiven. Voor Zwift-events zonder dat het lid een .gpx uploadt.

**Ronde 1 was de spike** die de hele Zwift-tak draagt. Zie
`docs/zwift-routeprofiel-spike.md`. Vier dingen staan geverifieerd vast:
`us-or-rly101.zwift.com/api/public/events/{id}` is zonder login bereikbaar en geeft
`routeId`/`laps`/`distanceInMeters`; alle 320 routes in `zwift-data` (al een
dependency) hebben dat `id`; 263 van de 279 fietsroutes hebben een
`stravaSegmentId`; en `segmentsOnRoute` levert de klimmen en sprints van een route
met naam en kilometrering, zodat er voor Zwift-routes géén klimdetectie nodig is.

**De spike is gedraaid en geslaagd.** Alle vier de testroutes gaven zowel een
`altitude`- als een `latlng`-stream; de afstand week maximaal 1,3 % af. De
hoogtemeters komen structureel iets lager uit dan `zwift-data` opgeeft (−0,1 % op
Road to Sky tot −26 % op Tempus Fugit), en dat hoort zo: smoothing telt ruis niet
als hoogtewinst. Op een vlakke route is dat percentage misleidend — Tempus Fugit
heeft 26 hm over 17 km, dus zeven meter is meteen 26 %. Daarom heeft de hoogtetoets
naast de 20 %-marge nu ook een absolute ondergrens van 15 m.

**Ronde 2 — routebibliotheek en eventlink.** Migraties `0144_zwift_routes.sql`
(routebibliotheek met profiel op 25 m en vorm op 100 m) en
`0145_event_route_link.sql` (`events.zwift_event_id`, `zwift_route_id`, `laps`).
Nieuw: `src/lib/events/zwift-route.ts` (eventlink parsen, publiek event ophalen,
`routeId` → route, accenten uit `segmentsOnRoute`, totalen over lead-in plus
ronden) en `src/lib/events/zwift-route-sync.ts` (gechunkte sync, 200 ms pauze, stoppen op 429
met een teller voor de volgende klik). Die sync begrenst zichzelf op een
**wandklok van 7 s** in plaats van op een vast aantal routes — hetzelfde als
`followZwbMembers`: hoeveel routes er in een Netlify-functie van 10 s passen hangt
van de Strava-responstijd af, dus een aantal vooraf kiezen is gokken. `/beheer/zwift-routes` heeft
nu naast de spike-knop een "Routes ophalen"-knop met statusoverzicht, en het
eventformulier een veld "Zwift-eventlink" dat route, ronden, afstand en
hoogtemeters invult. Een route wordt bij het ophalen alvast als rij in
`zwift_routes` gezet, anders houdt de foreign key niet voordat de sync heeft
gedraaid. Tests: `tests/unit/zwift-route.test.ts` (18) en
`zwift-route-streams.test.ts` (14).

**Ronde 3 — de rekenmotor.** Geen migratie, geen scherm: zeven pure modules in
`src/lib/pacing/` met 70 tests eromheen.

- `route-profile.ts` maakt van een .gpx-route en een Zwift-route hetzelfde
  begrip: segmenten met gradiënt plus de accenten. De gpx-tak hergebruikt
  `sampleRoute` (en daarmee exact de segmenten die het rit-weer al gebruikt); de
  Zwift-tak rolt het profiel uit de bibliotheek uit over lead-in en ronden.
- `cp.ts` bepaalt CP en W′ met een bron-label dat de UI toont: intervals.icu,
  anders een regressie op de vermogenscurve (P = W′/t + CP is lineair in 1/t),
  anders FTP, anders een clubbrede schatting. Een fit die buiten de
  fysiologische grenzen valt wordt verworpen in plaats van getoond.
- `w-prime.ts` rekent de anaerobe balans door met Skiba's differentiële model,
  inclusief de tijdconstante die van het verschil met CP afhangt — met een vaste
  τ zou een renner die net onder CP rijdt even snel herstellen als een die
  stilstaat.
- `durability.ts` laat CP meezakken met het verzette werk, gefit op de
  vermoeidheidscurves die al in `rider_power_profiles.curve_points_fatigue`
  staan. Begrensd op 25 % afname: een curve op een hoge kJ-drempel steunt vaak
  op een handvol ritten. Zonder die curves gebeurt er niets.
- `plan.ts` vertaalt tussen planstukken en segmentraster, begrenst elk stuk op
  `CP + W′/t` (of lager, waar de gemeten curve dat zegt) en schaalt de pieken
  terug tot de reserve de finish haalt.
- `baseline.ts` is het deterministische voorstel: basisintensiteit naar duur,
  opslag per klim naar lengte, steilte en rennerstype. Dat is tegelijk het
  vertrekpunt voor de AI en de terugval als die faalt.
- `similarity.ts` scoort eerdere ritten op afstand, hoogtemeters per kilometer,
  langste klim en rijduur, en levert de reden in gewone taal mee.

**Twee dingen gingen onderweg mis en zijn gerepareerd.** Bij het aaneenschakelen
van ronden werd het verkeerde punt weggelaten, waardoor per rondeovergang ruim
een hoogtemeter verdween — bij tien ronden telt dat op. En een stuk route dat het
plan niet noemde kreeg de mediaan van de geplande doelen; dat maakte van een gat
in het plan stilzwijgend een inspanning die de W′-balans leegtrok. Nu geldt het
laagste doel uit het plan. Beide staan vast in een test.

**Ronde 4 — AI, opslag en het scherm.** Migratie `0146_event_pacing_plans.sql`
(`event_pacing_plans` + `event_pacing_generations`). Nieuwe env-variabele
`OPENAI_PACING_MODEL`, met terugval op `OPENAI_TRAINING_MODEL`.

- `ai.ts` + `prompt.ts` volgen `training/ai.ts`: Responses API, strict
  `json_schema`, background met polling. De prompt legt de rolverdeling vast —
  het model kiest wáár de accenten liggen en waarom, wij rekenen door of het kan.
- `adopt.ts` is de reparatielaag daartussen. Het schema garandeert de vórm van
  het antwoord, niet dat de stukken de route dekken: een model schrijft "km 8 tot
  10" en daarna "km 9 tot 14", of vergeet de laatste vijf kilometer. Overlap
  wordt ingekort, gaten worden gevuld met het láágste doel van de buren, en pas
  daarna gaan de stukken door `clampPlan` en `rebalancePlan`.
- `route-loader.ts` haalt het parcours op uit beide bronnen. De gpx-tak gebruikt
  de server-veilige regex-parser (`parseGpx` vereist DOMParser) en respecteert de
  handmatige `event_climbs`-overrides, net als de routesectie op de eventpagina.
- `draft.ts` bouwt de modelcontext: parcours, renner, vorm, vergelijkbare ritten,
  én het doorgerekende basisvoorstel. Dat laatste is er met opzet — een model dat
  met een leeg vel begint verzint een verdeling, een model dat een doorgerekend
  voorstel ziet verbetert er een.
- `store.ts` schrijft de generatie-rij vóór de call vertrekt en slaat idempotent
  op. `staleness.ts` en `share.ts` zijn puur en getest.
- Scherm: `/events/[id]/pacing` met hoogteprofiel, accentbanden, W′-balanslijn,
  een SVG-routevorm voor Zwift (geen Leaflet: voor Watopia bestaat geen
  kaartlaag), een schuifregelaar per stuk die **clientside** herrekent, de
  vergelijkbare ritten, en de gedeelde plannen van clubgenoten.

**Delen.** Opt-in per plan. Wat naar buiten gaat staat expliciet in
`sharedPlanView`; de persoonlijke notities gaan nooit mee. Andermans plan
overnemen rekent de doelen om naar jouw CP: zijn 4,2 w/kg op de Muur zegt niets
over jou, maar "108 % van zijn CP" wel.

**Verversen.** Twee knoppen bij een verouderd plan: herberekenen met je huidige
gegevens (gratis, accenten blijven) of een nieuw AI-voorstel. Nooit automatisch —
dan verandert een plan onder het lid vandaan, mogelijk vlak voor een event.

**Weerblok gevoed.** `RouteWeather` krijgt de wattverdeling uit het opgeslagen
plan mee en rekent de doorkomsttijden daarop door, met een vinkje terug naar de
vrije schuifregelaars. Alleen voor gpx-events: die delen hetzelfde segmentraster
(`sampleRoute`) met het pacingmodel. Een Zwift-event heeft geen weer.

**Rem op de kosten:** vijf generaties per lid per uur via `rate-limit.ts`.

**Ronde 5 — na de eerste praktijktest.** Twee dingen uit het gebruik.

*28 van de 130 opgehaalde routes vroegen aandacht.* Dat bleek niet aan de
hoogtemeters te liggen maar aan de afstand: bij die routes dekt het
Strava-segment niet dezelfde afstand als de route, en dan slaat het profiel op
een ander parcours. `checkProfile` geeft die twee nu apart terug. Een
hoogteverschil is vrijwel altijd een meetconventie — zwift-data neemt de ruwe
optelsom van ZwiftInsider over, wij smoothen eerst en tellen ruis niet als
klimwerk mee, dus onze waarde is voor pacing juister — en levert geen melding
meer op. Een afstandsverschil boven 10 % is wél een fout: `route-loader.ts`
weigert zo'n profiel voortaan met een leesbare uitleg in plaats van er stilzwijgend
een pacingplan op te bouwen over de verkeerde kilometers. `/beheer/zwift-routes`
toont per route het gemeten profiel naast wat zwift-data zegt, met het
afstandsverschil in procenten, en zet de probleemgevallen bovenaan.

*Een plan kwam uit op drie stukken.* Twee oorzaken, allebei verholpen. Een
Zwift-route leverde alleen de bij naam bekende KOM's en sprints als accent, dus
een route met rollend terrein en geen genoemd segment werd één lang stuk; er is
nu ook detectie op het profiel zelf (`detectProfileAccents`, ≥15 hm over ≥300 m
bij ≥2,5 %), en klimmen die al een naam hebben blijven ongemoeid. Daarnaast
worden lange stukken opgeknipt: vlak op 8 km, een klim op 4 km, met een
bovengrens van 24 stukken zodat de lijst leesbaar blijft. Een opgeknipte klim
heet "De Alpe (2/3)" — dat is precies waar dosering over gaat. *Achterhaald
(13 september 2026):* een klim krijgt nu hoogstens drie delen met een eigen rol
en doel ("De Alpe (slot)"); zie "pacingplan: hellingen, indeling en doorrekenen
na klimwijziging".

**Niet veranderd:** de tolerantie op de hoogte. Die 20 % plus 15 m absoluut blijft
staan; het probleem zat niet daar.

**Ronde 6 — wat de dertig overgebleven meldingen bleken te zijn.** Migratie `0147`.

Van de dertig routes die na een volledige verversing bleven staan, droegen er
**zesentwintig nog de oude meldingtekst** uit ronde 4. Die rijen waren dus nooit
opnieuw opgehaald, en dat legde een bug bloot: bij `refreshAll` stond `todo` in
vaste volgorde, dus elke klik op "Alles opnieuw" herhaalde dezelfde eerste
vijftien routes en kwam de sweep nooit verder. De lijst wordt nu gesorteerd op
`synced_at` — nooit-opgehaald bovenaan, daarna de langst niet-ververste — zodat
herhaald klikken vanzelf door de bibliotheek loopt. De eigenschap ligt vast in
`tests/unit/zwift-route-sync.test.ts`. De pagina toont het oudste opgehaalde
profiel, zodat te zien is dát een sweep opschiet.

**Echt kapot zijn er drie:** Lutscher (+76,8 %), Lutscher CCW (+62,7 %) en
Southern Coast Cruise (+11,5 %). Daar wijst `zwift-data` naar een Strava-segment
dat een andere afstand beslaat dan de route. Een vierde, Innsbruckring, verwijst
naar `innsbruck-uci-lap` (8,8 km tegen 23,65 km) — ook een foute koppeling bij de
bron. Voor die routes blijft weigeren het juiste antwoord; een event erop heeft
een GPX nodig.

**Beslist: het smoothing-venster stond te ruim.** De vraag was of `zwift-data`
simpelweg de ruwe optelsom overneemt of dat ons venster echt klimwerk weggooit.
Migratie `0147` bewaarde daarvoor de ongesmoothde som, en die wees het uit. Op
Southern Coast Cruise: ruw 148 hm, `zwift-data` 136 hm, ons profiel 121 hm. De
ruwe som ligt dus *boven* `zwift-data` — er valt nauwelijks ruis weg te halen —
terwijl ons venster er 27 hm af haalde.

Waar dat aan lag: die 80 m kwam uit `route-sample.ts`, gemaakt voor gps-data van
echte ritten. Zwift-hoogte komt uit een game-engine, waar geen gps-ruis in zit.
Doorgemeten per golflengte houdt een venster van 80 m bij golving van 200 m — heel
gewoon op Zwift — nog maar **14 %** van het klimwerk over; bij 25 m is dat 81 %.
Precies de 35 % die op rollende routes verdween.

`SMOOTH_WINDOW_M` staat daarom op 25 m voor Zwift-profielen. `route-sample.ts`
blijft op 80 m voor .gpx-routes; daar is het venster wél terecht. Vastgelegd in
twee tests die allebei nodig zijn: een zaagtand moet voor meer dan 90 % verdwijnen,
en golving van 200 m moet voor meer dan 60 % blijven staan. Alleen de eerste had
de oude waarde ook doorstaan.

**Dit raakt de doorrekening, niet alleen de weergave:** het pacingmodel rekent met
de gradiënten uit ditzelfde profiel, dus rollende routes werden als te licht
ingeschat. Na deze wijziging moet de bibliotheek één keer volledig opnieuw
opgehaald worden.

**Wat blijft staan:** drie routes waar `zwift-data` naar een Strava-segment wijst
dat een andere afstand beslaat — Lutscher, Lutscher CCW en Southern Coast Cruise —
plus Innsbruckring met dezelfde fout bij de bron. Vier van de 263. Een event op
een van die routes heeft een GPX nodig.

### Werkplan uit juni (secties 0–10) — vervangen 2026-09-21

Vervangen door "Actieve volgorde" bovenaan dit document. Wat daarbij verviel:
de deploycontrole van `e834bc1` en de Strava-rate-limitcheck na de gear-throttle.
Die zijn achterhaald door de webhookronde van 5 september. Het debug-endpoint was
toen ook al weg. Wat nog gold (iOS-regressie, cockpit-praktijktest, eventkaart,
Strava-herindiening, `activities.csv`, eventscan) staat nu in de actieve volgorde.
Challenges, visuele herziening, AI-agenten en de on-hold-punten staan onder
"Geparkeerd — hoort in het plannenboek" onderaan.

---

## Historische roadmap (afgeronde werkstromen)

1. **✅ Sponsor-zone + ledenvoordeel** (commit `687f6ec`) — punt 17
   - Migratie `0030_sponsors.sql`: `sponsor_tier` enum + `sponsors` +
     `member_benefits` tabellen + RLS (publieke sponsors, leden-only
     voordelen) + Storage bucket `sponsors` + permission
     `sponsors.manage` aan board + community_manager
   - Seed met 8 sponsors van zwbcycling.nl (Hoofd: Haga Rubbers, Sub:
     RSC, Team: SPOTR/JeKa/Kalas/NexReply/A-Lourens, Web: KP Design);
     logo-URLs geseed in migratie `0031` (NexReply uitgezonderd =
     base64-inline op de bron).
   - `/sponsors`-pagina: tier-grouped showcase + gated ledenvoordeel-
     blok + worden-sponsor CTA + admin-paneel met logo-upload + CRUD.
   - Verlopen voordelen: 7 dagen grijs + niet-klikbaar, daarna auto-
     delete via `pruneExpiredBenefits()` op page-load.

2. **✅ Publieke liveticker** (commit `c946258`, `29c806f`)
   - `/live/[eventId]` outside `(app)`-group, via admin-client server-
     side zodat anon-bezoekers de event-data + sessies + posities zien
     zonder RLS-uitbreiding.
   - `/api/live/event/[eventId]`: JSON polling-endpoint (10s).
   - `EventLiveTicker` accepteert optionele `pollUrl`-prop → polling
     i.p.v. Realtime-subscription (geen duplicatie van renderlogic).
   - Share-knop op event-detail naast Bewerk (mobiel: native
     navigator.share, anders clipboard).
   - OG metadata + weer-blok (Open-Meteo) op de publieke pagina.
   - **OwnTracks background tracking** (commit `60397c7`):
     `0035_owntracks_live_tracking.sql`, tokenbeheer op `/live`,
     `/api/live/owntracks`, `live_sessions.source`, en verwijdering van
     browser-geolocation/wake-lock tracking.
   - **Kalender live hub**: eventrijen tonen "Live nu" + knop naar de
     publieke liveticker wanneer RSVP-deelnemers actief tracken.

3. **✅ Iteratie engagement** (commits `fe7c906`, `406fa79`, `f745f43`)
   - **Foto-galerij per event** (12) — upload via Supabase Storage
     (bucket `event-photos`), client-side resize naar 1920px, multi-
     file met progress, grid + lightbox modal. Migratie `0032`.
   - **Polls** (15) — `/polls` met scope-bewust schema (free/event/team),
     single + multi-select, sluitings-tijd, admin-CRUD via
     `polls.manage`-permission. Migratie `0033`.
   - **Push-notificaties** (16) — VAPID-based web push: opt-in toggle
     op `/profiel`, per-trigger preferences, send-helper met auto-
     prune, trigger op nieuw event + admin-broadcast pagina op
     `/beheer/notificaties`. Migratie `0034`.

4. **✅ Nav-clustering** (commit `d46b93e`)
   - 11 platte nav-items + 3 admin gegroepeerd in **5 top-level slots**:
     Kalender · Samen fietsen · **Club ▾** · **Community ▾** · Sponsors.
   - Club ▾ = Teams, Leden, Achievements.
   - Community ▾ = Community, Polls, Vraag en Aanbod, Media.
   - Rechts: avatar-naam wordt dropdown met Profiel, Training,
     Beheer-sectie (alleen als perms), Logout.
   - Mobiel: section-headers per cluster i.p.v. geneste dropdowns.
   - Gedeelde `nav-config.ts` als discriminated union (link | group)
     gebruikt door zowel `DesktopNav` als `MobileMenu`.
   - shadcn/ui `dropdown-menu` toegevoegd (base-ui-versie met
     `render`-prop i.p.v. `asChild`).

5. **✅ Training coach-cockpit** (commit `0d219e6`)
   - Nieuwe communityrol **Trainer** + trainingsrechten:
     `training.view_assigned`, `training.manage_assignments`,
     `training.create_plans`, `training.publish_plans`,
     `training.ai_generate`.
   - Migratie `0037_training_coach_cockpit.sql`: trainer-opt-ins,
     trainingsdoelen, schema's, workouts en AI-generation audit trail.
   - `/training` heeft nu lid-view + trainer-view. Leden geven expliciet
     toegang per trainer; trainers zien alleen toegewezen leden.
   - AI maakt alleen conceptschema's via OpenAI Responses API
     (`OPENAI_API_KEY`, optioneel `OPENAI_TRAINING_MODEL`).
   - Goedgekeurde schema's kunnen naar intervals.icu worden gepubliceerd;
     ZWB blijft bron van waarheid.
   - Push-trigger `on_training_plan` toegevoegd voor schema/coach-updates.

6. **✅ Afronden fase-3 push + stats + race-mate** (commits `0f64399`, `3aaff2c`)
   - **Event-reminders cron** (`0038_event_reminders.sql` + `/api/events/reminders`):
     24u + 2u voor start een push-notificatie naar RSVP yes/maybe leden
     die `on_event_reminder=true` hebben. Bearer-auth via
     `EVENT_REMINDER_SECRET`, dedupe via `event_reminder_sends`-log.
     **Live op cron-job.org**, draait elke 15 min.
   - **Club-stats dashboard-widget** (`_components/club-stats.tsx`):
     huidige maand km/hm/uren + delta vs vorige maand + top 3 rider +
     12-weken sparkline. Geen migratie nodig, leest `strava_activities`.
   - **Race-mate quick wins**: interactieve filter-bar op `/leden`
     (regio-dropdown + ZRL-chips A-E met multi-select), ZRL-categorie-
     badge naast namen in RSVP-lijst op event-detail.
   - **Live spoor B/C geskipt** — alleen Spoor A (OwnTracks) actief.
   - **Middleware-fix**: `/api/events/reminders` toegevoegd aan
     `PUBLIC_PATHS` zodat de externe cron niet naar /login redirected.
   - **NexReply logo** geüpload via /sponsors admin-paneel.

7. **✅ UI-polish + hulp-hub** (commit `7485b65`)
   - Nieuwe `/hulp` beginnerhub voor profiel, Strava, events, OwnTracks,
     training, teams, badges, community en privacy.
   - App-brede member-facing copy pass: page headers korter, lege states
     compacter en overbodige uitleg verplaatst naar `/hulp`.
   - Gedeelde compacte UI helpers in `src/components/app-ui.tsx`.
   - Sponsorpagina: sponsorcards met logo tonen geen dubbele sponsornaam
     of beschrijving meer; fallback-naam blijft alleen zonder logo.
   - Dashboard: intro-subtekst en clubstats-uitleg verwijderd; clubstats
     blijft data-first.
   - Training: leden kunnen expliciet een trainer aanwijzen; trainerlijst
     laadt via server-adminclient zodat RLS de keuze niet stil verbergt.
   - Self-coaching toegestaan voor leden met rol `Trainer` via migratie
     `0039_allow_self_training_coach.sql`.

8. **✅ Training AI + intervals/FIT hardening** (commits `f80164f`, `937a336`, `3cf687e`)
   - AI-conceptschema's gebruiken OpenAI background mode: de knop start een
     generatie, slaat `queued/in_progress` op en pollt tot het plan klaar is.
     Hierdoor kan het beste model (`OPENAI_TRAINING_MODEL`, standaard GPT-5.5)
     gebruikt worden zonder HTTP/Netlify-timeout.
   - `training_ai_generations` heeft `openai_response_id`, `completed_at`,
     `updated_at` en statussen `queued/in_progress/completed/failed/cancelled`
     via migratie `0066_training_ai_background.sql`.
   - Trainer-cockpit heeft een bevestigde knop om oude trainingsschema's uit
     ZWB te verwijderen. Workouts verdwijnen via cascade; intervals.icu-events
     blijven ongemoeid.
   - Power-ranges worden niet meer naar een middenwaarde geplet: `210-235w`
     en `60-75%` gaan als native `start/end` power targets naar intervals/FIT.
   - Compacte repeat-blokken zoals `3x8 min met 4 min herstel` worden bij
     normalisatie uitgeklapt naar losse werk- en herstelstappen voor grafiek,
     intervals-description en FIT-export.
   - De AI-prompt vraagt nieuwe concepten expliciet om herhalingen als losse
     structure-blokken terug te geven.

9. **✅ Team-ops, segmenten & onboarding-ronde** (commits `b882987`..`f51cabd`, 2026-06-02→08)
   - **Team-roster + ZRL-seeding** (`6e8f9c5`, migr. `0067`-`0070`): roster-tabel,
     auto-seed van ZRL-divisieteams uit een parent-team (verwijderd in `0172`),
     beschikbaarheid +
     lineup-planner + power-selectie, event-type-categorieën, RLS-recursiefix.
   - **Automatische Strava-sync-cron** (`014f8f6`): `/api/strava/sync` houdt
     activiteiten actueel zonder handmatige knop.
   - **Club-ladder + TTT-planner + onboarding** (`cdac2b0`, migr. `0071`):
     `/teams/club-ladder`, team-tijdrit-planner met ZwiftGopher-import,
     `/welkom` + `/wachten` voor nieuwe leden.
   - **Wachtwoord-reset-flow** (`fda4491`, `06f628c`, `ee46364`):
     e-mail+wachtwoord naast magic link, `/wachtwoord-resetten`, gehardende
     auth-confirm-route, recovery-sessie-gate in middleware.
   - **ZWB-segmenten + live timing + reconciliatie** (`5058ac1`, `a54acbc`,
     migr. `0072`-`0075`): eigen segmentendatabase + collecties,
     `/profiel/segments`, live-timing-paneel op events, Strava-activiteit-
     reconciliatie. Recordtijden nu via Strava athlete-PR.
   - **Vermogensprofiel + training-iteratie + echt logo** (`c5ba039`, `201b043`,
     `4cff23b`, `f51cabd`, migr. `0067_ai_generation_adaptation`, `0076`):
     `/training/vermogen` powercurve, ZWBeterWorden-advies, zichtbare
     plan-actie-feedback, achtergrond-AI voor "pas vandaag aan", en het echte
     ZWB-logo op login + alle PWA-icons.
   - **Verborgen `/brochure`** (`b882987`): deelbare team-weekend-brochure.

10. **✅ Verjaardagen + Strava-cron-tuning + copy-pass** (2026-06-10, gecommit)
   - **Verjaardagen** (migr. `0077`+`0078`): opt-in `share_birthday`, verjaardag
     op `/kalender` + ledenprofiel, en een afgeschermde ruimte
     `/verjaardagen/[id]` met felicitaties (`birthday_messages`), foto's
     (`birthday_photos` + privé bucket `birthday-photos`) en een verjaardagsrondje
     (`birthday_rides`: rit-uitnodiging + GPX in privé bucket `birthday-gpx`) met
     RSVP (`birthday_ride_rsvps`, migr. `0079`) en op de rit-dag een eigen
     liveticker (hergebruikte `EventLiveTicker`: kaart + hoogteprofiel + alleen
     aangemelde renners). Strikt RLS-gated op de opt-in.
   - **Strava-cron-tuning**: dure col/ZWB-segment-detailcalls standaard op 0 in
     de cron + athlete-profiel-refresh overgeslagen (`refreshAthleteInfo: false`)
     zodat de frequente sync licht blijft binnen de rate-limit.
   - **Copy-pass**: uitleg/hulptekst uit formulieren over ~64 bestanden naar
     `/hulp` + privacyverklaring; nieuwe "Product copy"-conventie in `AGENTS.md`.

11. **🛠️ Testerfeedback juni 2026 — in uitvoering**
   - Verdere opvolging staat voortaan in **Chronologisch werkplan vanaf
     2026-06-23**; deze bundel is historische context.
   - **Prioriteit 1: mobile menu polish.** Light-mode hamburger-menu krijgt
     meer contrast, duidelijkere section-dividers en subtiele inspringing per
     cluster. Dark mode blijft visueel gelijkwaardig. Geïmplementeerd in
     `src/app/(app)/_components/mobile-menu.tsx`.
   - **Prioriteit 2: achievementkwaliteit.** Niet-betrouwbare proxy/future
     achievements worden standaard verborgen i.p.v. verwijderd; bestuur/admin
     krijgt een flow om handmatige achievements aan te maken met basistitel,
     tier-titels (brons/zilver/goud/platinum) en icoonkeuze. Geïmplementeerd
     via gedeeld badgebeleid, badgebeheer-tab en publieke profiel-RPC-migratie
     `0080`.
   - **Prioriteit 3: Zwift/MyWhoosh-kalenderonderzoek.** Onderzoek of events
     automatisch gescand kunnen worden op ZWB-deelname en daarna als concept-
     kalenderitems klaar kunnen staan voor beheerreview. Geen simpele plaklijst
     als eerste voorkeur; integratie/scan is het gewenste spoor. Eerste spike
     vastgelegd in `docs/zwift-mywhoosh-kalender-spike.md`. Eerste beheer-MVP
     staat op `/beheer/event-scan`: duurzame conceptlaag
     `external_event_candidates` (migratie `0081`), MyWhoosh-metadata opslaan,
     handmatige ZWB-matchstatus, negeren/heropenen, idempotent publiceren naar
     `/kalender`. Zwift-feedsync werkt via een geautoriseerd club-serviceaccount
     dat ZWB'ers volgt en inschrijvingen op Zwift-ID matcht (migraties `0084`/
     `0085`). Bij publiceren krijgen externe events een eigen type
     (`zwift`/`mywhoosh`) met passende locatie (migratie `0086`); leden met een
     profiel worden als RSVP-deelnemer gekoppeld (avatars zoals bij gewone
     events) en alleen niet-gekoppelde namen blijven als tekst in de
     omschrijving (het interne `ZWB-deelnemers:`-label is uit kalender én
     eventdetail gestript). Zwift-events tonen automatisch de ZwiftPower-uitslag
     als directe link (`events.php?zid=<zwift-event-id>`); migratie `0087`
     backfilt bestaande gepubliceerde events.
   - **Later: team/club challenges.** Winter- en zomerchallenges voor teams,
     groepen of de hele club om verbinding te versterken.
   - **Later/betaalversie: AI-agenten.** Agenten voor platformvragen, beleid,
     abonnementen, functies vinden en "wie moet ik hebben"; privacy- en
     kennisscope eerst expliciet afbakenen.

12. **⏸️ On-hold (bewust uitgesteld)**
   - **E2E encrypted chat** — grote keuze. WhatsApp dekt dit
     momenteel voor ZWB; volwaardige eigen chat is forse bouw die
     pas zin heeft als bestuur 'm expliciet wil.
   - **Mollie iDEAL contributie/merch** — niet door bestuur gevraagd.
   - **Native app (Expo/React Native)** — PWA volstaat tot er
     concrete iOS-pushlimitaties bijten.

13. **Open punten**
   - **iOS PWA polish** — praktijktest op iPhone 16 Pro met iOS 26.5 is goed;
     mobiele terugknop toegevoegd. Nog één regressiecheck na deploy.
   - **Strava 1→100+ athleten cap** — **afgewezen**; webhooks + koppelingbeheer
     zijn daarop gebouwd (2026-09-05). Herindienen na een week meten, zie
     `docs/strava-api-resubmission.md`.
   - **intervals.icu OAuth app-registratie** — ingediend, wachten op approval.

---

## Architectuur-conventies

- **Taal in UI: Nederlands.** Code-comments + variabelen mogen Engels.
  **Uitzondering sinds 2026-08-19: de publieke `/omnium`-pagina's zijn
  Engels**, omdat het Omnium een internationaal deelnemersveld heeft dat niet
  inlogt. De beheerschermen onder `/beheer/omnium` blijven Nederlands. Er komt
  geen i18n-laag; de Omnium-sectie krijgt `lang="en"` op zijn contentwrapper.
- **Routes Nederlands**: `/kalender`, `/leden`, `/media`, `/community`,
  `/profiel`, `/achievements` (uitzondering), `/live`. Nieuwe routes
  volgen deze conventie.
- **Supabase RLS overal aan**, policies per migratie naast de tabel.
- **Service-role admin client**: alleen in server-acties die expliciet
  RLS moeten omzeilen (zoals milestone-evaluators). Nooit in API routes
  die direct user-input slikken.
- **Migraties zijn idempotent**: `if not exists`, `on conflict do nothing`,
  `drop policy if exists ... create policy ...` — zodat we lokaal +
  Netlify in dezelfde toestand komen zonder gedoe.
- **Server Actions** voor mutations binnen `(app)`-pages — geen losse
  API routes tenzij externe webhook of cron.
- **Chunked work boven 5s**: server actions die langer dan ~5s kunnen
  duren splitsen in chunks (zie Strava-sync pattern in
  `src/lib/strava/client.ts` → `SyncChunkOptions`), zodat Netlify's
  10s timeout niet bijt.
- **Strava-rate-limit**: 200ms pauze tussen pagina's, 429-cursor
  teruggeven aan client zodat die ~60s wacht en hervat.
- **PWA stacking-context**: voor modals/dropdowns over `backdrop-filter`
  parents → `createPortal` naar body.
- **Geen geheimen in repo**: `.env.local.example` met placeholders,
  echte waarden via Netlify env (STRAVA_CLIENT_SECRET, WTRL_COOKIE,
  LADDER_COOKIE, SUPABASE_SERVICE_ROLE_KEY, LIVE_CLEANUP_SECRET).
- **Avatar/logo storage-buckets**: public-read bucket, schrijfrechten
  alleen in `<owner>/...`-folder via RLS. Pattern in `0026_avatars_bucket.sql`.

---

## Verificatie (hoe testen we end-to-end)

- `npm run dev` lokaal voor frontend-werk
- TypeScript: `npx tsc --noEmit` (Netlify build faalt anders)
- E2E smoke: `npm run test:e2e` (start/stopt zelf een lokale Next dev-server
  op poort 3100; eerste dekking = login, privacy en auth-redirects)
- Netlify auto-deploy bij elke push naar `main`; vanwege credits werken we
  standaard lokaal en pushen/deployen we alleen als de eigenaar dat expliciet
  vraagt.
- Verdere Playwright-dekking voor ingelogde flows/training-cockpit is de
  volgende stap zodra er stabiele testdata of een test-login is.

---

## Bekende open dingen

- **Omnium: migratie `0174` toepassen** (beheer ziet anders het conceptseizoen
  niet), daarna seizoen `2026-27` plannen en de productie-inrichting voor
  editie 1 op 11 oktober. Zie de ronde van 2026-09-21 bovenaan.

- **Geparkeerd 2026-09-21 (besluit eigenaar): tokengebruik van
  trainingsgeneraties loggen.** `training_ai_generations.response_json` bewaart
  alleen het schema, dus de AI-kosten zijn niet uit de database te halen. Bouwen
  vraagt een migratie (kolom `usage`) plus zo'n zes schrijfpaden in `draft.ts`,
  de adaptatieroute en de coachchat. Niet nu: de kosten zijn via het
  OpenAI-dashboard te volgen, en het bestuur overweegt een featurepauze.

- **Geparkeerd 2026-09-21 (besluit eigenaar): `src/middleware.ts` → `proxy.ts`.**
  Next 16 noemt de naam `middleware` verouderd, maar hij werkt nog. De
  omzetting is een hernoeming (`npx @next/codemod@canary middleware-to-proxy .`),
  met één inhoudelijk verschil: `proxy` draait standaard op Node.js in plaats van
  Edge. Hoe Netlify dat afhandelt, is alleen met een deploy te zien. Oppakken
  zodra een Next-upgrade de oude naam echt laat vallen.

- **Voedingsmodule:** migraties `0168` en `0169` zijn toegepast (bevestigd
  2026-09-21). Nog open: de voedingsschermen met een echt account nalopen. Laat
  artikelteksten en clubrecepten nakijken door een (sport)diëtist, en beslis
  of de privacytekst een nieuwe versie krijgt. Zie de ronde van 2026-09-17.

- ~~**`/api/training/adaptations/daily` past niet binnen een Netlify-invocatie**~~
  — **opgelost 2026-09-08, commit `201d816`.** De route zet de generaties nu in de
  achtergrond (`startPlanUpdate` en het nieuwe `startBackgroundAdaptation`) en
  haalt ze een volgende run op met de `finishStaleGenerations` die er al zat.
  Daarom draait die cron nu elk uur: dat is de pollfrequentie, niet hoe vaak een
  lid aan de beurt komt — de dagcheck houdt het op één voorstel per schema per
  dag. (Correctie 2026-09-13: die dagcheck op `training_adaptation_runs` werkte
  niet, want de `queued`-rij werd door de CHECK-constraint geweigerd. Hij kijkt
  nu naar `training_ai_generations`; zie de ronde van 13 september.) Per run worden er hooguit
  `TRAINING_ADAPTATION_MAX_STARTS` (3) uitgezet, en de hele run heeft een
  wall-clock budget van 8 seconden zodat hij altijd netjes terugkomt met een
  overzicht in plaats van te worden afgekapt.

  Onderweg meegenomen: het TypeScript-type van `adaptation_kind` kende `'daily'`
  niet, terwijl de database het sinds migratie 0113 toestaat. En de route haalde
  per schema álle workouts op om er een telling van te zetten in
  `ctl_projection_json`, dat nergens wordt gelezen — die query is weg.

  De prijs is dat een voorstel er ongeveer een uur later staat in plaats van
  meteen. Dat is de juiste ruil: nu stond er hélemaal niets, want de route liep
  elke run in een timeout.

  *Oorspronkelijke beschrijving:*
  **`/api/training/adaptations/daily` past niet binnen een Netlify-invocatie**
  (ontdekt 2026-09-08 bij het opzetten van de cron-jobs). De route doet tot
  `MAX_PLAN_UPDATES_PER_RUN` (5) **synchrone** AI-generaties, en het runbook
  vermeldt zelf dat hij "minuten mag duren". Dat kan niet: een Netlify-functie
  wordt na circa tien seconden afgekapt. Dit is exact dezelfde ziekte die eerder
  al bij de renner-knop is verholpen — zie de regel hierboven over "Pas vandaag
  aan", waar de synchrone 45s-call werd vervangen door achtergrond-AI met polling.

  Het is nooit opgevallen omdat de scheduled function die deze route aanriep
  überhaupt nooit is afgegaan. Nu er een cron-job.org-job op staat, meldt die
  elke run een timeout.

  Wat wél lukt binnen het budget zijn de goedkope stappen: verlopen voorstellen
  archiveren en al afgeronde achtergrondgeneraties ophalen
  (`finishStaleGenerations`). Wat structureel niet lukt zijn de synchrone
  herzieningen; die vallen elke nacht af.

  **Op te lossen door de generaties net als bij de renner-knop naar de
  achtergrond-AI met polling te brengen**, zodat de route alleen werk uitzet en
  ophaalt. Tot die tijd blijft de job een timeout melden en blijven openstaande
  herplanverzoeken liggen.

- ~~**Netlify scheduled functions gaan niet af**~~ — **opgelost 2026-09-08** (ontdekt 2026-09-05). Netlify
  toont alle vijf de functions in `netlify/functions/` als *scheduled*, maar er
  is geen enkele invocatie-log en `integration_health` bevat één rij: 22-06-2026
  22:01, de dag dat de health-check werd uitgerold. De code klopt — dezelfde
  routes doen hun werk als je ze met hun bearer-secret aanroept.

  Dat ene datapunt is vrijwel zeker de uitrol-/testrun zelf en niet het bewijs
  dat de planning ooit gelopen heeft; anders stonden er meer rijen. De
  waarschijnlijkste lezing is dus dat de scheduled functions hier **nooit op
  schema zijn afgegaan** — geregistreerd wel, uitgevoerd niet. Zeker is dat niet
  (Netlify bewaart logs maar kort), maar het maakt voor de oplossing niet uit.

  Gevolgen, op volgorde van urgentie: **`live-cleanup` draait niet, dus de
  AVG-retentie op `live_positions` (30 dagen) en `event_chat_messages` (1 jaar)
  is al maanden niet uitgevoerd** — er staat locatiedata die gewist had moeten
  zijn. Daarnaast maakt `training-adaptations` geen dagelijkse aanpassingen meer,
  is er sinds juni geen monitoring, en zouden ook de nieuwe
  Strava-webhookverwerking en -opruiming nooit zijn afgegaan.

  **Opgelost op 2026-09-08**: alle jobs draaien nu op cron-job.org, tijdzone
  Europe/Amsterdam. De `.mjs`-bestanden blijven als documentatie staan, met een
  waarschuwing bovenaan dat ze niet afgaan. Details in `docs/runbook.md` §8. Dit
  is niet door de webhookronde veroorzaakt maar er wél door aan het licht gekomen.

  Onderweg kwamen er nog twee losstaande storingen boven: `LIVE_CLEANUP_SECRET`
  bestond helemaal niet in Netlify (dus de AVG-retentie had ook met een werkende
  planning nooit gedraaid), en de reconcile deed per lid tot honderd
  segment-calls. Beide inmiddels verholpen.

- **Strava 1→100+ athleten cap** — **afgewezen** door Strava met twee eisen:
  webhooks in plaats van polling, en actief beheer van stale/gedeauthoriseerde
  atleten. Beide zijn gebouwd (2026-09-05). Herindienen kan pas ná deploy,
  subscription aanmaken en een week meten; checklist en conceptnotitie staan in
  `docs/strava-api-resubmission.md`.
- **intervals.icu OAuth app-registratie** — ingediend, wachten op approval (extern).
- **iOS PWA** is in de praktijk getest op iPhone 16 Pro met iOS 26.5; nog één
  regressiecheck na deploy van de mobiele terugknop.
- **Training coach-cockpit praktijktest**: draaiboek staat in
  `docs/training-cockpit-praktijktest.md`; nog uitvoeren met echte trainer/renner
  en intervals.icu -> Wahoo/Garmin-publicatie.
- **AI-trainingszones sluiten niet aan op de renner** (2026-08-04, opvolging van
  de dag-aanpassing-fixes). De dataproblemen zijn verholpen — recente load,
  CTL/ATL/TSB/eFTP, het lopende weekschema en `minWorkouts: 1` gaan nu mee — maar
  de wattages zelf staan structureel aan de lage kant. Drie oorzaken, nog open:
  1. **FTP-bron.** De AI rekent met `profiles.ftp_watts`, terwijl de
     trainingspagina eFTP toont (`eftpLatest ?? intervalsFtp ?? profile.ftp_watts`,
     `src/app/(app)/zwbeter-worden/page.tsx`). `profiles.ftp_watts` loopt alleen
     mee met intervals.icu als `auto_sync_physique` aan staat én het lid
     handmatig de powerprofiel-sync draait (`src/app/(app)/teams/_actions.ts`) —
     er is geen achtergrondsync, dus die waarde veroudert. Overwegen: eFTP laten
     voorgaan voor de AI, of de physique-sync echt periodiek laten lopen.
     *Stand 2026-09-21: deels verholpen.* De eFTP gaat mee in `intervalsLoad`, en
     de prompt zegt het wattage op de eFTP af te stemmen als die afwijkt
     (`workouts.ts`). Een FTP-test in het schema werkt `profiles.ftp_watts` bij
     (`ftp-test.ts`). Nog open: er is nog steeds geen achtergrondsync, en de
     prompt laat eFTP ook voorgaan bij een lid met een recente testuitslag,
     terwijl de code elders de test laat winnen. *Later op 2026-09-21:* de eFTP
     kwam in werkelijkheid nooit binnen (verkeerde veldnaam), en na het meten is
     besloten dat de profiel-FTP leidt; zie de ronde bovenaan. Dit punt is daarmee
     dicht. De achtergrondsync blijft ontbreken, maar de meting laat geen
     structureel te lage profiel-FTP zien.
  2. ~~**Echte zones gaan niet mee.**~~ **Gesloten 2026-09-21:** gemeten; 10 van
     de 11 leden hebben de standaardzones, dus meegeven verandert niets. De lage
     wattages zaten in de duurblokken; zie de ronde bovenaan. Oorspronkelijk: `profile_sport_settings.power_zones` (+ CP,
     W', LTHR) wordt gesynct maar alleen op `/zwbeter-worden/vermogen` gebruikt.
     De AI valt terug op de generieke banden in `INTENSITY_FTP_RANGE`
     (`src/lib/training/workouts.ts`), die conservatiever zijn dan wat leden van
     JOIN gewend zijn. Let op: sinds 2026-08-20 hangt ook `estimateTrainingLoad`
     aan die banden (als terugval zonder leesbaar blokdoel), dus wie ze verruimt
     verhoogt tegelijk de geschatte belasting van elk schema.
  3. ~~**RPE-tabel spreekt de prompt tegen.**~~ **Opgelost 2026-09-21.** Het
     promptvoorbeeld noemt nu de FTP erbij ("bij FTP 250w 'RPE 6, 200-225w'") en
     de volledige RPE-tabel. Een test in `training-targets.test.ts` bewaakt dat
     die tabel gelijk blijft aan `percentRangeForRpe`. Oorspronkelijk: het
     promptvoorbeeld "RPE 6, 210-235w"
     is 72-80% FTP, terwijl `percentRangeForRpe(6)` 80-90% geeft
     (`src/lib/training/targets.ts`). Bij dezelfde RPE kan de UI-hint ~25w
     afwijken van het wattage van de AI.

  ~~Eerst meten: wat is de actuele eFTP versus de opgeslagen `profiles.ftp_watts`?~~
  Gemeten 2026-09-21: geen bronprobleem. De profiel-FTP ligt meestal boven de eFTP.
  Wat overblijft is punt 2, de zonebanden.

- **Geen FTP-historie: alle TSS wordt omgerekend met de húdige FTP**
  (2026-08-20, opvolging van de kwadratische belastingfix). `rideMetricsFromStrava`
  krijgt één `ftpWatts` mee — de huidige `profiles.ftp_watts` — en past die toe op
  elke rit, ook die van maanden terug. intervals.icu gebruikt de FTP die gold op
  de dag van de rit. TSS schaalt kwadratisch met FTP, dus 5% verschil geeft 10%
  TSS-verschil, met terugwerkende kracht over de hele grafiek. Dit is de grootste
  bron van de TSS-verschillen tussen ZWB en intervals die in de praktijk opvallen.
  Daarna komen twee kleinere: ZWB neemt Strava's `weighted_average_watts` als NP
  terwijl intervals NP zelf uit de stream rekent, en ZWB rekent met `moving_time`
  in plaats van de volledige activiteitsduur.

  **Gebouwd 2026-09-21 (migratie `0175`), zie de ronde bovenaan.** De twee
  kleinere oorzaken hieronder (NP uit Strava, `moving_time`) blijven staan.
  Oorspronkelijk: vraagt een eigen ronde: een FTP-historie per lid bijhouden (datum + waarde,
  gevoed door de FTP-test en door de intervals-sync) en `rideMetricsFromStrava`
  de FTP van de ritdatum laten opzoeken. Raakt ook de weekgrafiek en de
  CTL-reeks, dus historische cijfers verschuiven eenmalig. Hangt samen met punt 1
  hierboven — dezelfde vraag naar welke FTP-bron leidend is, maar dan over de tijd.

- **Naleving komt structureel net boven 100% uit bij blokkige workouts**
  (2026-08-20, restant van dezelfde fix). Een gereden rit meet TSS via het
  genormaliseerd vermogen over de héle rit, en NP is een vierdemachtsgemiddelde;
  de geplande kant is een kwadratische som over losse blokken. Bij blokkig werk
  ligt het eerste zo'n 5% boven het tweede — dat is de definitie van TSS, geen
  fout, en TrainingPeaks heeft hetzelfde. Gevolg: wie in ERG exact volgens plan
  rijdt scoort ~105% in plaats van 100%, en bij variabeler werk loopt dat op.

  `COMPLIANCE_HIGH` staat op 115 en vangt dat nu, maar de marge voor een sessie
  die wel echt te zwaar was is daarmee smal. Overwegen: een expliciete
  variabiliteits-opslag van ~5% op `estimateTrainingLoad` in plaats van de band
  oprekken. Dat is een keuze over hoe streng het oordeel moet zijn — die hoort
  bij de trainer, niet in een bugfix. Eerst meten: wat is de gemiddelde `loadPct`
  over sessies die aantoonbaar in ERG zijn gereden?

---

## Geplande features (afgesproken) — ✅ alle drie afgerond

Alle drie de toegezegde features zijn geleverd: #1 uitslagen-scraper,
#2 wellness-integratie training, #3 Strava-segmenttijden voor cols.

### 1. Uitslagen-scraper voor kalender-events (Gran Fondos e.d.) — ✅ AFGEROND

Op een event-pagina kan een **uitslag-URL** worden opgegeven; een admin klikt
**"Uitslag ophalen"** en het systeem toont **alleen de ZWB'ers** met
klassering + (netto) tijd. Geleverd 2026-05-29.

- Migraties `0053` (kolom `results_url` + status-velden op `events`, tabel
  `event_results`, RLS) en `0054` (`is_manual`-vlag).
- Provider-model in `src/lib/event-results/scrape.ts`:
  - **ChronoRace / ACN Timing** — JSON-API (`results/table/search`); één
    brede zoekterm haalt de hele tabel, kolommen op naam gemapt, netto tijd
    voorkeur (Total > Temps).
  - **RaceResult** (`my.raceresult.com`) — `config`→`data/list` JSON-API;
    werkt ook via **datasport.com** dat de RRPublish-widget embed (event-id
    uit de HTML, lijst o.b.v. URL-hash `#contest_listid`).
  - **Generieke HTML-tabellen** (cheerio) voor server-rendered sites.
  - Pure JS-SPA's zonder vindbare API (Sporthive, MyLaps) → nette
    foutmelding + handmatige invoer als fallback.
- ZWB-matching: strikt op voor- + achternaam (≥2 tokens, plus voornaam +
  achternaam-initiaal zoals "Casper C"), gedeelde `normalize()`/`nameTokens()`
  in `src/lib/text/normalize.ts`. Bronnen: `profiles.display_name`,
  `strava_connections.athlete_name`, `roster_entries.name`. Plus
  "ZWB"-vermelding (woordgrens) → `zwb_mention`.
- Admin-acties (guarded op `events.manage_all` of creator): "Uitslag
  ophalen" (delete+insert van gescrapte rijen), handmatig deelnemer
  toevoegen/verwijderen. `is_manual`-rijen blijven behouden bij her-scrape.
- Event-detail toont het ZWB-uitslagenblok (positie · naam · tijd, naam
  linkt naar ledenprofiel bij match).

### 2. Wellness-integratie in de trainingsmodule (herstel-data) — ✅ AFGEROND

Slaap/HRV/stress/rust-HR meegenomen in de AI-workoutplanning zodat
conceptschema's rekening houden met de actuele belastbaarheid. Databron:
**intervals.icu-wellness** (al gekoppeld, dus geen extra koppeling). Sporthologe
heeft geen publieke API; intervals.icu aggregeert Garmin/Oura/Whoop al.
Geleverd 2026-05-29.

- Migratie `0056`: `profile_wellness` (date, resting_hr, hrv, sleep_secs,
  sleep_score, readiness, fatigue, stress, soreness, mood) + `wellness_opt_in`
  op `intervals_connections`.
- `src/lib/training/wellness.ts`: `syncWellnessForUser` (intervals→DB),
  `summarizeWellness` (7d-gemiddelden + state fresh/normal/fatigued o.b.v.
  HRV/rust-HR/slaap/readiness t.o.v. baseline), `wellnessForAi` (opt-in-gated).
- `IntervalsWellness` uitgebreid met herstel-velden.
- AI: `TrainingAiInput.wellness` + prompt-instructie (zware blokken uitstellen
  bij vermoeidheid/lage readiness/weinig slaap), gewired in `generateAiDraft`
  én de dagelijkse adaptatie-cron.
- `/training`: opt-in-toggle + eigen herstel-overzicht (status, HRV, rust-HR,
  slaap).
- Privacy: strikt opt-in; `profile_wellness` RLS = alleen het lid zelf leest;
  trainer/AI lezen via service-role na de bestaande coaching-check.
- Trainer-cockpit toont de hersteltrend nu apart naast load-metrics
  (niet gedeeld / geen data / status + readiness/HRV/rust-HR/slaap).

### 3. Strava-segmenttijden voor de cols — ✅ AFGEROND

Echte beklimmingstijden per col, voor **tijd-leaderboards** en de
tijd-gebaseerde badge-tiers (A083 sub-75/sub-60). Geleverd 2026-05-29.

- Migratie `0055`: `best_time_seconds`/`_activity_id`/`_at` op
  `profile_climbed_cols` + `efforts_fetched_at` op `strava_activities`.
- `src/lib/cols/segment-times.ts` (`syncColSegmentTimesForUser`): detecteert
  col-passages (detector), fetcht detailed activity
  (`include_all_efforts=true`) voor cols met `strava_segment_id`, neemt de
  snelste effort per (profiel, col). Begrensd per run (`maxFetches=40`,
  nieuwste eerst), gecachet via `efforts_fetched_at`, stopt netjes bij 429.
- Draait mee in "Badges herberekenen" (`recomputeMyMilestoneBadges`), token
  hergebruikt van de Watopia-kalibratie. Backfilt over meerdere klikken.
- `/profiel/cols`: PR-tijd per geklommen col + ZWB-tijd-ranking (snelste
  eerst, bekende tijden boven).
- A083 silver/gold (sub 75/60) auto via `colBestSeconds` in de
  evaluator-context.
- Watopia-cols zijn inbegrepen: alle 10 hebben een `strava_segment_id`
  (migr. 0048) + gekalibreerde coords, dus VirtualRide-efforts tellen mee
  (o.a. Alpe du Zwift voor A083 sub-75/60).
- Open: alleen aangehaakt op recompute, niet op de reguliere sync (bewust,
  om elke sync licht te houden). Vereist een actieve Strava-koppeling — de
  effort-fetch is een live API-call (opgeslagen `raw` heeft geen efforts).

---

## Mogelijke volgende richtingen (geen actieve toezegging)

Fase 3 is dicht — wat hierna logisch zou kunnen komen, afhankelijk van
waar ZWB de meeste waarde uithaalt. Geen verplichting, geen volgorde.

- ✅ **Dedicated `/stats`-pagina** met drill-down (per maand, per discipline,
  per regio) — afgerond 2026-05-29. KPI's + km-per-maand trend (klikbaar als
  maandfilter) + breakdowns discipline/regio + top-10 riders. In Club-nav.
- ✅ **Foto-galerij × liveticker** — afgerond 2026-05-29. `/ritverslagen`
  bundelt gereden events met foto's tot bladerbare verslagen + dashboard-nudge
  ("Deel je foto's") voor recent gereden events zonder eigen foto. In
  Community-nav.
- ✅ **WhatsApp bulk-import via OG metadata** — afgerond 2026-05-29.
  "Bulk toevoegen" op /community: meerdere invite-links tegelijk, namen via
  Open Graph opgehaald, dubbele/ongeldige overgeslagen.
- ✅ **Sponsor-bannercarousel** — afgerond 2026-05-29. Subtiele continu
  scrollende logo-strip onderaan `/dashboard` (CSS-marquee, hover-pauze,
  reduced-motion-safe), logo's linken naar de sponsor-site.
- Challenges, AI-agenten, E2E-chat en Mollie: zie "Geparkeerd — hoort in het
  plannenboek" onderaan.
- ✅ **Core & mobiliteit als eigen trainingsspoor** — gebouwd (migraties
  `0159`/`0160`, krachtreeksen uit wens 19, core-advies op het dashboard).
  Oorspronkelijke aanleiding: de AI plande in
  augustus 2026 een "Rust + rug/mobiliteit"-sessie in een ZWB-schema. Inhoudelijk
  waardevol, maar het past niet in de fietspijplijn: geen wattages dus geen
  intervals.icu-publicatie en geen FIT-download, de duur telt via
  `estimateTrainingLoad` ten onrechte mee als fietsbelasting (en dus in
  `projectCtl`), en compliance matcht alleen Strava-**ritten** — waardoor een
  keurig uitgevoerde mobiliteitssessie altijd `niet_gereden` scoort en de
  AI-prompt die dag daarna juist lichter gaat plannen. Per direct is off-bike
  werk uit `defaultTrainingPrompt()` verbannen. Een echte inbouw vraagt om:
  een apart sessietype dat buiten de fietsbelasting valt, handmatig afvinken
  in plaats van Strava-matching, een eigen compliance-regel, en een kleine
  oefeningenbibliotheek. Let op de scope-grens met fysiotherapie: rug- en
  blessuregerelateerd advies hoort niet automatisch uit de AI te rollen.

---

## Mobiele revisie (uitgevoerd 2026-08-03)

Aanleiding: op telefoon zijn grafieklabels onleesbaar klein, vallen detail-
weergaven buiten het scherm en loopt de tab-balk van ZWBeter Worden net buiten
de marge. Dit is géén smaakkwestie maar een ergonomie-/techniekprobleem, dus het
staat los van het redesign-traject hieronder en heeft geen referentiemateriaal
nodig. Uitgangspunt: 360 px breed (kleinste veelgebruikte Android), controle op
390 px (iPhone) en 430 px (Max/Ultra).

### Diagnose — vijf oorzaken, niet vijftig symptomen

1. **Grafieken schalen mee in plaats van te herschalen.** Alle SVG-grafieken
   hebben een vaste viewBox (`training-load-chart.tsx` 980×420,
   `power-curve-chart.tsx` 920×390) plus `className="h-auto w-full"`. Op een
   telefoon is de beschikbare breedte ~340 px, dus schaalt de hele tekening
   ~0,35×. Een `fontSize="12"` komt daardoor als ~4 CSS-px op het scherm — dat
   is de kern van "te kleine letters". Lijndikte, marges en tickafstand krimpen
   even hard mee.
2. **Tabellen krimpen in plaats van te scrollen.** `overflow-x-auto` om een
   `<table className="w-full">` doet niets: de tabel perst zich in de container.
   Zo wordt "2u 2m" over twee regels gebroken en vallen de laatste kolommen weg
   (`activity-load-panel.tsx`, 7 kolommen). Andere tabellen hebben wél een
   `min-w-[…]` (`team-roster-table.tsx` 1180 px) en scrollen dan drie schermen
   ver — ook geen antwoord. Het patroon is inconsistent over 8 tabellen.
3. **Tab-strips scrollen zonder houvast.** `SectionNav` gebruikt `-mx-1` terwijl
   de pagina `px-4` heeft, dus de strip loopt niet door tot de schermrand; het
   laatste item ("Vermogen") wordt middenin afgekapt zonder fade, zonder
   scroll-snap en zonder dat het actieve item in beeld wordt gescrold.
4. **Informatie verstopt achter hover.** Op `/stats` staan de maandwaarden als
   `opacity-0 group-hover:opacity-100` en de staafdetails in `title=`-attributen.
   Op touch bestaat hover niet: die cijfers zijn op telefoon onbereikbaar.
5. **Micro-typografie.** 24 plekken met `text-[10px]` / `text-[0.6rem]` als
   dragende datalabels (aslabels, weekstaven). Onder de leesbaarheidsdrempel.

### Ontwerpregels (gelden app-breed)

- **Datatekst nooit onder 12 px effectief.** Niet de opgegeven waarde telt maar
  de gerenderde: bij een geschaalde SVG moet je terugrekenen.
- **1 SVG-eenheid = 1 CSS-pixel.** Grafieken tekenen op hun werkelijke breedte
  in plaats van een vaste viewBox weg te schalen. Dan klopt typografie vanzelf.
- **Minder datapunten in plaats van kleinere labels.** Op smal scherm minder
  ticks, kortere datumnotatie, geaggregeerde reeksen — niet uitzoomen.
- **Horizontaal scrollen is een uitzondering**, alleen voor echt tabelvormige
  data, altijd met zichtbare rand-fade en altijd full-bleed tot de schermrand.
- **Alles wat op desktop hover is, moet op touch een tap zijn.**
- **Tapdoelen: 44 px hoog voor navigatie en primaire acties, 36 px voor
  secundaire filterchips.** Eén maat voor alles maakte dichte chiprijen
  onwerkbaar hoog, dus de grens is bewust gesplitst.

### Gedeelde bouwstenen (eerst bouwen, daarna toepassen)

- `useContainerWidth` — ResizeObserver-hook die de werkelijke breedte teruggeeft.
- `<ResponsiveChart>` — wrapper die breedte + dichtheid (`compact` / `comfortable`)
  doorgeeft, zodat elke grafiek zelf bepaalt hoeveel ticks en welke marges.
- Grafiek-tokens in `src/lib/charts/` — asfont, marges, tickaantal per dichtheid,
  datumnotatie kort/lang. Sluit aan op het bestaande `format.ts` / `scale.ts`.
- `<ScrollTabs>` — full-bleed (`-mx-4 px-4`), scroll-snap, rand-fade, en
  `scrollIntoView` op het actieve item. Vervangt de binnenkant van `SectionNav`,
  de segment-nav op `/profiel/segments` en de maand-chips op `/stats`.
- `<ResponsiveTable>` — tabel vanaf `sm`, daaronder gestapelde kaarten per rij
  met label/waarde-paren. Eén component voor alle 8 tabellen.
- Tap-tooltip voor grafieken: tap toont waarde, tweede tap elders sluit.

### Fasering — ✅ alle zes uitgevoerd (2026-08-03)

- **Fase 1 — bouwstenen.** ✅ `src/lib/charts/responsive.ts` (dichtheid, marges,
  ticks, pointer-helpers), `use-container-width.ts`, `<ResponsiveChart>` +
  `useChartPointer`, `<ScrollTabs>`, `<ResponsiveTable>`. `ChartTooltip` klemt
  zich nu binnen de grafiekranden.
- **Fase 2 — grafieken.** ✅ `training-load-chart.tsx`, `power-curve-chart.tsx`,
  weekstaven in `activity-load-panel.tsx`, `/stats` maandtrend,
  `elevation-profile.tsx`. Onderweg gevonden en gerepareerd: de maandstaven op
  `/stats` renderden helemaal niet — de kolom om de staaf had geen definitieve
  hoogte, waardoor een hoogte in procenten tegen `auto` werd afgezet.
- **Fase 3 — navigatie.** ✅ `SectionNav` (en daarmee `trainer-nav.tsx`),
  segment-filters, maand-chips. Carousel-stippen op het dashboard kregen een
  fatsoenlijk tapdoel.
- **Fase 4 — tabellen.** ✅ Zeven van de acht naar `<ResponsiveTable>`.
  `team-roster-table.tsx` (13 kolommen, sorteerbare koppen) houdt zijn tabel
  vanaf `sm` en kreeg een eigen kaartweergave op mobiel. Het invulschema in de
  brochure zat in een `overflow-hidden` en kon dus niet scrollen.
- **Fase 5 — dichte pagina's.** ✅ Drie-koloms KPI-rasters worden twee koloms
  onder `sm`. De maandkalender toont op mobiel een gekleurde balk per workout
  in plaats van een titel die in ~40 px toch niet leesbaar is.
- **Fase 6 — sweep.** ✅ Alle 24 plekken met `text-[10px]`/`[0.6rem]`/`[0.65rem]`
  naar minimaal 12 px.

### Verificatie

Per fase een doorloop op 360/390/430 px: geen horizontale paginascroll, geen
afgekapte tekst, alle datalabels ≥12 px, tapdoelen ≥44 px, licht én donker.
Let op: vrijwel alles zit achter login, dus visuele controle loopt via de
ingelogde browser van de eigenaar tegen de lokale dev-server — niet via een
kale preview.

### Klaar wanneer

Elke pagina is op 360 px bruikbaar zonder in te zoomen of horizontaal te
scrollen, op de expliciet als scrollbaar gemarkeerde tabellen na.

---

## Geparkeerd — hoort in het plannenboek

Toekomstplannen die nog geen code zijn. Volgens AGENTS.md horen ze in het
plannenboek in Drive. De Drive-koppeling kan daar geen tekst aan toevoegen, dus
ze staan hier gebundeld tot ze met de hand zijn overgezet (besluit eigenaar,
2026-09-21). Het bestuur overweegt daarnaast een featurepauze; zie de
[gebruiksanalyse](docs/gebruiksanalyse-2026-09-17.md).

### Club- en teamchallenges

**Waarom:** dit is de eerstvolgende productmatige uitbreiding uit
testerfeedback die direct communitywaarde kan leveren.

1. Start met een eenvoudige challenge-vorm: clubbreed of per team, periode,
   metric (km/hoogtemeters/ritten/consistentie), leaderboard.
2. Gebruik bestaande Strava-activiteiten en teams; geen nieuwe externe koppeling.
3. Bouw eerst beheer + read-only leaderboard, daarna pas badges/pushes.
4. Denk aan winter- en zomerchallenge als twee templates.

### AI-agenten en kennisvragen

**Waarom later/betaalversie:** nuttig, maar privacy- en kennisscope moeten eerst
strak zijn.

1. Bepaal scope: platformhulp, beleid, functies vinden, "wie moet ik hebben".
2. Bepaal databronnen: `/hulp`, `PLAN.md`, runbook, publieke content,
   eventueel afgeschermde ledeninformatie met expliciete grenzen.
3. Start met read-only Q&A; geen acties namens gebruiker in v1.

### Visuele herziening en redesign-traject

**Waarom later:** er is al veel functionaliteit; een redesign is waardevol,
maar moet niet door functionele stabilisatie heen lopen.

1. Verzamel eerst referenties van de eigenaar: apps/sites, sfeer, do's/don'ts.
2. Werk designsysteem bij: tokens, cards, typografie, spacing, states.
3. Pak daarna high-impact pagina's in volgorde:
   login, dashboard, event-detail, ritverslagen, training.
4. Doe dit op een aparte branch/ronde zonder functionele wijzigingen.

Uitgewerkt stappenplan:

Ronde 3 leverde een eerste restyle-pass (merk-accent, beeld-forward cards,
officiële store-badges). Een vólledige, op de smaak van de eigenaar afgestemde
visuele herziening is bewust uitgesteld naar een eigen ronde, omdat dat eerst
**referenties** vereist. Niets hiervan is gebouwd; dit is het stappenplan.

- **Stap 0 — referenties (eerst).** Eigenaar levert inspiratie aan: apps/sites
  die hij mooi vindt, gewenste sfeer (strak/sportief/premium/speels), merken,
  kleuren, en concrete do's/don'ts. Dit bepaalt de hele richting; zonder dit
  niet starten.
- **Stap 1 — designsysteem.** Centraliseer de visuele taal in
  `src/app/globals.css` (kleur-tokens — uitbreiding ZWB petrol/goud —
  typografie-schaal, spacing, radius, shadow, motion) en
  `src/components/app-ui.tsx` (component-varianten: card, hero, badge, section).
  Zo propageert de stijl i.p.v. per pagina te divergeren.
- **Stap 2 — high-impact pagina's eerst.** Login, dashboard, event-detail,
  ritverslagen; daarna de overige hoofdpagina's (kalender, teams, leden, media,
  training, sponsors).
- **Stap 3 — afwerking.** Light/dark-pariteit, toegankelijkheid (contrast,
  focus-states), `prefers-reduced-motion`, consistente iconografie, en
  beeldgebruik (echte foto's waar mogelijk).
- **Aanpak.** Aparte branch/ronde, pagina-voor-pagina met visuele review na elke
  stap. Geen functionele wijzigingen — puur presentatie.

---

### Bewust on-hold

Deze punten blijven geparkeerd totdat bestuur/eigenaar ze expliciet vraagt:

- E2E encrypted chat: WhatsApp dekt nu de behoefte; echte E2E is groot.
- Mollie/iDEAL contributie of merch: onderzocht, niet gevraagd.
- Native Expo/React Native app: PWA volstaat zolang iOS-push/UX niet blokkeert.

### Onderzoek (iteratie-ronde 2) — Mollie & E2E-chat

Beide zijn deze ronde alléén onderzocht; nog niet gebouwd.

#### Mollie (contributie/betalingen)

**Haalbaarheid: hoog.** `MOLLIE_API_KEY` staat al in `.env.local.example`.

Ontwerp:
- Migratie `payments` (id, profile_id, mollie_payment_id, amount_cents,
  currency, description, status [open/paid/failed/expired/refunded], kind
  [contributie/los/merch], created_at, paid_at). RLS: lid leest eigen; writes
  via service-role.
- Server-action `createPayment(amount, kind)` → Mollie Payments API
  (`POST /v2/payments`, iDEAL/alle NL-methoden), `redirectUrl` →
  `/betalingen/return`, `webhookUrl` → `/api/mollie/webhook`. Bewaar
  `mollie_payment_id` + status `open`.
- Webhook-route `/api/mollie/webhook` (geen Bearer — Mollie post alleen het
  payment-id; status verifiëren via een GET naar Mollie met de API-key, nooit
  de POST-body vertrouwen). Update `payments.status` + `paid_at`.
- Jaarcontributie: óf losse Payments per jaar, óf Mollie **Subscriptions**
  (vereist eerst een `customer` + eerste mandaat-betaling) voor automatische
  incasso. Aanrader v1: losse jaarlijkse Payment-link (simpeler, geen
  mandaat-administratie).
- UI: `/betalingen` (eigen status + "Betaal contributie"-knop) + admin-
  overzicht wie betaald heeft.
- Schatting: ~1 migratie + 1 webhook-route + 1 server-action + 2 pagina's
  = vergelijkbaar met de uitslagen-scraper qua omvang.

#### E2E-chat

> **Bijgewerkt 2026-09-17.** Dit stuk gaat over een *clubbrede* chat; die staat nog steeds
> geparkeerd. Wat er sindsdien wél is gebouwd, is de coachchat in ZWBeter Worden (migratie
> `0167`): één besloten gesprek per lid tussen het lid, een AI-coach en zijn aangewezen
> trainer. Dat is niet E2E-versleuteld en lost geen van de vragen hieronder op — het is een
> smalle toepassing van optie (B), zonder rooms en zonder WhatsApp-import.

**Kernconclusie: geschiedenis-behoud (WhatsApp-import) en échte E2E zijn
grotendeels onverenigbaar.** Kies dus eerst het doel.

- WhatsApp `.txt`-import is parsebaar maar verliesgevoelig (locale-afhankelijk
  formaat, multiline-berichten, zwakke afzender-identiteit = fuzzy mapping,
  geen message-IDs/reacties/edits, media inconsistent, lokale tijd zonder
  zone). En het is **onverenigbaar met écht E2E**: de server/importeur zou
  platte tekst versleutelen namens auteurs zónder hun privésleutels → altijd
  plaintext-opslag of schijn-E2E; auteurschap niet te bewijzen. Plus
  **AVG/consent-risico**: andermans berichten importeren zonder expliciete
  groeps-toestemming.
- Opties:
  - **(A)** WhatsApp-deeplinks behouden (huidige situatie) — nul risico/verlies,
    nul onderhoud. *Aanrader als er geen sterke vraag is.*
  - **(B)** Niet-E2E **Supabase-Realtime clubchat** vooruit (relatief simpel:
    `chat_rooms`/`chat_messages` + RLS + Realtime) + optioneel een apart,
    duidelijk gelabeld read-only "WhatsApp-archief" (met vooraf groeps-
    toestemming, best-effort naam-matching). *Aanrader als historie-behoud +
    eigen chat zwaarder wegen dan vertrouwelijkheid.*
  - **(C)** Echte E2E (Matrix/Synapse self-hosted, of libsignal) — zware bouw,
    alleen nieuwe berichten versleuteld; oude historie niet in de versleutelde
    store. Alleen bij harde vertrouwelijkheidseis.
- Schatting: (A) nul, (B) middelgroot (1 migratie + realtime-UI), (C) groot
  (server-infra + key-management).
