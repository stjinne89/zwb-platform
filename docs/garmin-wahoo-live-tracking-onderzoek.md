# Live volgen via Garmin- en Wahoo-fietscomputers — onderzoek

Datum: 2026-09-28
Status: **gebouwd op 2026-09-28** (migratie `0191`), na een gedeeltelijke spike.
De eerste versie van dit document schreef dat geen enkel endpoint was
aangeroepen, omdat de egress van de cloud-omgeving Garmin en Wahoo blokkeerde.
Dezelfde dag is vanaf de ontwikkelmachine de kernvraag (punt 3) wel getest:
Garmin's CSRF-token staat in de HTML, dus uitlezen lukt zonder browser. De
uitkomsten staan in [sectie 7](#7-spike-checklist-voor-de-eigenaar); wat nog
alleen uit bronnen komt, staat daar ook.

## De vraag

Renners kunnen nu alleen live gevolgd worden via OwnTracks. Dat blijkt
omslachtig en wordt weinig gebruikt. Kan het via de fietscomputers van Garmin en
Wahoo, die de meeste leden al op het stuur hebben?

## Antwoord in het kort

1. **Geen officiële live-API.** De cloud-API's van Garmin (Connect Developer
   Program) en Wahoo (Cloud API) leveren een rit pas na afloop. Voor live is er
   niets officieels.
2. **Wel: de ingebouwde LiveTrack van beide merken, doorgestuurd per mail.**
   Garmin (Auto Start) en Wahoo (Share Automatically) mailen bij elke rit
   automatisch een LiveTrack-link naar ingestelde ontvangers. Maakt een renner
   één keer een persoonlijk clubadres ontvanger, dan weten wij bij elke rit
   vanzelf dat hij rijdt en waar de link staat. **De renner doet per rit
   niets.** Dat is het grote verschil met OwnTracks.
3. **Posities uitlezen lukt bij Garmin zonder browser.** Ze komen uit
   ongedocumenteerde endpoints die sinds kort een CSRF-token vragen. Een
   actueel open-sourceproject gebruikt daarvoor een headless browser, maar het
   token staat gewoon in `<meta name="csrf-token">` van de sessiepagina, samen
   met de cookie `livetrack_csrf` (getest 2026-09-28, zie sectie 7). Bij Wahoo
   is het kaart-endpoint nog onbekend.
4. **Ook als het uitlezen niet lukt, levert de mail-route iets op.** De renner
   staat dan automatisch als "live via Garmin/Wahoo" op `/live` en op de
   eventpagina, met een klikbare link naar de kaart van Garmin of Wahoo. Nu moet
   hij die link zelf plakken, en die sessie verdwijnt na 15 minuten (zie 2.4).
5. **Een fallback voor Garmin, alleen als het uitlezen niet lukt, is een eigen
   Connect IQ-dataveld.** Dat stuurt posities rechtstreeks naar het bestaande
   OwnTracks-endpoint, officieel en stabiel. Het kost wel Monkey C-werk,
   publicatie in de store en onderhoud. Voor Wahoo bestaat zoiets niet: de
   ELEMNT heeft geen app-platform.

## 1. Aanleiding

OwnTracks vraagt van de renner (zie `/hulp`, `OWNTRACKS_STEPS` in
`src/app/(app)/hulp/page.tsx` L220-249):

- een aparte app installeren en een eenmalig getoonde koppel-URL kopiëren;
- de modus op Private HTTP zetten en de URL plakken;
- locatietoegang op "Altijd" met precieze locatie;
- per rit de juiste modus kiezen: iOS "Actie" of "Significant", Android
  "Grootte wijzigingen";
- na de rit de modus terugzetten.

Gebruik (`docs/gebruiksanalyse-2026-09-17.md`): "Samen fietsen live" 10 leden
ooit, 3 in de laatste 30 dagen, 49 sessies in totaal (jun 23, jul 1, aug 1,
sep 12). Daartegenover heeft vrijwel iedere renner een Garmin Edge of Wahoo
ELEMNT die al via Bluetooth aan de telefoon hangt (voor meldingen en uploads).

## 2. Huidige situatie in de code

### 2.1 Ingest

`src/app/api/live/owntracks/route.ts`:

- neemt OwnTracks-JSON of form-data aan (`lat`, `lon`, `alt`, `vel`, `tst`);
- zoekt het token op via SHA-256 in `live_tracker_tokens` (provider
  `owntracks`);
