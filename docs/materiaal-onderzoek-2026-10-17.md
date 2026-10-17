# ZWBeter materiaal: onderzoek en voorstel

**Voorstel, 2026-10-17. Wacht op akkoord van de eigenaar.** Er is nog niets
gebouwd.

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

## Bewijsniveau bij materiaal

De schaal blijft sterk, matig, beperkt of afgeraden
(zie [bewijsniveau-kennisbank](bewijsniveau-kennisbank.md)). Er komen twee
aanvullingen bij:

1. **Metingen tellen als bewijs.** Een gepubliceerde meting in een windtunnel,
   op een testbank of in het veld meet de luchtweerstand of het rendement direct.
   Meerdere onafhankelijke metingen die het eens zijn, tellen voor *sterk*, ook
   zonder meta-analyse. Eén meting, of metingen van één groep, tellen voor
   *beperkt* of *matig*.
2. **Wat het in de wedstrijd oplevert, is een berekening.** Het artikel zegt
   dat er dan bij ("bij 30 km/h, alleen, op het vlak"). Het niveau gaat over de
   gemeten weerstand, niet over de seconden.

Een nieuwe soort bron, `meting`, komt dan naast consensus, review, studie en
richtlijn.

## Voorgestelde artikelen

| # | Artikel | Plank | Niveau (voorstel) | Kern |
|---|---|---|---|---|
| 1 | Waar je watt heen gaan | Lucht | Sterk | Lucht, rollen, aandrijving en klimmen naar snelheid; waarom de winst met de snelheid groeit |
| 2 | Houding: de grootste winst | Lucht | Sterk | Meerdere windtunnel- en veldmetingen (14 %, 13,9 %); hoofd, romp en onderarmen tellen het meest |
| 3 | Helm | Lucht | Matig | Hoofdstand telt meer dan de helm; aerohelm niet voor iedereen beter |
| 4 | Kleding en pak | Lucht | Matig | Strak zitten en textuur; enkele procenten |
| 5 | Sokken en overschoenen | Lucht | Beperkt | Eén studie naar schoenen; aero-sokken zelf niet gepubliceerd onderzocht |
| 6 | Wielen en frame | Lucht | Matig | Minuten in een solotijdrit, minder in een groep; dichte wielen en zijwind |
| 7 | Banden en bandenspanning | Rollen | Sterk | Spanning en breedte naar ondergrond; op ruwe weg kost schudden meer dan rollen |
| 8 | Ketting en smering | Rollen | Matig | Testbanken; een paar watt; groter tandwiel en schone ketting tellen |
| 9 | Ventilator bij binnen fietsen | Binnen | Matig | Luchtstroom houdt je koel en je vermogen hoog |
| 10 | Klopt je vermogensmeter? | Binnen | Matig | Afwijkingen van een paar procent; ijken, temperatuur, twee meters vergelijken |
| 11 | Zadelhoogte, bikefit en schoenplaatjes | Lichaam en fiets | Matig | Kniehoek tijdens het fietsen; comfort ja, blessures onzeker; plaatjes verschuiven doet weinig |
| 12 | Cranklengte | Lichaam en fiets | Matig | Maakt voor vermogen weinig uit |
| 13 | Gewicht van fiets en uitrusting | Lichaam en fiets | Sterk (berekening) | Telt bergop, nauwelijks op het vlak |
| 14 | Neusstrips | Kleine middelen | Afgeraden | Geen effect, behalve bij een vernauwde neus (arts) |
| 15 | Compressiekleding | Kleine middelen | Afgeraden | Niet sneller; herstel onzeker |
| 16 | Inlegzolen | Kleine middelen | Afgeraden | Geen winst in vermogen; bij klachten naar een podotherapeut |

Zoals bij de bewijsniveaus: na akkoord komt er een tabel met per artikel het
niveau en waarom, en een test houdt code en tabel gelijk.

## Waar het komt

**Voorstel: een zesde pijler "ZWBeter materiaal"**, op
`/zwbeter-worden/materiaal`. Hij begint met alleen de kennisbank.

- Het menu en de tegels hebben nu vijf pijlers: trainen, racen, voeden, kracht
  en coachen. Met zes staan ze op de telefoon in drie rijen van twee.
- "Kracht" is ook een zelfstandig naamwoord, dus "ZWBeter materiaal" past in het
  rijtje.
- **Let op de naam.** `/materiaal` bestaat al: dat is Vraag en Aanbod onder
  Club, de vroegere Materiaalzone. De pijler komt op een ander adres, maar twee
  keer "materiaal" in het menu verwart. Mogelijke oplossingen: de pijler
  "ZWBeter uitrusten" noemen, of "ZWBeter materiaal" houden en in het menu alleen
  "Vraag en Aanbod" laten staan, zoals nu al.
