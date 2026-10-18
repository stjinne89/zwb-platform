# ZWBeter materiaal: onderzoek en voorstel

**Voorstel 2026-10-17; besluiten van de eigenaar en gebouwd 2026-10-18.** De
kennisbank staat in `src/lib/materiaal/library.ts`, de rekenaar in
`src/lib/materiaal/rekenaar.ts`. `tests/unit/materiaal.test.ts` houdt de niveaus
in code gelijk aan de tabel "Artikelen en niveaus" hieronder; wijzig een niveau
dus eerst hier.

De vraag van de eigenaar: naast trainen, voeding, kracht en tactiek kun je ook
beter worden met materiaal en kleine winsten, zoals neusstrips en aero-sokken.
Kan ZWB daarvoor iets inrichten, te beginnen met een kennisbank?

Kort antwoord: ja. Er is genoeg onderzoek voor zo'n zestien artikelen. Twee
dingen maken het wel anders dan de bestaande kennisbanken:

1. **Veel winst geldt alleen buiten, en pas op snelheid.** De club rijdt vooral
   op Zwift. Binnen bepaalt het spel de luchtweerstand van je virtuele fiets;
   aero-sokken en een strakker pak doen daar niets. Binnen tellen andere dingen:
   een goede ventilator en een vermogensmeter die klopt.
2. **Het onderzoek is anders van aard.** Het meeste is techniek: metingen in een
   windtunnel, op een testbank of met een computermodel, vaak met een pop of één
   renner. Meta-analyses zijn er weinig. De bewijsschaal van de kennisbanken moet
   daarvoor een aanvulling krijgen (zie "Bewijsniveau bij materiaal").

## Hoe gezocht

- **Consensus**, twaalf zoekvragen: houding en luchtweerstand; helm en pak;
  sokken en overschoenen; slipstream; rolweerstand en bandenspanning; ketting en
  smering; vermogensmeters en smart trainers; ventilator binnen; compressie;
  bikefit en zadelhoogte; cranklengte; inlegzolen; neusstrips.
- **PubMed**: drie kernbronnen bevestigd (Adams 2017, PMID 27637570; Bouillod
  2022, PMID 35009945; Otani 2018, PMID 28985477). De techniekbladen (Journal of
  Wind Engineering, Sports Engineering) staan niet in PubMed; die zijn via
  Consensus gevonden, met DOI.
- **Onderzoeksagent van Consensus (Pro)**, op verzoek van de eigenaar, met één
  brief voor alle zeventien onderwerpen. De agent leest volle teksten en volgt
  citaties.
  - Hij vond 62.857 artikelen, waarvan er 139 in aanmerking kwamen en 20 zijn
    meegenomen.
  - Daarmee dekte hij alleen lucht en het rekenmodel (onderwerpen 1–5).
  - Bij de onderwerpen 6–17 (banden, ketting, gewicht, ventilator,
    vermogensmeters, bikefit, cranks, neusstrips, compressie, zolen, schoenplaatjes)
    meldt hij "geen bewijs in deze set". Dat betekent niet dat er geen onderzoek
    is: de gewone zoekfunctie hierboven vond er wel studies voor. Twintig artikelen
    zijn te weinig voor zeventien onderwerpen.
  - Het ruwe rapport staat lokaal in `docs/consensus/materiaal-2026-10-17.md`,
    net als de rapporten van de toets buiten git.
- **Tweede ronde, stand Deep** (eigenaar, 2026-10-17), alleen voor de onderwerpen
  5–17, met een nieuwe zoekopdracht.
  - Van de ruim 54 miljoen gevonden artikelen kwamen er 886 in aanmerking en zijn
    er 100 meegenomen; 44 worden geciteerd.
  - Veel nieuws bij wielen, banden, ketting, ventilator, vermogensmeters en
    bikefit.
  - Bij cranklengte, neusstrips en compressie vond ook deze ronde niets. Daar
    blijft de gewone zoekfunctie de basis: een meta-analyse en een proef bij
    fietsers over neusstrips, en meerdere meta-analyses over compressie.
  - Eén fout in het rapport: in de slottabel staat bij vermogensmeters DOI
    10.3390/s22010146. Bouillod 2022 is 10.3390/s22010386.
  - Rapport lokaal in `docs/consensus/materiaal-deep-2026-10-17.md`.
