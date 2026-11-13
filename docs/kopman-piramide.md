# Kopman — de piramide

Gebouwd op 2026-11-12. De eigenaar had een seizoen gespeeld: "de eigen
ontwikkeling gaat te snel. Kunnen we iets meer niveau erin krijgen?" Ze vroegen
een piramide van clubteam tot World Tour, en twijfelden aan de daglimiet op
pakketten. Op het voorstel hieronder zei de eigenaar: "Ja, bouw dit".

## Vijf niveaus

Je begint onderaan, in de Kermis. Elk niveau heeft een eigen peloton van 11
fictieve ploegen en een eigen kalender van 8 koersen.

| Niveau | Rivalen (beste vijf, gemeten) | Prijzengeld | Materiaal rivalen |
| --- | --- | --- | --- |
| Kermis | 61–52 | 12% | geen |
| Interclub | 67–58 | 22% | brons |
| Continentaal | 72–64 | 40% | brons |
| Proftour | 78–68 | 65% | zilver |
| Wereldtour | 87–72 | 100% | goud |

Proftour en Wereldtour zijn op 2026-11-12 opgeschoven (zie "Rivalen die
terugvechten"); daarvoor was dat 74–67 en 84–73. Interclub en Continentaal
schoven op 2026-11-13 op (zie "Sterkere pelotons"); daarvoor 64–57 en 69–62.

- **Prijzengeld** is het aandeel van de bedragen uit de eerste versie: de
  startpremie, het prijzengeld en de seizoensmunten.
- **Materiaal rivalen.** Hoger in de piramide rijden de rivalen met een volle
  set materiaal van dat niveau (`rivalBonus`).
- **Pelotons.** `rivalTeams(niveau)` kiest per ploeg renners rond een
  streefwaarde (`band` in `divisions.ts`). De zwakste ploegen worden eerst
  gevuld, anders raken de lage renners op en wordt de zwakste ploeg de
  sterkste. Een renner rijdt in hooguit één peloton.
- **Kalender.** De 16 koersen van de eerste versie zijn verdeeld over de
  Proftour (de lichtere) en de Wereldtour (de monumenten en de bergritten).
  Er zijn 24 nieuwe koersen bij, voor de Kermis, de Interclub en het
  Continentaal. De Kermis heeft een eigen soort, de kermiskoers: kort en vlak,
  of met één helling of kasseistrook. Elke koers hoort bij precies één niveau
  (`divisionOfRace`).
- **Ploegnamen** zijn verzonnen. De Wereldtour houdt de 11 ploegen van de
  eerste versie, met dezelfde id's.

## Promotie en degradatie

- De **top 2** gaat een niveau omhoog, de **laatste 2** een niveau omlaag. In
  de Kermis kun je niet zakken, in de Wereldtour niet stijgen.
- Het klassement toont de zones met een groene of rode streep en een pijltje.
- Na het seizoen staat er "Promotie naar de …" of "Degradatie naar de …", met
  de piramide eronder. De knop heet "Naar de …".

## Pakketten

Er is geen daglimiet meer. Een pakket verdien je met een uitslag:

| Niveau | Zege | Podium | Top 10 | Promotie |
| --- | --- | --- | --- | --- |
| Kermis | brons | brons | — | brons |
| Interclub | brons | brons | — | brons |
| Continentaal | zilver | brons | — | zilver |
| Proftour | zilver | zilver | brons | zilver |
| Wereldtour | goud | zilver | brons | diamant |

- Buiten de top 10 is er geen pakket. Een seizoenspakket krijg je alleen bij
  promotie (in de Wereldtour: bij een plek in de top 2, sinds 2026-11-12 een
  diamanten pakket; daarvoor goud).
- **Winkel.** Brons kost overal 1.000 munten. Zilver (3.000) staat pas vanaf
  het Continentaal in de winkel; goud en diamant zijn alleen te winnen.
- **Bronzen pakket:** 94% brons, 6% zilver, geen goud. Eerst was dat 78%, 20%
  en 2%; zo trok je in de Kermis al zilveren renners die op Continentaal
  niveau rijden.
- **Vangnet.** Alleen zilveren en gouden pakketten tellen mee voor goud
  gegarandeerd na 8 pakketten. Anders opende je met bronzen pakketten toch goud.
- **Start.** 5 renners met een totaal van 53 tot 57, 1.500 munten en één
  bronzen pakket (was: bronzen renners vanaf 55 en een zilveren pakket).

## Oude saves

De save heeft nu versie 2 (`division` erbij, `day` eraf). Een save van versie 1
gaat bij het laden naar het niveau waar je beste vijf horen: het hoogste niveau
waarvan je de zwakste ploeg verslaat, met de ondergrens van `band` + 1
(`divisionFor`). Het seizoen begint daar opnieuw, want de koersen zijn anders.
Verzameling, munten, pakketten en het seizoensnummer blijven. De sleutel blijft
`kopman:v1`.

## Balans

Gemeten met een script dat een carrière zelf speelt (`.tmp/kopman-balans.ts`,
niet in git). Het script gebruikt de koers-AI zonder kaarten en stelt elke
koers de beste vijf op. Het opent elk pakket, ruilt reserves en koopt een
pakket zodra er 2.000 munten over zijn.

| Seed | Seizoen in de Wereldtour | Verloop |
| --- | --- | --- |
| 11 | 7 | Kermis 1, Interclub 2, Continentaal 2, Proftour 1 |
| 22 | 5 | één seizoen per niveau |
| 33 | 9 | Kermis 5, daarna één seizoen per niveau |
| 44 | 9 | Kermis 4, Interclub 2, Continentaal 1, Proftour 1 |

Doel was 6 tot 8 seizoenen; gemiddeld 7,5. In de Wereldtour duurt het daarna
nog 2 tot 4 seizoenen voor de eerste titel. Iemand die de kaarten op het bord
goed speelt, gaat sneller dan dit script.

## Bewust niet gebouwd

- **Grandtours** (meerdaagse rondes) bovenop de Wereldtour. Dat is een nieuwe
  spelvorm met klassementen over dagen; eerst moet blijken of de piramide
  bevalt. Op 2026-11-13 vroeg de eigenaar er wel om; uitgewerkt in
  [kopman-breder.md](kopman-breder.md), nog niet gebouwd.
- **De daglimiet.** Die is weg: een pakket hangt nu aan je uitslag, niet aan
  de klok.
- **Een salarisplafond of budget per niveau.** Overwogen om de groei verder te
  remmen. Het is een nieuw mechanisme en de balans haalt het doel al zonder.

## Rivalen die terugvechten

Gebouwd op 2026-11-12. De eigenaar, in het vierde seizoen: "Ik ... speel op
contintentaal niveau en domineer daar de wedstrijden met weinig tegenstand, ik
denk dat de moeilijkheid of de groei anders moeten." En: "mss een niveau boven
goud ... (diamand?)". Van de vier voorstellen koos de eigenaar A, C en D: "B
niet de rest wel".

**A. Per niveau feller** (`rivals` in `divisions.ts`):

| Niveau | Kracht kopman | Aanvallen per ploeg | Achtervolgen | Valse bidon per sector | Diamanten |
| --- | --- | --- | --- | --- | --- |
| Kermis | +0 | 2 | nee | — | — |
| Interclub | +0 | 2 | nee | — | — |
| Continentaal | +1 | 3 | ja | — | — |
| Proftour | +1 | 3 | ja | 5% | — |
| Wereldtour | +2 | 4 | ja | 8% | top 3 |

- **Kracht.** Een rivaliserende kopman begint met de ervaring van zijn niveau
  erbij; jouw kopman niet.
- **Achtervolgen.** Valt jouw kopman aan met Demarrage of Bergop versnellen,
  dan zet de rivaal met de best passende kopman in zijn groep een knecht op
  kop tot het eind van de sector (`chase` in `board.ts`). Die knecht betaalt
  1 kracht. Een ploeg die zelf een intentie uitvoert, doet niet mee.
- **Valse bidon.** Na een sector kan een rivaal je kopman 2 kracht afnemen,
  hooguit één keer per koers en niet in de tijdrit (`rivalTrick`). Het
  logboek noemt de ploeg.

**C. Hogere toppen.** De Proftour heeft als `band` 75–68 (was 73–67), de
Wereldtour 86–76 (was 80–73). De drie sterkste Wereldtourploegen krijgen
elk een negende renner: een diamant.

- In de Proftour werkt dat: gemiddeld 72,6 over de beste vijf, was 70,7.
- In de Wereldtour nauwelijks: 78,7, was 78,2. Er zijn maar 52 gouden renners
  voor 88 plekken, dus de middenploegen krijgen wat overblijft. De top is wel
  sterker (87, 87, 84 met de diamanten; was 84, 83, 82) en de zwakste ploeg
  zwakker (72, was 73). Meer gouden renners in de pool zou dat oplossen; dat
  is niet gebouwd.

**D. Diamant.** <a id="diamant"></a>

- **Renners.** 12 diamanten renners van 89 tot 95, achter de pool van 320
  (`buildDiamonds`, `r321`–`r332`). Een diamant krijgt op het bord 2 kracht
  extra en betaalt, net als goud, 1 minder per kaart.
- **Materiaal en personeel.** Elk vak heeft een vierde kaart: één stap boven
  goud (bijvoorbeeld een frame −12%, een mechanieker +40%).
- **Hoe je eraan komt:**
  - een gouden pakket: 4% per kaart;
  - 5 gouden reservekaarten ruilen voor 1 diamant;
  - een diamanten pakket (70% goud, 30% diamant, minstens één diamant) voor de
    top 2 van de Wereldtour.
- **Uiterlijk.** IJsblauw met een gloed, stralen en sterren zoals goud.
- **Dubbel.** Een diamanten reservekaart verkoop je voor 6.000 munten.

**Gemeten.** Met `.tmp/kopman-groei.ts` (niet in git), een carrière met een
eenvoudige kaartkeuze, 3 seeds over 8 seizoenen. In de Wereldtour in seizoen
7, 8 en 8; voor deze ronde stond het script in seizoen 5 tot 6 al in het
Continentaal. Het eerste Continentaalseizoen: 3, 3 en 6 zeges van 8.

**A maakt het niet zwaarder.** Gemeten met `.tmp/kopman-ab2.ts` (niet in git):
dezelfde 8 saves aan het begin van het Continentaal rijden één seizoen
(64 koersen) met elke variant van de rivalen, zonder groei tussendoor.

| Rivalen | Zeges | Podium | Gem. beste plek |
| --- | --- | --- | --- |
| Zoals tot 2026-11-12 | 24 | 32 | 7,6 |
| Alleen +1 kracht | 28 | 31 | 7,4 |
| Alleen 3 aanvallen | 25 | 33 | 7,5 |
| Alleen achtervolgen | 28 | 37 | 6,1 |
| Alles van A | 31 | 35 | 6,0 |
| Proef: kopmannen +4% vermogen | 25 | 29 | 6,9 |
| Proef: kopmannen +12% vermogen | 15 | 27 | 8,6 |

- Kracht en aanvallen maken weinig uit: een rivaal die vaker aanvalt, maakt
  zichzelf ook moe.
- Achtervolgen helpt jou zelfs. Waarschijnlijk trekt de knecht op kop je
  eigen groep mee naar je kopman; dat is niet uitgezocht.
- Zelfs 12% meer vermogen voor elke rivaliserende kopman kost het script maar
  9 van de 24 zeges. Je wint in het Continentaal omdat je ploeg (72 tot 76)
  ver boven het niveau zit (62 tot 67, de band tot 2026-11-13; zie
  "Sterkere pelotons"), niet omdat de rivalen braaf rijden.
  De proeven met vermogen zijn niet gebouwd.
- In de Proftour, met dezelfde aanpak op 6 saves (48 koersen): 22
  zeges en gemiddeld 7,1e, met A ook 22 zeges en 7,8e. Ook daar weinig verschil.

**Bewust niet gebouwd:**

- **B, een niveau overslaan** voor wie als kampioen sterker is dan het
  niveau erboven: de eigenaar wilde het niet.
- **Meer gouden renners** voor een sterkere Wereldtour: zie C.
- **Rivalen die ook materiaal of personeel stelen**, of een tweede valse
  bidon: één streek per koers is genoeg om het te merken.

## Sterkere pelotons

Gebouwd op 2026-11-13. Omdat het gedrag van de rivalen het Continentaal niet
zwaarder maakte, kreeg de eigenaar twee knoppen voorgelegd: sterkere pelotons
of tragere groei. Ze kozen "Sterkere pelotons".

- **Hogere banden.** De Interclub heeft als `band` 64–58 (was 61–56), het
  Continentaal 71–64 (was 67–62). De Kermis bleef gelijk: daar begin je, met
  een ploeg aan de top van de band.
- **Het peloton in vorm** (`pelotonForm` in `board.ts`). Zitten je vijf in de
  koers boven het niveau, dan rijden alle rivalen sterker:
  - 1% per punt dat je gemiddelde boven de top van de band min 2 ligt;
  - hooguit `rivals.form`: 0% in de Kermis, 4% in de Interclub, 8% vanaf het
    Continentaal;
  - het telt per koers, met de vijf die je opstelt; niets in de save;
  - bij de start staat "Het peloton is in vorm: +4%" in het logboek.

**Gemeten.** Dezelfde 8 saves aan het begin van het Continentaal, één seizoen
(64 koersen), met A:

| | Zeges | Podium | Gem. beste plek |
| --- | --- | --- | --- |
| Band 67–62, zonder vorm | 31 | 35 | 6,0 |
| Band 71–64, zonder vorm | 22 | 31 | 9,3 |
| Band 71–64, met vorm | 23 | 30 | 9,3 |

- De hogere band doet het werk. De vorm doet bij deze saves bijna niets: hun
  vijf zitten maar 1 tot 3 punten boven 71, dus 1 tot 5%. Het is een rem voor
  wie veel verder boven het niveau zit; eerder kostte 12% vermogen voor alle
  rivaliserende kopmannen 9 zeges van 24.
- Carrières (`.tmp/kopman-groei.ts`, 4 seeds, 10 seizoenen): in de
  Wereldtour in seizoen 8, 10 en 10; één seed staat in seizoen 10 in het
  Continentaal. Daarvoor 7, 8 en 8 (3 seeds). Het eerste
  Continentaalseizoen: 7, 3, 1 en 4 zeges van 8. Die 7 is een ploeg die met
  twee gouden renners van 88 en 86 promoveerde (79 gemiddeld).
- Een eerste versie had ook vorm in de Kermis, tot 8% vanaf de top van de
  band. Toen bleef een seed 8 seizoenen in de Kermis hangen.

**Bewust niet gebouwd:**

- **Pelotons die echt van renners wisselen** naarmate je sterker wordt: dan
  hangt de ploeg van een rivaal af van jouw save, en dat raakt elke plek die
  `rivalTeams` gebruikt.
- **Tragere groei** (minder of zwakkere pakketten): de andere knop, niet
  gekozen.

## Niet geverifieerd

- De omzetting van de echte save van de eigenaar, op hun eigen apparaat. Getest
  met tests en een save op het testadres van de preview.
- Of 8 koersen per seizoen goed voelen. De balans is gemeten zonder kaarten op
  het bord.
- Hoe de rivalen van 2026-11-12 voelen voor een speler: de metingen zijn met
  een script dat kaarten eenvoudig speelt en de sprint niet zelf rijdt.