- Alternatief: de kennisbank onder ZWBeter racen. Racen heeft nu alleen de
  analyse van ZRL-races. Materiaal is breder dan racen, maar zo komt er geen
  pijler bij die eerst alleen een lijst is.

**Wat er verder mee verbonden wordt, zonder nieuwe tabellen:**

- **Leeszaal (ZWBieb).** Nieuwe planken Lucht, Rollen, Binnen, Lichaam en fiets,
  en Kleine middelen. Ze wijzen naar bestaande ZWBieb-onderwerpen: Banden en
  tubeless, Bikefit en houding, Vermogensmeters, Zwift-setup en smart trainers,
  Sleutelen en onderhoud, en Kleding en slecht weer. Onder elk artikel staan dan
  de kenners in de club.
- **Coachchat.** De kennisbank gaat mee in het blok voor de coach, zoals de
  andere drie.
- **Kennisbank-scan.** De maandelijkse scan neemt de vierde kennisbank mee.
- **ZWBieb Spullen.** Een aerohelm, een skinsuit of een tweede vermogensmeter
  kun je al uitlenen; er hoeft niets bij.

## In fases

1. **Kennisbank** (dit voorstel): zestien artikelen, bewijsniveaus, planken in
   de leeszaal, coach en scan. Geen migratie; de inhoud staat in code, zoals bij
   de andere kennisbanken.
2. **Rekenaar "Wat levert het op?"** Kies een route (een event, of een
   Zwift-route uit de routebibliotheek) en je eigen vermogen en gewicht. Zie wat
   minder luchtweerstand, lagere rolweerstand of minder gewicht oplevert in
   seconden. De rekenkern bestaat al in het pacingplan. Alleen voor buiten; voor
   Zwift-routes met de fysica van het spel.
3. **Later, apart te beslissen:**
   - Een protocol "Aerotest": op een vlak stuk heen en terug rijden, en met je
     eigen vermogensmeter twee houdingen vergelijken
     ([Lim 2011](https://doi.org/10.1249/mss.0b013e3181fcb140)). Wel tussen
     dagen slecht herhaalbaar
     ([Merkes 2019](https://doi.org/10.1123/ijspp.2018-0560)).
   - Een koppeling met Mijn garage, bijvoorbeeld bandenbreedte en spanning per
     fiets.

## Bewust niet

- **Merken, producten of koopadvies.** Dezelfde lijn als bij supplementen. Een
  merknaam staat alleen in een bronvermelding (validatiestudies gaan per apparaat).
- **Tests van fabrikanten en ongepubliceerde testsites als bron.** Niet na te
  gaan.
- **Virtueel materiaal in Zwift** (welk frame of welke wielen in het spel). Dat
  is spelmechaniek, geen onderzoek; er past geen bewijsniveau bij. Het pacingplan
  rekent er al mee, en daar hoort het.
- **Slipstream en groepsrijden** in deze kennisbank. Dat is tactiek; het hoort
  bij racen.
- **Een bikefit-hulp in de app** die zadelhoogte uitrekent. De beste methode
  meet de kniehoek tijdens het fietsen; een formule uit je binnenbeenlengte is
  minder goed, en een fout geeft klachten. Het artikel verwijst naar een
  bikefitter.

## Eerst te beslissen

1. **Waar en hoe heet het**: een eigen pijler "ZWBeter materiaal" (voorstel), of
   onder racen; en de naam, gezien Vraag en Aanbod op `/materiaal`.
2. **Bewijsniveau bij materiaal**: metingen tellen als bewijs, met de nieuwe
   bronsoort `meting` (voorstel), of alleen de bestaande criteria. Met alleen de
   bestaande criteria komt bijna elk artikel over lucht en rollen op *beperkt*,
   omdat er geen meta-analyses zijn.
3. **Afgeraden** voor neusstrips, compressie en inlegzolen. Zo staat het in de
   tabel; bij compressie is het herstelstuk onzeker, niet weerlegd.
4. **De volgorde**: eerst alleen de kennisbank (fase 1), of de rekenaar meteen
   mee-ontwerpen.
5. **De niveaus van banden en ventilator.** Banden staan op *sterk*: meerdere
   metingen in het veld en op de testbank zijn het eens, en Consensus geeft 8 van
   10. De ventilator staat op *matig*. Consensus geeft ook daar 8 van 10, maar
   naar onze criteria zijn het een paar kleine proeven, vooral in de hitte,
   zonder meta-analyse.
