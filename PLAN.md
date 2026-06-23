# ZWB Platform — Plan & Status

> Levend document. Bijwerken wanneer er een fase wordt afgerond of een
> richting verandert. Bedoeld zodat zowel Claude als Codex (en eventuele
> nieuwe contributors) snel kunnen zien wat klaar is en wat de volgorde is.
>
> Update 2026-05-27: UI-polish + hulppagina afgerond: compactere
> app-copy, `/hulp` beginnerhub, sponsorlogo's zonder dubbele namen,
> en trainer-aanwijzing in `/training`.
> Laatst bijgewerkt: 2026-06-17 (testerfeedback juni 2026 verwerkt tot roadmap:
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
  afstand + foto, showcase-only en bewust buiten de onderhoudsfunctie
  (`/onderhoud` filtert op `source='strava'`). Helpers in `src/lib/strava/bikes.ts`.

---

## Roadmap forward (chronologisch)

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
