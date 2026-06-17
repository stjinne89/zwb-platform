# Zwift/MyWhoosh Kalenderintegratie Plan

Datum: 2026-06-17
Status: MVP-scan + handmatige koppeling gereed; richting automatische
integratie vastgelegd (zie "Beslissing 2026-06-17"). Increment 1 gereed.
Increment 2 (Zwift-club-sync) + Increment 3 (ZWB'er-participatie over alle
events) gebouwd; auth + endpoints empirisch bevestigd (event-feed + entrants).
Te bevestigen op live data zodra er aankomende events met ZWB-inschrijvingen
zijn, via de knoppen op `/beheer/event-scan`.

## Samenvatting

Doel is een beheerflow waarmee ZWB relevante Zwift- en MyWhoosh-events kan vinden,
controleren en als kalenderitem publiceren. Publiceren blijft in v1 altijd een
adminactie. Automatische ZWB-deelnameherkenning wordt alleen gebruikt wanneer de
bron betrouwbaar genoeg is; anders blijft een event een gewoon concept zonder
deelnameclaim.

De huidige basis is `/beheer/event-scan`: admins scannen externe bronnen,
MyWhoosh- en Zwift-metadata wordt als concept opgeslagen in
`external_event_candidates`, duplicaten worden herkend via
`(source, external_id)` en admins kunnen gevonden events negeren, heropenen,
markeren en naar `/kalender` publiceren. Zwift-eventrijen komen niet uit de
marketingpagina, maar uit de publieke upcoming endpoint van Zwift. De
screenshot/OCR-route is afgekeurd omdat screenshots verouderde data kunnen
tonen; ZWB-deelnemers worden daarom expliciet per actueel concept gekoppeld.

## Fase 1 - Huidige MVP Afronden

- Houd `/beheer/event-scan` beheer-only achter `events.manage_all`. **Gereed.**
- Toon externe events als concepten met bron, titel, starttijd, afstand,
  hoogtemeters en bronlink. **Gereed.**
- Publiceer alleen na adminactie naar de bestaande `events`-tabel. **Gereed.**
- Gebruik bestaande eventvelden: `title`, `type`, `start_at`, `location`,
  `external_url`, `distance_km`, `elevation_m`, `created_by`.
- Dedupliceer op `(source, external_id)` en voorkom dubbele publicatie via
  bestaande `external_url`. **Gereed.**
- Geen pushnotificatie bij scan; alleen reguliere eventflows mogen leden
  informeren.

## Fase 2 - Bronadapters

- MyWhoosh-adapter:
  - Gebruik `https://mywhoosh.com/events/` als metadata-bron.
  - Parse alleen server-side beschikbare data: titel, tijd, afstand,
    hoogtemeters en `event.mywhoosh.com`-link.
  - Sla geen deelnemersclaims op zolang detailpagina's of loginroutes niet
    betrouwbaar en toegestaan zijn. **Gereed.**
- Zwift-adapter:
  - Gebruik `https://us-or-rly101.zwift.com/api/public/events/upcoming` voor
    concrete upcoming eventrijen.
  - Gebruik `https://www.zwift.com/events` alleen nog als fallback/verificatie
    wanneer de API geen bruikbare data levert.
  - Accepteer alleen bronnen zonder accountmisbruik, onduidelijke scraping of
    afhankelijkheid van private cookies.
  - **Gereed.**
- Adaptercontract:
  - Elke adapter levert `source`, `externalId`, `title`, `startAt`,
    `externalUrl`, `distanceKm`, `elevationM`.
  - Adapters falen stil per bron, zodat een storing bij een platform de hele
    eventscan niet breekt. **Gereed.**

## Fase 3 - ZWB-Deelnameherkenning

- Herken deelname alleen conservatief:
  - betrouwbare team-/organizernaam in eventmetadata;
  - betrouwbare deelnemerslijst met match op bekende ledennaam of platform-ID;
  - handmatige adminmarkering in de beheerflow.
- Voeg pas daarna een conceptstatus toe zoals `zwb_match_status`:
  `unknown`, `likely`, `confirmed`, `manual`. **Gereed als handmatige
  beheerstatus en als confirmed-status na deelnemerimport.**
- Koppel deelnemers via beheer per concept:
  - beheerder scant actuele Zwift-events;
  - beheerder plakt ZWB-namen direct onder het juiste concept;
  - categorie kan per regel of als standaard worden meegegeven;
  - deelnemers worden opgeslagen in `external_event_participants`;
  - publicatie zet een compacte `ZWB-deelnemers:` regel in de eventbeschrijving.
  **Gereed via migratie `0082`.**