- hergebruikt of maakt een open `live_sessions`-rij (`mode='outdoor'`,
  `source='owntracks'`);
- schrijft een punt in `live_positions`;
- stuurt bij een nieuwe sessie de push `on_live_started` naar de leden
  (L182-198).

### 2.2 Tabellen

- **`live_sessions`** (`0023`, plus `source` uit `0035`):
  - `source` mag alleen `manual`, `owntracks` of `external` zijn.
  - `external_track_url` bestaat al.
- **`live_positions`** (`0023`): `lat`, `lng`, `altitude`, `speed_kmh`,
  `recorded_at`.
- **`live_tracker_tokens`** (`0035`): `provider` mag alleen `owntracks` zijn.

### 2.3 Koppeling aan een rit

Er is geen event-ID in de live-tabellen. `src/lib/live/event-snapshot.ts`
(L70-128) neemt een renner op als:

- het event vandaag is;
- de renner op ja of misschien staat;
- er een open outdoor-sessie is met `last_seen_at` binnen 15 minuten.

Een nieuwe bron voor posities hoeft hier dus niets aan te veranderen, zolang hij
`live_sessions` en `live_positions` vult.

### 2.4 De bestaande route met een externe link werkt maar kort

> Sinds 2026-09-28 deels opgelost: een geplakte Garmin- of Wahoo-link wordt
> uitgelezen en sluit niet meer na 15 minuten, en de eventticker toont de link
> (sectie 8). Een andere link, en een handmatige indoorsessie, sluiten nog wel
> na 15 minuten.

Op `/live` kan een renner een sessie starten met een Garmin- of Wahoo-link
(`start-form.tsx`, `startSession` in `_actions.ts`; dan is
`source='external'`). Twee beperkingen:

- **De sessie wordt na ongeveer 15 minuten gesloten.** De server action
  `heartbeat()` bestaat (`_actions.ts` L173), maar wordt nergens in de UI
  aangeroepen. De cleanup (`src/app/api/live/cleanup/route.ts` L28-33) sluit
  elke open sessie waarvan `last_seen_at` ouder is dan 15 minuten, ongeacht de
  bron.
- **De eventpagina toont de link niet.** De event-ticker selecteert
  `external_track_url` niet (`event-snapshot.ts` L115), en een sessie zonder
  posities geeft geen marker.

### 2.5 Kaart en verversen

- Kaart: Leaflet met OSM-tiles.
- Ingelogde pagina's: Supabase Realtime op inserts in `live_positions`, plus elke
  30 s een `router.refresh()`.
- De publieke `/live/[eventId]` pollt elke 10 s `/api/live/event/[eventId]`.

### 2.6 Opruimen

`/api/live/cleanup` draait elke 15 minuten via cron-job.org (runbook sectie 2):

- sluit verouderde sessies;
- wist posities na 30 dagen.

## 3. Onderzochte routes

### 3.1 Garmin LiveTrack, doorgestuurd per mail — aanbevolen (Garmin)

**Hoe het werkt.** LiveTrack zit in de Garmin Connect-app. Met **Auto Start**
begint bij elke activiteit een LiveTrack-sessie. Alle ingestelde
e-mailontvangers krijgen een mail met een link van de vorm
`https://livetrack.garmin.com/session/<sessionId>/token/<token>`. Elke rit
krijgt een nieuwe sessie en een nieuwe link. Optioneel blijft de link met
"Extend LiveTrack" nog 24 uur na de rit zichtbaar.

**Wat de renner doet.**
- Eén keer: in Garmin Connect bij LiveTrack het clubadres als ontvanger
  toevoegen en Auto Start aanzetten.
- Per rit: niets. De Edge moet wel met de telefoon verbonden zijn en Garmin
  Connect mag op de achtergrond draaien. Dat is bij de meeste renners al zo.

**Posities uitlezen.** Via ongedocumenteerde JSON-endpoints van de
LiveTrack-webpagina.

- **Oudere generatie** (renarsvilnis/garmin-livetrack):
  - `/services/session/{id}/token/{token}` geeft de status `InProgress` of
    `Expired`.
  - `/services/trackLog/{id}/token/{token}?from=…` geeft de trackpoints:
    `latitude`, `longitude`, `timestamp` en `metaData` (afstand, hoogte,
    snelheid, duur).
  - Volgens die bron meet de Edge ongeveer elke 4 s een punt en worden de punten
    in batches doorgestuurd.
