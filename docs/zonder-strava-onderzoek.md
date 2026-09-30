# Verder zonder Strava — onderzoek

Datum: 2026-09-30
Status: **onderzoek, geen code.** Aanleiding: Strava wees de tweede aanvraag voor
meer atleten af met dezelfde reactie als de eerste. De eigenaar heeft om
uitleg gevraagd. Dit onderzoek kijkt ondertussen of ZWB zonder Strava kan, met
directe koppelingen met Garmin, Wahoo, Zwift en andere merken.

**Beperking van dit onderzoek.** De cloud-omgeving blokkeerde alle primaire
bronnen (strava.com, developers.wahooligan.com, developer.garmin.com,
intervals.icu, polar.com). Wat hieronder over externe partijen staat, komt uit
zoekresultaten en samenvattingen van nieuws- en forumpagina's, niet uit de
beleidsteksten zelf. Wat over onze eigen code staat, is wél in de code
nagekeken. Bij elk extern punt staat hoe zeker het is. De spike in sectie 8
controleert de punten die de keuze bepalen.

## Antwoord in het kort

1. **Ja, het kan, via intervals.icu als centraal punt.** Die koppeling
   bestaat al in de app. intervals.icu is officieel partner van Garmin, Wahoo,
   Zwift, MyWhoosh, Rouvy, Hammerhead, Polar, Suunto en Coros. Eén koppeling per
   lid dekt dus bijna elk merk, óók Garmin.
2. **Garmin rechtstreeks kan niet.** Het Garmin Connect Developer Program neemt
   sinds voorjaar 2026 geen nieuwe aanvragen aan. Er is geen datum voor
   heropening, en het programma eist een rechtspersoon. intervals.icu is de
   enige legale route naar Garmin-ritten die er nu is.
3. **Zwift rechtstreeks kan ook niet.** Zwift werkt alleen met partners, via
   een aanvraag en een contract. intervals.icu is zo'n partner.
4. **Wahoo rechtstreeks kan wel,** maar het levert weinig op boven
   intervals.icu. De Cloud API is self-service met OAuth, een webhook per rit en
   het FIT-bestand erbij. Voor productie volgt een review door Wahoo. Het dekt
   alleen Wahoo-rijders.
5. **Eén voorwaarde, en die is cruciaal.** Het lid moet zijn toestel of Zwift
   **rechtstreeks** aan intervals.icu koppelen, niet via Strava.
   intervals.icu mag ritten die via Strava binnenkomen niet doorgeven. Onze
   API krijgt dan alleen `{ source: "STRAVA", _note: "…not available via the
   API" }` terug (zie `src/lib/training/ride-metrics.ts`). Dat is nu bij de
   meeste leden zo.
6. **Wat wegvalt: alles wat Strava zelf is.** Strava-segmenten, KOM's, de
   segmentverkenner en kudos. Coltijden en ZWB-segmenttijden kunnen terugkomen
   als we ze zelf uit het GPS-spoor berekenen. Dat is het grootste bouwwerk.
7. **Nieuw en belangrijk: ook de huidige 10 koppelingen staan onder druk.**
   Volgens de bronnen verbiedt het Strava-beleid van 2026 drie dingen die de app
   nu doet:
   - Strava-data langer dan 7 dagen bewaren;
   - de data van een lid aan andere leden tonen;
   - Strava-data in een AI-prompt stoppen.

   Dat verklaart vermoedelijk waarom de afwijzing algemeen blijft: de kern van
   een clubapp is precies wat het beleid verbiedt. Zie sectie 2.

**Advies:** niet opnieuw bij Strava indienen. Stap over op intervals.icu als
bron voor ritten. Begin met een proef zonder code (sectie 8): de eigenaar en één
Garmin-lid koppelen hun toestel rechtstreeks aan intervals.icu. Daarna bouwen we
in fasen (sectie 6). Strava kan daarna blijven als optionele koppeling die alleen
de eigen data van het lid aan dat lid toont, of helemaal verdwijnen. Dat is een
keuze voor de eigenaar.

## 1. Wat de app nu uit Strava haalt

Nagekeken in de code, 2026-09-30. `strava_activities` wordt in 45 bestanden
gelezen.

