# ZWB Platform — Plan & Status

> Levend document. Bijwerken wanneer er een fase wordt afgerond of een
> richting verandert. Bedoeld zodat zowel Claude als Codex (en eventuele
> nieuwe contributors) snel kunnen zien wat klaar is en wat de volgorde is.
>
> Laatst bijgewerkt: 2026-05-27 (training coach-cockpit v1 toegevoegd:
> trainerrol, expliciete opt-in, AI-conceptschema's en intervals-publicatie)

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
| 11 | Race-mate finder | 🟡 deels via /leden filters |

### Fase 3 — Engagement

| # | Onderdeel | Status |
|---|---|:---:|
| 12 | Foto-galerij per event | ✅ |
| 13 | Achievements & badges (400 badges, 38 auto-evaluators) | ✅✅✅ |
| 14 | Club-stats dashboard | 🟡 deels (weekranking + recente ritten) |
| 15 | Polls | ✅ |
| 16 | Push-notificaties (PWA Web Push) | ✅ infra · ⏳ VAPID-keys setup |
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

Auto-evaluated codes (38):
`A001 A002 A003 A004 A005 A006 A007 A008 A009 A012 A017 A018 A020 A021
A026 A027 A028 A029 A030 A031 A038 A039 A041 A042 A043 A044 A045 A046
A051 A057 A071 A075 A081 A084 A085 A088 A090 A096`

De overige ~62 codes blijven `manual` (admin kent toe) of `future`
(wachten op power-data / komoot-koppeling / etc).

---

## Sub-plan: ZWB Live "Samen fietsen"

Update 2026-05-26: spoor A is omgebouwd van PWA foreground-GPS naar
OwnTracks background tracking. De browser-geolocation/wake-lock route is
verwijderd; echte outdoor posities komen nu binnen via
`/api/live/owntracks` met persoonlijke tokens. De kalender toont live
indicators op eventrijen en linkt direct naar `/live/[eventId]`.

| Spoor | Beschrijving | Status |
|---|---|:---:|
| A | Outdoor GPS-tracker via PWA (geolocation + wake-lock + Realtime) | ✅ |
| B | Externe LiveTrack aggregator (Garmin/Wahoo share-URL per rit) | ❓ check |
| C | Indoor status-board (handmatige "Ik fiets nu"-toggle) | ❓ check |
| Bonus | Event liveticker op event-pagina's | ✅ |

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
- Training coach-cockpit op `/training`: trainerrol, expliciete opt-in per
  trainer, doelen/intake, AI-conceptschema's, trainer-review en publicatie
  naar intervals.icu. Migratie `0037`.

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

6. **🚧 NU — Migraties uitrollen + env setup**
   - `supabase db push` of plak `0030-0034` in Dashboard SQL-editor
     om alle schema-wijzigingen live te krijgen.
   - Update 2026-05-26: migratie `0035` hoort nu bij deze set. Controleer
     na deploy dat `live_tracker_tokens` en `live_sessions.source` bestaan.
   - Update 2026-05-27: migratie `0037` hoort nu bij deze set. Controleer
     na deploy dat `training_coach_assignments`, `training_goals`,
     `training_plans`, `training_workouts` en `training_ai_generations`
     bestaan.
   - OwnTracks praktijktest: token maken op `/live`, URL in OwnTracks
     plakken, testlocatie laten posten, en controleren op `/kalender`,
     `/events/[id]` en `/live/[eventId]`.
   - Logo's uploaden via /sponsors admin-paneel waar nog initialen-
     fallback staat (alleen NexReply na de logo-seed).
   - Push-keys genereren: `npx web-push generate-vapid-keys` en de
     drie env vars in Netlify zetten (zie `.env.local.example`).
   - OpenAI env zetten voor training-AI: `OPENAI_API_KEY` en optioneel
     `OPENAI_TRAINING_MODEL` (default in code: `gpt-4.1-mini`).

7. **⏸️ On-hold (bewust uitgesteld)**
   - **E2E encrypted chat** — grote keuze. WhatsApp dekt dit
     momenteel voor ZWB; volwaardige eigen chat is forse bouw die
     pas zin heeft als bestuur 'm expliciet wil.
   - **Mollie iDEAL contributie/merch** — niet door bestuur gevraagd.
   - **Native app (Expo/React Native)** — PWA volstaat tot er
     concrete iOS-pushlimitaties bijten.
   - **Cron-based event-reminders** (24h/2h voor start) — vereist
     Netlify Scheduled Functions opzet, helper bestaat al.
   - **on_live_started + on_new_badge push-triggers** — preference-
     toggles staan er, alleen de send-calls moeten nog gehangen
     worden in `samen-fietsen/_actions` + `milestone-evaluators.ts`.

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

- Strava 1→100+ athleten cap aanvragen — eerder ingediend, wachten op approval
- intervals.icu OAuth app-registratie — ingediend, wachten op approval
- Training coach-cockpit praktijktest na migratie `0037`: trainerrol geven,
  doel aanmaken, trainer toegang geven, AI-concept maken en publiceren naar
  intervals.icu
