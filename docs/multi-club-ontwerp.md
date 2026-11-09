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
- **Baseline (fase 5).** `supabase/baseline/` heeft het schema na `0320` en een
  generieke seed; `tests/unit/baseline.test.ts` speelt alle migraties af op
  PGlite en vergelijkt. De nummers 0066, 0067, 0172 en 0173 komen dubbel voor;
  op PGlite lopen ze op volgorde van bestandsnaam af. Er is geen `config.toml`.
- **De eerste beheerder** wordt nu met de hand gezet (`profiles.is_admin`).

### 2.5 Huisstijl

- De kleuren staan in lagen in `src/app/globals.css`:
  - de ZWB-basis `--zwb-petrol/teal/sage/gold/cream/paper/petrol-dark`, als hex;
  - de shadcn-tokens (`--primary`, `--chart-*`, …) als losse oklch-waarden die de
    tenue **benaderen**, dus niet afgeleid;
  - de tegelkleuren `--tg-*`, als hex-kopieën die drie keer zijn gedupliceerd;
  - een eigen dark-set.

  Elke kleur staat dus meerdere keren hard in het bestand.
- **Een club kiest 5 kleuren**: primair, secundair, neutraal, accent en
  donkere inkt (`0314`, gebouwd 2026-11-09). Anders dan eerst gedacht is het
  tokenblok **niet** herschreven: `globals.css` blijft de met de hand afgestelde
  standaard (de ZWB-kleuren), en `src/lib/club-theme.ts` leidt bij eigen kleuren
  alle tokens af in TypeScript (OKLCH, met contrastcontrole) en zet ze in een
  `<style>` die zwaarder weegt. Zo verandert er voor ZWB niets, en is de
  afleiding te testen.
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
- **Fonts** staan sinds 2026-11-09 als bestand in `src/fonts` en laden met
  `next/font/local` (de build haalde ze eerst bij Google, en faalde als dat
  haperde). Daarom een vaste keuzelijst van een paar fonts, vooraf gedeclareerd
  met `preload:false`, en per installatie één variabele omzetten. Een vrij te kiezen font zou een
  runtime-link naar Google Fonts vragen; dat stuit op de privacyregels en is
  daarom niet gekozen.
- **Het oude design "klassiek" kan weg.** DESIGN.md noemt het al een vangnet. De
  generieke basis wordt dan "tegels". Dat scheelt ~16 aanroepen van
  `getDesign()` en de dubbele CSS.
- **Merkwerelden** met eigen vaste stijl (`/verhaal`, `/brochure`, bokaal, de
  ZWBekers-bekericonen) zet een club liever uit dan dat je ze themet.

## 3. Moduleregister

