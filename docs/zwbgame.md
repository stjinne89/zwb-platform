# ZWBgame — implementatie en verificatie, 17 september 2026

De eerste versie is een besloten solo-spel op `/zwbgame`: zelf als renner rijden,
maximaal 23 bots uit het clubroster, drie fictieve parcoursen, voeding, hydratatie,
aanvalsreserve, positionering, slipstream, bonuskaarten, knechten en vooraf
berekende compensatie. Lagere sportsterkte kan met beter spel winnen; bij gelijk
spel wint de sterkere renner vaker, maar niet elke race. Die uitleg van
"gelijkwaardige kans" is op 17 september 2026 door de eigenaar bevestigd.
Vormgegeven met zelf opgebouwde, instanced 3D-fietsen en renners in het ZWB-clubshirt
(wit boven met gouden streep, petrol met lichtere chevrons onder, gouden kraag en
mouwranden), in een interface in petrol en goud. Er worden geen modellen of
spelassets uit Flamme Rouge of Tour de France gebruikt.

## Lokale speeltest

```sh
npm run zwbgame:preview
# http://127.0.0.1:3199
npm run test:zwbgame:browser
npx vitest run tests/unit/zwbgame.test.ts tests/unit/zwbgame-database.test.ts tests/unit/zwbgame-server.test.ts tests/unit/privacy-version.test.ts
```

De preview bundelt de echte client en simulatie met uitsluitend fictieve renners
en vervangende serveracties. Hij luistert alleen op localhost. Deze preview is
geen productieroute of authenticatie-bypass. Playwright test beide schermformaten
tegen deze preview; servertoegang is afzonderlijk met mocks en echte SQL/RLS in
PGlite getest. Dit is geen end-to-end test tegen de gekoppelde Supabase-database.

## Architectuur en spelregels

- `src/lib/zwbgame`: vaste simulatiestap van 200 ms, seed-afhankelijke bots en
  selectie, parcoursen, afleiding van kwaliteiten, serveradapter en lokale opslag.
- `src/app/(app)/zwbgame`: afzonderlijk geladen Three.js-renderer, HUD, lobby,
  voorkeuren, eigen invoer/Intervals-sync en rosterbeheer voor admins.
- Bots gebruiken dezelfde commando's, energie, bevoorrading en kaarten als de speler.
  Per race krijgt elke bot een eigen karakter uit de seed: agressie en de afstand
  van de laatste aanval (per rennerstype, ×0,55–1,65). Bots volgen soms een
  aanval, houden een ontsnapping vast en nemen gespreid beslissingen, niet op
  dezelfde tick.
  Een uitgeputte renner krijgt pas nieuwe aanvalsreserve bij bewust lager
  gekozen inspanning: permanent Aanvallen vasthouden regenereert geen gratis sprint.
- Vermogensverschillen worden naar begrensde arcade-snelheidscoëfficiënten
  vertaald (vlak 0,80–1,23; klimmen 0,76–1,28; sprint 0,80–1,25), niet als ruwe
  natuurkundige watts doorgestuurd. Compensatie geeft maximaal 45 extra
  energiepunten, maximaal 1,9× herstel, tot twee extra bonuskaarten en tot drie
  knechten. Geen inhaalbonus op basis van achterstand.
- Knechten: het zwakste derde van het veld kan knechten krijgen (1 bij
  compensatie ≥ 0,10, 2 bij ≥ 0,22, 3 bij ≥ 0,36), het middelste derde levert ze,
  het sterkste derde rijdt altijd alleen. Maximaal een derde van het veld is
  knecht; de zwakste renner krijgt eerst een volledige ploeg. Een knecht rijdt
  vóór zijn kopman op het hoogste tempo zonder aanvalsreserve (0,86), rijdt gaten
  dicht, wacht als hij wegrijdt en rijdt de laatste 450 m een lead-out. Het wiel
  van een eigen knecht kost 0,52 in plaats van 0,62, werkt ook bergop en trekt je
  mee op zijn snelheid. Knechten stoppen onder 30% energie.
