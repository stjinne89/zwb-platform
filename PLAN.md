# ZWB Platform — Plan & Status

> Levend document. Bijwerken wanneer er een fase wordt afgerond of een
> richting verandert. Bedoeld zodat zowel Claude als Codex (en eventuele
> nieuwe contributors) snel kunnen zien wat klaar is en wat de volgorde is.
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
- Next.js 15 (App Router, TypeScript) op Vercel/Netlify
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

Volgende kleine stap: liveticker zichtbaar maken op `/kalender`-rij
(niet alleen op detail-pagina) — kalender als hub voor live-volgen.

---

## Buiten oorspronkelijk plan opgeleverd

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
  team, automatische seeding van ZRL-divisieteams vanuit een parent-team,
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
  blokken. Nav-item, dashboard- en statsintegratie, hulpsectie met zoekindex.
  Privacyregel: start- en eindblok tellen nooit mee, plus de eerste en laatste
  kilometer.
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
  — dat is een wedstrijdklasse, geen fysiologie. Nieuw logboek onder
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

Deze sectie is het actieve werkplan. De volgorde is gebaseerd op de huidige
staat van `PLAN.md`, de commit/deploy-geschiedenis t/m `e834bc1`, en de
operationele risico's die nu het meest waarschijnlijk bijten. De oudere
"roadmap forward" hieronder is vanaf nu vooral historisch naslagwerk.

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

### Opgeleverd — beschikbaarheid per week, nachtelijk vangnet + FTP-test in het schema

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
in de input. Uitslagen staan als lijst op `/zwbeter-worden/vermogen`, en komt de
profiel-FTP uit een test, dan noemt de FTP-tegel die datum als bron. Uitleg op
`/hulp#ftp-test`, met zoekindex-regel.

**Bekende wrijving.** Staat het profiel op *bijhouden vanuit intervals.icu*
(`auto_sync_physique`), dan overschrijft de eerstvolgende vermogenssync de
testwaarde met de eFTP van intervals. De test blijft in de historie staan en het
lid krijgt die zin te zien bij het opslaan; automatisch die instelling uitzetten
leek te ver gaan.

**Nachtelijk vangnet.** Bij het opslaan van je beschikbaarheid vraagt het lid
al meteen een herziening aan, maar die kan zijn overgeslagen: de cooldown van
vijf minuten in `replan.ts`, een achtergrondgeneratie die niemand ophaalde
(alleen de browser van het lid pollt `/api/training/ai-draft/[id]`), of een
mislukte call. De comment in `replan.ts` beloofde dat zo'n wijziging "bij de
eerstvolgende herziening" meekwam, maar niets vroeg die herziening dan alsnog
aan — een lid dat vier keer aan de schuifbalken zat, verloor de laatste drie
wijzigingen tot het toevallig iets anders deed. Die belofte klopt nu wel.

De nacht-cron (`/api/training/adaptations/daily`) draaide alleen voor leden met
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
door iemand worden opgehaald voordat er een schema uit komt, en 's nachts kijkt
er niemand mee. Het resultaat wordt direct doorgevoerd, net als overdag — geen
voorstelkaart. Maximaal vijf per run, zodat de route niet tegen de
functietimeout loopt; wie er vannacht buiten valt is morgennacht aan de beurt,
want de wijziging blijft nieuwer dan de laatste herziening.

Bijvangst: `saveWeekAvailability` schreef ook wanneer er niets was veranderd. De
touch-trigger zette `updated_at` dan vooruit, en daar leest de cron aan af of er
werk is — twee keer op Opslaan drukken zou zo elke nacht een generatie hebben
gekost. Nu slaat hij een ongewijzigde opslag helemaal over.

