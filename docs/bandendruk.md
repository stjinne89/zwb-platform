# Bandendruk op Vandaag

Onderbouwing van de rekenregel in `src/lib/materiaal/bandendruk.ts`
(2026-11-21). Wat hier staat als **aanname** is geen meting en mag niet als
zodanig in de app of in een kennisartikel terechtkomen.

## De basis: 15 % inzakking (Berto)

Frank Berto mat in de jaren tachtig hoeveel een band onder gewicht inzakt, en
publiceerde later in Bicycle Quarterly lijnen per bandbreedte. Volgens die lijnen
staat een band goed als hij onder de last op dat wiel 15 % van zijn hoogte
inzakt. Op die regel rusten de meeste openbare bandendrukcalculators.

Berto publiceerde lijnen, geen formule. Wij gebruiken een regressie op die lijnen:

    druk (psi) = 153,6 × lading per wiel (lb) / breedte (mm)^1,5785 − 7,1685

Die staat in het R-pakket `btpress`
([droop_pressure.R](https://rdrr.io/github/dgabbe/btpress/src/R/droop_pressure.R)),
dat hem toeschrijft aan een pagina van BikeTinker. **De constanten zijn niet
tegen Berto's oorspronkelijke artikel gecontroleerd**: die pagina hebben we niet
gelezen. Op [Bike Forums](https://www.bikeforums.net/bicycle-mechanics/915821-15-drop-formula-tire-pressure-function-width-load.html)
staan twee andere fits op dezelfde lijnen; die geven in het gebied 25–32 mm
waarden van dezelfde orde.

**Waar het minder zeker is.**
- Berto mat ongeveer tussen 20 en 37 mm. Gravel- en mtb-banden (40–60 mm) zijn
  een extrapolatie. Daar geeft de formule 1,5 tot 2,5 bar. Dat ligt in de buurt
  van wat fabrikanten aanraden, maar het is niet gemeten.
- Er is kritiek op het getal 15 % zelf. Op goed asfalt verandert de rolweerstand
  boven een bepaalde druk nauwelijks nog. Volgens road.cc is Berto een startpunt
  en geen optimum
  ([road.cc](https://road.cc/content/feature/180830-how-choose-your-tyre-pressure-%E2%80%94-balancing-speed-comfort-and-grip)).

## Gewichtsverdeling

**Aanname**: 45 % van het systeemgewicht (renner plus fiets) op het voorwiel.
Zittend op een racefiets ligt dat ruwweg tussen 40 en 45 %. Hoe meer op het
voorwiel, hoe dichter voor en achter bij elkaar komen. Met 40 % komt het voorwiel
volgens Berto onder de 4 bar uit bij een renner van 75 kg op 28 mm. Dat vonden we
te laag voor de praktijk. De verdeling is één constante (`VOOR_AANDEEL`).

## Breedte

De gemeten breedte op de velg gaat voor, als het lid die invult. Anders rekenen
we met de breedte die op de band staat. Op een brede velg komt een band vaak 1 tot
3 mm breder uit dan er op staat. Daarom staat in `/hulp` dat je moet meten.

Velgbreedte en wielmaat vragen we niet. De formule gebruikt ze niet, en een
schatting van de breedte uit de velgbreedte voegt een tweede aanname toe. Liever
een gemeten getal.

## Correcties (aannames ZWB)

| Keuze | Factor | Waarom |
|---|---|---|
| Goed asfalt | 1,00 | Berto |
| Slecht asfalt | 0,93 | ruwer wegdek: minder druk rolt sneller en geeft grip |
| Klinkers | 0,88 | idem |
| Onverhard | 0,85 | idem |
| Tubeless | 0,95 | geen binnenband, dus geen snakebite |
| Nat | 0,95 | meer contactvlak, meer grip |

Die factoren zijn niet gemeten. Commerciële calculators (SRAM/Zipp, Silca)
gebruiken vergelijkbare correcties, maar publiceren hun factoren niet. Vindt de
maandelijkse kennisbank-scan een meting, dan vervangt die het getal hier.

## Grenzen

- **Hookless**: niet boven 5 bar. Dat is de ETRTO-grens voor hookless racevelgen
  ([BikeRadar](https://www.bikeradar.com/features/tech/are-hookless-rims-safe-for-road-cycling),
  [Schwalbe](https://www.schwalbe.com/en/technology-faq/hookless/)). Voor
  bredere banden kan het maximum van de fabrikant lager liggen. Daarom kan het
  lid een eigen maximum invullen.
- **Eigen maximum**: het laagste van wat op band en velg staat. De uitkomst
  blijft daaronder en toont dan "maximum".
- **Ondergrens**: nooit onder 1 bar.

## Controle

`tests/unit/bandendruk.test.ts` zet één geval naast een handberekening: 75 kg en
8 kg fiets op 28 mm geeft 4,0 bar voor en 5,0 bar achter. De tests controleren
ook de richting van elke correctie en de grenzen. De uitkomsten zijn niet naast
die van SRAM of Silca gelegd: die calculators zijn alleen in de browser te
gebruiken.
