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
| Interclub | 64–57 | 22% | brons |
| Continentaal | 69–62 | 40% | brons |
| Proftour | 74–67 | 65% | zilver |
| Wereldtour | 84–73 | 100% | goud |

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
| Wereldtour | goud | zilver | brons | goud |

- Buiten de top 10 is er geen pakket. Een seizoenspakket krijg je alleen bij
  promotie (in de Wereldtour: bij een plek in de top 2).
- **Winkel.** Brons kost overal 1.000 munten. Zilver (3.000) staat pas vanaf
  het Continentaal in de winkel; goud is alleen te winnen.
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
  bevalt.
- **De daglimiet.** Die is weg: een pakket hangt nu aan je uitslag, niet aan
  de klok.
- **Een salarisplafond of budget per niveau.** Overwogen om de groei verder te
  remmen. Het is een nieuw mechanisme en de balans haalt het doel al zonder.

## Niet geverifieerd

- De omzetting van de echte save van de eigenaar, op hun eigen apparaat. Getest
  met tests en een save op het testadres van de preview.
- Of 8 koersen per seizoen goed voelen. De balans is gemeten zonder kaarten op
  het bord.
