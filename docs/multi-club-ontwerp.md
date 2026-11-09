# Generieke versie voor andere clubs — ontwerp en inventaris

Opgesteld 2026-11-09. Alleen onderzoek: er is geen code gewijzigd. De cijfers
hieronder komen uit een doorloop van de code op commit `ac812f86`.

## 1. Doel en besluiten

Stijn wil het platform beschikbaar maken voor andere clubs en teams. Elke club
krijgt een eigen app met precies de onderdelen die ze nodig heeft. Een
inrichtingsmodule met een vragenlijst legt naam, huisstijl, modules en inhoud
vast.

Besluiten van de eigenaar, 2026-11-09:

1. **Eén codebase, een eigen installatie per club.** Elke club krijgt een eigen
   Netlify-site en een eigen Supabase-project. Ze draaien allemaal op dezelfde
   code. Een verbetering gaat dus in één keer naar alle clubs, en de data blijft
   per club gescheiden.
2. **Inrichten gebeurt in de app zelf.** De instellingen staan in de database van
   de installatie. Kleuren, modules en teksten zijn later aan te passen zonder
   nieuwe build of deploy.
3. **Neutrale modulenamen; de ZWB-naam wordt een instelling.** De generieke
   versie heet bijvoorbeeld "Training" in plaats van "ZWBeter Worden". ZWB vult
   zijn eigen namen in en ziet dus niets veranderen.
4. **Eerst dit ontwerp, daarna bouwen.**

Bewust niet gekozen:

- **Eén app voor alle clubs samen (multi-tenant).** Dan krijgen alle 205 tabellen
  een club-kolom en moeten alle RLS-policies om. Dat is te groot en te riskant
  voor de bestaande ZWB-data, en één lek raakt alle clubs tegelijk.
- **Een losse kopie per club.** CoachbyStijn (2026-10-14) liet zien dat een kopie
  binnen dagen uit de pas loopt: elke verbetering moet je daarna met de hand
  overnemen.

## 2. Hoe vast ZWB er nu in zit

| Wat | Omvang |
|---|---|
| Code | ~1.300 bestanden, ~254.000 regels |
| Database | 312 migraties, ~205 tabellen |
| "ZWB" in `src/` | ~1.350 keer in 428 bestanden; "ZWB'er(s)" 94 keer |
| Centrale plek voor merknaam, logo en contact | **geen**: geen `brand.ts`, geen tabel met clubinstellingen |
| Kleurliterals | ~207 in `globals.css`, ~494 in 51 ts/tsx-bestanden, ~179 in CSS-modules |
| Clubgegevens in migraties | o.a. **93 ledennamen met Zwift-ID** (`0005_roster_seed.sql`), teams, sponsors, segmenten, releasenotes |

Een paar dingen gaan de goede kant op. De rol-ids zijn al generiek (`board`,
`team_captain`, `trainer`, …), de grafieken lezen alleen CSS-variabelen, en de
navigatie en het beheermenu komen elk uit één register.

### 2.1 Naam, teksten en logo

- **Metadata en PWA**: `src/app/layout.tsx:22-63` (title, applicationName "ZWB",
  OpenGraph) en een statisch `public/manifest.json`. Verder zetten 24
  paginabestanden zelf "ZWB" in hun titel; er is geen title-template.
- **Juridisch en uitleg**: privacy 53×, plus `src/lib/privacy.ts` 11×; voorwaarden
  16×; `/hulp` 226× (vooral `(app)/hulp/_data.ts`).
- **Pushmeldingen**: fallback "ZWB Cycling" in `public/sw-push.js`, plus ~12
  meldingsteksten in de server-code.
- **AI-prompts** noemen de club, o.a. `lib/training/coach-chat.ts`,
  `lib/weekly-review/coach-text.ts`, `lib/pacing/prompt.ts`, en `lib/protocols/*`
  ~20×.
- **Tekst die buiten de app landt**: de Strava-beschrijving "ZWBeter
  workout-samenvatting", `WORKOUT_TITLE_BRAND = "ZWBeter Worden"` (in intervals.icu
  en Zwift), de ICS-`PRODID` en de user-agents met `zwbcycling.nl`.
- **Logo**: `public/zwb-logo.png` staat direct in 5 bestanden en
  `ZwbLogo`/`ZwbMark` (`src/components/zwb-logo.tsx`) in 6. De iconen, favicons,
  `og-default.png` en `badge-96.png` zijn gebakken PNG's
  (`scripts/generate-icons.mjs`).
