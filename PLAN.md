# ZWB Platform — Plan & Status

> Levend document. Bijwerken wanneer er een fase wordt afgerond of een
> richting verandert. Bedoeld zodat zowel Claude als Codex (en eventuele
> nieuwe contributors) snel kunnen zien wat klaar is en wat de volgorde is.
>
> Laatst bijgewerkt: 2026-05-23

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
| 12 | Foto-galerij per event | 🔜 volgende iteratie |
| 13 | Achievements & badges (400 badges, 38 auto-evaluators) | ✅✅✅ |
| 14 | Club-stats dashboard | 🟡 deels (weekranking + recente ritten) |
| 15 | Polls | 🔜 volgende iteratie |
| 16 | Push-notificaties (PWA Web Push) | 🔜 volgende iteratie |
| 17 | Sponsor-zone + ledenvoordeel (samengevoegd) | 🚧 NU |
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

1. **🚧 NU — Sponsor-zone + ledenvoordeel (samengevoegd)** — punt 17
   - Sponsors-showcase (publiek) + ledenvoordeel-blok (leden-only)
   - Open keuzes (worden bij start van implementatie geverifieerd):
     - Pagina-structuur: één `/sponsors`-pagina met twee secties vs. twee aparte routes
     - Sponsor-tiering: tiered (hoofd/co/partner/vriend) vs. vlak
     - Voordeel-koppeling: alleen sponsor-gekoppeld vs. ook losse aanbiedingen
     - Logo-opslag: Supabase Storage bucket vs. externe URL
   - Suggesties (default): één pagina + tiers + gekoppeld-met-optioneel-los + Storage bucket
   - Data-model schets:
     ```
     sponsors(id, name, slug, logo_url, website_url, description_md,
              tier, display_order, active, timestamps)
     member_benefits(id, sponsor_id (nullable), title, description_md,
                     discount_code, redeem_url, valid_from, valid_until,
                     active, display_order, timestamps)
     ```

2. **🔜 Volgende iteratie**
   - **Foto-galerij per event** — upload via Supabase Storage,
     auto-resize, optioneel geo-tag. Koppelen aan event-liveticker
     (rit-verslag met foto's achteraf).
   - **Polls** — kleine bouw, hoge engagement. RSVP-achtig UI per
     vraag, mogelijk gekoppeld aan event (datum/locatie-keuze) of
     vrijstaand op /community.
   - **Push-notificaties** (Web Push API) — fundament staat in PWA,
     opt-in per user, gebruik voor event-reminders + chat-meldingen
     (eventueel later) + nieuwe badges.

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
