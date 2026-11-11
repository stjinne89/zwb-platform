# Kopman — wielermanager met rennerkaarten (werktitel)

Ronde 1 gebouwd op 2026-11-11. Pagina: `/zwbgame/kopman`, alleen voor wie
ZWBgame beheert (`zwbgame.manage`). Code: `src/kopman`, los van het platform
(een test bewaakt dat er niets van buiten `src/kopman` geïmporteerd wordt,
behalve `react`, `lucide-react` en `zod`), zodat het spel later als losse app
kan uitkomen.

## Aanleiding en keuzes van de eigenaar

De eigenaar zag het gevibecodede spel *Autoracer*: munten, diamanten en
tickets, een garage met coureurs en een winkel, een Grand Prix met 16
coureurs, elke 20 seconden een willekeurige kaart, en twee pogingen per dag.
De vraag was die opzet naar het wielrennen te halen. De eigenaar koos daarbij:

- de echte wereld in plaats van Zwift, met een verkleinde WorldTour-kalender
  als basis;
- vijf renners per koers en geen vermoeidheid;
- renners als kaarten in brons, zilver en goud, zoals bij voetbalkaarten, die
  je wint door goed te spelen;
- alles fictief (renners, ploegen, koersen), behalve de beklimmingen;
- een beloningsstructuur zoals bij spellen die werken met pakketten, munten,
  diamanten en seizoenspassen. Ronde 1 bevat alleen de pakketten en de munten.
- eerst binnen ZWB bouwen, later als losse app.

## Spel in ronde 1

- **Kaarten.** Er is een vaste pool van 320 fictieve renners (seed `20261111`):
  134 brons, 134 zilver en 52 goud. Er zijn vijf types (sprinter, klimmer,
  klassieker, tijdrijder, allrounder) en zes eigenschappen (vlak, klim, sprint,
  tijdrit, kasseien, afdalen). Het totaal bepaalt de kleur: vanaf 65 zilver,
  vanaf 75 goud. Namen komen uit lijsten per land zonder achternamen van
  bekende profs.
- **Ploeg.** Je hebt een verzameling en een opstelling van vijf renners, met
  één kopman. "Beste opstelling" kiest per koers de vijf renners die het best
  passen bij het profiel.
- **Kalender.** Een seizoen telt 16 fictieve koersen: klassiekers, vijf
  monumenten, bergritten, een tijdrit en vlakke koersen. Ze lopen over 22 echte
  beklimmingen en 5 echte kassei- en grindstroken (zie "Bronnen").
- **Koers.** Er rijden 60 renners: 11 fictieve ploegen en de eigen ploeg, elk
  met vijf renners. Elke 20 seconden echte tijd krijg je een hand van 3
  radiokaarten: aanvallen, tempo op kop, sparen, meespringen, kopman
  terugbrengen, naar voren, lead-out en vroege sprint. In de tijdrit krijg je
  geen kaarten. Op een SVG-hoogteprofiel zie je de groepen. De tijd vertraagt
  in de laatste 5 km, op de laatste klim en bij een aanval van de kopman. Je
  kunt pauzeren, versnellen (4×) of naar de finish springen.
- **Opslag.** Alles staat op het apparaat in `localStorage` onder `kopman:v1`.
  Een zod-schema controleert de opslag bij het laden. Kaart-ids moeten in de
  pool voorkomen, en de opstelling moet bestaan uit vijf unieke eigen renners
  met de kopman erbij. Een beschadigde opslag gaat naar `kopman:v1:kapot` en je
  begint opnieuw, met een melding.

## Koerssimulatie

`src/kopman/engine/race.ts` rekent met stappen van 1 s en een vaste seed
(mulberry32). Dezelfde koers met dezelfde seed geeft dus dezelfde uitslag, ook
in andere browsers. Daarvoor worden alle sorteringen gedaan op vooraf
berekende sleutels.

- **Vermogensbalans.** De rekening telt luchtweerstand (CdA 0,30, in de
  tijdrit lager voor tijdrijders), rolweerstand per wegdek (asfalt 0,004,
  kasseien 0,012, grind 0,009, keer de kasseivaardigheid), zwaartekracht met
  fiets van 7,5 kg, en traagheid. De afdaalsnelheid is begrensd door de
  afdaalvaardigheid.