| Functie | Wat uit Strava | Waar |
|---|---|---|
| Naleving, weekbelasting, ongeplande ritten | afstand, tijd, vermogen, hartslag, type, `trainer` | `lib/training/ride-metrics.ts`, `completion.ts`, `compliance.ts`, `unplanned-rides.ts` |
| AI: dagaanpassing, schema, pacing | ritten van de laatste 48 uur, samenvatting | `lib/training/adapt-context.ts`, `draft.ts`, `lib/pacing/draft.ts` → OpenAI |
| Badges, week-awards, clubstatistiek | afstand, hoogtemeters, aantal ritten, **kudos** | `lib/achievements/awards.ts`, `milestone-evaluators.ts`, dashboard, `/stats`, `/leden/[id]` |
| Cols gepasseerd | `raw.map.summary_polyline` | `lib/cols/detector.ts` |
| ZWBlokken (ook Zwift-werelden) | polyline, `device_name`, `external_id` | `lib/zwblokken/sync.ts` |
| Coltijden, ZWB-segmenten, KOM's | **Strava segment efforts** (`include_all_efforts`) | `lib/segments/sync.ts`, `lib/cols/segment-times.ts` |
| Segmentverkenner | `GET /segments/explore` | `lib/segments/sync.ts` L962 |
| Mijn garage | fietsen en kilometers uit `/athlete` | `lib/strava/client.ts` L336 |
| Samenvatting in de Strava-beschrijving | `activity:write` | `lib/strava/post-sync.ts`, `summary-writer.ts` |
| Zwift-routeprofielen | streams van Strava-segmenten (app-niveau) | `lib/events/zwift-route-streams.ts` |
| Historie | volledige historie, geleidelijk opgehaald | `lib/strava/history-backfill.ts` |

Ook de **handmatige import** hangt aan Strava: een `activities.csv` of een GPX
uit de Strava-export (`lib/strava/import.ts`). Die schrijft in dezelfde tabel.

Niet van Strava afhankelijk: live volgen (OwnTracks, Garmin-mail, Wahoo-link),
wellness, CTL/ATL en eFTP (intervals.icu), en Zwift-uitslagen (Zwift-API met het
serviceaccount).

## 2. De Strava-kant: wat er sinds juni 2026 geldt

Uit zoekresultaten, niet uit de beleidstekst zelf. **Zekerheid: hoog voor 2.1
en 2.2** (meerdere onafhankelijke bronnen, onder andere heise en de
intervals.icu-forumdraad). **Middel voor 2.3 en 2.4**: de precieze bepalingen
moet de eigenaar op `strava.com/legal/api_policy` nalezen.

### 2.1 Toegangsniveaus

- **Standard**: vereist sinds 30 juni 2026 een betaald Strava-abonnement van de
  ontwikkelaar (ongeveer $12 per maand). Tot 10 atleten zonder review, via het
  API-dashboard.
- **Meer dan 10 atleten**: alleen na een review. De criteria zijn niet
  gepubliceerd, er is geen termijn, en een verhoging is niet gegarandeerd.
- **Extended Access**: vanaf 10.000 atleten, voor partners.
- Op de community hub melden meerdere ontwikkelaars dat ze twee keer dezelfde
  standaardafwijzing kregen, zonder uitleg. Onze ervaring is dus niet uniek.

### 2.2 Weggehaalde endpoints (1 september 2026)

- Club Activities, Club Members en Club Admins zijn verwijderd.
- `segments/explore` is alleen nog voor Extended Access. **Onze segmentverkenner
  gebruikt dat endpoint** (`lib/segments/sync.ts` L962). Hij werkt dus
  waarschijnlijk niet meer. Niet gecontroleerd op productie.

### 2.3 Bewaren, tonen, AI

- **Bewaren**: Strava-data mag hooguit 7 dagen in een cache staan (§6.2). Op de
  community hub staat het antwoord dat dit ook geldt voor de eigen historie van
  een atleet. Na een deauthorisatie moet de data binnen 48 uur weg.
  - **Wij**: `strava_activities` bewaart alles, voor altijd, en we halen zelfs
    de volledige historie op (`history-backfill.ts`).
