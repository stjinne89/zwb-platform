# Losse apps buiten ZWB — onderzoek

2026-11-11. Alleen onderzoek: geen code gewijzigd, geen migratie. De
inventaris komt uit een doorloop van de code op `2c944e11`.

## 1. Vraag en uitkomst

Vraag eigenaar: welke onderdelen van de app zouden als losse app kunnen
bestaan, en zijn die haalbaar voor fietsers buiten ZWB?

**Uitkomst.** Een paar onderdelen kunnen los, maar geen enkel onderdeel is nu
een sterke app voor de hele wereld. Het platform als geheel, met een eigen
installatie per club, is al gebouwd ([multi-club-ontwerp.md](multi-club-ontwerp.md),
fase 1 t/m 7) en blijft het eigenlijke product. De grootste rem op losse apps
is niet de code, maar de toegang tot data.

Na het gesprek koos de eigenaar één richting: **het live ZRL-dashboard als
losse app**, met inloggen met je Zwift-account in de browser. Zie §6.

## 2. Wat er al los staat

- **Generieke versie per club**: één codebase, eigen Netlify-site en
  Supabase-project per club, modules aan/uit (`src/lib/modules.ts`).
- **CoachbyStijn** (2026-10-14): een ZWB-vrije kopie van ZWBeter. Sinds
  2026-10-16 heeft hij geen enkele van de ~198 latere commits aan training,
  voeding en protocollen gekregen. Bevestigt dat een losse kopie binnen dagen
  uit de pas loopt.
- **CyclingBadges**: apart project, deelt geen code; komt qua idee het dichtst
  bij ZWBekers.

## 3. Wat elke losse app remt

- **Zwift**: geen publieke API. Het platform logt in met een serviceaccount als
  `Zwift_Mobile_Link` en decodeert protobuf. Dat valt buiten de voorwaarden
  ([zonder-strava-onderzoek.md](zonder-strava-onderzoek.md)). Gemeten limieten
  per account: 2 verzoeken/s op `/race-results/entries`, ~45 spelersstatussen
  per minuut, en een 400 bij vijf gelijktijdige logins.
- **WTRL**: de voorwaarden verbieden het aanspreken van hun endpoints; de sync
  staat uit.
- **Strava**: 10 van 10 sporters, twee keer afgewezen; de regels van 2026
  verbieden Strava-data in AI-prompts en tonen aan anderen.
- **intervals.icu en Garmin**: Garmin scherpte in oktober 2026 zijn
  voorwaarden aan. Intervals Pro, een betaalde coach-app op intervals.icu (het
  model van een losse ZWBeter), stopte daardoor op 12 oktober.
- **Kosten**: AI ~$30 per week voor ~15 actieve leden, lineair met gebruikers;
  beperkte Netlify-credits; Supabase op het gratis plan.
- **Taal en privacy**: alles Nederlands, voeding op NEVO. HRV, rust-HR en slaap
  zijn gezondheidsgegevens: een open product maakt de maker
  verwerkingsverantwoordelijke.

## 4. Per onderdeel

| Onderdeel | Kans buiten ZWB | Reden |
|---|---|---|
| Houding (bèta) | Hoogste, op termijn | Alles in de browser, geen database of externe bron. Concurrent Aerox (€49, desktop). Pas zinvol als de meetproef laat zien dat het advies klopt. |
| Pacing | Goed, met werk | Rekenkern puur en getest; nu alleen via een club-event, dus route-upload en eigen vermogensprofiel nodig. Concurrent Best Bike Split. |
| Club Ladder-captaintool | Alleen met de organisatie | Geen concurrent gevonden, maar draait op scraping met een persoonlijke sessiecookie. Route: aanbieden aan de laddermakers. |
| Omnium | Matig | Los van leden, maar uitslagen via het serviceaccount (plakroute als terugval). |
| Ritvoeding | Matig, alleen NL | Overlapt met het gratis musette.io; het rijke deel is NEVO en AI. |
| Training (ZWBeter) | Nu niet | Afhankelijkheidsrisico (Intervals Pro), drift van een kopie, volle markt. Eerst het besluit over de regelmotor. |
| TTT-planner, Discord-bot, Sauce-mod | Open source | Bot afgeleid van MIT-gelicenseerde TTT-Timer; ZwiftRoster en de Zwift TTT Calculator bestaan al. |
| ZWBgame, voorspelspel | Laag | Vraagt een clubrooster; fantasy-wielrennen is vol. |
| ZWBekers | Bij CyclingBadges | Zelfde idee. |
| Garage, ZWBlokken, live tracking, Briljant, uitslagenscraper | Nee | Volle markt, Strava of onofficiële Garmin/Wahoo-pagina's, of eigen clubnormen. |