**Vangnet voor álle wijzigingen, niet alleen beschikbaarheid** (migratie `0132`).
De tijdstempel-afleiding hierboven werkt voor een gewijzigde rij, maar niet voor
een verdwenen rij: `syncEventWorkout()` **verwijdert** het blok als een lid zich
afmeldt, en `removeOwnRide()` doet hetzelfde met een eigen rit. Aan wat er niet
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
er is hier geen Docker of Supabase-config. Ook de nachtelijke herziening is niet end-to-end gedraaid —
daar hoort een cron-aanroep met een OpenAI-call bij; de logica eromheen is wél
getest (`tests/unit/replan.test.ts`). `npm run build`, `npx tsc --noEmit`,
`eslint` en de volledige Vitest-suite (575 tests) zijn groen.

Eén regel die daarbij hoort: een workout met `test_type` wordt door
`supersedableWorkouts()` nooit meer vervangen. Een test uit de bibliotheek draagt
`origin 'ai'` en zou anders bij de eerstvolgende herziening verdwijnen — met een
uitslagvraag zonder training als resultaat.

### Actief — ZWB Omnium als platformmodule

**Ronde 1 (datamodel + puntenmotor) opgeleverd 2026-08-19, working tree, nog
niet gecommit.** Migraties `0126`-`0130`.

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
2026-08-19, working tree, nog niet gecommit.** Geen migraties.

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
`src/lib/supabase/middleware.ts`, staat los van het Omnium, apart op te pakken.

**Ronde 3 (plak-import + klassement) opgeleverd 2026-08-19, working tree, nog
niet gecommit.** Eén migratiewijziging: `0128` kreeg alsnog `wins` en
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

**Ronde 4 (publieke `/omnium`-pagina's) opgeleverd 2026-08-19, working tree,
nog niet gecommit.** Geen migraties.

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

**Openstaand punt om te beslissen vóór de links gedeeld worden.** De publieke
pagina's zijn Engels maar de routes zijn Nederlands (`/omnium/regels`,
`/omnium/klassement`, `/omnium/[editie]/uitslag`, `/omnium/[editie]/startlijst`).
Dat volgt de projectconventie en het goedgekeurde plan, maar het is wringend
voor een internationaal publiek. Wijzigen kan nu nog gratis; zodra deze URL's op
Zwift, Discord en YouTube staan, breekt elke wijziging bestaande links.

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

**Ronde 5 (livestream-basis) opgeleverd 2026-08-19, working tree, nog niet
gecommit.** Geen migraties.

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

**Daarmee staat alles wat vóór 11 oktober moest staan.** Wat rest is één ding
dat ik niet kan doen: de beheerschermen één keer met de hand doorlopen
(plannen → editie vullen → publiceren → uitslag plakken). Het integratiescript
spiegelt de databasestappen van die server actions, niet de React-kant.

**Volgende rondes:** spike Zwift-uitslagen (te testen op editie 1 zelf),
startlijst via Zwift-entrants, draaiboek en OBS-overlay, prijzen, communicatie,
historische import, uitfaseren van de oude site.

### 0. Documenthygiëne en release-basis

**Doel:** zorgen dat nieuwe rondes niet opnieuw door elkaar gaan lopen.

1. Houd deze sectie bovenaan als enige actieve volgorde.
2. Verplaats afgeronde rondes na push/deploy naar de historische roadmap of de
   featurelijst.
3. Laat detailonderzoek in losse docs staan (`docs/...`) en link alleen de
   conclusie hier.
4. Noteer per ronde: datum, commit, migraties, risico's en verificatie.

### 1. Stabilisatie na de juni-builds

**Waarom nu:** de laatste deploys raakten veel kernpaden: Strava, training,
events/kaart, onderhoud en hulp/onboarding.

1. Verifieer production-flow na deploy van `e834bc1`:
   `/training`, `/achievements`, `/hulp`, `/welkom`, eventkaart + Street View.
2. Controleer de Strava rate-limit na gear-throttle + lagere cronfrequentie:
   daglimiet, 15-minutenvenster, aantal actieve profielen.
3. Verwijder of beveilig het tijdelijke `/api/strava/debug-gear` zodra de
   gear-sync is bevestigd.
4. Doe de nog open iOS PWA-regressiecheck na de recente navigatie- en
   trainingwijzigingen.