- **Contact en social**: `info@zwbcycling.nl` (privacy, sponsors, VAPID-default),
  Instagram `zwb_cycling` (`lib/instagram.ts`), YouTube `zwbcycling`
  (`media/_actions.ts`), en het Netlify-adres als fallback in `layout.tsx`, `bot/`,
  `sauce-mod/` en `lib/live/external-livetrack.ts`.

### 2.2 Gemerkte modules

| Nu | Voorstel neutraal | Route | Merk in DB-namen |
|---|---|---|---|
| ZWBeter Worden | Training | `/zwbeter-worden/*` (~40 subroutes) | nee |
| ZWBieb | Bibliotheek | `/zwbieb` | nee (`knowledge_*`, `member_tips`) |
| ZWBekers | Bekers | `/zwbekers` | ja (`zwbekers`, `zwbeker_*`) |
| ZWBlokken | Blokkenjacht | `/zwblokken` | ja (`0111_zwblokken`) |
| ZWBgame | Managerspel | `/zwbgame` | ja (`zwbgame_*`, recht `zwbgame.manage`) |
| ZWBriljant | Rennersniveau | `/stats/zwbriljant` | ja (`zwbriljant_*`) |
| voorZpWelBokaal | Voorspelspel | `/voorzpwelbokaal` | nee (`bokaal_*`) |
| ZWB DS | Ploegleider | `/ds/[eventId]` | ja (`zwb_ds_*`) |
| ZWB Segments | Segmenten | `/profiel/segments` | ja (`zwb_segments*`) |
| ZWB Omnium | Omnium | `/omnium` | nee |

**Voorstel: tabel-, functie- en rechtnamen blijven zoals ze zijn.** Dat zijn
interne namen die geen lid ziet. Ze hernoemen raakt honderden queries en de
productie-database, en levert niets op. Alleen wat een lid ziet wordt
instelbaar: labels, paginatitels en meldingen.

### 2.3 Clubherkenning en integraties

Deze gegevens bepalen welke externe data "van de club" is. Ze moeten clubinstelling
worden:

- `ZWIFT_CLUB_ID` (env; `lib/events/zwift-club.ts`)
- `ZWB_EVENT_MARKERS`, met de default `zwb`, `zwift belgie`, `zwift belgium`
  (`lib/events/zwb-detection.ts`)
- teamtag `[ZWB]` (`lib/zrl-live/snapshot.ts:580`, `bot/src/plan.ts:27`,
  `lib/ttt/zwiftgopher.ts:75`) en de regex `ZWB_MENTION`
  (`lib/event-results/scrape.ts:76`)
- WTRL-teamnamen "ZWB Cycling B1/C1", "ZWB Zwiftladies", vaste league-waarden en de
  ladderteams ZWBeasts/Bullets/Bandits/Beauties (`lib/team-results/sync.ts:107-160,
  419, 542`)
- `SRC_DEFAULT_TEAM_NAME = "ZWB SRC"` (`lib/src/auto-join.ts:16`) en de default
  "ZWB Omnium" (`lib/event-types.ts:12`, `season-create-form.tsx:28`)
- Instagram-account en -token, YouTube-handle, podcast-RSS

**Per installatie apart, en niet deelbaar:**

- **Strava-app.** Een Strava-app heeft één webhook-URL, en de ZWB-app zit op
  **10 van 10** sporters (`docs/strava-api-resubmission.md`). Elke club vraagt dus
  een eigen app aan, met een eigen capaciteitsaanvraag. Tot die er is, blijft
  intervals.icu of de CSV/GPX-import de route.
- **Zwift-serviceaccount** (`ZWIFT_USERNAME`/`ZWIFT_DS_*`), en de sessiecookies
  voor WTRL en de ladder.
- **Telegram-bot** (`@ZWBCyclingBot` is van ZWB).
- **Crons**: die draaien op cron-job.org (`docs/runbook.md` §2), niet op Netlify.
  Elke installatie richt ~16 jobs in.

**Deelbaar, maar met een kostenvraag:** OpenAI/Anthropic (op één rekening betaalt
Stijn voor alle clubs), GraphHopper en ZwiftRacing. De ZwiftRacing-sleutel is
persoonlijk aangevraagd; delen met andere clubs moet eerst bij de maker worden
nagevraagd.

### 2.4 Database