- **Huidige generatie** (GarminLiveTrack-Server, commit van 13-09-2026):
  - `/api/sessions/{id}?token=…` voor de sessie;
  - `/api/sessions/{id}/track-points/common?token=…&begin=…` voor de punten;
  - `/api/sessions/{id}/courses` voor de geplande route.
  - Elke call vereist de header `livetrack-csrf-token`. Het project vangt die
    header af van het eerste verzoek dat de pagina-JavaScript zelf doet. Het
    schrijft "Garmin blocks direct API clients" en draait daarom per sessie een
    headless Chromium (Playwright).

**Stabiliteit, voorwaarden en kosten.**
- **Stabiliteit**: het formaat is al één keer gewijzigd (van `/services` naar
  `/api` met CSRF). Garmin zet Cloudflare in tegen geautomatiseerd verkeer;
  forums melden 403- en 429-blokkades op andere Garmin-endpoints. Reken erop dat
  dit zonder aankondiging kan breken.
- **Voorwaarden**: de renner stuurt de link zelf naar ons, dus toestemming is er.
  Maar geautomatiseerd uitlezen van Garmins webpagina is geen ondersteunde
  integratie.
- **Kosten**:
  - Headless Chromium op Netlify-functies is zwaar (pakketgrootte, koude
    start) en kost bij elke run credits.
  - Zonder browser is het één `fetch` per sessie per verversing.

**Oordeel: aanbevolen voor de melding "X rijdt nu, hier is de link".** Het
uitlezen van posities is alleen te doen als de spike laat zien dat het
CSRF-token zonder browser te krijgen is, bijvoorbeeld uit de HTML of een cookie
van de sessiepagina.

### 3.2 Wahoo Live Track — aanbevolen (Wahoo)

**Hoe het werkt.** Live Track zit in de ELEMNT-companion-app. Er zijn drie
manieren om te delen:

- **Share Automatically**: bij elke rit gaat automatisch een link naar de
  ingestelde e-mailontvangers. De link verloopt aan het eind van de rit.
- **Share Forever**: één vaste permalink die altijd de huidige rit toont, van
  de vorm `https://www.wahooligan.com/users/live/<secret>`.
- **Reset All Links**: trekt alle links in.

Vereist:
- de telefoon heeft data;
- de Wahoo-app mag op de achtergrond draaien;
- de ELEMNT blijft verbonden met de app.

**Wat de renner doet.**
- Eén keer: óf het clubadres als ontvanger bij Share Automatically zetten, óf
  de Share Forever-link in zijn ZWB-profiel plakken.
- Per rit: niets, zolang Live Track aan staat.

**Posities uitlezen.** Niet gedocumenteerd.
- Het enige openbare voorbeeld (WeasleyClock, een Home Assistant-hobbyproject)
  leest uit de HTML van de live-pagina alleen het attribuut
  `data-seconds-since-update` van het element `.livetrack`. Dat is genoeg om
  "rijdt nu" te bepalen.
- Welk JSON-endpoint de kaart op die pagina voedt, is niet bekend. Dat moet de
  spike uitwijzen.
- Er zijn geen meldingen van actieve blokkades, maar ook geen stabiele API.
- Forums melden dat de automatische Live Track-mail van Wahoo niet altijd
  aankomt. Share Forever is dan de betrouwbaardere variant, omdat de link niet
  per rit hoeft binnen te komen.

**Oordeel: aanbevolen.**
- De Share Forever-permalink maakt Wahoo zelfs eenvoudiger dan Garmin: er is geen
  mail nodig, alleen één keer een link opslaan.
- Zonder mail weten we echter niet wanneer de renner begint. Dan moet de server
  de permalink zelf af en toe bekijken, bijvoorbeeld alleen voor renners die
  vandaag op "ja" staan bij een rit (zie 4.3).

### 3.3 Eigen Connect IQ-dataveld — fallback, alleen Garmin

**Hoe het werkt.**
- Een eigen ZWB-dataveld stuurt de positie met `Communications.makeWebRequest`
  naar `/api/live/owntracks`. Het formaat is OwnTracks-JSON met
  `Authorization: Bearer <token>`, dus het bestaande endpoint verandert niet.
- De Edge heeft zelf geen internet. Het verzoek gaat via Bluetooth en de Garmin
  Connect-app op de telefoon.
