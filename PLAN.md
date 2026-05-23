# ZWB Platform — Plan & Status

> Levend document. Bijwerken wanneer er een fase wordt afgerond of een
> richting verandert. Bedoeld zodat zowel Claude als Codex (en eventuele
> nieuwe contributors) snel kunnen zien wat klaar is en wat de volgorde is.
>
> Laatst bijgewerkt: 2026-05-23 (foto-galerij + polls + push-notificaties
> afgerond — fase 3 inhoudelijk klaar op een paar kleinere punten na)

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
| 7 | intervals.icu koppeling + dagelijkse sync | ✅ |
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

---

## Roadmap forward (afgesproken volgorde)

1. **✅ AFGEROND — Sponsor-zone + ledenvoordeel (commit `687f6ec`)** — punt 17
   - Migratie `0030_sponsors.sql`: `sponsor_tier` enum + `sponsors` +
     `member_benefits` tabellen + RLS (publieke sponsors, leden-only
     voordelen) + Storage bucket `sponsors` + permission
     `sponsors.manage` aan board + community_manager
   - Seed met 8 sponsors van zwbcycling.nl (Hoofd: Haga Rubbers, Sub:
     RSC, Team: SPOTR/JeKa/Kalas/NexReply/A-Lourens, Web: KP Design)
   - `/sponsors`-pagina: tier-grouped showcase + gated ledenvoordeel-
     blok + worden-sponsor CTA + admin-paneel met logo-upload + CRUD
   - Nav-item toegevoegd. Logo's nog leeg → initialen-fallback tot
     admin uploadt via "Sponsor toevoegen / bewerken" UI.

2. **🚧 NU — Migraties uitrollen + VAPID-keys setup**
   - User draait `supabase db push` of plakt `0030-0034` in Dashboard
     SQL editor om alle schema-wijzigingen live te krijgen.
   - Logo's uploaden via /sponsors admin-paneel (1× per sponsor).
   - Push-keys genereren: `npx web-push generate-vapid-keys` en de
     drie env vars in Netlify zetten (zie `.env.local.example`).

3. **✅ AFGEROND iteratie 3 (commits `fe7c906`, `406fa79`, `f745f43`)**
   - **Foto-galerij per event** (12) — upload via Supabase Storage
     (bucket `event-photos`), client-side resize naar 1920px, multi-
     file met progress, grid + lightbox modal. Migratie `0032`.
   - **Polls** (15) — /polls met scope-bewust schema (free/event/team),
     single + multi-select, sluitings-tijd, admin-CRUD via
     `polls.manage`-permission. Migratie `0033`.
   - **Push-notificaties** (16) — VAPID-based web push: opt-in toggle
     op /profiel, per-trigger preferences, send-helper met auto-prune,
     trigger op nieuw event + admin-broadcast pagina op /beheer/
     notificaties. Migratie `0034`.

3. **⏸️ On-hold (bewust uitgesteld)**
   - **E2E encrypted chat** — grote keuze. WhatsApp dekt dit
     momenteel voor ZWB; volwaardige eigen chat is forse bouw die
     pas zin heeft als bestuur 'm expliciet wil.
   - **Mollie iDEAL contributie/merch** — niet door bestuur gevraagd.
   - **Native app (Expo/React Native)** — PWA volstaat tot er
     concrete iOS-pushlimitaties bijten.

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
- Live cleanup cron via Netlify Scheduled Functions — helper bestaat,
  scheduling niet wired