- **Persoonsgegevens in een migratie.** `0005_roster_seed.sql` zet 93 echte
  ledennamen met Zwift-ID in de database. Een nieuwe installatie mag die nooit
  krijgen.
- **Overige ZWB-data in migraties**: teams (`0008`, `0009`, `0070`, `0290`,
  `0295`, `0298`), sponsors (`0030`, `0031`, met logo's op zwbcycling.nl),
  segmenten (`0072`/`0074`), releasenotes (`0293`), badges (`0011`, `0025`, `0277`
  "ZWB-week") en kennis (`0242`, `0282`, `0284`).
- **Schema dat van één club uitgaat**: functies met `ilike '%zwiftladies%'`
  (`0070`, `0172`, `0181`, `0182`, `0184`) en de check `event_links.kind 'zwb'`
  (`0185`).
- **Inhoud die generiek bruikbaar is**, maar in ZWB-toon: cols, workouts,
  mobiliteit, voeding en onderhoudstips. Die kan mee als startinhoud.
- **Er is geen baseline.** Geen test speelt alle migraties af op een lege
  database. Er is geen `seed.sql` en geen `config.toml`. De nummers 0066, 0067,
  0172 en 0173 komen dubbel voor; of dat bij `db push` op een leeg project botst,
  is niet getest.
- **De eerste beheerder** wordt nu met de hand gezet (`profiles.is_admin`).

### 2.5 Huisstijl

- De kleuren staan in lagen in `src/app/globals.css`:
  - de ZWB-basis `--zwb-petrol/teal/sage/gold/cream/paper/petrol-dark`, als hex;
  - de shadcn-tokens (`--primary`, `--chart-*`, …) als losse oklch-waarden die de
    tenue **benaderen**, dus niet afgeleid;
  - de tegelkleuren `--tg-*`, als hex-kopieën die drie keer zijn gedupliceerd;
  - een eigen dark-set.

  Elke kleur staat dus meerdere keren hard in het bestand.
- **Een club kiest straks 5 kleuren**: primair, secundair, neutraal, accent en
  donkere inkt. De rest wordt afgeleid met `color-mix()` of relative color
  syntax. Daarvoor moet het tokenblok één keer herschreven worden.
- Er zijn ~86 Tailwind-klassen `bg-zwb-*`. Die zijn geen probleem zolang de
  variabelen tijdens het draaien gevuld worden.
- **Runtime-injectie kan.** De root layout is al dynamisch (cookies), dus een
  server component kan daar een `<style>` met de clubkleuren neerzetten.
  Blokkades, van klein naar groot:
  1. `manifest.json` en `viewport.themeColor` zijn statisch. Oplossing:
     `src/app/manifest.ts` en `generateViewport`.
  2. Canvas en three.js hebben vaste kleuren (`lib/zwbgame/colors.ts`,
     `scenery.ts`, `race-scene.tsx`, `src/app/verhaal/*`, `components/briljant/*`).
     Oplossing: de variabelen uitlezen bij mount, zoals
     `zwblokken/_components/blocks-layer.tsx` al doet.
  3. Iconen, favicons en de OG-kaart zijn PNG's. Oplossing: logo-upload in de
     wizard en de PNG's genereren in een route (sharp staat al in de
     devDependencies; voor runtime moet die naar `dependencies`, of
     `ImageResponse` gebruiken).
- **Fonts** worden bij de build geladen (`next/font/google`). Daarom een vaste
  keuzelijst van een paar fonts, vooraf gedeclareerd met `preload:false`, en
  per installatie één variabele omzetten. Een vrij te kiezen font zou een
  runtime-link naar Google Fonts vragen; dat stuit op de privacyregels en is
  daarom niet gekozen.
- **Het oude design "klassiek" kan weg.** DESIGN.md noemt het al een vangnet. De
  generieke basis wordt dan "tegels". Dat scheelt ~16 aanroepen van
  `getDesign()` en de dubbele CSS.
- **Merkwerelden** met eigen vaste stijl (`/verhaal`, `/brochure`, bokaal, de
  ZWBekers-bekericonen) zet een club liever uit dan dat je ze themet.

## 3. Moduleregister

Eén register `src/lib/modules.ts`, met per module: een sleutel, de neutrale
naam, de routeprefixes, de beheergebieden, de rechten-categorie, de crons, de
afhankelijkheden en de benodigde koppelingen. De instelling per installatie zegt
aan of uit, en geeft eventueel een eigen naam.