5. Houd `npm run lint`, `npm run test`, `npm run build` als standaard
   acceptatiecheck; breid tests alleen uit waar nieuwe pure logica bijkomt.

### 2. Training-cockpit praktijktest

**Waarom daarna:** training is nu functioneel rijk, maar publicatie naar
intervals/Wahoo/Garmin is een echte gebruikersflow met externe gevolgen.

1. Voer `docs/training-cockpit-praktijktest.md` uit met één trainer en één
   renner/testaccount.
2. Test: intake, AI-concept, traineredit, publicatie naar intervals.icu,
   FIT-download, Wahoo/Garmin-route, dag-aanpassing en rapportage.
3. Leg bevindingen vast in hetzelfde document: bugs, UX-frictie,
   copy die naar `/hulp` moet, en eventuele dataverschillen met intervals.icu.
4. Pas daarna pas nieuwe trainingfeatures toe; eerst stabiliseren wat er nu is.

### 3. Strava-integratie structureel oplossen

**Waarom:** de club groeit richting de Strava app-cap en de API-limieten blijven
een operationeel risico.

1. Blijf de status van Strava app approval / athlete-cap verhogen volgen.
2. Houd de handmatige `activities.csv` import als fallback en verbeter alleen
   op basis van echte importfouten van leden.
3. Werk Strava-webhooks uit als structurele polling-vervanger:
   verify-challenge endpoint, subscription, athlete-id mapping, eventqueue,
   lichte dagelijkse reconcile.
4. Pas cron daarna aan naar een lage reconcilefrequentie; webhooks worden de
   realtime trigger.
5. Documenteer in `docs/runbook.md` welke calls overblijven en wat de normale
   daglimiet hoort te zijn.

### 4. Event- en livekaart afronden

**Waarom:** de eventpagina is een grote kracht van het platform en kreeg veel
snelle upgrades.

1. Praktijktest routekaart: hoogteprofiel, klim-overrides, POI's, fullscreen,
   Street View-marker en publieke `/live`.
2. Controleer Google Street View deep-links op meerdere GPX-routes:
   juiste panorama, rijrichting, gedrag bij ontbrekende Street View.
3. Beslis of POI's alleen event-detail blijven of ook prominenter in de
   kalender/livehub moeten komen.
4. Pas pas daarna nieuwe kaartfeatures toe; eerst regressies uit de huidige set.

### 5. Achievements en importkwaliteit

**Waarom:** badges zijn engagement-kern, en import maakt dit nu toegankelijker
voor leden zonder Strava-koppeling.

1. Verzamel 3-5 echte Strava `activities.csv` exports en test varianten in
   datumformaat, delimiter, sporttype en ontbrekende velden.
2. Voeg unit-tests toe voor elke importvariant die stukgaat.
3. Maak admin/herbereken-flow zichtbaar genoeg voor support, maar houd de
   leden-UI compact.
4. Rond de testerfeedback rond achievementkwaliteit af: verborgen proxy/future
   achievements, handmatige achievement-flow, duidelijke badgekwaliteit.

### 6. Externe events en teamplanning hardenen

**Waarom:** Zwift/MyWhoosh-eventscan en teamtools zijn geleverd, maar externe
feeds en cookies zijn broos.

1. Monitor eventscan-cron na de 429-fixes: volgen, matchen, publiceren,
   ZwiftPower-link.
2. Leg failure modes in `docs/runbook.md` vast: cookie verlopen, feed leeg,
   publish mismatch, roster-onbekend.
3. Verbeter pas daarna de beheer-MVP met extra automatisering of reviewfilters.
4. Houd team-roster/TTT-planner/powerselectie stabiel voor het volgende seizoen.

### 7. Club- en teamchallenges

**Waarom:** dit is de eerstvolgende productmatige uitbreiding uit
testerfeedback die direct communitywaarde kan leveren.

1. Start met een eenvoudige challenge-vorm: clubbreed of per team, periode,
   metric (km/hoogtemeters/ritten/consistentie), leaderboard.