- **Tonen**: sinds november 2024 mag de data van een lid alleen aan dat lid zelf
  getoond worden, ook als die op Strava openbaar is.
  - **Wij**: de RLS op `strava_activities` geeft elk ingelogd lid leesrecht
    (`0010`, policy `strava_activities_select_authenticated`). Clubstatistiek,
    leaderboards, rennerpagina's, badges en KOM's tonen ritten aan andere leden.
  - Eén zoeksamenvatting noemt een uitzondering op basis van
    atletencapaciteit. De tekst is daar onduidelijk. Lees de beleidstekst na; ga
    er niet van uit dat die uitzondering voor ons geldt.
- **AI**: het beleid van 2026 verbiedt Strava-data in "een AI-toepassing",
  uitdrukkelijk ook "in een context window". Prompts vallen daar dus onder.
  - **Wij**: de ritten van de laatste 48 uur gaan naar OpenAI, voor de
    dagaanpassing, het schema en het pacingplan.
- **Tussenpartijen**: apps die Strava-data via een tussenplatform doorgeven,
  worden niet meer ondersteund (§5.16). Daarom geeft intervals.icu
  Strava-ritten niet meer door.

### 2.4 Wat dat betekent

- Onze herindiening (`docs/strava-api-resubmission.md`) beschrijft een clubapp
  die ritten bewaart, aan de club toont en met AI gebruikt. Dat zijn precies de
  drie dingen die het beleid verbiedt. **Een verhoging is daarom
  onwaarschijnlijk, ook met perfecte webhooks.** De afwijzing ging
  waarschijnlijk niet over de techniek.
- **Ook met 10 atleten is de app nu waarschijnlijk niet in regel.** Blijft de
  Strava-koppeling bestaan, dan moet hij hoe dan ook worden ingeperkt:
  - data na 7 dagen weg;
  - alleen aan het lid zelf tonen;
  - niet naar de AI.

  Dat is een besluit los van de vraag uit dit onderzoek.

## 3. De alternatieven per merk

| Route | Merken | Toegang voor ZWB | Levert | Oordeel |
|---|---|---|---|---|
| **intervals.icu** (bestaat al) | Garmin, Wahoo, Zwift, MyWhoosh, Rouvy, Hammerhead, Polar, Suunto, Coros, Amazfit, Huawei | nu al: API-sleutel per lid; OAuth-app aangevraagd | samenvatting, TSS/IF/NP, streams, origineel FIT-bestand | **aanbevolen** |
| Garmin Connect Developer Program | Garmin | **gesloten** sinds voorjaar 2026, geen datum; eist een rechtspersoon | — | niet mogelijk |
| Wahoo Cloud API | Wahoo (ELEMNT, BOLT, ROAM, KICKR/SYSTM) | self-service sandbox; productie na review | webhook `workout_summary`, FIT-bestand | kan, maar weinig winst |
| Zwift Training/Racing API | Zwift | alleen partners, via aanvraag en contract | — | niet realistisch |
| Zwift, onofficieel (serviceaccount) | Zwift | technisch misschien | ritten van leden | **niet doen**: buiten de voorwaarden, en de officiële route via intervals.icu bestaat |
| Polar AccessLink | Polar | gratis, self-service, webhooks | FIT, GPX, TCX (laatste 30 dagen) | kan; via intervals.icu is eenvoudiger |
| Coros Partner API | Coros | eist een bedrijf en een bestaand gebruikersbestand | — | via intervals.icu |
| Suunto API | Suunto | partnerprogramma met contract | — | via intervals.icu |
| Aggregators (Terra e.d.) | alles | vanaf ~$399 per maand | uniforme API | te duur voor ~35 leden |
| Open Wearables (open source) | Garmin, Polar, Suunto… | zelf hosten, maar met **eigen** Garmin-sleutels | — | lost het Garmin-probleem niet op |
| Handmatig uploaden (FIT/GPX) | alles | geen afhankelijkheid | wat het lid uploadt | **vangnet**, altijd houden |

### 3.1 intervals.icu — aanbevolen

**Waarom.**
- **Bestaat al.** `intervals_connections` (per lid een API-sleutel, versleuteld)
  en `intervals_activities` (`0100`). Wellness, eFTP, workouts publiceren en de
  vermogenscurve lopen er al over.