- Hoe vaak het mag, hangt af van het toestel:
  - Toestellen met Connect IQ 5 of nieuwer (onder meer Edge 540, 840, 1040 en
    1050): het dataveld mag in de voorgrond web-requests doen, dus vaak genoeg
    voor een strak spoor.
  - Oudere toestellen: alleen via een background-service, hooguit elke 5
    minuten.
- Bestaand voorbeeld: TraccarAPIBarrel (MIT-licentie, 3 commits) stuurt posities
  via het OsmAnd-protocol naar Traccar. Het dataveld PauseTimer gebruikt die
  barrel.

**Wat de renner doet.**
- Eén keer: het veld installeren via de Connect IQ-store, het token plakken in
  de veldinstellingen (Connect IQ-app) en het veld op een datascherm zetten.
- Per rit: niets.

**Stabiliteit en kosten.**
- Officieel platform, dus stabiel.
- Wel eenmalig bouwwerk in Monkey C met de Connect IQ SDK, een store-review en
  onderhoud per nieuw toestel.
- Het veld bezet een dataveldplek.
- Voor Wahoo levert het niets op.

**Oordeel: fallback.** Alleen als het uitlezen van Garmin LiveTrack (3.1) niet
betrouwbaar blijkt.

### 3.4 Officiële cloud-API's — niet bruikbaar voor live

- **Garmin Connect Developer Program (Activity API):**
  - pusht activiteiten pas na upload, dus na de rit;
  - toegang via een zakelijke aanvraag met goedkeuring.
- **Wahoo Cloud API** (`api.wahooligan.com`):
  - OAuth 2.0 voor workouts, routes, plannen en FIT-uploads;
  - de enige webhook is `workout_summary`, bij een voltooide of bijgewerkte
    workout;
  - geen live-positie.

Wel bruikbaar voor iets anders: de rit achteraf ophalen. Dat doet de
Strava- en intervals.icu-koppeling al.

### 3.5 Overige opties

- **Strava Beacon**: werkt op Wahoo en sommige Garmins, maar Strava biedt er
  geen API voor.
- **Garmin GroupTrack**: alleen tussen Garmin-toestellen onderling, zonder API.
- **Hammerhead Karoo**: heeft wel een extension-SDK (Android), waarmee een
  dataveld zoals in 3.3 mogelijk is. Buiten scope, omdat de vraag over Garmin en
  Wahoo ging.

### 3.6 Overzicht

| Route | Garmin | Wahoo | Renner per rit | Stabiliteit | Oordeel |
|---|---|---|---|---|---|
| LiveTrack-mail naar clubadres | ✅ Auto Start | ✅ Share Automatically | niets | melding stabiel; posities onofficieel | **aanbevolen** |
| Wahoo Share Forever-permalink | — | ✅ | niets | onofficieel | **aanbevolen (Wahoo)** |
| Eigen Connect IQ-dataveld | ✅ (CIQ 5+ goed, ouder elke 5 min) | ❌ geen SDK | niets | officieel | fallback |
| Officiële cloud-API's | ❌ pas na de rit | ❌ pas na de rit | — | officieel | niet bruikbaar |
| Strava Beacon / GroupTrack | ❌ geen API | ❌ geen API | — | — | niet bruikbaar |

## 4. Aanbevolen architectuur (voorstel)

### 4.1 Koppelen

Op het `/live`-paneel (naast of in plaats van OwnTracks) krijgt de renner een
persoonlijk adres, bijvoorbeeld `live-<code>@<ontvangstdomein>`.

- `<code>` is een willekeurige string. Opgeslagen wordt alleen de SHA-256-hash,
  net als de OwnTracks-tokens.
- Voor Wahoo is er daarnaast een veld voor de Share Forever-link.
- Op `/hulp` komen twee korte stappenlijsten: Garmin Connect (LiveTrack →
  ontvangers → Auto Start) en Wahoo (Live Track → Share Automatically of Share
  Forever).

### 4.2 Ontvangen

- **Resend Receiving.** Resend is al in gebruik (`RESEND_API_KEY`). Het kan mail
  ontvangen op een eigen domein, met één MX-record op een subdomein, of op een
  `<id>.resend.app`-adres zonder DNS.
  - Resend stuurt een webhook `email.received`, met Svix-handtekening, naar
    `/api/live/inbound-mail`.
  - De payload bevat alleen metadata; de body komt via een losse API-call.