Gebouwd in fase 1 (2026-11-09): `src/lib/modules.ts`, met per module een
sleutel, de neutrale naam, de groep, de paden (pagina's, beheer en API), de crons
en de vereiste modules. Een pad hoort bij de module met het langste passende
patroon. Een pad dat bij geen module past, is kern en altijd aan. Wat per
installatie aan staat en hoe een module heet, staat in `club_modules`.

**Kern, altijd aan:** inloggen, dashboard, club, leden, profiel, hulp, Q&A,
app-updates, beheer, de kalender met events, programma's en verjaardagen, en de
koppelingen met Strava en intervals.icu. Kalender en koppelingen zijn tijdens het
bouwen naar de kern gegaan: bijna elke module leunt erop, en een club zonder
kalender bestaat niet.

| Sleutel | Neutrale naam | Groep | Vereist |
|---|---|---|---|
| `samen_fietsen` | Samen fietsen | algemeen | – |
| `training` | Training (ZWB: ZWBeter Worden) | algemeen | – |
| `weekoverzicht` | Weekoverzicht | algemeen | – |
| `stats` | Stats | algemeen | – |
| `bekers` | Badges en bekers (ZWB: ZWBekers) | algemeen | – |
| `segmenten` | Segmenten en cols (ZWB: ZWB Segments) | algemeen | – |
| `garage` | Garage | algemeen | – |
| `whatsapp` | WhatsApp-groepen | algemeen | – |
| `polls` | Polls | algemeen | – |
| `media` | Media (met Instagram) | algemeen | – |
| `ritverslagen` | Ritverslagen | algemeen | – |
| `clubverhaal` | Clubverhaal (met `/verhaal`) | algemeen | – |
| `bibliotheek` | Bibliotheek (ZWB: ZWBieb) | algemeen | – |
| `sponsors` | Sponsors | algemeen | – |
| `voorspelspel` | Voorspelspel (ZWB: voorZpWelBokaal) | algemeen | – |
| `blokkenjacht` | Blokkenjacht (ZWB: ZWBlokken) | zwift | – |
| `teams` | Teams en competities (ZRL, FRR, ladder, TTT) | zwift | – |
| `pacing` | Race-pacing en briefing | zwift | – |
| `rennersniveau` | Rennersniveau (ZWB: ZWBriljant) | zwift | – |
| `live_race` | Live race en ploegleider (ZWB: ZWB DS) | zwift | teams |
| `src` | Sunday Race Club | zwift | – |
| `omnium` | Omnium (ZWB: ZWB Omnium) | zwift | – |
| `managerspel` | Managerspel (ZWB: ZWBgame) | zwift | teams |

"Vereist" is alleen een harde afhankelijkheid: de module werkt niet zonder. Dat
een module data van een andere toont (bekers uit teams, weekoverzicht uit
training), is geen vereiste; dat deel blijft dan leeg.

**Waar een uitgeschakelde module wordt tegengehouden (fase 1):**

1. **Middleware** (`lib/modules-gate.ts`, aangeroepen vanuit
   `lib/supabase/middleware.ts`): een pagina geeft de gewone 404, een API-route
   een 404 in JSON, en een cron-route een 200 die niets doet. De poort onthoudt de
   stand een minuut per warme instantie. Lukt lezen niet, dan staat alles aan.
2. **Menu, beheermenu en persoonlijk menu**: `filterNavForPermissions` en
   `beheerCategoriesFor` krijgen `club.allowsPath`, en de layout geeft de
   gefilterde persoonlijke links door aan `AvatarMenu` en `MobileMenu`.
3. **Tegels**: de tab "ZWBeter" valt weg als Training uit staat (`hiddenPlaces`),
   en `club/page.tsx` filtert zijn tegels.
4. **Dashboard**: vragen van een uitgeschakelde module vertrekken niet. Blokken
   zonder data vallen vanzelf weg; de losse componenten (RecentBekers, MyRaces,
   MyTeams, de training- en garageblokken, FRR, SRC, ClubStats, het weekoverzicht,
   live en de briljant-tegel) hebben een eigen check.
5. **Vaste dialogen en tellers in de layout**: TrainingNoticeDialog,
   DurabilitySetupDialog, WeekReviewLauncher, de ongelezen-teller van ZWBieb en
   de sponsorbalk. De ZwiftIdDialog blijft: het Zwift-ID hoort bij het profiel.

**Nog niet afgeschermd** (later):

- de hulpcategorieën (`lib/help-categories.ts`) en de stappen van `/welkom`;
- losse links binnen pagina's naar een andere module (bijvoorbeeld van een event
  naar de pacing). Die geven nu een 404 als de module uit staat.

`getClub()` (`lib/club.ts`) leest de instellingen gedeeld gecachet
(`unstable_cache`, tag `club-settings`), net als de sponsorbalk.
`/beheer/modules` leegt die cache bij opslaan.

Wat niet generiek wordt: `/brochure` (trainingsweekend Warsberg) blijft van
ZWB alleen.

## 4. Clubinstellingen

Twee tabellen in elke installatie. Migratie `0313` (fase 1) maakt ze aan met
alleen de identiteit, het contact, de social-handles en de stand van de
inrichting. De huisstijl komt in fase 2, de clubherkenning in fase 4 en de inhoud
in fase 3/6, elk met een eigen kolomuitbreiding. Het Zwift-club-ID staat bewust
niet in `0313`: het is een env-waarde, en een env-waarde mag niet letterlijk in de
repo staan (Netlify secrets-scan).

- **`club_settings`** (één rij):
  - identiteit: naam, korte naam, leden-aanduiding (bv. "ZWB'er"), logo en
    beeldmerk (Storage), contactadres en website;
  - huisstijl: 5 kleuren (`0314`, `color_primary` … `color_ink`, leeg = de
    standaard), font uit de keuzelijst;
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

**RLS** (zo gebouwd in `0313`):

- Lezen mag iedereen, ook anon. De publieke pagina's en de middleware moeten
  weten wat aan staat, en er staat niets geheims in. Een view is daarom niet
  nodig.
- Schrijven mag alleen de server, met de service role, na de controle op
  `roles.manage_permissions`. Daarom is er geen schrijfpolicy. Een eigen recht
  `club.setup` is niet gemaakt: dat zou de check-constraint uit `0206` vragen,
  en het zijn nu dezelfde mensen.

## 5. De inrichtingsmodule

Gebouwd in fase 6 (2026-11-09), anders dan hier eerst stond:

- **`/beheer/inrichting`** is het enige scherm, voor wie
  `roles.manage_permissions` heeft. Een aparte route `/inrichten` voor de eerste
  gebruiker is er niet: de eerste beheerder komt er met één SQL-regel
  (fase 5, [installatie.md](installatie.md) §4). Zolang de inrichting niet af is,
  staat er een balk op het dashboard van beheerders.