- **Officieel partner** van Garmin, Wahoo, Zwift (Training API), MyWhoosh, Rouvy,
  Hammerhead, Polar, Suunto en Coros. Voor Garmin en Zwift is het nu de enige
  legale route.
- **Voorwaarden** (API Terms, van kracht sinds 23 oktober 2025, volgens de
  forumdraad): gebruik voor elk wettig doel, ook commercieel. De enige eis:
  **naamsvermelding van Garmin** bij data die van een Garmin komt (herkenbaar aan
  `device_name`). Geen verbod op tonen aan anderen, geen bewaartermijn en geen
  AI-verbod gevonden. **Zekerheid: middel.** Lees de voorwaarden zelf na.
- **Levert meer dan Strava voor training.** TSS, IF, NP en FTP per rit komen
  kant-en-klaar. Die rekenen we nu zelf uit Strava-velden.
- **Spoor en bestand.** `GET /api/v1/activity/{id}/streams` (met `latlng`, te
  bevestigen in de spike) en `GET /api/v1/activity/{id}/file` (het originele
  FIT-bestand). Dat is genoeg voor cols, ZWBlokken en eigen segmenttijden.
- **Limieten.** API-sleutel: 5.000 verzoeken per dag, 2.500 per 15 minuten.
  OAuth: 100 per lid per dag, minimaal 5.000. Wij hebben ongeveer 10 ritten per
  dag (287 in 30 dagen, gebruiksanalyse). Ruim voldoende.
- **Webhooks.** `ACTIVITY_UPLOADED` en andere, maar alleen voor een OAuth-app.
  Die registratie staat nog open ("ingediend, wachten op approval" in
  `PLAN.md`). Tot die er is: pollen per lid. Met de bestaande
  sync-drempel van 6 uur (`ACTIVITY_SYNC_MAX_AGE_MS`) of een cron.

**Gratis of supporter** (toegevoegd 2026-09-30, uit zoekresultaten; zekerheid
middel).
- **Gratis voor iedereen:** de koppelingen met Garmin, Wahoo, Zwift en de andere
  merken, de API-sleutel en de analyses (CTL/ATL, vermogenscurve, intervallen).
  Alles wat ZWB nodig heeft, zit in het gratis account.
- **Alleen voor supporters** ($4 per maand): de volledige Strava-historie via
  de API (gratis: 3 maanden), het jaarplan, volledig eigen zones, route
  matching, pendelritten automatisch markeren, CSV-streams uploaden, teams en
  coaching. ZWB gebruikt niets daarvan.
- **Het addertje: slapende accounts.** Een gratis account wordt DORMANT als het
  lid intervals.icu 90 dagen niet heeft bezocht. Dan verwerkt intervals.icu
  **geen nieuwe ritten meer**, ook niet van Garmin of Wahoo. Na een bezoek
  werkt het weer, soms pas na opnieuw koppelen met Garmin. Supporters hebben dit
  niet.
  - Voor ZWB weegt dit zwaar: leden gebruiken ZWB, niet intervals.icu, en
    lopen dus juist dit risico.
  - Onbekend: of onze API-aanroepen met de sleutel van het lid als bezoek
    tellen. Waarschijnlijk niet; de forumdraad spreekt van "de site bezoeken".
  - Opvangen: ZWB meldt het als een lid met een intervals-koppeling ongewoon
    lang geen rit meer binnenkrijgt, of vraagt elke twee maanden "open
    intervals.icu even". Of het lid wordt supporter; ongeveer €45 per jaar per
    lid. Of de club dat voor leden kan betalen, is niet uitgezocht.

**Risico's.**
- **Eén man, door supporters betaald.** intervals.icu draait op één ontwikkelaar
  (David Tinker). Valt het weg, dan staan we weer stil. Het vangnet: het
  FIT-bestand zelf opslaan en handmatig uploaden blijven ondersteunen.
- **De leden moeten iets doen.** Zie punt 5 van het korte antwoord. Wie via
  Strava blijft koppelen, levert ons niets.
- **Garmin stuurt alleen Garmin-ritten door.** Een Zwift-rit die in Garmin
  Connect staat, gaat niet via Garmin naar intervals.icu. Zwift moet dus apart in
  intervals.icu gekoppeld worden.