- **Wat de route doet:**
  1. Handtekening controleren.
  2. Body ophalen.
  3. Afzenderdomein controleren (garmin.com of Wahoo), en waar mogelijk de
     DKIM-uitslag.
  4. Met een regex de link zoeken (`livetrack.garmin.com/session/…/token/…` of
     de Wahoo-link).
  5. De renner vinden via de hash van de code.
  6. Een `live_sessions`-rij maken of verversen (`mode='outdoor'`,
     `source='garmin'` of `'wahoo'`, `external_track_url`).
  7. De push `on_live_started` sturen, zoals `owntracks/route.ts` L182-198.
- **Beveiliging:**
  - De code in het adres is het geheim. Een aanvaller zonder de code kan niets
    aanmaken.
  - Een link uit een mail waarvan de afzender niet klopt, wordt genegeerd.
  - Rate limiting per code.

### 4.3 Posities ophalen: "pull-on-view"

- **Alleen ophalen als iemand kijkt.** Als iemand `/live`, de event-ticker of
  `/api/live/event/[id]` opent, haalt de server voor elke open Garmin- of
  Wahoo-sessie de nieuwe punten op, sinds `external_last_point_at`. Dat gebeurt
  hooguit één keer per 30 s per sessie (`external_last_fetch_at` als slot).
- **Nieuwe punten gaan naar `live_positions`,** en `last_seen_at` wordt
  bijgewerkt. Daardoor werken de kaart, ETA, off-route-melding, Realtime, de
  retentie van 30 dagen en de data-export zonder wijziging.
- **Zonder kijkers wordt niets opgehaald,** dus kost het niets op Netlify.
  - Garmin's endpoint geeft alle punten sinds `begin`. Een gat zonder kijkers
    wordt bij de volgende keer kijken dus ingehaald.
- **Einde van de rit:**
  - Een cronjob op cron-job.org (elke 5 min, zie het runbook) vraagt voor open
    externe sessies de status op en sluit sessies die beëindigd of verlopen
    zijn.
  - De 15-minutenregel van de cleanup moet externe sessies zolang ontzien, of
    de cronjob moet `last_seen_at` bijwerken zolang de bron "bezig" meldt.
- **Wahoo Share Forever zonder mail:** dezelfde cronjob kijkt alleen voor
  renners met een opgeslagen permalink én een ja-RSVP voor een rit van vandaag,
  vanaf ongeveer 30 minuten voor de start. Zo wordt niet de hele dag gepolld.

### 4.4 Degradatie

Lukt het ophalen van posities niet (geblokkeerd, formaat gewijzigd):

- De sessie bestaat toch, via de mail.
- `/live` en de event-ticker tonen de renner als "live via Garmin/Wahoo", met de
  link.
- De sessie sluit na een vaste maximale duur (bijvoorbeeld 8 uur) of als de mail
  "rit beëindigd" binnenkomt. Garmin stuurt zo'n mail niet standaard; dat moet de
  spike laten zien.
- De ticker moet hiervoor `external_track_url` gaan selecteren (zie 2.4).

Ook de health-check moet dit melden. Anders blijft een stil falen onopgemerkt,
zoals bij WTRL (zie de gebruiksanalyse).

### 4.5 Fallback voor Garmin

Een Connect IQ-dataveld (3.3) dat naar het ongewijzigde `/api/live/owntracks`
post. Alleen als 4.3 voor Garmin niet werkt.

## 5. Datamodel (gebouwd als `0191_live_garmin_wahoo.sql`)

Gebouwd zoals hieronder, met `external_status` (`live`, `ended`, `error`,
`link`). De vaste Wahoo-link kwam er in `0192_live_wahoo_link.sql` bij, als
provider `wahoo_link` met `external_url` en `last_checked_at`, plus
`live_sessions.tracker_token_id` (sectie 8).

- `live_sessions.source`: check uitbreiden met `garmin` en `wahoo`.
- `live_sessions`: nieuwe kolommen:
  - `external_last_fetch_at timestamptz`;
  - `external_last_point_at timestamptz`;
  - eventueel `external_status text`.
- `live_tracker_tokens.provider`: check uitbreiden met `mail` (voor de code van
  het persoonlijke adres) en eventueel `wahoo_permalink`. Een Wahoo-permalink is
  zelf een geheim; bewaar hem dus niet leesbaar voor andere leden (RLS: alleen
  eigen rij, zoals nu).
- `live_positions`: ongewijzigd.

## 6. Privacy

**Aan te passen bij de bouw:**