2. Gebruik bestaande Strava-activiteiten en teams; geen nieuwe externe koppeling.
3. Bouw eerst beheer + read-only leaderboard, daarna pas badges/pushes.
4. Denk aan winter- en zomerchallenge als twee templates.

### 8. Visuele herziening

**Waarom later:** er is al veel functionaliteit; een redesign is waardevol,
maar moet niet door functionele stabilisatie heen lopen.

1. Verzamel eerst referenties van de eigenaar: apps/sites, sfeer, do's/don'ts.
2. Werk designsysteem bij: tokens, cards, typografie, spacing, states.
3. Pak daarna high-impact pagina's in volgorde:
   login, dashboard, event-detail, ritverslagen, training.
4. Doe dit op een aparte branch/ronde zonder functionele wijzigingen.

### 9. AI-agenten en kennisvragen

**Waarom later/betaalversie:** nuttig, maar privacy- en kennisscope moeten eerst
strak zijn.

1. Bepaal scope: platformhulp, beleid, functies vinden, "wie moet ik hebben".
2. Bepaal databronnen: `/hulp`, `PLAN.md`, runbook, publieke content,
   eventueel afgeschermde ledeninformatie met expliciete grenzen.
3. Start met read-only Q&A; geen acties namens gebruiker in v1.

### 10. Bewust on-hold

Deze punten blijven geparkeerd totdat bestuur/eigenaar ze expliciet vraagt:

- E2E encrypted chat: WhatsApp dekt nu de behoefte; echte E2E is groot.
- Mollie/iDEAL contributie of merch: onderzocht, niet gevraagd.
- Native Expo/React Native app: PWA volstaat zolang iOS-push/UX niet blokkeert.

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
     auto-seed van ZRL-divisieteams uit een parent-team, beschikbaarheid +
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
   - **Strava 1→100+ athleten cap** — eerder ingediend, wachten op approval.
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

- **Strava 1→100+ athleten cap** — eerder ingediend, wachten op approval (extern).
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
  2. **Echte zones gaan niet mee.** `profile_sport_settings.power_zones` (+ CP,
     W', LTHR) wordt gesynct maar alleen op `/zwbeter-worden/vermogen` gebruikt.
     De AI valt terug op de generieke banden in `INTENSITY_FTP_RANGE`
     (`src/lib/training/workouts.ts`), die conservatiever zijn dan wat leden van
     JOIN gewend zijn.
  3. **RPE-tabel spreekt de prompt tegen.** Het promptvoorbeeld "RPE 6, 210-235w"
     is 72-80% FTP, terwijl `percentRangeForRpe(6)` 80-90% geeft
     (`src/lib/training/targets.ts`). Bij dezelfde RPE kan de UI-hint ~25w
     afwijken van het wattage van de AI.

  Eerst meten: wat is de actuele eFTP versus de opgeslagen `profiles.ftp_watts`?
  Dat bepaalt of dit vooral een bronprobleem (1) of een zonemodel-probleem (2/3) is.

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
- **Team/club challenges + AI-agenten** — productsporen na de quick wins uit
  testerfeedback juni 2026. Challenges richten zich op winter/zomerbinding;
  agenten horen bij een latere/betaalversie en vragen eerst afbakening van
  kennis, privacy en verantwoordelijkheden.
- **E2E chat** — onderzocht (zie hieronder); bouw alleen bij expliciete vraag.
- **Mollie iDEAL** — onderzocht (zie hieronder); bouw alleen bij expliciete vraag.
- **Core & mobiliteit als eigen trainingsspoor** — aanleiding: de AI plande in
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

## Mobiele revisie (gepland, eigen ronde)

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

## Redesign-traject (gepland, aparte ronde)

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

## Onderzoek (iteratie-ronde 2) — Mollie & E2E-chat

Beide zijn deze ronde alléén onderzocht; nog niet gebouwd.

### Mollie (contributie/betalingen)

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

### E2E-chat

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