- **Dubbele ritten.** Een lid met Zwift én een Garmin op de trainer levert
  dezelfde rit twee keer. intervals.icu kan dubbelingen samenvoegen; wij moeten
  dat ook opvangen.

### 3.2 Wahoo Cloud API — kan, niet nu

- OAuth 2.0, scope `offline_data` voor de webhook `workout_summary`. Die bevat
  de samenvatting en een link naar het FIT-bestand.
- **Sandbox**: 25 verzoeken per 5 minuten, 100 per uur, 250 per dag. Niet om te
  zetten naar productie; productie is een aparte aanvraag met review (200 per
  5 min, 5.000 per dag). Geen termijn bekend.
- De app heeft al een FIT-lezer voor records (`lib/live/fit-records.ts`, voor de
  Wahoo-livepagina). Die is minimaal; een volledige rit heeft ook sessie- en
  lapberichten nodig.
- **Afweging.** Hetzelfde werk als een Strava-koppeling (OAuth, tokens,
  webhook, opruimen), voor één merk dat intervals.icu al dekt. **Alleen doen
  als intervals.icu wegvalt,** of als Wahoo-leden intervals.icu weigeren.

### 3.3 Garmin — alleen via intervals.icu

- Het Connect Developer Program pauzeert sinds voorjaar 2026 alle nieuwe
  aanvragen (Health, Activity, Training, Courses). Het formulier is weg, en Garmin
  noemt het een "significante herziening". Bestaande partners blijven werken.
- Ook na heropening eist Garmin een rechtspersoon. ZWB zou dat moeten regelen
  via de vereniging.
- Onofficiële bibliotheken die met gebruikersnaam en wachtwoord inloggen (garth,
  garminconnect) zijn **geen optie**: wachtwoorden van leden bewaren is onveilig
  en valt buiten Garmins voorwaarden.
- Dat stemt overeen met eerder onderzoek: [buitenrit-routevoorstel](buitenrit-routevoorstel-spike.md)
  sectie 8 en [live volgen](garmin-wahoo-live-tracking-onderzoek.md) sectie 3.4.

### 3.4 Zwift — alleen via intervals.icu

- Zwift werkt met partners (Training API, Racing API), via een aanvraag bij
  `developers@zwift.com` en een contract. Er is geen portaal waar een club
  sleutels aanmaakt.
- Het serviceaccount dat we voor uitslagen gebruiken
  ([Zwift-API-spike](omnium-zwift-api-spike.md)) is onofficieel. Ritten van
  leden daarmee ophalen, gaat een stap verder dan openbare uitslagen lezen. Niet
  doen.
- intervals.icu haalt Zwift-ritten officieel op, en zet er ook workouts in.
  Zwift-ritten hebben een spoor in de coördinaten van de Zwift-werelden. Dat is
  hetzelfde als wat we nu via Strava krijgen, dus ZWBlokken in de Zwift-werelden
  blijft werken (te bevestigen in de spike).

## 4. Wat er wegvalt, en wat ervoor terugkomt

| Functie | Zonder Strava | Wat ervoor nodig is |
|---|---|---|
| Naleving, belasting, AI-coach | **beter**: TSS/IF komen van intervals.icu | ritbron omzetten (fase 1) |
| Badges, week-awards, stats | blijft, **behalve kudos** | badge `kudos_received_week` en kudos-badges schrappen of vervangen |
| Cols gepasseerd | blijft | spoor uit intervals.icu-streams (fase 2) |
| ZWBlokken | blijft | idem |
| Coltijden, ZWB-segmenttijden | alleen met **eigen segmentmatching** | fase 3, grootste werk |
| Strava-KOM's | **weg** (dat zijn Strava-klassementen) | eventueel club-KOM's uit eigen tijden |
| Segmentverkenner | **al weg** voor ons (explore gesloten, 2.2) | eigen geometrie |
| Mijn garage (km per fiets) | Strava-fietsen vallen weg | kilometers per fiets zelf optellen; handmatige fietsen bestaan al (`0091`). intervals.icu kent ook "gear"; nakijken in de spike |
| Samenvatting in de Strava-beschrijving | weg | eventueel in de beschrijving op intervals.icu |
| Zwift-routeprofielen | los van leden, maar valt ook onder de 7-dagenregel | aparte bron voor routes (buiten dit onderzoek) |
| Historie | nieuwe ritten via intervals.icu. Oude: de Strava-bulkexport (het archief dat Strava mailt) kan het lid gratis in intervals.icu importeren; die valt niet onder de Strava-API-regels. Historie ophalen via de Strava-API is gratis maar 3 maanden, volledig alleen voor supporters. Of Garmin bij koppelen historie meestuurt: na te gaan | per lid één keer; spikepunt 7 |