- `/privacy` (nu L115-117, L237):
  - we ontvangen en verwerken de LiveTrack-mail;
  - we halen posities op bij Garmin of Wahoo zolang de renner dat heeft
    ingesteld;
  - intrekken kan door het adres te verwijderen of de koppeling op `/live` te
    stoppen.
- De mail zelf niet bewaren, alleen de link.

**Bijvangst uit deze verkenning (bestaande situatie, los van dit voorstel):**

- **Posities zijn publiek.** De publieke `/live/[eventId]` en
  `/api/live/event/[eventId]` gebruiken de admin-client. Iedereen met de
  event-link ziet dus de posities van die dag van renners die op ja of misschien
  staan. De privacytekst (L115-117) zegt "gedeeld met clubleden".
- **"Per rit opt-in" wordt niet afgedwongen.** Elke OwnTracks-post met een
  geldig token maakt de renner live. `/hulp` L191 en de privacytekst noemen het
  per rit.
- **Het OwnTracks-token kan in de querystring staan** (`?token=`) en kan dan in
  access-logs belanden.

## 7. Spike-checklist voor de eigenaar

Uit te voeren met een eigen Garmin en een eigen Wahoo, op een korte proefrit.
Niet met de link van een ander lid zonder diens toestemming.

| # | Vraag | Hoe | Als ja | Als nee |
|---|---|---|---|---|
| 1 | Accepteert Garmin Connect een subadres of `+`-adres als ontvanger, en komt de mail aan? | Ontvanger `jij+live@…` of een Resend-testadres, Auto Start aan, rit starten | Persoonlijk adres per renner (4.1) | Eén clubadres, en de renner herkennen aan de naam in de mail (zwakker) |
| 2 | Wie is de afzender, en klopt DKIM? | Headers van de mail bekijken | Afzendercheck in 4.2 | Alleen op de code in het adres vertrouwen |
| 3 | Staat het CSRF-token in de HTML of een cookie van de sessiepagina? | Pagina openen, in DevTools het eerste `/api/`-verzoek en de bron bekijken | Server-side `fetch` zonder browser (4.3) | Geen posities van Garmin: degradatie (4.4) of dataveld (4.5) |
| 4 | Welke velden en welke interval geven de trackpoints? | DevTools → Network → `track-points` | Veldmapping naar `live_positions` | — |
| 5 | Wat staat er op de Wahoo-live-pagina, en welk JSON-verzoek voedt de kaart? | Share Forever-link openen, DevTools → Network | Server-side fetch (4.3) | Alleen "rijdt nu" via `data-seconds-since-update`, plus de link |
| 6 | Komt de Wahoo-mail (Share Automatically) betrouwbaar aan? | Drie ritten | Mail-route voor Wahoo | Share Forever-permalink met RSVP-venster (4.3) |
| 7 | Wat gebeurt er aan het eind van de rit? | Status en endpoint na afloop | Sessie netjes sluiten | Maximale duur als vangnet (4.4) |

### Uitkomsten (2026-09-28)

Getest vanaf de ontwikkelmachine, met een verzonnen sessie-ID en zonder
iemands echte link:

- **Punt 3: ja.** `GET livetrack.garmin.com/session/<id>/token/<token>` geeft
  HTML met `<meta name="csrf-token" content="…">` en zet de cookie
  `livetrack_csrf`. Met die header (`livetrack-csrf-token`) én die cookie geeft
  `/api/sessions/<id>?token=…` een JSON-antwoord (404 "session not found" voor
  de verzonnen sessie). Zonder header of zonder cookie: 403. Dat werkt ook met
  een eerlijke User-Agent (`ZWB-platform live`), dus er is geen browser en geen
  vermomming nodig. Vanaf Netlify werkt het ook: de health-check
  `garmin_livetrack` gaf op productie "CSRF-route werkt" (2026-09-28). Die
  check meet het elk uur opnieuw.
- **Punt 4: uit de bron, niet gemeten.** De veldnamen komen uit
  GarminLiveTrack-Server (`dateTime`, `position.lat/lon`, `speedMetersPerSec`,
  `altitude`; sessie `start`, `end`, `viewable`). De parser probeert ook de oude
  namen (`latitude`, `timestamp`, `metaData`). Een echte rit moet dit bevestigen.