## 5. Live ZRL-stand

### Wat het is

`src/lib/zrl-live`: de WTRL-telling (FAL, FTS, FIN, podium, Race of Truth,
scratch, TTT-tussentijden met afgeleide startrij) uit Zwifts
segmentresultaten, teamindeling op tag met bijstelling door de captain,
bevriezen na de race, Sauce-overlay. Getoetst tegen WTRL op ronde 1 (308
renners): de telregels kloppen ([live-zrl-dashboard.md](live-zrl-dashboard.md)).
Het Omnium gebruikt dezelfde bron alleen achteraf voor de Sprint Quali; de
live-pagina en overlay van het Omnium tonen het klassement per onderdeel.

Er bestaat, voor zover gevonden, geen andere live ZRL-stand voor een hele
divisie.

### Waarom niet zelf hosten voor iedereen

1. De bron is onofficieel; voor één club valt het niet op.
2. Het schaalt per event (5 tot 8 verzoeken per 15 s), niet per kijker. Een
   ZRL-avond met tientallen divisies past niet door één account.
3. Een blokkade van het serviceaccount neemt ook de eventsync, het Omnium,
   ZWB DS en de racebriefjes van ZWB mee.
4. ZRL is een merk van WTRL; de stand mag niet officieel lijken.
5. Voor de teamindeling hebben captains buiten de club een identiteit nodig.

### Afgewogen routes

- **A. Aanbieden aan WTRL of Zwift**, met de toets van ronde 1 als bewijs.
- **B. Een Sauce-mod die zelf rekent**, met het eigen account van de gebruiker.
- **Tussenvorm**: één Sauce-gebruiker per divisie stuurt de berekende stand
  naar onze server, die hem deelt met kijkers zonder login.
- **De server logt in met het account van de gebruiker**: afgeraden. De
  server beheert dan wachtwoorden of tokens met volledige toegang, de verzoeken
  komen nog steeds van één bron (een accountpool), en de gebruiker riskeert
  zijn eigen account. Zwifts voorwaarden verbieden het verkopen, verhuren of in
  licentie geven van toegang tot een account aan derden zonder schriftelijke
  toestemming.

### Inloggen zoals ZwiftRacing

Gezien op 2026-11-11 (ingebouwde browser, niet ingelogd): "Continue with
Zwift" op zwiftracing.app stuurt naar Zwifts eigen OAuth-pagina
(`secure.zwift.com/auth/realms/zwift/protocol/openid-connect/auth`) met een
eigen client (`client_id=zracingapp`), PKCE en alleen de scope `profile:read`.
Dat is een officiële koppeling, maar een client moet Zwift toekennen; er is
geen openbaar portaal. `profile:read` geeft de identiteit, niet de racedata.

### Inloggen in de browser

Een CORS-voorcontrole (`OPTIONS`, 2026-11-11) op
`secure.zwift.com/.../token` en `us-or-rly101.zwift.com/api/segment-results`
gaf voor een willekeurige origin `access-control-allow-origin` terug, met
`authorization` als toegestane header. Dan kan de browser van de gebruiker zelf
inloggen en ophalen: geen wachtwoord op onze server, verzoeken van het eigen
IP, en de limiet groeit mee met het aantal gebruikers. **Alleen de
voorcontrole is gezien**, geen echte login of echte aanroep.

Later dezelfde dag, bij het bouwen van de meetpagina (`/dev/zwift-probe`): een
echte aanvraag met een ongeldig token gaf een 401 **zonder**
`access-control-allow-origin`, terwijl een publiek endpoint bij 200 wel
`access-control-allow-origin: *` gaf. Een foutstatus (401, waarschijnlijk ook
429) is in de browser dus niet als status te lezen, alleen als CORS-fout. De
losse app moet zo'n fout als "wachten en opnieuw" behandelen. Of een geslaagde
aanroep met een echt token de kop krijgt, laat de meting zien.