**Segmentgeometrie.** De geometrie van onze ZWB-segmenten komt nu van
Strava-segmenten (`lib/segments/geometry-sync.ts`). Onder de 7-dagenregel mag
die niet blijvend bewaard worden. Eigen segmentmatching heeft dus ook eigen
geometrie nodig:
- voor cols: start en top (de toppen staan al in `cols`);
- verder: getekend, of uit een GPX of OpenStreetMap.

## 5. Datamodel (voorstel, niet gebouwd)

Twee manieren om intervals.icu-ritten naast of in plaats van Strava te laten
tellen.

**A. Rijen in `strava_activities` met een nep-ID.**
- Snel, want alle 45 lezers werken meteen.
- Maar de naam liegt, `id` is een Strava-`bigint`, `raw` volgt Strava's
  veldnamen, en de retentiecode (`lib/strava/retention.ts`) zou ze wissen bij
  ontkoppelen.
- **Afgeraden.**

**B. Een bronneutrale rittabel.**
- Een nieuwe tabel `rides`:
  - `id uuid`, `profile_id`;
  - `source` (`intervals`, `strava`, `upload`) en `source_id`, samen uniek;
  - `device_name`, `start_date`, `sport_type`, `trainer`;
  - afstand, hoogtemeters, bewegende tijd, verstreken tijd;
  - vermogen (gem., NP), hartslag, cadans, kJ;
  - `training_load`, `intensity`, `ftp_watts`;
  - `summary_polyline`, eigen afgeleid uit het spoor;
  - `raw`.
- Lezers gaan per functie over, eerst via een view die `rides` en
  `strava_activities` samenvoegt.
- **Dubbele ritten**: zelfde lid, start binnen ±2 minuten en duur binnen ±5%,
  dan telt één. Voorrang: intervals boven upload boven Strava.
- **Verwijzingen**: `profile_completed_segments`, `profile_climbed_cols` en de
  trainingskoppeling (`paired_activity_id`) verwijzen nu naar
  `strava_activities.id`. Die moeten mee.
- **Aanbevolen.** Het is meer werk, maar het is de enige vorm die Strava
  optioneel maakt.

`intervals_activities` bestaat al met bijna dezelfde kolommen. Het kan de basis
van `rides` worden, of er één op één in opgaan. Dat is een ontwerpkeuze voor
fase 1.

## 6. Fasering (voorstel)

| Fase | Wat | Code | Leden |
|---|---|---|---|
| 0 | Spike (sectie 8). Niet opnieuw bij Strava indienen. | geen | eigenaar + één Garmin-lid |
| 1 | `rides` + intervals.icu als ritbron voor training, badges en stats. Dubbelingen opvangen. `/hulp`: stappen "koppel je toestel rechtstreeks aan intervals.icu". | middel | leden koppelen rechtstreeks |
| 2 | Spoor (latlng) ophalen, polyline afleiden: cols en ZWBlokken. | klein | — |
| 3 | Eigen segmentmatching en eigen geometrie: coltijden, ZWB-segmenten, club-KOM's. | **groot** | — |
| 4 | Handmatige upload van FIT/GPX als bron in `rides` (vervangt de Strava-CSV). | klein | vangnet |
| 5 | Strava: óf beperken tot "eigen data, alleen voor het lid, 7 dagen, geen AI", óf ontkoppelen (deauthorize via de bestaande sweeper). | klein | — |
| later | intervals.icu OAuth-app + webhooks, als de registratie wordt goedgekeurd. | klein | — |