- **Lichaam uit de kaart.** Gewicht 58–85 kg (klimmers lichter), duurvermogen
  op het vlak en bergop, W′ (anaerobe reserve) met herstel volgens Skiba, en
  sprintvermogen.
- **Slipstream.** De CdA daalt met 30, 38 of 45% bij 1, 2 of 3 of meer renners
  binnen 15 m vooruit. Het volle voordeel geldt tot 3 m en verloopt tot 12 m.
  Posities worden aan het begin van elke stap vastgelegd. Zonder dat
  momentopname reed iedereen in de wind, omdat de renners vóór je in dezelfde
  stap al verplaatst waren.
- **Tactiek van de bots.** Elke renner beslist om de 5 s. Zo ontstaat:
  - een ochtendontsnapping van 4 renners uit verschillende ploegen;
  - een achtervolging door de drie sterkste ploegen zonder renner vooruit;
  - aanvallen op klimmen (vaker op de laatste klim) en op kasseien, en late
    aanvallen;
  - een lead-out voor sprinters in de laatste 2,5 km;
  - klimtempo op de laatste klim;
  - meegaan met aanvallen. Wie "meerijdt" volgt geen aanval, zoals in
    ZWBgame.

**Balans** (kladruns, niet gecommit). Sprinters winnen de vlakke koersen,
klimmers of allrounders de bergritten, tijdrijders de chrono,
klassiekerrenners de kasseikoersen en allrounders de heuvels. Een bronzen
beginploeg eindigt rond plek 26–60. Een koers rekenen kost 0,1–0,6 s. De test
"laat klimmers de bergrit winnen…" legt de grove verdeling vast.

## Economie

Gebaseerd op onderzoek naar spellen met pakketten en passen (EA FC, Marvel
Snap, Brawl Stars, Clash Royale) en naar de regels daarvoor.

- **Pakketten** van 3 kaarten. De kansen staan in de winkel:

  | Pakket | Brons | Zilver | Goud | Prijs |
  | --- | --- | --- | --- | --- |
  | Brons | 78% | 20% | 2% | 1.000 munten |
  | Zilver | 25% | 65% | 10% | 3.000 munten |
  | Goud | — | 60% | 40% | alleen te winnen |

  Een gouden pakket bevat altijd minstens één gouden kaart.
- **Vangnet.** Na 8 pakketten zonder goud is de volgende kaart goud. De teller
  gaat terug naar nul zodra je goud trekt.
- **Dubbele kaarten** worden munten: 150 voor brons, 500 voor zilver en 2.000
  voor goud. Een verzameling raakt zo nooit "vol".
- **Koersbeloning.** Er is prijzengeld voor de top 10 (1.500 tot 140) en 80
  munten voor plek 11–20. Elke start levert 300 munten op. Punten krijgt de
  top 15, ×1,5 in een monument. Een pakket hangt af van de uitslag:
  - een zege in een monument geeft goud;
  - een andere zege of een podiumplaats geeft zilver;
  - uitrijden geeft brons.
- **Daglimiet.** Alleen de eerste 3 koersen per dag geven een pakket; munten
  en punten tellen altijd. Dat is de "Vandaag 2/2" van Autoracer, maar zonder
  dat je wordt tegengehouden.
- **Seizoen.** Na 16 koersen volgt een eindklassement tegen de 11 ploegen,
  met een beloning:

  | Eindplek | Munten | Pakket |
  | --- | --- | --- |
  | 1 | 8.000 | goud |
  | 2–3 | 5.000 | zilver |
  | 4–6 | 3.000 | zilver |
  | 7–12 | 1.500 | brons |

- **Start.** Je begint met 5 bronzen renners (één van elk type), 1.500 munten
  en één zilveren pakket.

### Waarom zo, en wat de regels zeggen

- **Betaalde pakketten zijn in België verboden.** De Kansspelcommissie
  beschouwt ze sinds 2018 als kansspel. In Nederland vernietigde de Raad van
  State in 2022 de KSA-boete voor FIFA-pakketten, maar de politieke druk
  blijft. Apple-richtlijn 3.1.1 eist dat de kansen bekend zijn vóór de
  aankoop. De EU werkt aan een Digital Fairness Act. Een uitgelekt concept van
  november 2026 (Euronews) noemt tien manipulatieve ontwerptrucs; dat is niet
  bevestigd.