- **Punt 5: ja** (met de eigen link van de eigenaar, 2026-09-28). De pagina
  (~800 KB) zet de status in data-attributen van `.livetrack`:
  `data-workout-state` ("completed" na de rit) en `data-seconds-since-update`.
  Het spoor staat in `window.livetrack_fit`: een lijst base64-strings, elk 4
  bytes lengte plus een gzip'te complete FIT-file van een paar seconden. Zijn
  rit van 27 september gaf 8.298 records (1 per seconde, 67,5 km). Live-updates
  lopen daarnaast via Faye (`mb.wahooligan.com/faye`); die gebruiken we niet.
  Een ongeldige link geeft "User Not Found".
- **Punt 6: vervalt.** De ELEMNT-app van de eigenaar heeft geen "Share
  Automatically" naar een mailadres, alleen een vaste link. De mailroute werkt
  dus niet voor Wahoo; zie sectie 8.
- **Punten 1, 2, 4 en 7: open.** Garmin (1, 2, 4) vraagt een lid met een Edge;
  de eigenaar heeft er geen. Punt 7 voor Wahoo test de eigenaar met een
  proefrit. De bouw vangt de onzekerheid op (zie sectie 8).

## 8. Wat er gebouwd is (2026-09-28)

- **Koppelen:** paneel "Garmin of Wahoo LiveTrack" op `/live` (alleen als
  `LIVE_INBOUND_DOMAIN` is gezet). Het adres `live-<code>@<domein>` wordt één
  keer getoond; alleen de hash van de code wordt bewaard (provider `mail`).
- **Ontvangen:** `POST /api/live/inbound-mail`. Controleert de
  Svix-handtekening, haalt de mail op bij Resend, zoekt de link en maakt een
  sessie met bron `garmin` of `wahoo`. Een nieuwe link sluit de vorige externe
  sessie van die renner.
- **Posities:** `src/lib/live/external-refresh.ts`, aangeroepen door `/live`,
  de eventpagina, de verjaardagsrit, de publieke eventticker, `/kalender` en de
  cleanup-cron. Hooguit één ophaalronde per 30 s per sessie.
- **Rit-einde:** Garmin meldt het zelf. Bij Wahoo telt
  `data-seconds-since-update` boven 30 minuten, of "User Not Found". Anders
  sluit de cleanup een Garmin- of Wahoo-sessie na twee uur zonder teken van
  leven of een dag na de start. De 15-minutenregel geldt voor deze bronnen niet
  meer: een koffiestop is geen einde van de rit.
- **Degradatie:** lukt uitlezen niet, dan blijft de renner "live, met link" tot
  8 uur na de start. De eventticker toont zulke renners met een knop naar de
  kaart van Garmin of Wahoo.
- **Geplakte link:** een Garmin- of Wahoo-link in het startformulier op `/live`
  krijgt nu dezelfde bron, en wordt dus ook uitgelezen in plaats van na 15
  minuten te sluiten (2.4).

**Afwijking van 4.2:** er is geen afzendercheck. Het afzenderadres van Wahoo is
onbekend (punt 2), en een renner die de mail vanuit zijn eigen mailbox
doorstuurt moet ook werken. De code in het adres is het geheim, en alleen een
link van de vorm `livetrack.garmin.com/session/…/token/…` of een Wahoo-link met
"live" in het pad wordt gebruikt.

**Wahoo via de vaste link (tweede ronde, migratie `0192`).** Omdat de
ELEMNT-app geen mail stuurt:

- Het lid plakt zijn vaste link op `/live`. De server controleert eerst of
  Wahoo de link kent. De link staat alleen in `live_tracker_tokens`
  (`provider = 'wahoo_link'`, `external_url`), leesbaar voor het lid zelf. Een
  sessie wijst ernaar met `tracker_token_id` en krijgt geen
  `external_track_url`. De link blijft altijd geldig, dus in de sessie zou elk
  lid en de publieke eventpagina hem zien. Om dezelfde reden weigert het
  startformulier een geplakte vaste link.
- **Wanneer er gekeken wordt: alleen bij kijken** (keuze eigenaar, 2026-09-28).
  Andere opties waren "rond clubritten" (RSVP-venster, plus cron) en "altijd"
  (cron elke 15 min voor alle leden). Opent iemand `/live`, een eventpagina of
  de publieke ticker, dan wordt elke gekoppelde link hooguit elke 3 minuten
  bekeken (`last_checked_at` is het slot). `/kalender` en de cleanup-cron
  zoeken niet: de kalender opent vaak en toont alleen een teller. Gevolg: een
  rit verschijnt pas als iemand kijkt, en de push "X is live" komt dan ook pas.