**Tijdens de overgang gaat niets verloren.** Een Garmin, Wahoo of Zwift kan
tegelijk aan Strava en aan intervals.icu hangen. Leden kunnen dus nu al
rechtstreeks koppelen, terwijl de app nog uit Strava leest. Een functie verdwijnt
pas als we Strava zelf beperken of loskoppelen (fase 5).

**Onafhankelijk van deze fasering, en eerder:** de Strava-data die nu naar
OpenAI gaat, en de 7-dagenregel. Zie 2.4. Dat is een besluit van de eigenaar.

## 7. Privacy

Bij de bouw aan te passen in de privacyverklaring:
- de ritdata komt van intervals.icu in plaats van Strava;
- welke velden we ophalen, inclusief het GPS-spoor voor cols en blokken;
- de Garmin-naamsvermelding volgt uit de voorwaarden van intervals.icu, niet uit
  de privacy.

Het tonen van ritten aan andere leden (clubstats, badges) blijft een keuze die in
de verklaring moet staan. Voor zover bekend verbiedt intervals.icu het niet
(spikepunt 5), maar de leden moeten het weten.

## 8. Spike-checklist voor de eigenaar

Geen code. Met een eigen account, en met een Garmin-lid dat toestemming geeft.

| # | Vraag | Hoe | Als ja | Als nee |
|---|---|---|---|---|
| 1 | Komt een Wahoo-rit volledig door als Wahoo rechtstreeks aan intervals.icu hangt? | Wahoo koppelen in intervals.icu (Settings → Connections), rit maken, dan in ZWB "intervals syncen" en in `intervals_activities.raw` kijken | fase 1 kan | Wahoo Cloud API (3.2) |
| 2 | Idem voor een Garmin Edge | Garmin-lid koppelt Garmin in intervals.icu | Garmin gedekt | geen legale Garmin-route; alleen upload |
| 3 | Idem voor Zwift | Zwift koppelen in intervals.icu | Zwift gedekt | upload van de Zwift-FIT |
| 4 | Geven de streams `latlng`, ook voor Zwift-ritten (Zwift-wereld)? | `GET /api/v1/activity/{id}/streams?types=latlng,time` met de eigen sleutel | fase 2 kan | FIT-bestand ophalen en zelf lezen |
| 5 | Wat staat er in de intervals.icu API Terms over tonen aan anderen, bewaren en AI? | Terms nalezen op intervals.icu | geen beperking: advies blijft | advies herzien |
| 6 | Wat zegt Strava's beleid letterlijk (§5.16, §6.2, de tonen-regel, AI)? | `strava.com/legal/api_policy` en `/legal/api` | bevestigt sectie 2 | sectie 2 corrigeren |
| 7 | Haalt intervals.icu bij koppelen de Garmin-historie op? | Garmin-lid uit punt 2 | historie gedekt | Strava-bulkexport in intervals.icu importeren |
| 8 | Kent intervals.icu fietsen (gear) met kilometers per rit? | Instellingen en API van het eigen account | garage via intervals.icu | kilometers per fiets zelf tellen |
| 9 | Hoe staat de OAuth-registratie bij intervals.icu? | intervals.icu-account van de app | webhooks inbouwen | pollen blijft |
| 10 | Houdt een API-aanroep een gratis account wakker (geen DORMANT na 90 dagen)? | Navragen op het intervals.icu-forum of bij David Tinker | geen actie van leden nodig | slaapmelding in ZWB, of supporter |

## 9. Bewust niet voorgesteld, en waarom

- **Garmin via gebruikersnaam en wachtwoord (garth en dergelijke).** Onveilig,
  buiten Garmins voorwaarden, en kan elk moment breken.
- **Zwift-ritten via het serviceaccount.** Onofficieel, en de officiële route
  via intervals.icu bestaat.
- **Een aggregator (Terra, Rook, Sahha).** Vanaf ~$399 per maand voor ~35
  leden, terwijl intervals.icu gratis dezelfde merken dekt.
- **Nu al een eigen Wahoo-koppeling.** Hetzelfde werk als een Strava-koppeling,
  voor één merk dat intervals.icu al dekt. Bewaren voor als intervals.icu
  wegvalt.