- **Daarom zijn er in ronde 1 alleen munten die je verdient**, toon je de
  kansen altijd en heb je een vangnet. Diamanten (betaalvaluta) en een
  betaalde pas komen niet in de ZWB-versie. Bij een losse app moet dat
  opnieuw bekeken worden, per land.
- **Spellen die het goed doen** combineren een vaste weg met toeval. Brawl
  Stars haalde in 2022 zijn lootboxen weg en zette ze later in een andere
  vorm terug. Marvel Snap geeft vooral vaste beloningen in een pas. Spelers
  accepteren toeval als ze de kansen kennen, als er een vangnet is en als
  dubbele kaarten iets waard blijven.

## Bewust niet in ronde 1

- Diamanten, een seizoenspas, fietsupgrades en trainen (met dubbele kaarten
  als grondstof). Die horen bij de volgende rondes; het plan staat in het
  plannenboek.
- 3D, waaiers, wind en valpartijen.
- Echte renners, ploegen of koersnamen: rechten en het verzoek van de
  eigenaar.
- Opslag op de server en een ranglijst tussen leden. Het spel draait volledig
  op het apparaat.
- Een race hervatten na herladen. Een koers duurt een paar minuten; wie
  herlaadt, begint die koers opnieuw.
- Een grens op het aantal keren dat je een koers opnieuw kunt rijden. De
  seed hangt af van je opslag, het seizoen en de koers. Wie vóór de uitslag
  herlaadt, rijdt dus dezelfde koers met dezelfde hand opnieuw en kan alleen
  andere keuzes maken. De uitslag telt pas na de finish.
- Een tekst op `/hulp`: de pagina is alleen voor beheerders.

## Bronnen

Beklimmingen en stroken zijn afgerond tot één decimaal (lengte in km,
gemiddelde in %). Ze komen uit openbare klimgegevens en zijn niet per klim
nagemeten. Voor de twijfelgevallen is gecontroleerd:

- Cauberg — <https://climbfinder.com/en/climbs/cauberg>
- Kemmelberg (Belvédère) — <https://climbfinder.com/us/climbs/kemmelberg-belvedere>
- La Redoute — <https://climbfinder.com/en/climbs/redoute>,
  <https://en.wikipedia.org/wiki/C%C3%B4te_de_La_Redoute>

Beloningssystemen en regels:

- Apple, kansen bekendmaken — <https://www.pcgamer.com/apple-now-requires-app-store-games-to-disclose-loot-box-odds/>
- Brawl Stars zonder lootboxen — <https://www.deconstructoroffun.com/blog/why-removing-loot-boxes-in-brawlstars-failed>
- Seizoenspassen — <https://deconstructoroffun.com/blog/2022/6/4/battle-passes-analysis>
- Spelvaluta — <https://www.gamedeveloper.com/business/types-of-game-currencies-in-mobile-free-to-play>
- Economie-ontwerp — <https://unity.com/resources/game-economy-design-guide>
- EA FC Division Rivals-beloningen — <https://www.dexerto.com/wikis/ea-fc-27/division-rivals-rewards/>
- Marvel Snap-voortgang — <https://marvelsnapzone.com/marvel-snap-progression-guide/>
- Uitgelekt DFA-concept — <https://euronews.com/2026/11/09/eu-to-blacklist-ten-manipulative-online-design-traps-leaked-draft-shows>

## Lokaal spelen en testen

```sh
npm run kopman:preview
# http://localhost:3198 (esbuild-bundel van de echte app, zonder Next of inloggen)
npx vitest run tests/unit/kopman.test.ts
```

## Niet geverifieerd

- De echte Next-pagina `/zwbgame/kopman`. In deze worktree staan geen
  `.env.local` en geen lokale Supabase, dus alleen de preview-bundel is in de
  browser bekeken (desktop en 375 px breed).
- Het speelgevoel over een heel seizoen en de balans van de economie: hoe snel
  je zilver en goud verzamelt.
- Op een echte telefoon en in Safari. De koers is wel deterministisch
  opgezet.