| Sleutel | Neutrale naam | Soort | Hangt af van |
|---|---|---|---|
| `core` | Toegang, leden, profiel, beheer, hulp, privacy | altijd aan | – |
| `koppelingen` | Strava / intervals.icu | basis | – |
| `kalender` | Kalender en events, programma's, ritverslagen, verjaardagen | algemeen | – |
| `samen_fietsen` | Samen fietsen (live) | algemeen | kalender; Telegram |
| `training` | Training (ZWBeter Worden) | algemeen | koppelingen; AI |
| `weekoverzicht` | Weekoverzicht | algemeen | training; AI |
| `stats` | Stats en ranglijsten | algemeen | koppelingen |
| `bekers` | Badges en bekers | algemeen | koppelingen |
| `segmenten` | Segmenten en cols | algemeen | koppelingen |
| `garage` | Garage | algemeen | koppelingen |
| `community` | WhatsApp-groepen, polls, media, clubverhaal | algemeen | – |
| `bibliotheek` | Bibliotheek (ZWBieb) | algemeen | AI |
| `sponsors` | Sponsors en ledenvoordeel | algemeen | – |
| `voorspelspel` | Voorspelspel (voorZpWelBokaal) | algemeen | – |
| `blokkenjacht` | Blokkenjacht (ZWBlokken) | algemeen + Zwift | koppelingen |
| `teams` | Teams en competities (ZRL, FRR, ladder, TTT) | Zwift | kalender; Zwift-ID |
| `pacing` | Race-pacing en briefing | Zwift | kalender; AI |
| `rennersniveau` | Rennersniveau (ZWBriljant) | Zwift | koppelingen; ZwiftRacing |
| `live_race` | Live race en ploegleider (DS) | Zwift | teams |
| `src` | Sunday Race Club | Zwift | kalender |
| `omnium` | Omnium | Zwift | kalender |
| `managerspel` | Managerspel (ZWBgame) | Zwift | teams |

**Waar een uitgeschakelde module tegengehouden moet worden:**

1. **Middleware** (`src/lib/supabase/middleware.ts`): routeprefix → module, zodat
   een uitgeschakelde module een 404 geeft.
2. **Navigatie** (`nav-config.ts`, `filterNavForPermissions`) en het
   **beheermenu** (`ADMIN_AREAS`): een veld `module` erbij.
3. **Tegelplekken** (`lib/design-places.ts`, `club/page.tsx`).
4. **Dashboard** (`dashboard/page.tsx`, 1.626 regels, ~20 queries in één
   `Promise.all`) en `tegels/vandaag.tsx`. Per sectie een check, en een query
   voor een uitgeschakelde module niet uitvoeren.
5. **Dialogen die op elke pagina draaien** (ZwiftIdDialog, DurabilitySetupDialog,
   TrainingNoticeDialog, WeekReviewLauncher, de ongelezen-teller van ZWBieb).
6. **Cron-routes**: een no-op als de module uit staat.
7. **Hulpcategorieën** (`lib/help-categories.ts`) en de stappen van `/welkom`.

Het patroon bestaat al: `getDesign()` (`lib/design.ts`) is een server-flag met
React `cache()`. Op dezelfde manier komen `getClub()` en `isModuleEnabled()`.
De rechten hebben al een `category`, en die past bijna één-op-één op een module.

Wat niet generiek wordt: `/brochure` (trainingsweekend Warsberg) blijft van
ZWB alleen.

## 4. Clubinstellingen

Twee tabellen in elke installatie:

- **`club_settings`** (één rij):
  - identiteit: naam, korte naam, leden-aanduiding (bv. "ZWB'er"), logo en
    beeldmerk (Storage), contactadres en website;
  - huisstijl: 5 kleuren, font uit de keuzelijst;
  - social: Instagram, YouTube, podcast-RSS;
  - clubherkenning: Zwift-club-ID, eventmarkers, teamtag;
  - inhoud: welkomtekst, en de contactgegevens van de verwerkingsverantwoordelijke
    voor de privacyverklaring;
  - stand van de inrichting (welke stap klaar is).
- **`club_modules`**: per modulesleutel aan/uit en een eigen naam.

**Geheimen** (Zwift-wachtwoord, WTRL- en laddercookie, Instagram-token) blijven
voorlopig env-variabelen per Netlify-site. In de database zou dat met de
bestaande `TOKEN_ENCRYPTION_KEY` (`admin/encrypt-secrets`) kunnen, maar dat is
een aparte afweging.