- **Een derde keer indienen bij Strava.** Niet zinvol zolang de app ritten
  bewaart, aan de club toont en met AI gebruikt. Zie 2.4. Komt er uitleg van
  Strava die iets anders zegt, dan deze conclusie herzien.

## Bronnen

Alle externe bronnen zijn via zoekresultaten gelezen. De pagina's zelf waren
vanuit de cloud-omgeving niet bereikbaar.

- Strava:
  - [API Policy (2026)](https://www.strava.com/legal/api_policy) en
    [API Agreement (2026)](https://www.strava.com/legal/api);
  - [heise: API alleen nog met betaald abonnement](https://www.heise.de/en/news/Strava-API-access-only-with-paid-subscription-in-the-future-11315017.html);
  - [Strava API changelog](https://developers.strava.com/docs/changelog/);
  - [Community hub: §6.2 en de eigen historie](https://communityhub.strava.com/developers-api-7/clarification-on-api-policy-6-2-retaining-an-athlete-s-own-activity-data-for-historical-comparison-13928);
  - [Community hub: wachten op een hogere limiet](https://communityhub.strava.com/developers-api-7/everyone-waiting-on-athlete-limit-increase-let-s-coordinate-13265);
  - [intervals.icu-forum: Strava API Update 2026](https://forum.intervals.icu/t/strava-api-update-new-terms-subs-required-for-api-access/130240);
  - [Strava: updates to the API Agreement (2024)](https://press.strava.com/articles/updates-to-stravas-api-agreement);
  - [appsforstrava: Developer Program 2026](https://appsforstrava.com/blog/strava-developer-program-changes-2026);
  - [GitHub-issue: LLM-stap weg vanwege Strava API Policy 2026](https://github.com/benneknudsen/stride/issues/292).
- Garmin:
  - [the5krunner: Garmin bevriest de API](https://the5krunner.com/2026/09/14/garmin-developer-api-access-paused/);
  - [Garmin-forum: API al maanden gepauzeerd](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-mobile-andriod/441607/garmin-connect-api-access-paused-for-months-what-are-startups-supposed-to-do).
- Wahoo:
  - [Wahoo Cloud API](https://developers.wahooligan.com/cloud) en
    [API-referentie](https://cloud-api.wahooligan.com/);
  - [api-evangelist/wahoo](https://github.com/api-evangelist/wahoo): webhook
    en limieten.
- Zwift:
  - [Zwift-forum: API voor apps van derden](https://forums.zwift.com/t/api-for-3rd-party-app-sync-zwift-activities/655226);
  - [DC Rainmaker over de Training API](https://www.dcrainmaker.com/2024/04/structured-training-interesting.html);
  - [intervals.icu en Zwift live](https://forum.intervals.icu/t/intervals-icu-and-zwift-integration-is-live/81764).
- intervals.icu:
  - [API Terms and Conditions](https://forum.intervals.icu/t/intervals-icu-api-terms-and-conditions/114087);
  - [API access (limieten, OAuth)](https://forum.intervals.icu/t/api-access-to-intervals-icu/609);
  - [App-integraties](https://www.intervals.icu/features/app-integrations/);
  - [FIT-bestanden downloaden](https://forum.intervals.icu/t/can-i-download-the-original-fit-file-directly-from-intervals-icu/110550);
  - [ROUVY en intervals.icu](https://support.rouvy.com/hc/en-us/articles/35523188955793-ROUVY-and-Intervals-icu);
  - [Prijzen (gratis en supporter)](https://www.intervals.icu/pricing/);
  - [Slapend account na 90 dagen](https://forum.intervals.icu/t/solved-suspended-account-no-activity-processed-ans-acc-set-dormant-if-90days-not-visit-intervals-icu-is-not-supporter/112826);
  - [Alle data uit Strava importeren](https://forum.intervals.icu/t/import-all-data-from-strava/81068).
- Overig:
  - [Polar AccessLink via Open Wearables](https://openwearables.io/docs/providers/polar-api-integration);
  - [Coros Partner API](https://support.coros.com/hc/en-us/articles/53181766856724-Partner-API-Access);
  - [Terra-prijzen](https://tryterra.co/pricing);
  - [Open Wearables: Garmin](https://openwearables.io/integrations/garmin).
