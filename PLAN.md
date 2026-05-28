# ZWB Platform — Plan & Status

> Levend document. Bijwerken wanneer er een fase wordt afgerond of een
> richting verandert. Bedoeld zodat zowel Claude als Codex (en eventuele
> nieuwe contributors) snel kunnen zien wat klaar is en wat de volgorde is.
>
> Update 2026-05-27: UI-polish + hulppagina afgerond: compactere
> app-copy, `/hulp` beginnerhub, sponsorlogo's zonder dubbele namen,
> en trainer-aanwijzing in `/training`.
> Laatst bijgewerkt: 2026-05-27 (col-detector volledig + 3 nieuwe
> geplande features: uitslagen-scraper, wellness-integratie training,
> Strava-segmenttijden voor cols)

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

8. **⏸️ On-hold (bewust uitgesteld)**
   - **E2E encrypted chat** — grote keuze. WhatsApp dekt dit
     momenteel voor ZWB; volwaardige eigen chat is forse bouw die
     pas zin heeft als bestuur 'm expliciet wil.
   - **Mollie iDEAL contributie/merch** — niet door bestuur gevraagd.
   - **Native app (Expo/React Native)** — PWA volstaat tot er
     concrete iOS-pushlimitaties bijten.

9. **Open punten**
   - **iOS PWA push-praktijktest** — niemand in ontwikkelteam heeft
     iPhone. Push werkt op desktop + Android getest; iOS-flow (PWA
     beginscherm-installatie + opt-in) moet door een iOS-eigenaar
     gevalideerd worden zodra er een ZWB'er beschikbaar is. Code
     ondersteunt iOS 16.4+ via Web Push API.
   - **OwnTracks praktijktest op een echte rit** (token werkt; veld-
     validatie staat nog te gebeuren).
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
- Netlify auto-deploy bij elke push naar `main`
- Geen test-suite (Playwright e2e staat op de wenslijst voor later)

---

## Bekende open dingen

- **Strava 1→100+ athleten cap** — eerder ingediend, wachten op approval (extern).
- **intervals.icu OAuth app-registratie** — ingediend, wachten op approval (extern).
- **iOS PWA push** werkt theoretisch (iOS 16.4+) maar moet door een iOS-
  eigenaar in de praktijk gevalideerd worden.
- **Training coach-cockpit praktijktest**: trainerrol geven, doel aanmaken,
  trainer toegang geven, AI-concept maken en publiceren naar intervals.icu.
- **OwnTracks praktijktest** op een echte buitenrit (token + push naar
  `/api/live/owntracks` is getest, eind-tot-eind veld-validatie nog niet).

---

## Geplande features (afgesproken, nog te bouwen)

Drie features die ZWB wil — nog niet ingepland qua volgorde, maar wel
toegezegd om op te pakken.

### 1. Uitslagen-scraper voor kalender-events (Gran Fondos e.d.)

Als op een event-pagina een **uitslag-URL** wordt opgegeven, scrapen we de
uitslagenlijst en tonen we **alleen de ZWB'ers** daaruit.

- Per event optioneel veld `results_url` (nieuwe kolom op `events`).
- Scraper haalt de uitslagenpagina op (Gran Fondo / wegwedstrijd /
  toertocht) en parseert naam + klassering + tijd.
- ZWB-matching: via ledennaam (fuzzy, zoals roster-claim `normalize()`
  in `/leden`) óf via een "ZWB"-vermelding in de teamkolom van de uitslag.
- Toon een ZWB-resultatenblok op de event-detail (klassering, tijd,
  gap). Cache in een tabel `event_results` tegen herhaald scrapen.
- Aandachtspunten: elke uitslagensite heeft eigen HTML → scraper per
  bron isoleren met fallback "handmatig invoeren" (zelfde patroon als de
  WTRL/Ladder-scrapers). Bearer-cron of admin-trigger voor de fetch.

### 2. Wellness-integratie in de trainingsmodule (Sporthologe / herstel-data)

Slaapkwaliteit, stress/HRV en herstel meenemen in de workout-planning,
zodat de AI-conceptschema's rekening houden met de actuele belastbaarheid.

- Databron: Sporthologe-koppeling (of equivalent: intervals.icu-wellness,
  Garmin/Whoop/Oura) — per lid opt-in, read-only.
- Nieuwe wellness-tabel (`profile_wellness`: date, sleep_score,
  hrv, stress, readiness, resting_hr) gevoed via API/sync.
- De training-AI-prompt (`src/lib/training/ai.ts`) uitbreiden met de
  recente wellness-trend zodat zware blokken worden uitgesteld bij lage
  herstelscores.
- Trainer-cockpit toont de wellness-trend naast de load-metrics.
- Privacy: gevoelige gezondheidsdata → expliciete opt-in + RLS, alleen
  zichtbaar voor het lid + toegewezen trainer.

### 3. Strava-segmenttijden voor de cols

Echte beklimmingstijden per col ophalen zodat we **tijd-leaderboards**
en de tijd-gebaseerde badge-tiers (A083 Alpe du Zwift sub-75/sub-60)
kunnen vullen.

- Strava `GET /segments/{id}` of segment-efforts uit detailed-activity
  ophalen voor de cols met bekende `strava_segment_id`.
- Per (profiel, col) de snelste effort-tijd bewaren in
  `profile_climbed_cols` (nieuwe kolom `best_time_seconds`).
- `/profiel/cols` toont PR-tijd + ZWB-tijd-ranking per col.
- A083 silver/gold (sub 75/60 min) worden hiermee auto-detecteerbaar.
- Let op rate-limit: segment-effort-fetch is duurder → batchen + cachen,
  alleen voor cols die het lid daadwerkelijk geklommen heeft.

---

## Mogelijke volgende richtingen (geen actieve toezegging)

Fase 3 is dicht — wat hierna logisch zou kunnen komen, afhankelijk van
waar ZWB de meeste waarde uithaalt. Geen verplichting, geen volgorde.

- **Dedicated `/stats`-pagina** met drill-down (per maand, per discipline,
  per regio) als de dashboard-widget honger wekt.
- **Foto-galerij × liveticker** — foto's automatisch koppelen aan event
  na `eventIsToday`, zodat ritverslagen met foto's gestructureerd ontstaan.
- **WhatsApp bulk-import via OG metadata** — open punt uit eerdere fase.
- **Sponsor-bannercarousel** op `/dashboard` of `/login`, of subtiel in
  de footer — voor extra zichtbaarheid van sponsors.
- **E2E chat** — alleen bij expliciete vraag van bestuur.
- **Mollie iDEAL** — alleen bij expliciete vraag van bestuur.