**RLS**: iedereen die ingelogd is mag lezen. De publieke pagina's (login,
`/live`, `/profielen`) lezen naam, logo en kleuren via een smalle view.
Schrijven mag alleen met het recht `roles.manage_permissions`, of een nieuw recht
`club.setup` (de check-constraint uit `0206` moet dan mee).

## 5. De inrichtingsmodule

- **`/inrichten`** is er alleen zolang de inrichting niet af is. De eerste
  gebruiker van een lege installatie wordt beheerder; dat vervangt het
  handwerk met `profiles.is_admin`. Daarna loopt hij de stappen door.
- **`/beheer/inrichting`** toont dezelfde stappen later als beheergebied, om
  achteraf aan te passen.
- Stappen:
  1. **Club**: naam, korte naam, leden-aanduiding, logo, contact.
  2. **Huisstijl**: 5 kleuren met een live voorbeeld (tegels, knop, grafiek, licht
     en donker) en een contrastcontrole volgens de Goudregel; font kiezen.
  3. **Modules**: aan/uit per module. Afhankelijkheden gaan automatisch mee (wie
     Teams aanzet, krijgt Kalender), en de Zwift-modules staan samen in een groep.
  4. **Namen**: per module de naam, met de neutrale naam als voorinvulling.
  5. **Koppelingen en herkenning**: Zwift-club-ID, markers, teamtag, social.
     Ontbrekende env-geheimen worden getoond als "nog niet ingesteld", zonder dat
     de waarde zichtbaar is.
  6. **Inhoud**: welkomtekst en de contactgegevens voor de privacyverklaring.
     Daarnaast een keuze welke startinhoud geladen wordt: workouts, mobiliteit,
     cols, kennisbank.
  7. **Controle**: een samenvatting, en dan publiceren.
- Volgens AGENTS.md komt er geen uitleg in de formulieren. Wat een stap betekent,
  staat op `/hulp` in een nieuwe categorie "Inrichten".

## 6. Teksten

- **`getClub()`** levert naam, leden-aanduiding en modulenamen aan server
  components, metadata, meldingen en AI-prompts. Client components krijgen ze via
  een provider in de layout.
- **Een title-template** in de root layout (`%s · {clubnaam}`), zodat de 24
  pagina's hun eigen "ZWB" kwijt kunnen.
- **Privacy en voorwaarden** worden templates met clubvelden. Inhoudelijk geldt:
  de club is verwerkingsverantwoordelijke, Stijn (als beheerder van de software) is
  verwerker. Dat vraagt een verwerkersovereenkomst per club. Dat is juridisch werk
  en hoort niet in dit ontwerp.
- **`/hulp`** (226 keer "ZWB"): teksten met de clubnaam als variabele, en
  categorieën van uitgeschakelde modules verbergen.
- **Tekst die buiten de app landt** (Strava, intervals.icu, ICS, GPX,
  user-agents) gebruikt de clubnaam of een neutrale productnaam.
- **De ZWB-woordspelingen** (ZWBallen, ZWBeasts, ZWB-week-badge) zijn clubinhoud.
  Ze verhuizen naar de ZWB-installatie en komen niet in de generieke startinhoud.

## 7. Schone installatie

- **Eén baseline-migratie** voor nieuwe installaties: het schema na `0312`,
  afgeleid met PGlite (zo is het bij CoachbyStijn ook gedaan). Daarnaast een
  generieke seed: rollen, rechten, `club_settings` leeg en de startinhoud.
- **ZWB-specifieke seeds en functies** worden in de baseline weggelaten of
  generiek gemaakt: geen ledenroster, geen ZWB-teams, sponsors, segmenten of
  releasenotes, en een teamfilter op basis van de instelling in plaats van
  `zwiftladies`.
- **ZWB zelf houdt zijn migratiegeschiedenis.** Vanaf de baseline komen nieuwe
  migraties in beide sporen. Hoe dat zonder dubbel werk kan, moet in fase 5
  worden uitgewerkt: bijvoorbeeld een versienummer in de baseline waarna
  dezelfde migratiebestanden gelden.
- **Een installatiehandleiding** in `docs/` met:
  - Netlify-site en env;
  - Supabase-project en de baseline;
  - een eigen Strava-app en de webhook;
  - de cron-job.org-jobs;
  - de Telegram-bot;
  - Resend inbound;
  - en een script dat migraties op alle installaties toepast.