## 6. Besluiten eigenaar (2026-11-11)

- **Houding als losse app: geparkeerd.** Eerst moet de meetproef slagen.
- **Live ZRL-stand en een racescherm in Sauce-stijl in één app**, niet twee.
- **Geen eigen spelclient.** De eigenaar vindt het concept te groot voor wat
  het oplevert. Afweging, uit `src/zwift.mjs` van sauce4zwift (GPL-3.0):
  - Sauce logt in als spel (`/api/users/login` met een eigen AES-sleutel), opent
    TCP 3025 en UDP 3024 (AES-128-GCM) en krijgt elke seconde de status van de
    renners rond de gevolgde renner, plus de officiële positie.
  - Inloggen als spel sluit andere verbindingen van dat account, dus er is per
    gevolgde renner een tweede, gratis monitoraccount nodig.
  - Een browser kan geen rauwe TCP/UDP openen: het vraagt een server die altijd
    aan staat (niet Netlify), één sessie per gevolgde renner, en het volgen van
    protocolwijzigingen. Sauce headless draaien (`--headless`) is daarvoor de
    minst kwetsbare vorm.
  - Het zou wel het betrouwbaarheidsprobleem van ZWB DS oplossen: DS haalt ~30
    statussen per minuut op en schat de rest (fout per renner mediaan 22 m, p90
    81 m, gemeten 2026-10-18).
- **Daarmee valt het racescherm af.** ZWB DS blijft zoals het is.
- **Wat overblijft: het live dashboard als losse app.** Opzet: inloggen met het
  eigen Zwift-account in de browser; de browser haalt de segmentresultaten en de
  uitslag van de eigen divisie op en rekent de stand uit (`scoring.ts` is puur);
  onze server deelt alleen de berekende stand met kijkers zonder login; de login
  geeft het Zwift-ID voor de teambijstelling. Het plan staat in het plannenboek.
- **Eerste stap**: een lokale meetpagina waarop de eigenaar met zijn eigen
  account inlogt en tijdens een race de segmentresultaten ophaalt. Werkt dat
  niet, dan blijft de Sauce-mod de route. Gebouwd dezelfde dag:
  `/dev/zwift-probe`, alleen bij `next dev`.

## 7. Niet geverifieerd

- Een echte login en een echte aanroep vanuit de browser (alleen de
  voorcontrole); of Zwift de user-agent controleert, die een browser niet kan
  zetten; of de limiet van het eigen account gedeeld wordt met de game of de
  Companion-app.
- De grens van `/api/segment-results` en hoeveel ZRL-divisies tegelijk rijden.
- Of een monitor elke renner op Zwift-ID kan volgen (alleen in de code gelezen).
- Marktomvang en prijzen; van ZwiftRoster zijn prijs en status niet gevonden.
- Of WTRL of Zwift zelf aan een live-stand werkt.

## 8. Bronnen

- [Garmin cuts off INTERVALS and other third-party apps](https://the5krunner.com/2026/10/14/garmin-api-intervals-third-party-apps/)
- [Garmin API Terms: Why Intervals Pro Shut Down](https://stack-archive.com/blog/garmin-api-third-party-apps-intervals-pro-shutdown-2026/)
- [ZwiftRoster](https://zwiftinsider.com/zwiftroster/), [Zwift TTT Calculator](https://zwiftinsider.com/zwift-ttt-calculator/), [Zwift Club Ladder](https://zwiftinsider.com/zwift-club-ladder/)
- [Zwift Terms of Service](https://www.zwift.com/ca/p/terms), [Zwift and Third-party Platforms](https://support.zwift.com/en_us/linking-zwift-to-another-platform-SypU0LdVr)
- [Request to release Zwift semi-public API](https://forums.zwift.com/t/request-to-release-zwift-semi-public-api/575162), [Training Connections API in 2026](https://forums.zwift.com/t/training-connections-api-how-does-a-coaching-platform-actually-apply-in-2026/671308)
- [sauce4zwift](https://github.com/SauceLLC/sauce4zwift) (GPL-3.0), `src/zwift.mjs`, gelezen 2026-11-11