- Bonuskaarten (Flamme Rouge-achtig, eenmalig): Rugwind (20 s geen wind, 15%
  goedkoper), Goede benen (aanvalsreserve direct vol), Tweede adem (+22 energie,
  +15 vocht), Verrassingsaanval (10 s aanvalstempo zonder reservekosten). Twee
  getimede kaarten lopen niet tegelijk. Iedereen krijgt er twee uit de seed, bij
  compensatie ≥ 0,3 en ≥ 0,6 één extra.
- Dagvorm per renner per race: ×0,94–1,06 op het vermogen, zichtbaar voor de speler.
  Wind per race: basiswind van het segment ×0,4–1,7 plus een verschuiving van
  ±0,3; rugwind maakt sneller.
- Hydratatie daalt met 0,07 + 0,10 × inspanning per seconde; onder 40 word je
  tot 20% trager. Zonder drinken merk je dat in een hele race.
- Twee gels en twee bidons; bij 52% afstand één van elk erbij, maximaal drie
  tegelijk. Een gel herstelt 30 energiepunten geleidelijk. Voeding verlaagt de
  inspanning tijdelijk. Finishvolgorde gebruikt de berekende passeertijd binnen
  een simulatiestap. Na 30 minuten stopt een vastgelopen/extreme race met DNF's.
- Browseropslag bewaart één versiegebonden race per account (spelversie 2 sinds
  de balansronde; een versie-1-race is niet meer hervatbaar), maximaal zeven dagen
  hervatbaar, zonder rennersnamen of vermogenskwaliteiten. Profielen en identiteiten
  worden bij start/hervatten vers opgehaald. Een gewijzigde of vervallen
  profielrevisie geeft een basisrenner; verdwenen identiteit wordt een gast.
  Alleen de laatste twintig eigen uitslagen blijven lokaal bewaard; hun sleutel
  bleef `v1`, zodat eerdere uitslagen de versiewissel overleven. Dagvorm, kaarten,
  lopende kaart en kopman-ID worden in de bewaarde race meegeslagen; een kopman-ID
  dat niet in dezelfde race voorkomt maakt de race ongeldig.

## Gegevens en toestemming

Migratie **0170** voegt spelvoorkeuren, afgeleide rennerprofielen en uitsluitingen
van ongeclaimde rosterleden toe. De service-role bouwt het zichtbare spelroster;
de client krijgt geen sleutels, ruwe vermogenswaarden, gewicht of wellness.
Iedere serveractie controleert login, goedgekeurd lidmaatschap en de actuele
privacyversie. De UI verstuurt invoer alleen voor het eigen account.

Sportdata heeft afzonderlijke toestemming `2026-09-17`. Wijziging van voorkeuren
maakt een nieuwe revisie en wist het oude spelprofiel in dezelfde transactie.
Een late sync wordt geweigerd als de toestemmingsrevisie is veranderd. Verwijderen
of wijzigen van de Intervals-koppeling wist het Intervals-spelprofiel. RLS staat
leden alleen eigen voorkeuren en eigen afgeleide profielinzage toe; afgeleide
profielen en rosteruitsluitingen kunnen niet rechtstreeks worden geschreven.

Profielen vervallen na 30 dagen: verlopen rijen tellen niet mee en worden bij
een volgende succesvolle sync vervangen. Er is geen nieuwe opruimcron toegevoegd.
Toestemming intrekken/account verwijderen wist de rij wel direct.