## 8. Fasenplan

Elke fase is een eigen ronde in PLAN.md. Fase 1 t/m 4 bouw je **in de ZWB-app
zelf**, met ZWB als eerste club en de huidige waarden ingevuld. Leden mogen in
die fasen niets merken; dat is tegelijk de test.

| Fase | Inhoud | Omvang | Migratie |
|---|---|---|---|
| 1. Fundament | `club_settings`, `club_modules`, `getClub()`, `src/lib/modules.ts`, gating in middleware, nav, beheer en crons; ZWB-waarden als seed | middel | ja |
| 2. Huisstijl | tokens herschrijven naar 5 basiskleuren, runtime-`<style>`, `manifest.ts`, `generateViewport`, logo-upload, iconen genereren, canvas leest variabelen, klassiek weg | groot | klein |
| 3. Teksten en namen | title-template, clubnaam en modulenamen via `getClub()` in UI, meldingen, AI-prompts en extern; privacy, voorwaarden en hulp als templates | groot | nee |
| 4. Clubherkenning | Zwift-club-ID, markers, teamtag, WTRL- en ladderteams, SRC- en Omnium-defaults, social naar instellingen; ZWB-teams uit de code naar de DB | middel | ja |
| 5. Schone installatie | baseline-migratie, generieke seed, bootstrap van de eerste beheerder, installatiehandleiding, migratiescript voor meerdere projecten | groot | baseline |
| 6. Inrichtingsmodule | `/inrichten` en `/beheer/inrichting`, de 7 stappen, live voorbeeld, hulpcategorie | middel | nee |
| 7. Proefinstallatie | een testclub op een eigen Netlify-site en Supabase-project, de hele vragenlijst doorlopen, verschillen vastleggen | klein | – |

Fase 1 kan alleen. De fasen 2, 3 en 4 hangen alleen van fase 1 af en raken
grotendeels andere bestanden; ze kunnen dus na elkaar of naast elkaar. Fase 6
schrijft in wat fase 1 tot en met 4 uitlezen, en komt daarom pas daarna.

## 9. Risico's en open vragen

1. **Featurepauze.** PLAN.md zegt dat stabiliteit voorgaat zolang het bestuur over
   een featurepauze beslist. Fase 1 tot en met 4 raken veel bestanden (fase 3 alleen
   al ~400). Wanneer dit werk in de volgorde past, is een keuze van de eigenaar.
2. **Netlify-credits.** Elke installatie bouwt bij elke push naar `main`. Met meer
   clubs vermenigvuldigt dat het verbruik. Te overwegen: de clubsites bouwen van een
   `release`-branch die alleen bij een release wordt bijgewerkt, en ZWB blijft op
   `main`.
3. **Wie host en betaalt?** Draaien de Netlify- en Supabase-projecten onder Stijns
   accounts (met doorbelasting), of onder die van de club? Dit bepaalt ook wie
   bij de productiedata kan.
4. **AI-kosten**: een eigen API-sleutel per club, of één rekening met een limiet
   per installatie (`ai_jobs` telt al)?
5. **Strava**: elke club zit op 10 sporters tot Strava meer toestaat. Dat moet
   vooraf gemeld worden; intervals.icu en de import blijven de volwaardige route.
6. **Routes**: `/zwbeter-worden` is zichtbaar in de adresbalk. Neutrale routes
   (`/training`) met een redirect vanaf de oude zijn netter, maar raken bookmarks,
   pushlinks en de hulpvideo's. Voorstel: pas na fase 3 beslissen.
7. **Productnaam** van de generieke versie: de app-updates noemen de app al
   "ZWBasis" (`lib/app-updates/auto.ts:61`), en het plannenboek heet ook zo. Wordt
   dat de naam, of komt er een neutrale?
8. **Updates naar meerdere databases.** Een migratie moet straks op N projecten
   worden toegepast, en als dat op één project halverwege mislukt, lopen de
   installaties uiteen. Dat vraagt een script en een vaste volgorde.

## 10. Niet lokaal te verifiëren

Deze repo heeft geen Docker en geen `supabase/config.toml`. Daarom zijn niet
lokaal te testen:

- of alle migraties op een leeg project aflopen;
- de botsing van de dubbele nummers;
- de baseline.

PGlite kan het schema wel nabouwen; daar komt de baseline vandaan, net als bij
CoachbyStijn. De echte proef is fase 7 op een leeg Supabase-project.