- Toon in de UI geen harde deelnameclaim bij `unknown` of zwakke matches.
- Overweeg profielvelden voor platform-ID's pas wanneer duidelijk is welke
  externe bron ze gebruikt.

## Fase 4 - Betere Conceptworkflow

- Aparte conceptlaag: `external_event_candidates` met bron, externe ID/URL,
  beperkte ruwe metadata, matchstatus, scanmoment en publicatiestatus.
  **Gereed via migratie `0081`.**
- Laat admins concepten negeren, publiceren of later opnieuw bekijken.
  **Gereed.**
- Bewaar ruwe metadata beperkt en zonder persoonsgegevens, tenzij expliciete
  noodzaak en privacygrondslag aanwezig zijn. **Gereed voor MyWhoosh: alleen
  bronregeltekst.**
- Maak publicatie idempotent: een concept kan niet meerdere kalenderitems
  maken. **Gereed.**

## Testplan

- MyWhoosh-scan slaat events op wanneer de bron HTML bevat.
- Zwift-scan slaat events op wanneer de publieke upcoming endpoint JSON levert.
- Bulk-invoer onder een concept koppelt ZWB-deelnemers aan dat Zwift-concept.
- Scanpagina blijft bruikbaar als MyWhoosh of Zwift tijdelijk geen data levert.
- Publiceren maakt exact een kalenderitem aan met externe URL en koppelt het
  concept aan `published_event_id`; gekoppelde deelnemers komen in de
  eventbeschrijving.
- Opnieuw scannen update `last_seen_at` zonder dubbele concepten.
- Gebruiker zonder `events.manage_all` kan `/beheer/event-scan` niet gebruiken.
- Bestaande event-aanmaak, eventbewerking en kalenderweergave blijven werken.

## Beslissing 2026-06-17 - Richting Automatische Integratie

Na overleg is besloten dat volautomatische ZWB-filtering het doel is. De
kalenderkant is af; het knelpunt is een betrouwbare, toegestane, automatische
bron van "welke ZWB'ers zitten in dit event". Vastgestelde uitgangspunten:

- **ZWB heeft een eigen Zwift Club.** Dit maakt een geautoriseerde, automatische
  bron vóór het event mogelijk (club-events + inschrijvingen) i.p.v. scraping.
- **ZWB's eigen ritten verschijnen onder een herkenbare naam** (vaste organizer-,
  serie- of clubnaam). Dit maakt naam-gebaseerde auto-detectie van ZWB-events
  mogelijk zonder enige auth.
- **Leden mogen hun Zwift/MyWhoosh-ID op hun profiel invullen.** Dit maakt
  betrouwbare ID-matching mogelijk i.p.v. broze weergavenaam-matching.

De aanpak wordt gefaseerd, omdat alleen de Zwift Club-bron een ToS/credential-
beslissing vereist; de rest niet.

### Increment 1 - Auto-detectie + auto-matching (geen auth-risico)

Bouwt voort op de bestaande scan en conceptlaag. Geen externe credentials.

1. **Profielvelden** `zwift_id` en `mywhoosh_id` op `profiles` (optioneel,
   zelf in te vullen via `/profiel`). Migratie `0083`.
2. **Configureerbare ZWB-markers**: patronen voor organizer-/serie-/clubnaam.
   Een scankandidaat die matcht krijgt automatisch `zwb_match_status` op
   `likely` (naammatch) of `confirmed` (sterke match) en wordt als concept
   bewaard. Markers staan in code/env, niet hardcoded per event.
3. **Automatische deelnemer-matching**: gescande of geïmporteerde namen worden
   automatisch tegen `zwift_id`/`mywhoosh_id` en weergavenamen gematcht (exacte
   ID-match eerst, daarna genormaliseerde naam). Admin reviewt nog steeds, maar
   hoeft niet meer handmatig te plakken voor herkende leden.

### Increment 2 - Zwift Club-bron (GEBOUWD, te verifiëren)

- Zwift biedt **geen officiële publieke OAuth** voor clubdata van derden. De
  route is de onofficiële Zwift-API met een **eigen ZWB-club-serviceaccount**
  (credentials als secrets) die uitsluitend ZWB's eigen clubdata leest:
  club-events + inschrijvingen -> Zwift rider-ID -> match op `zwift_id` ->
  automatische deelnemerslijst -> klaar voor publicatie.
- Geïmplementeerd in `src/lib/events/zwift-club.ts` + sync in
  `/beheer/event-scan`. Club-events worden als `confirmed` concept bewaard;
  ingeschreven ZWB'ers worden via Zwift-ID gematcht en als `zwift_club`-
  deelnemer gekoppeld (migratie `0084`). De sync faalt veilig terug naar de
  reguliere scan; publiceren blijft een adminactie.