De game gebruikt **geen** `rider_power_profiles` of andere gemengde caches als
bewijs van gegevensherkomst. Eigen metingen worden apart ingevuld. Bij Intervals
worden een 90-dagencurve en activiteiten opgehaald; elk gebruikt curvepunt moet
een activiteit-ID hebben dat matcht op een expliciet toegestane bron (UPLOAD,
GARMIN_CONNECT, WAHOO, ZWIFT, SUUNTO, COROS of POLAR), zonder Strava-ID. Een
20-minutenpunt met bewezen bron is vereist; de game schat FTP op 95% daarvan.
Gewicht vult het lid zelf in. Ontbrekende bronmetadata resulteert in een
afwijzing van de sync, nooit in stilzwijgend gebruik van een gemengde cache.
API-sync is begrensd op drie pogingen per lid per uur via de bestaande limiter.

De [Intervals API-voorwaarden](https://forum.intervals.icu/t/intervals-icu-api-terms-and-conditions/114087)
staan afgeleide toepassingen toe en vragen Garmin-bronvermelding. Bij herkende
Garmin-gegevens toont de game die vermelding. De herkomstcontrole is met fixtures
getest; de actuele bronvelden/volledigheid bij echte leden zijn **niet live
geverifieerd**. Intervals-gegevens zonder bruikbare herkomst blijven uitgesloten.

Strava is bewust buiten deze versie gehouden vanwege onzekerheid rond virtuele
races en het delen/afleiden van gegevens voor andere leden. Zie
[Strava Developers](https://developers.strava.com/) en
[API Policy](https://www.strava.com/legal/api_policy). Dit is geen route om die
voorwaarden via Intervals te omzeilen.

## Verificatie en uitrol

- 34 gerichte unit/database/privacy-tests geslaagd: determinisme, middelen,
  duur/finish, drie parcoursen, zwakker profiel tegen sterkere roekeloze renners,
  toestemmingsrevisies, intrekken, RLS, ontbrekende data en servertoegang.
- Acht Playwright-tests geslaagd op desktop- en mobielviewport: starten,
  parcourskeuze, aanvallen, eten, pauzeren, bewaren/hervatten, finish, uitslag
  wissen, eigen profiel en bediening zonder WebGL. Screenshots visueel bekeken.
- Balansronde (17 september 2026): simulatie van 80 races per parcours met
  dezelfde botstrategie voor iedereen, veld FTP 180–387. Vóór: top 3 wint 64–81%,
  zwakste helft 0%, zwakste renner gemiddeld plek 23–24. Na: top 3 wint 49–57%,
  zwakste helft 1–4%, zwakste renner met knechten gemiddeld plek 13. In een
  smaller veld (FTP 180–295): top 3 wint 35–48%, zwakste helft 4–9%. Het script
  zat in de scratchpad en is niet gecommit; de unit-tests leggen de richting vast
  (variatie in winnaars, sterkere helft wint vaker, knechten, kaarten, drinken, wind).
- TypeScript, gerichte ESLint en volledige Next-productiebuild geslaagd.
  De bestaande middleware-deprecatiewaarschuwing is niet in deze ronde aangepakt.
- Migratie 0170 is uitgevoerd in PGlite met nagebouwde noodzakelijke basistabellen.
  Volgens de eigenaar is hij op 17 september 2026 op de gekoppelde
  Supabase-database uitgevoerd; dat is niet vanuit deze repo gecontroleerd. Geen
  Docker of volledige lokale Supabase beschikbaar. De echte game toont bij ontbrekende
  tabellen 'nog niet beschikbaar', zodat voorkeuren nooit worden overgeslagen.
- Fysieke telefoons, iOS/Safari, lange sessies op echte hardware en het doel van
  minimaal 30 fps zijn niet gemeten. De mobiele browserchecks zijn emulatie.
- Privacyversie 2026-09-17-zwbgame vraagt
  opnieuw akkoord op de platformverklaring; dit activeert niet automatisch
  de afzonderlijke sportdatatoestemming.

Geen multiplayer, publiek klassement, seizoenen, echte GPX-parcoursen,
consolebesturing of Strava-koppeling gebouwd: de afgesproken eerste stap is
een complete lokale solo-race. Uitbreidingsideeën horen in het gedeelde
plannenboek, niet in de actieve werkvoorraad van PLAN.md.