- Rijdt de renner (niet "completed", laatste update minder dan 15 min
  geleden), dan komt er een sessie en halen we de punten uit de FIT-data. Die
  dunnen we uit tot één per 10 s (Garmin ook). De sessie sluit bij
  "completed", na 30 minuten zonder update, of als het lid ontkoppelt.
- Kosten: één pagina van ~800 KB per link per 3 minuten zolang iemand kijkt, en
  per 30 s tijdens een rit. Ophalen duurt ~1 s, zonder browser.

**Niet gebouwd:**

- **Wahoo-mail.** De mailroute blijft bestaan en herkent een Wahoo-link, maar
  de ELEMNT-app lijkt geen mail te sturen.
- **Zoeken naar Wahoo-ritten via een cron of een RSVP-venster.** Afgewezen
  voor "alleen bij kijken".
- **Faye-abonnement op Wahoo's live-updates.** Het verversen van de hele pagina
  werkt; Faye is een langlopende verbinding die niet past in een
  Netlify-functie.
- **Connect IQ-dataveld (4.5).** Niet nodig zolang punt 3 werkt.

## 9. Bewust niet gebouwd, en waarom

- ~~Nog geen code.~~ Achterhaald: op 2026-09-28 gebouwd op verzoek van de
  eigenaar, nadat punt 3 van de spike positief uitviel (zie sectie 8).
- **Geen headless Chromium op Netlify.** Te zwaar, te traag bij een koude start,
  en het kost bij elke kijker credits. Liever degraderen naar "live, met link".
- **Geen officiële partner-API's.** Ze leveren niets live; zie 3.4.
- **Geen Connect IQ-dataveld als eerste stap.** Het dekt alleen Garmin, vraagt
  een nieuwe taal, toolchain en een store-proces, en is pas nodig als 3.1 niet
  werkt.
- **OwnTracks wordt niet verwijderd.** Het werkt voor wie het gebruikt en is
  ook de ingest van een eventueel Connect IQ-dataveld.

## Bronnen

- [GarminLiveTrack-Server](https://github.com/Johannes11833/GarminLiveTrack-Server):
  mail-listener, huidige `/api/sessions`-endpoints, CSRF-header,
  "Garmin blocks direct API clients" (commit van 13-09-2026, broncode
  `garmin_livetrack/tracker.py` en `mail_listener.py` bekeken).
- [renarsvilnis/garmin-livetrack](https://github.com/renarsvilnis/garmin-livetrack):
  de oudere `/services/session` en `/services/trackLog`, en de interval van 4 s.
- [Garmin: LiveTrack in de Connect-app](https://support.garmin.com/en-US/?faq=HbqxxbiBGA3mDhlLX4GUw8)
  en [Edge 1040-handleiding: LiveTrack](https://www8.garmin.com/manuals/webhelp/GUID-0083D0A0-EA6E-41F0-8207-3F1498875E61/EN-US/GUID-5B654CCE-ADFB-4886-879A-75FDE6D154FE.html).
- [Wahoo: Live Track (ELEMNT)](https://support.wahoofitness.com/hc/en-us/articles/115000500184-Live-Track-ELEMNT),
  [Live Track voor ACE/ROAM 3/BOLT 3](https://support.wahoofitness.com/hc/en-us/articles/24743760966034-Live-Track-for-ELEMNT-ACE-ROAM-3-and-BOLT-3)
  en [DC Rainmaker over Wahoo Live Track](https://www.dcrainmaker.com/2017/07/elemntbolt-tracking-routes.html).
- [WeasleyClock BuildLog](https://github.com/randomstring/WeasleyClock/blob/master/BuildLog.md):
  Wahoo-permalink `wahooligan.com/users/live/…`, `data-seconds-since-update`.
- [Wahoo Cloud API](https://cloud-api.wahooligan.com/) en
  [developers.wahooligan.com](https://developers.wahooligan.com/cloud): alleen de
  webhook `workout_summary`.
- [TraccarAPIBarrel](https://github.com/britiger/TraccarAPIBarrel): Connect
  IQ-dataveld of -widget dat posities post; background-limiet van 5 min.
- [Connect IQ Communications-module](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html)
  en [background-services](https://developer.garmin.com/connect-iq/connect-iq-faq/how-do-i-create-a-connect-iq-background-service/).
- [Resend Receiving](https://resend.com/docs/dashboard/receiving/introduction)
  en [aankondiging Inbound](https://resend.com/blog/inbound-emails).