- Stappen:
  1. **Club**: naam, korte naam, leden-aanduiding, contact en website.
  2. **Huisstijl**: het bestaande `/beheer/huisstijl` (kleuren met live
     voorbeeld en contrastcontrole, letter, logo).
  3. **Modules**: het bestaande `/beheer/modules`; afhankelijkheden gaan mee.
  4. **Namen en woorden**: per aangezette module de naam, met de neutrale als
     voorinvulling, en de eigen woorden (`0319`).
  5. **Herkenning en koppelingen**: eventmarkers, teamtag en social. Per groep
     env-sleutels "ingesteld" of "niet ingesteld", zonder dat de waarde
     zichtbaar is.
  6. **Controle**: een samenvatting, en dan afronden (`setup_completed_at`).
- Niet gebouwd: de welkomtekst (geen plek die hem toont; plannenboek), de keuze
  van de startinhoud (de seed laadt alles; een uitgezette module verbergt zijn
  inhoud) en aparte velden voor de verwerkingsverantwoordelijke (de
  privacyverklaring gebruikt de clubnaam en het contactadres).
- Volgens AGENTS.md komt er geen uitleg in de formulieren. Wat een stap betekent,
  staat op `/hulp/inrichten`.

## 6. Teksten

- **`getClub()`** levert naam, leden-aanduiding en modulenamen aan server
  components, metadata, meldingen en AI-prompts. Client components krijgen ze via
  een provider in de layout.
- **Geen title-template** (besloten bij fase 3 deel 1, 2026-11-09). Pagina's
  hebben nu geen achtervoegsel, en een template als `%s · {clubnaam}` zou elke
  tabtitel bij ZWB veranderen. Pagina's met een modulenaam in de titel krijgen
  die via `generateMetadata` uit de clubinstellingen.
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
| 2. Huisstijl | deel 1 (gebouwd): 5 kleuren, afgeleide tokens in een runtime-`<style>`, manifest als route, `generateViewport`, `/beheer/huisstijl`. Deel 2 (gebouwd): logo en beeldmerk met gegenereerde iconen, een lijst van vier letters, kaarten lezen de clubkleuren, klassiek weg. Merkwerelden houden hun stijl; donker blijft afgeleid (keuzes eigenaar 2026-11-09) | groot | klein (`0314`, `0315`) |
| 3. Teksten en namen | deel 1 (gebouwd): clubnaam en modulenamen via `getClub().texts` en `ClubTextsProvider` in metadata, manifest, menu, beheer en schermen; geen title-template. Deel 2 (gebouwd): hulp, privacy en voorwaarden met clubwoorden (`{club}`, `{m:…}` in data, componenten in JSX), contactadres uit de club, hulp van uitgezette modules weg. Deel 3a (gebouwd): korte naam, clubnaam en lidwoord in schermen, meldingen, Telegram, agenda en AI-prompts (tokens, bij verzenden ingevuld). Deel 3b (gebouwd, `0319`): eigen woorden per club (appnaam, dagadvies, betaalmiddel, beker, beter-woord), user agents met de korte naam, kennisbanken neutraal ("de app"), eventsoort, rechtenlabels en workout-titel. Drie kennisbankzinnen houden op verzoek "ZWB" | groot | klein (`0319`) |
| 4. Clubherkenning | gebouwd (`0320`): eventmarkers en teamtag in `club_settings` (env `ZWB_EVENT_MARKERS` gaat voor), ZRL-live, ZWB DS en uitslagscraper volgen de tag, teams alleen uit de DB (seeds en WTRL-fallback weg), SRC-standaardteam met de korte naam, Instagram en YouTube uit de clubinstellingen. Zwift-club-ID en podcast-RSS blijven env | middel | ja |
| 5. Schone installatie | gebouwd (geen migratie): baseline `0320` en generieke seed in `supabase/baseline/` (pg_dump uit PGlite, rechten expliciet), test die beide routes vergelijkt, eerste beheerder met één SQL-regel, [installatie.md](installatie.md). Het migratiescript voor meerdere projecten schuift naar fase 7 | groot | baseline |
| 6. Inrichtingsmodule | gebouwd (geen migratie): `/beheer/inrichting` met Club, Huisstijl, Modules, Namen en woorden, Herkenning en een controle met afronden, balk op het dashboard, hulpcategorie Inrichten. Geen `/inrichten`, welkomtekst of keuze van de startinhoud | middel | nee |
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

- de baseline op een echt Supabase-project (Postgres 17, met de echte auth,
  storage en standaardrechten).

Op PGlite (Postgres 18) met een Supabase-stub lopen alle migraties af, ook de
dubbele nummers, en geven ze hetzelfde schema als de baseline
(`tests/unit/baseline.test.ts`). De echte proef is fase 7 op een leeg
Supabase-project.