#### Endpoint-onderzoek (2026-06-17, met echte credentials)

Via de "Test clubkoppeling"-prober empirisch vastgesteld op een echt account:
- **Auth werkt**: password-grant op `secure.zwift.com` met de app-identity-
  headers (`Platform: OSX`, `Source: Game Client`, Zwift `User-Agent`,
  `Zwift-Api-Version: 2.7`). Zonder die headers geven event-endpoints 403.
- **Geen bruikbaar club-events-lijst-endpoint**: `clubs/club/{id}/events` →
  404; `clubs/events` en `clubs/event-search` → 403 (management/owner-only).
  Deze route is verlaten.
- **Wel bruikbaar — de member-feed**: `GET /api/event-feed` levert volledige
  event-objecten, inclusief `microserviceExternalResourceId` waarmee club-
  events aan de ZWB-club te koppelen zijn. Dit is nu de club-events-bron.
- **Entrants bevestigd**: `GET /api/events/subgroups/entrants/{id}?type=all&participation=signed_up`
  → 200. Hiermee halen we de inschrijvers per subgroep op.
- Conclusie: club-events uit `event-feed` filteren op de club-ID, daarna per
  subgroep entrants ophalen en matchen op `zwift_id`. Alleen bevestigd-
  werkende endpoints, geen 403-muur.

- **Env-configuratie** (server-side secrets, nooit loggen):
  - `ZWIFT_USERNAME`, `ZWIFT_PASSWORD` — ZWB-club-serviceaccount.
  - `ZWIFT_CLUB_ID` — clubidentifier (UUID).
  - Optioneel: `ZWIFT_API_BASE` (default `https://us-or-rly101.zwift.com/api`),
    `ZWIFT_EVENT_FEED_PATH` (default `event-feed`),
    `ZWIFT_ENTRANTS_PATH` (default `events/subgroups/entrants/{id}?type=all&participation=signed_up`).
- **Nog te bevestigen op live data**: er stonden tijdens het onderzoek geen
  aankomende ZWB-club-events in de feed, dus het filteren op
  `microserviceExternalResourceId` is nog niet met een echt club-event
  geverifieerd (defensief vergelijkt de code ook de ruwe JSON op de club-ID).
  Zodra er een clubrit gepland staat: "Test clubkoppeling" bevestigt of events
  + entrants binnenkomen.
- MyWhoosh blijft naam-/markergebaseerd (Increment 1), tot er een toegestane
  deelnemersbron is.

### Increment 3 - ZWB'er-participatie over alle events (GEBOUWD)

Generalisatie van Increment 2: niet alleen ZWB-club-events, maar elk Zwift-event
waar minstens één ZWB'er zich op inschrijft, wordt een bevestigd concept met die
ZWB'ers als deelnemer.

- **Opt-in via `zwift_id`**: alleen leden die hun Zwift-ID invulden tellen mee.
  Dat is de toestemmingsgrens — wie niet meedoet, vult niets in.
- **Discovery via volgen**: het serviceaccount volgt alle leden met een
  `zwift_id` (knop "ZWB-leden volgen", `POST /api/profiles/{me}/following/{them}`).
  Daardoor verschijnen hun inschrijvingen in de member-feed met
  `followeeSignedUpCount > 0`.
- **Feedsync** (`syncZwiftFeed`): voor elk feed-event dat een club-event is óf
  `followeeSignedUpCount > 0` heeft, worden de entrants opgehaald en op
  `zwift_id` gematcht. Bij ≥1 ZWB'er → `confirmed` concept + deelnemers
  (`source = 'zwift_feed'`, migratie `0085`). Events zonder match worden
  overgeslagen; de dure entrants-call wordt alleen gedaan als er een signaal is.
- **Efficiëntie**: geen brute scan van alle events; het followee-signaal
  bepaalt welke events de moeite waard zijn om entrants van op te halen.
- Gepubliceerde events tonen de ZWB-deelnemers op `/kalender` (regel
  "ZWB-deelnemers: ..." uit de eventbeschrijving).

### Increment 4 - Auto-publicatiebeleid

- Bepaal wanneer een `confirmed` ZWB-event zonder adminreview live mag, en of
  daarbij een reguliere eventpushnotificatie hoort. Tot dan blijft publiceren
  een adminactie.

## Open Beslissingen (resterend)

- Welke exacte ZWB-markerpatronen gebruiken we (organizer/serie/club)?
- Akkoord op de Zwift-club-serviceaccountroute voor Increment 2?
- Moeten gepubliceerde scan-events `type = overig` blijven of een eigen
  eventtype krijgen?
- Wanneer mag automatische publicatie zonder adminreview (Increment 4)?