- Van de bronnen uit de gewone zoekfunctie is alleen de samenvatting gelezen. Bij het bouwen gaat elke
  bron, zoals bij de andere kennisbanken, eerst via PubMed of de uitgever voordat
  hij in de app komt.
- **Niet gebruikt**: tests van fabrikanten, en onafhankelijke tests die niet
  gepubliceerd zijn (rolweerstand-testsites, windtunnelbureaus). Die zijn vaak
  zorgvuldig, maar niet na te gaan zoals een publicatie.

## Wat het onderzoek zegt, per onderwerp

### Lucht

- **Lucht is buiten de grootste weerstand.** Boven ongeveer 50 km/h gaat zo'n
  90 % van je vermogen naar luchtweerstand
  ([Debraux 2011](https://doi.org/10.1080/14763141.2011.592209)).
- **Houding is de grootste knop.** Bij profs verlaagde alleen een andere houding
  de luchtweerstand met 14 %
  ([García-López 2008](https://doi.org/10.1080/02640410701501697)). Een
  wegrenner die de remgrepen vasthoudt met de onderarmen horizontaal, had 13,9 %
  minder luchtweerstand dan met gewone remgrepen. Het benodigde vermogen daalde
  bijna evenveel (13,4 %), omdat lucht op snelheid bijna alle weerstand is
  ([Barry 2015](https://doi.org/10.1177/1754337114549876)). Van de remgrepen naar
  de beugel scheelt volgens een recent overzicht 15–20 %
  ([Maddocks 2025](https://doi.org/10.1007/s12283-025-00495-7)). Bij recreatieve
  renners scheelde een lage sprinthouding 23–26 %, maar de meting was tussen
  twee dagen slecht herhaalbaar
  ([Merkes 2019](https://doi.org/10.1123/ijspp.2018-0560)). In een
  computermodel verschilde de luchtweerstand tussen gangbare houdingen meer dan
  een factor twee. Overzichten: [Malizia 2021](https://doi.org/10.1016/j.jweia.2021.104673)
  (renner en kleding) en [Malizia 2020](https://doi.org/10.1016/j.jweia.2020.104134)
  (fiets en wielen).
- **Helm.** Een aerohelm hielp niet bij alle profs
  ([García-López 2008](https://doi.org/10.1080/02640410701501697)). In een
  computermodel scheelde de vorm van de helm minder dan 1,5 %, de stand van het
  hoofd 6,4 % ([Beaumont 2018](https://doi.org/10.1016/j.jbiomech.2017.10.042)).
  Op een testhoofd telden de hoek van het hoofd en hoe de helm aansluit meer dan
  het aantal of de plek van de ventilatiegaten
  ([Underwood 2015](https://doi.org/10.1007/s12283-015-0181-7)). Open of dichte
  gaten scheelden op een pop 3,7–4,1 %
  ([Novak 2019](https://doi.org/10.1177/1754337118822613)). Wat je met je hoofd
  doet, telt dus meer dan welke helm je draagt.
- **Kleding.** Strak zittende stof, met de juiste textuur per lichaamsdeel,
  scheelde in windtunneltests enkele procenten tot zo'n 8 %
  ([Brownlie 2009](https://doi.org/10.1080/19346182.2009.9648499),
  [Oggiano 2009](https://doi.org/10.1007/s12283-009-0029-0)). Bij meer
  turbulentie, zoals buiten of in een groep, verandert dat effect
  ([Brown 2023](https://doi.org/10.1016/j.jweia.2023.105575)).
- **Sokken en overschoenen.** Eén windtunnelstudie naar tijdritschoenen: de
  voeten kosten bijna een tiende van het vermogen, en overschoenen maken
  verschil ([Gibertini 2010](https://doi.org/10.1007/s12283-010-0037-0)). Naar
  aero-sokken zelf is geen gepubliceerd onderzoek gevonden, alleen naar
  ruwe stof op cilinders. Dat het werkt, is dus een afleiding.
- **Wielen en frame.**
  - Aerowielen gaven in de windtunnel ongeveer 25 % minder luchtweerstand dan een
    gewoon spaakwiel, gemeten aan het wiel alleen
    ([Greenwell 1995](https://doi.org/10.1017/s0001924000028281)). In een fiets
    is het anders: frame en vork verlagen de luchtweerstand van het voorwiel met
    9–13 % ([Malizia 2021b](https://doi.org/10.1007/s12283-021-00341-6)).
  - In een rekenmodel voor een tijdrit van 40 km scheelde een aeroframe 1:17 tot
    1:44 minuut en aerowielen 60–82 seconden
    ([Jeukendrup & Martin 2001](https://doi.org/10.2165/00007256-200131070-00009)).
    Dat is solo, in tijdrittempo.
  - Bij zijwind geeft een dicht wiel veel meer stuurmoment, in een
    windtunnelmeting dertig keer zoveel
    ([Mao 2025](https://doi.org/10.1016/j.expthermflusci.2025.111423)). Dat raakt
    de veiligheid.
- **Slipstream.** In een groot peloton zakt de luchtweerstand achterin tot 5–10 %
  van die van een renner alleen
  ([Blocken 2018](https://doi.org/10.1016/j.jweia.2018.06.011)). Dat is eerder
  tactiek dan materiaal; het hoort bij racen.

### Rollen

- **Bandenspanning.** Op een gladde ondergrond daalt de rolweerstand met de
  spanning ([Grappe 1999](https://doi.org/10.1080/001401399185009),
  [Henchoz 2010](https://doi.org/10.1080/02640414.2010.498483)). Op de weg
  meten gewone vermogensmeters het verschil tussen 4 en 8 bar
  ([Lim 2011](https://doi.org/10.1249/mss.0b013e3181fcb140)). Op ruwe ondergrond
  gaat te hard pompen weer kosten. Bij een mountainbike maakte de velgbreedte
  bijna niets uit, de spanning wel
  ([Maier 2019](https://doi.org/10.1080/02640414.2018.1530057),
  [Bertucci 2013](https://doi.org/10.1080/02640414.2013.792945)).
- **Slechte wegen.** Op een matig ruwe weg kost het schudden meer dan de
  rolweerstand van de band, en op een heel ruwe weg zelfs meer dan de lucht
  ([Turner 2024](https://doi.org/10.1080/00423114.2024.2304031), een rekenmodel).
  Lagere spanning en een bredere band verminderen de trillingen
  ([Crenna 2025](https://doi.org/10.3390/eng6090245)). Bij welke spanning het
  omslagpunt ligt, is niet vastgesteld.
- **Brede banden, tubeless en latex** zijn in gepubliceerd onderzoek nauwelijks
  vergeleken. Wat daarover rondgaat, komt vooral van testsites.

### Aandrijving

- Kettingspanning en de grootte van de tandwielen bepalen het rendement meer
  dan de smering ([Spicer 2001](https://doi.org/10.1115/1.1412848)).
- Wax gaf op testbanken een beter en stabieler rendement
  ([Dowd 2026](https://doi.org/10.1007/s12283-025-00529-0),
  [Lanaspeze 2025](https://doi.org/10.1051/meca/2025013)). Het gaat om een paar
  watt, gemeten op een testbank, niet in een wedstrijd. Wax met onderdompelen was
  het meest herhaalbaar en hield ruim 60 uur; een druppelsmeermiddel deed het op
  hoge snelheid het best. Overzichten:
  [Liew 2025](https://doi.org/10.3390/machines13010066) en
  [Aubert 2023](https://doi.org/10.1177/17543371231202562) (hoe dichter een test
  bij echt fietsen, hoe meer spreiding).
- Een groter tandwiel achter scheelde op een tandem merkbaar: 2,9 % verlies met
  53-13 tegen 4,0 % met 53-11
  ([Smit 2023](https://doi.org/10.1007/s12283-023-00439-z)).

### Binnen

- **Ventilator.** Dit is voor een Zwift-club misschien het nuttigste onderwerp.
  - Bij 30 °C hielden renners het zonder luchtstroom 41 minuten vol, met
    30 km/h luchtstroom 90 minuten
    ([Otani 2018](https://doi.org/10.1139/apnm-2017-0448)).
  - In een tijdrit in de hitte was het vermogen zonder luchtstroom lager. Meer
    dan 16 km/h luchtstroom hielp niet meer
    ([Bright 2023](https://doi.org/10.1249/mss.0000000000003168)).
  - Ook bij kamertemperatuur leverden mensen bij dezelfde hartslag 15 % meer
    vermogen met een ventilator
    ([Fernández 2022](https://doi.org/10.1080/02701367.2021.1946467)).
  - Met luchtstroom voegde voorkoelen weinig meer toe
    ([Morrison 2014](https://doi.org/10.4085/1062-6050-49.3.27)). Dat raakt het
    protocol IJsslush.
- **Vermogensmeters en smart trainers.**
  - Een overzicht van 74 validatiestudies
    ([Bouillod 2022](https://doi.org/10.3390/s22010386)).
  - Van 54 vermogensmeters in gebruik zaten er zes meer dan 5 % naast
    ([Maier 2017](https://doi.org/10.1055/s-0043-102945)).
  - Temperatuur verschuift de meting
    ([Gardner 2004](https://doi.org/10.1249/01.mss.0000132380.21785.03)).
  - Directe-aandrijving-trainers kwamen binnen een paar procent van een
    referentiemeter ([Hoon 2016](https://doi.org/10.28985/jsc.v5i3.240),
    [Lillo-Beviá 2017](https://doi.org/10.1123/ijspp.2017-0403)).
  - Trainers met het wiel erop zijn minder nauwkeurig. Ook een
    directe-aandrijving-trainer kan bij 100–200 W meer afwijken (samengevat in
    [Peeters 2024](https://doi.org/10.3389/fspor.2024.1433368)). Bij één smart
    trainer was de spreiding 5,5 % bij 100 W en 1,6 % bij 300 W
    ([Costa 2026](https://doi.org/10.28985/1526.jsc.02)).
  - Een vermogensmeter aan één kant gaf staand 4,4 % minder dan zittend, en week
    af bij trillingen ([Bouillod 2017](https://doi.org/10.1123/ijspp.2016-0436)).
    Pedalen gaven bij een hogere cadans iets minder
    ([Czajkowski 2016](https://doi.org/10.28985/jsc.v5i2.257)).
  - Dat raakt je FTP, je schema en eerlijk racen in de ZRL.

### Lichaam en fiets

- **Zadelhoogte en bikefit.**
  - Er is sterk bewijs dat je de zadelhoogte het best instelt op de kniehoek
    tijdens het fietsen. Verschillen van minder dan 4 % van je beenlengte doen
    weinig ([Bini 2021](https://doi.org/10.1080/02640414.2021.1994727)).
  - Voor een verband tussen fietsmaten en overbelastingsklachten is geen sterk
    bewijs gevonden ([Visentini 2021](https://doi.org/10.1016/j.jsams.2021.12.008)).
  - Een systematische review van de andere instellingen noemt geen enkele studie
    "goed" ([Husband 2024](https://doi.org/10.1080/02640414.2024.2394752)).
  - Bij een enquête onder 849 renners hing een bikefit samen met meer comfort en
    minder pijn, niet met minder blessures
    ([Priego Quesada 2018](https://doi.org/10.1080/17461391.2018.1556738)).
  - Bij 160 mountainbikers daalden ongemak, vermoeidheid en kniepijn een maand na
    een bikefit sterk, maar zonder controlegroep
    ([Scoz 2021](https://doi.org/10.1136/bmjsem-2021-001096)). Een proef met
    twaalf recreanten vond na een fit 8,6 % meer piekvermogen en iets meer
    vermogen in de FTP-test; dat is een pilot
    ([Hoyt 2025](https://doi.org/10.70252/cmdy5909)).
  - Een overzicht van reviews over de zadelpositie vond tegenstrijdige uitkomsten
    voor knieklachten en rendement
    ([Vigário 2024](https://doi.org/10.3390/physiologia4040032)).
- **Schoenplaatjes.** De plaatjes 15 mm naar voren of achteren zetten veranderde
  de stand van heup en enkel, maar niet het rendement of het sprintvermogen
  ([Chartogne 2016](https://doi.org/10.28985/jsc.v5i2.255)). Voor cranklengte,
  Q-factor en plaatjes zijn er geen duidelijke aanbevelingen
  ([Husband 2024](https://doi.org/10.1080/02640414.2024.2394752)).
- **Cranklengte.**
  - Binnen de gangbare maten maakt de lengte voor vermogen en rendement weinig
    uit ([Martin 2001](https://doi.org/10.1007/s004210100400),
    [Ferrer-Roca 2014](https://doi.org/10.1080/02640414.2016.1215490),
    [Li 2025](https://doi.org/10.1016/j.jesf.2025.100384)).
  - Kortere cranks kunnen ruimte geven voor een lagere houding. Dat staat in een
    preprint, dus nog niet nagekeken door vakgenoten
    ([Delp 2026](https://doi.org/10.64898/2026.09.25.754230)).
- **Inlegzolen.** Een systematische review en een proef met een nepzool vonden
  geen winst in vermogen ([Yeo 2014](https://doi.org/10.1186/1757-1146-7-31),
  [Yeo 2016](https://doi.org/10.1016/j.jsams.2015.04.015)); zolen met
  boogsteun ook niet bij recreanten (Meyers 2017, Footwear Science). Een zool met
  vorm vergroot wel het contactvlak onder de middenvoet (Bousie 2012, J Sci Med
  Sport). Dat kan bij drukklachten helpen, maar levert geen watt op.

### Kleine middelen

- **Neusstrips.**
  - Een meta-analyse vond geen effect op VO2max, hartslag of zwaarte
    ([Dinardi 2020](https://doi.org/10.1007/s00405-020-06202-5)).
  - Bij getrainde fietsers maakten uitwendige en inwendige neusspreiders een
    tijdrit van 20 km niet sneller
    ([Adams 2017](https://doi.org/10.1016/j.jsams.2016.08.018)).
  - Een meta-analyse bij lopers zag een klein voordeel, maar met zeer lage
    zekerheid ([Gomes 2022](https://doi.org/10.1080/02640414.2022.2151752)).
  - Alleen bij sporters met een vernauwde neusklep hielp een inwendige spreider
    wel ([Valsamidis 2023](https://doi.org/10.1016/j.amjoto.2023.104059)).
- **Compressiekleding.**
  - Tijdens het sporten word je er niet sneller van. Een netwerk-meta-analyse
    vond dat met matige zekerheid
    ([Jin 2026](https://doi.org/10.3389/fspor.2026.1876924); voor lopers
    [Wang 2025](https://doi.org/10.1016/j.jshs.2025.101028)).
  - Na het sporten herstelde kracht in een oudere meta-analyse iets sneller
    ([Brown 2017](https://doi.org/10.1007/s40279-017-0728-9)), maar latere
    analyses wijzen op een verwachtingseffect.

### Natuurkunde als rekenbasis

Wat een kleinere luchtweerstand, een lagere rolweerstand of een lichtere fiets
in seconden oplevert, volgt uit een rekenmodel dat buiten goed klopt.
- Het gemeten en berekende vermogen kwamen overeen met R² = 0,97 en een
  standaardfout van 2,7 W ([Martin 1998](https://doi.org/10.1123/jab.14.3.276);
  niet in PubMed, DOI en samenvatting via Consensus).
- Op echte routes, ook in de bergen, haalde hetzelfde model correlaties van
  0,96–0,99 ([Dahmen 2011](https://doi.org/10.1007/s12283-011-0076-1)).
- Een vergelijkbaar model voorspelde de tijd op een tijdrit van 26 km bij 41
  renners met gemiddeld 1,7 % afwijking
  ([Olds 1995](https://doi.org/10.1152/jappl.1995.78.4.1596)). ZWB heeft zo'n model al: het
pacingplan rekent met luchtweerstand, rolweerstand en gewicht
(`src/lib/pacing/plan.ts`, `zwift-setup.ts`).

Twee voorbeelden met dat model, voor een renner van 80 kg met fiets, alleen op
het vlak:

- **5 % minder luchtweerstand** (CdA 0,32) scheelt bij 30 km/h ongeveer 5 W, en
  bij 45 km/h ongeveer 19 W. Lucht kost met de derde macht van de snelheid.
  Voor een clubrenner in een groep is de winst dus veel kleiner dan de cijfers
  uit de windtunnel.
- **Rolweerstand van 0,005 naar 0,004** scheelt bij 30 km/h ongeveer 6–7 W.

Dat soort verhoudingen hoort in de kennisbank. Het past ook bij wat leden
zelf willen weten: "is dit het geld waard voor hoe ik rijd?"

## Besluiten van de eigenaar (2026-10-18)

1. **Pad.** Vraag en Aanbod wordt niet meer gebruikt, dus het pad `/materiaal`
   gaat over naar ZWBeter materiaal.
2. **Metingen tellen als bewijs.** Er komt een bronsoort `meting`. Het beleid
   voor het beoordelen van artikelen wordt in een volgende ronde verbeterd en
   vastgelegd, voor alle kennisbanken.
3. **Geen "Afgeraden".** Neusstrips, compressie en inlegzolen krijgen een gewoon
   niveau. Wat zwak is aan het onderzoek, staat in het artikel.
4. **De rekenaar wordt meteen mee-ontworpen** (zie "De rekenaar").
5. **Gelijk op de criteria is gelijk ingedeeld.** Banden en ventilator voldoen
   aan dezelfde regel, dus ze krijgen hetzelfde niveau. De niveaus hieronder zijn
   daarom allemaal opnieuw langs dezelfde regels gelegd.

## Bewijsniveau bij materiaal

De schaal is sterk, matig of beperkt, zoals bij de kennisbanken
([bewijsniveau-kennisbank](bewijsniveau-kennisbank.md)). Het niveau gaat over de
conclusie van het artikel. Ook als die conclusie is dat iets niet helpt: dan staat
dat in de samenvatting, en wat zwak is aan het onderzoek in "Wat dit niet laat
zien".

| Niveau | Wanneer |
|---|---|
| **Sterk** | Een consensusstuk of richtlijn; of meerdere meta-analyses die het eens zijn; of meerdere onafhankelijke onderzoeksgroepen waarvan de metingen of proeven met renners het eens zijn, in de situatie van het advies. |
| **Matig** | Eén meta-analyse, of meerdere studies die klein zijn, van één groep komen of elkaar tegenspreken. |
| **Beperkt** | Eén of enkele kleine studies, of een advies dat vooral is afgeleid. |

Drie begrenzingen, alle drie *hooguit matig*:

1. **Alleen een tussenmaat**, zoals een bloedwaarde, en geen prestatie of
   weerstand.
2. **Niet bij duursporters onderzocht.**
3. **Alleen op een pop, een testbank of in een computermodel**, zonder metingen
   met renners. Zo'n meting is precies, maar zegt nog niet hoe het uitpakt met een
   echte renner op een echte fiets.

Wat iets in de wedstrijd oplevert, is een berekening met het gevalideerde
rekenmodel ([Martin 1998](https://doi.org/10.1123/jab.14.3.276)). Het artikel en
de rekenaar zeggen dan onder welke omstandigheden: snelheid, alleen of in een
groep, en het wegdek.

**Verschil met de andere kennisbanken.** Daar is *sterk* nog: een consensusstuk
of meerdere meta-analyses. De derde weg (meerdere onafhankelijke groepen die het
eens zijn) en het loslaten van "Afgeraden" gelden voorlopig alleen voor
materiaal. De volgende ronde trekt het beleid gelijk voor alle kennisbanken
(besluit 2).

**Voorstel daarvoor (2026-10-18, wacht op akkoord):**
[beoordelingsbeleid-bewijsniveau](beoordelingsbeleid-bewijsniveau.md). De niveaus
bij materiaal veranderen daarin niet; neusstrips, compressie en inlegzolen krijgen
de vorm "geen effect" in de badge.

## Artikelen en niveaus

Herzien op 2026-10-18 langs de regels hierboven.

| # | Artikel | Plank | Niveau | Waarom |
|---|---|---|---|---|
| 1 | Waar je watt heen gaan | Lucht | **Sterk** | Het rekenmodel is door drie onafhankelijke groepen tegen metingen getoetst (Martin 1998, Olds 1995, Dahmen 2011). |
| 2 | Houding: de grootste winst | Lucht | **Sterk** | Metingen met renners van meerdere groepen zijn het eens: windtunnel bij profs, windtunnel met renners, en veldtests bij recreanten (García-López 2008, Barry 2015, Merkes 2019, Lim 2011). |
| 3 | Helm | Lucht | **Matig** | Eén studie met renners; de rest gebruikt een pop, een testhoofd of een computermodel (begrenzing 3). |
| 4 | Kleding en pak | Lucht | **Matig** | Vooral metingen op cilinders en poppen (begrenzing 3). |
| 5 | Sokken en overschoenen | Lucht | **Beperkt** | Eén windtunnelstudie naar schoenen; naar aero-sokken zelf is niets gepubliceerd. |
| 6 | Wielen en frame | Lucht | **Matig** | Windtunnel aan het wiel alleen, een gevalideerd computermodel en een rekenmodel; geen metingen met renners (begrenzing 3). |
| 7 | Banden en bandenspanning | Rollen | **Sterk** | Veldmetingen met renners van meerdere groepen zijn het eens over spanning, band en wegdek (Grappe 1999, Lim 2011, Bertucci 2013, Maier 2019). Bij welke spanning het op een ruwe weg omslaat, is niet vastgesteld. |
| 8 | Ketting en smering | Rollen | **Matig** | Meerdere onafhankelijke testbanken zijn het eens over spanning en tandwielgrootte, maar alleen op een testbank (begrenzing 3). |
| 9 | Ventilator bij binnen fietsen | Binnen | **Sterk** | Gecontroleerde proeven met fietsers van meerdere groepen zijn het eens: Otani 2018, Bright 2023, Morrison 2014, Fernández 2022. Het meeste is in de hitte gedaan; bij kamertemperatuur zijn er minder proeven. |
| 10 | Klopt je vermogensmeter? | Binnen | **Sterk** | Veel onafhankelijke validatiestudies zijn het eens over afwijkingen van een paar procent, afhankelijk van temperatuur, staan, cadans en trillingen. Plus een overzicht van 74 studies (Bouillod 2022). |
| 11 | Zadelhoogte, bikefit en schoenplaatjes | Lichaam en fiets | **Matig** | Voor de zadelhoogte via de kniehoek is het bewijs sterk (Bini 2021). Voor een bikefit als geheel: comfort uit één ongecontroleerde studie en een enquête, prestatie uit een pilot. |
| 12 | Cranklengte | Lichaam en fiets | **Sterk** | Meerdere onafhankelijke proeven zijn het eens: binnen de gangbare maten maakt de lengte voor vermogen en rendement weinig uit (Inbar 1983, Martin 2001, Barratt 2011, Ferrer-Roca 2014, Li 2025). |
| 13 | Gewicht van fiets en uitrusting | Lichaam en fiets | **Sterk** | Een berekening met het getoetste rekenmodel (zie 1): gewicht telt bergop, nauwelijks op het vlak. |
| 14 | Neusstrips | Kleine middelen | **Matig** | Een meta-analyse vond geen effect, en een proef bij fietsers ook niet. Een meta-analyse bij lopers zag een klein voordeel, met zeer lage zekerheid: de uitkomsten spreken elkaar tegen. Alleen bij een vernauwde neus hielp een spreider. |
| 15 | Compressiekleding | Kleine middelen | **Sterk** | Meerdere meta-analyses zijn het eens. Tijdens het sporten word je er niet sneller van (da Silva 2018, Wang 2025), en als herstelmiddel geeft het daarna geen betere prestatie (Jin 2026, matige zekerheid). Voor het herstel van kracht spreken de analyses elkaar tegen, en een verwachtingseffect valt niet uit te sluiten. Dat staat in het artikel. |
| 16 | Inlegzolen | Kleine middelen | **Matig** | Een systematische review en losse proeven, ook een met een nepzool, vinden geen winst in vermogen. Maar de studies zijn klein en wisselend van kwaliteit. |

Uitkomst: 8 sterk, 7 matig, 1 beperkt.

Neusstrips, compressie en inlegzolen hebben nu een gewoon niveau. Bij
compressie is dat *sterk*: het bewijs dat je er tijdens het sporten niet
sneller van wordt, is stevig. De samenvatting moet dat dus voorop zetten, zodat
niemand het niveau leest als "werkt".

## Waar het komt

- **ZWBeter materiaal** wordt de zesde pijler, met twee tabs: **Kennisbank** en
  **Rekenaar**.
- **Het adres.** De pagina's staan, net als de andere pijlers, onder
  `/zwbeter-worden/materiaal`; daar zitten de tegels en tabs van ZWBeter. Het
  korte pad `/materiaal` gaat er met een permanente doorverwijzing naartoe.
- **Vraag en Aanbod verdwijnt uit de app:** de pagina's onder
  `src/app/(app)/materiaal/`, het menu-item en de vermelding op `/hulp`. De
  berichten blijven in de database staan. Of die tabel weg kan, is een aparte
  beslissing met een migratie; dat hoort niet bij deze ronde.
- **Leeszaal (ZWBieb).** Nieuwe planken Lucht, Rollen, Binnen, Lichaam en fiets,
  en Kleine middelen. Ze wijzen naar de ZWBieb-onderwerpen Banden en tubeless,
  Bikefit en houding, Vermogensmeters, Zwift-setup en smart trainers, Sleutelen
  en onderhoud, en Kleding en slecht weer.
- **Coachchat en kennisbank-scan** nemen de vierde kennisbank mee, met de
  niveaus.
- **`/hulp`** legt de rekenaar en de regels voor het bewijsniveau bij materiaal
  uit.

## De rekenaar

**Vraag die hij beantwoordt:** wat levert deze verandering mij op, op deze route,
met mijn vermogen?

**Rekenkern.** Het buitenmodel van ZWB, `estimateRide` in
`src/lib/ride-estimate.ts`. Die rekent al per stuk route met luchtweerstand,
rolweerstand, gewicht en het rendement van de aandrijving. Zo'n model is door
drie groepen tegen metingen getoetst (artikel 1). Er komt één pure functie bij,
`compareSetups`, die dezelfde route twee keer doorrekent met hetzelfde vermogen,
en een test die de uitkomst naast een handberekening legt.

**Invoer.**
- **Route.** Een paar vaste routes (vlak 40 km, heuvelachtig, een klim van
  8 km), of een buitenevent uit de kalender met een GPX. Zwift-routes niet: daar
  bepaalt het spel de fysica, niet je echte materiaal.
- **Vermogen.** Standaard een deel van je FTP, of een eigen getal; gewicht uit
  je profiel. De uitrusting staat standaard op 9 kg, zoals in het pacingplan.
- **Alleen of in een groep.** In een groep is de luchtweerstand lager en is de
  winst van aero dus kleiner. Hoeveel lager, is een aanname; die staat er met
  bron bij (Blocken 2018).
- **Wat je verandert**, elk met de bron en het artikel erbij:
  - houding: op de kappen, in de beugel, of onderarmen horizontaal (−13,9 %,
    Barry 2015);
  - helm, kleding en wielen: als luchtweerstand in m² of procent, met een
    bandbreedte uit de artikelen;
  - band en spanning: rolweerstand per wegdek;
  - gewicht in kg;
  - rendement van de aandrijving: schone of vuile ketting, binnen de bandbreedte
    uit het artikel.

**Uitkomst.**
- Tijdwinst in seconden op de route.
- Hetzelfde uitgedrukt in watt: hoeveel meer vermogen je anders voor diezelfde
  tijd nodig had.
- Bij elke verandering het artikel en de bewijsbadge.
- Bandbreedtes worden een vork ("30–45 s"), niet één schijnzeker getal.

**Bewust niet in de rekenaar.**
- **Wind.** De rekenaar rekent windstil, zoals het pacingplan. Dat staat op
  `/hulp`.
- **Prijzen of "seconden per euro".** Dat is koopadvies.
- **Opslaan.** Er komt geen tabel en geen migratie bij. Hooguit onthoudt de
  browser je laatste keuze.

## Bewust niet

- **Merken, producten of koopadvies.** Dezelfde lijn als bij supplementen. Een
  merknaam staat alleen in een bronvermelding (validatiestudies gaan per apparaat).
- **Tests van fabrikanten en ongepubliceerde testsites als bron.** Niet na te
  gaan.
- **Virtueel materiaal in Zwift** (welk frame of welke wielen in het spel). Dat
  is spelmechaniek, geen onderzoek; het pacingplan rekent er al mee.
- **Slipstream en groepsrijden als artikel.** Dat is tactiek en hoort bij racen.
  De rekenaar gebruikt de slipstream wel, als keuze.
- **Een rekenhulp voor de zadelhoogte.** De beste methode meet de kniehoek
  tijdens het fietsen; een formule uit de binnenbeenlengte is minder goed, en een
  fout geeft klachten. Het artikel verwijst naar een bikefitter.
- **De tabel van Vraag en Aanbod opruimen.** Zie "Waar het komt".

## Gebouwd (2026-10-18)

Alles hierboven is gebouwd, op twee na: er is geen vork in de rekenaar (elke
keuze heeft één bronwaarde), en er is geen keuze voor gravel bij de banden. Zie
PLAN.md, "Opgeleverd — ZWBeter materiaal".

**Bronnen gecontroleerd.** Ruim dertig bronnen uit sport- en
sportgeneeskundebladen zijn in PubMed teruggevonden. De techniekbladen staan
niet in PubMed; die hebben de DOI van de uitgever, via Consensus. Grappe 1999 is
niet in PubMed gevonden.

**Volgende ronde**: het beleid voor het bewijsniveau voor alle kennisbanken
(besluit 2), in een eigen sessie.
