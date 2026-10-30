# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

De hoofdgebruiker is **het clublid op de telefoon**: een lid van de ZWB Cycling
Community dat tussen ritten door even kijkt wat er speelt. Kalender bekijken,
aan- of afmelden, het schema van vandaag, de eigen ritten. De app is als PWA
geïnstalleerd en staat staand op het scherm (bevestigd door de eigenaar,
2026-10-12).

Secundair, en ondergeschikt aan het lid wanneer keuzes botsen:

- **Captains** die teams, opstellingen en TTT-plannen regelen.
- **Trainers** die schema's, doelen en beoordelingen van leden bijhouden.
- **Bestuur en beheerder** die events, Omnium, kalenders en koppelingen
  beheren onder `/beheer`.

Schaal: een kleine club, orde van grootte 35 accounts
(zie `docs/gebruiksanalyse-2026-09-17.md`). Iedereen kent elkaar.

## Product Purpose

Eén plek voor alles van de club. Leden vinden ritten, teams, training en
community op één plek in plaats van verspreid over WhatsApp, Strava en WTRL
(bevestigd door de eigenaar, 2026-10-12).

Succes is dus dat een lid het platform als vanzelfsprekend startpunt gebruikt,
niet dat er meer onderdelen bij komen. Het bestuur overweegt een featurepauze;
tot dat besluit gaat stabiliteit voor nieuwe features (`PLAN.md`).

## Positioning

Het platform is van en voor één club. Het kent de eigen teams, de eigen
ritten, de eigen competities (ZWB Omnium, Sunday Race Club) en de eigen leden,
en legt clubdata naast elkaar die elders los staat: WTRL/ZRL, Zwift, MyWhoosh,
Strava en intervals.icu. Een algemene trainings- of clubapp kan dat niet
overnemen.

## Operating Context

- Buiten- en binnenfietsen: clubritten op de weg naast Zwift- en
  MyWhoosh-races (ZRL, TTT, FRR-tours, Club Ladder).
- Ritdata komt binnen via intervals.icu, Strava of bulk-import (CSV/GPX).
  Niet elk lid kan Strava koppelen; de import blijft een volwaardige route.
- Naast de app blijven WhatsApp-groepen bestaan; het platform verwijst ernaar.
- Meldingen via Web Push; live meerijden via "Samen fietsen" en `/live`.
- Publieke pagina's buiten de login: `/welkom`, `/verhaal`, `/brochure`,
  `/omnium`, `/privacy`, `/voorwaarden`.

## Capabilities and Constraints

Hoofdgebieden, in de termen van de navigatie:

- **Kalender** en **Samen fietsen**: events met route, aan-/afmelden, live.
- **ZWBeter Worden**: Vandaag, Schema, Jaarplan, Belasting, Vermogen,
  Core & mobiliteit, Voeding, Doelen, Coach; plus een trainerskant.
- **Club**: Leden, Teams (met TTT-planner), Achievements, Stats,
  ZWB Segments, ZWBlokken, ZWBgame, ZWB Omnium, Sunday Race Club.
- **Community**: WhatsApp-groepen, Polls, Vraag en Aanbod, Media,
  Ritverslagen.
- **Profiel**, **Mijn garage**, **Hulp**, **Sponsors**, **Beheer**.

Vaste beperkingen:

- Interfaces blijven beknopt. Geen uitleg- of techniektekst in formulieren en
  schermen; uitleg hoort op `/hulp`, privacy-uitleg in de privacyverklaring
  (`AGENTS.md`).
- Privacy weegt zwaar. Voorbeeld: bij ZWBlokken tellen start- en eindblok en
  de eerste en laatste kilometer nooit mee.
- Beschikbaarheid (uren per week) is een planningsplafond, geen maat voor
  belastbaarheid.
- Technisch: Next.js 16, Supabase, Tailwind v4, Netlify met beperkte credits;
  de Supabase-database zit op het gratis plan. Nieuw werk mag daar niet
  zwaar op leunen.
- Taal: Nederlands.

Open: of de featurepauze er komt, en wat er met de Strava-koppeling gebeurt
nu de API-aanvraag twee keer is afgewezen.

## Brand Commitments

Bindend (bevestigd door de eigenaar, 2026-10-12):

- **Tenuekleuren en logo.** Petrol, teal, sage, goud en crème uit het
  ZWB-tenue, en het originele ZWB-logo (`public/zwb-logo.png`). De drie
  schuine vlakken in de app zijn een benadering en worden daardoor vervangen
  (eigenaar, 2026-10-12); app-icoon en favicons zijn al omgezet (2026-10-30).
- **ZWB-woordspelingen.** ZWBeter Worden, ZWBlokken, ZWBasis en ZWBgame zijn
  vaste productnamen; het patroon mag worden doorgezet. ZWBeter Worden wordt
  ZWBeter, met een woord erachter per onderdeel: ZWBeter trainen, ZWBeter
  voeden, ZWBeter kracht, ZWBeter coachen (eigenaar, 2026-10-12). Die naam
  geldt nu alleen in het design "tegels"; elders staat nog ZWBeter Worden.
- **Stem.** Kort, informeel Nederlands met je/jij.
- **Licht én donker thema** blijven beide volwaardig.

## Evidence on Hand

- Gebruikscijfers per onderdeel: `docs/gebruiksanalyse-2026-09-17.md`.
- Projectgeschiedenis en besluiten: `PLAN.md`; onderzoek in `docs/`.
- Clubverhaal en brochure: `/verhaal`, `/brochure`, `public/story`,
  `public/brochure`.
- Sponsorlogo's: `public/logos`.

Niet aanwezig, dus niet verzinnen: paginabezoekcijfers (worden niet gemeten),
citaten of aanbevelingen van leden, en ledenaantallen buiten de analyse van
17 september.

## Product Principles

1. **De telefoon van het lid beslist.** Bij een botsing tussen het lid
   onderweg en beheer op desktop wint het lid.
2. **Eén plek, geen extra plek.** Iets hoort erin als het een losse bron
   vervangt of samenbrengt, niet omdat het kan.
3. **Stabiel boven nieuw.** Wat er staat moet kloppen en werken voordat er
   iets bij komt.
4. **Het scherm doet het werk, niet de uitleg.** Kort en direct; toelichting
   staat op `/hulp`.
5. **Het is een club.** Leden kennen elkaar; privacy en de toon van de club
   gaan voor op volledigheid van data.

## Accessibility & Inclusion

Geen formele standaard vastgelegd. Wat de code al doet en moet blijven doen:
`prefers-reduced-motion` respecteren, en tekstcontrast in beide thema's
bewaken (het tenuegoud haalt als kleine tekst op licht te weinig contrast;
daarvoor bestaat een diepere tint).
