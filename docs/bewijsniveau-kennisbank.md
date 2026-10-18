# Bewijsniveau per kennisartikel

**Voorgesteld 2026-10-16, goedgekeurd door de eigenaar op 2026-10-17 en
gebouwd.** De niveaus staan in code bij elk artikel (`evidence`, met
`src/lib/knowledge/evidence.ts`). `tests/unit/article-evidence.test.ts` laat de
build falen als een niveau in code afwijkt van de tabel hieronder. Wijzig een
niveau dus eerst hier.

**Voorstel tot vervanging (2026-10-18, wacht op akkoord):**
[beoordelingsbeleid-bewijsniveau](beoordelingsbeleid-bewijsniveau.md) geeft één
beleid voor alle kennisbanken, met nieuwe woorden, zonder "Afgeraden", en met een
herbeoordeling van elk artikel. Tot het akkoord en de bouwronde geldt de tabel
hieronder.

De eigenaar vroeg of de artikelen in de kennisbanken, net als de nieuwe
trainingsmethodes, een label kunnen krijgen waaraan je ziet hoe gegrond ze zijn.
Dit document geeft per artikel het niveau en waarom. Een nieuw artikel krijgt
een niveau volgens dezelfde criteria.

## Wat het niveau zegt

Elk artikel krijgt een niveau op dezelfde schaal als de protocollen
(`PROTOCOL_EVIDENCE` in `src/lib/protocols/types.ts`): **Sterk bewijs**, **Matig
bewijs** of **Beperkt bewijs**. Zo ziet een lid overal dezelfde drie woorden.

- Het niveau gaat over het **centrale advies** van het artikel, niet over elk
  punt apart. Twijfel per punt blijft staan in "Wat dit niet laat zien".
- Het staat **naast** de labels Veelbelovend en Experimenteel, en vervangt ze
  niet. Die afspraak is al gemaakt bij de trainingsmethodes
  ([trainingsmethodes-onderzoek](trainingsmethodes-onderzoek-2026-10-16.md)): het
  niveau zegt hoeveel en hoe goed onderzoek er is, het label of het effect op
  prestatie al vaststaat.
- Een **eigen keuze van ZWB** (een grens, een frequentie, een vertaling naar een
  workout) telt niet mee voor het niveau. Die staat al als beperking bij het
  artikel.

## Criteria

| Niveau | Wanneer |
|---|---|
| **Sterk** | Een consensusstuk, richtlijn of position stand die het advies direct onderbouwt, of meerdere meta-analyses die het eens zijn. Gedaan bij duursporters, of bij sporters in het algemeen. |
| **Matig** | Een meta-analyse of systematische review, of meerdere gecontroleerde studies in dezelfde richting. Maar klein, kort, grotendeels van één onderzoeksgroep, of met tegenstrijdige uitkomsten. |
| **Beperkt** | Eén of enkele kleine studies, alleen metingen binnen één sessie of alleen het mechanisme, of een advies dat vooral is afgeleid. |

Twee regels die een niveau begrenzen:

1. **Alleen een tussenmaat**, zoals eiwitaanmaak, een bloedwaarde of tijd bij
   VO2max, en geen prestatie of gezondheid: **hooguit matig**.
2. **Niet bij duursporters onderzocht** (alleen bij niet-sporters, of alleen in
   krachttests): **hooguit matig**.

## Hoe beoordeeld

- Op de bronnen die nu bij elk artikel in de app staan, met de soort (consensus,
  review, studie, richtlijn) en de beperkingen die het artikel zelf noemt.
- Daarnaast de oordelen uit de [wetenschappelijke toets](wetenschappelijke-toets.md)
  en de niveaus van de protocollen die naar een artikel verwijzen.
- Er is **niet opnieuw gezocht**, en de bronnen zijn voor dit document niet
  opnieuw gelezen. Het is een indeling van wat er al staat, geen nieuwe toets.

## Besluiten van de eigenaar (2026-10-17)

1. **Afgeraden.** *Wat niet werkt*, *Ketonen* en *Low-carb en keto* raden iets
   af. Ze krijgen geen niveau maar het label **Afgeraden**. Een niveau leest
   daar verkeerd: "Ketonen — Sterk bewijs" zou je lezen als "ketonen werken".
   Twee meta-analyses vonden juist geen effect.
2. **Lage cadans.** Het artikel staat op *beperkt*: het positieve effect rust op
   één proef bij 24 jonge vrouwen, de systematische review vond "geen sterk
   bewijs", en een torque-proef vond niets. Het protocol `lage-cadans-vo2max`
   ging daarom ook van *matig* naar *beperkt*.
3. **Voor de rit.** Het artikel staat op *sterk*, het protocol Koolhydraten
   laden blijft op *matig*. Het protocol gaat over één precies schema (36–48
   uur, 10–12 g/kg), niet over stapelen als zodanig.

## Per artikel

### Trainen (20)

| Artikel | Niveau | Waarom |
|---|---|---|
| Lage cadans | **Beperkt** | Eén positieve proef (jonge vrouwen), een review zonder sterk bewijs, een negatieve proef. Zie punt 2. |
| Zones: een afspraak, geen grens in je lijf | **Matig** | Meerdere studies laten hetzelfde zien: FTP valt niet samen met de drempel, en een vaste procent geeft per persoon iets anders. Wel klein, en vooral bij mannen. De ZWB-zones zelf zijn een afspraak. |
| Lange ritten en duurvermogen | **Beperkt** | Dat duurvermogen telt, is goed beschreven. Hoe je het traint, is nauwelijks in proeven getest, en dat is het advies. Gelijk aan het protocol Duurtest. |
| Korte intervallen (30/15) | **Matig** | Gecontroleerde proeven bij fietsers, maar klein en vrijwel allemaal van één groep. Een meta-analyse ziet geen duidelijk winnende lengte. |
| Intervallen: tempo, drempel, VO2max en anaeroob | **Matig** | Meerdere meta-analyses die het eens zijn: intervallen geven iets meer VO2max dan alleen duur, en geen vorm wint duidelijk. Maar vooral bij niet of matig getrainde mensen, en vooral op VO2max (regel 1). Tempo en sweet spot rusten op twee blokweekproeven van één groep. Toegevoegd 2026-10-17 op verzoek van de eigenaar, zodat de gewone intervalworkouts in de bibliotheek een niveau krijgen; het niveau is dezelfde dag door de eigenaar goedgekeurd. |
| Gepolariseerd of piramidaal | **Sterk** | Twee meta-analyses, waaronder een op individuele deelnemersdata, komen allebei uit op weinig of geen verschil. |
| Rustige ritten rustig | **Matig** | Hoe goed getrainde renners hun tijd verdelen, is goed beschreven. Het advies om tempo apart te plannen is een vuistregel van coaches, met een paar kleine proeven, deels bij lopers. |
| Je FTP: wat de test meet | **Matig** | Veel studies naar betrouwbaarheid en geldigheid, die het eens zijn. Wel klein en vooral bij getrainde mannen; geen meta-analyse. |
| Opbouwen: hoe snel mag het? | **Matig** | Een gecontroleerde proef, cohortstudies en reviews, maar bijna alles bij hardlopers. |
| Warming-up | **Matig** | Een meta-analyse (35 studies) en een paar proeven bij fietsers, allemaal in een lab bij mannen. |
| Taper naar een wedstrijd | **Sterk** | Twee meta-analyses die het eens zijn, plus een proef bij elite-fietsers. |
| Herstel meten: HRV, rusthartslag en slaap | **Matig** | Reviews en kleine proeven bij fietsers. De winst van sturen op HRV is bescheiden. |
| Hittetraining | **Sterk** | Een consensusstuk, een review en veel proeven. Het deel over hemoglobine is *matig*, net als het protocol Hitte lang. |
| Ademspiertraining | **Matig** | Meta-analyses en proeven bij fietsers, maar een proef met placebo vond geen winst. Gelijk aan het protocol en de toets. |
| Koud water na de training | **Matig** | Eén meta-analyse. Het deel over duurtraining is dun, zeker op lange termijn. |
| Blokweken *(veelbelovend)* | **Matig** | Proeven bij fietsers en een meta-analyse, maar één onderzoeksgroep en een meta-analyse van matige kwaliteit. Gelijk aan de protocollen. |
| VO2max met wisselend vermogen *(experimenteel)* | **Beperkt** | Alleen metingen binnen één sessie (tijd bij VO2max, een tussenmaat). Of het over weken meer oplevert, is niet getest. |
| Sprints als onderhoud *(veelbelovend)* | **Beperkt** | Een paar kleine proeven, vooral bij elite-renners; geen meta-analyse. |
| Brain endurance training *(experimenteel)* | **Beperkt** | Kleine studies van grotendeels dezelfde onderzoekers; zekerheid zeer laag tot matig. Gelijk aan het protocol. |
| Trainen met bloedstroombeperking *(experimenteel)* | **Beperkt** | Twee meta-analyses spreken elkaar tegen, en er is één kleine proef bij fietsers. |

### Voeding (25)

| Artikel | Niveau | Waarom |
|---|---|---|
| Brandstof volgens de training | **Sterk** | Het UCI-consensusstuk en het ACSM-standpunt. De banden per dagtype zijn niet apart getest; dat staat al in de beperkingen. |
| Voor de rit en koolhydraatstapelen | **Sterk** | Consensusstukken (UCI, ACSM, ISSN). Zie punt 3. |
| Koolhydraten tijdens de rit | **Sterk** | Het UCI-consensusstuk, reviews en proeven met gelabelde koolhydraten. Het deel boven 90 g per uur is dunner; dat staat al in het artikel. |
| Darmtraining en maagklachten | **Matig** | Een position statement en reviews, maar kleine, korte proeven tot 90 g per uur. Gelijk aan het protocol Darmtraining; *Darmtraining 150* blijft *beperkt*. |
| Vocht en zout | **Sterk** | Consensusstukken en een meta-analyse over drinken op dorst. |
| Indoor fietsen en Zwift | **Beperkt** | Nauwelijks studies bij Zwift-races. Het advies is afgeleid van buitenwedstrijden en een UCI-review. |
| Eiwit | **Matig** | Gedragen door consensusstukken, maar het bewijs meet vooral eiwitaanmaak (een tussenmaat), niet of je sneller wordt. |
| Herstel tussen sessies | **Matig** | Consensus over snel aanvullen, maar de rol van eiwit erbij rust op twee proeven die elkaar tegenspreken. Gelijk aan het protocol Herstel na wedstrijd. |
| Genoeg eten: energiebeschikbaarheid en REDs | **Sterk** | Het IOC-consensusstuk van 2023 en het UCI-stuk. |
| Vrouwen en voeding | **Matig** | Een ISSN-standpunt en een meta-analyse over de cyclusfase, maar die noemt de kwaliteit van de studies zelf laag. |
| IJzer | **Matig** | Een review en een gecontroleerde proef, die niet bij sporters was. Bloed laten prikken voor je suppleert is gewone medische praktijk. |
| Botgezondheid | **Matig** | De UCI-review en het IOC-stuk. Het voedingsadvies is afgeleid, en de studie naar een calciumrijke maaltijd mat alleen bloedwaarden. |
| Weerstand en ziek zijn | **Matig** | Een UCI-review en Cochrane-reviews, maar die gaan over mensen onder zware belasting in het algemeen, niet over renners. |
| Ouder worden als renner | **Matig** | Consistente reviews, maar vooral bij oudere niet-sporters. |
| Supplementen en sportvoeding | **Sterk** | Het IOC-consensusstuk en het AIS-framework. Per supplement geeft het protocol het niveau (cafeïne *sterk*, nitraat *matig*, enzovoort). |
| Kersensap en andere polyfenolen | **Matig** | Meta-analyses met lage tot matige zekerheid, deels betaald door de industrie. Gelijk aan het protocol. |
| Collageen en gelatine | **Beperkt** | Kleine studies met tegenstrijdige uitkomsten, geen bij wielrenners. Gelijk aan het protocol. |
| Vitamine D | **Matig** | Een richtlijn van de Gezondheidsraad (gezondheid), en reviews: alleen winst voor prestatie bij een tekort. Gelijk aan het protocol. |
| Visolie en omega-3 | **Beperkt** | Voor prestatie vooral mechanisme en kleine studies, zelden bij fietsers. |
| Probiotica | **Beperkt** | Een ISSN-standpunt, maar elk effect hangt af van de stam, en de studies zijn klein en wisselend. |
| Mondspoelen met koolhydraten of menthol | **Matig** | Twee meta-analyses, met een klein effect dat afhangt van de situatie. |
| Wat niet werkt | **Afgeraden** | Een Cochrane-review over magnesium, reviews over BCAA's en CBD, en een proef over vitamine C en E. Gemengd per middel. |
| Ketonen | **Afgeraden** | Twee meta-analyses vonden geen effect op prestatie. Het herstelonderzoek is één groep. |
| Low-carb en keto | **Afgeraden** | Eén sterke proef, maar bij snelwandelaars, plus een UCI-review. |
| Gezonde basis | **Sterk** | De Richtlijnen goede voeding van de Gezondheidsraad. Die gaan over gezondheid, niet over prestatie; dat staat in de beperkingen. |

### Core & mobiliteit (12)

| Artikel | Niveau | Waarom |
|---|---|---|
| Maakt zwaar krachtwerk je sneller op de fiets? | **Matig** | Een meta-analyse van 17 studies en proeven bij fietsers, maar de meta-analyse noemt de zekerheid zelf laag. |
| Het gymprogramma: opbouw in drie blokken | **Beperkt** | Het precieze schema komt uit het werk van één onderzoeksgroep. Zwaar krachtwerk als zodanig is *matig* (zie hierboven). |
| Kracht vasthouden in het seizoen | **Matig** | Eén kleine proef bij fietsers (zes per groep), maar een review over onderhoud in het algemeen wijst dezelfde kant op. |
| Thuis met lichtere gewichten | **Matig** | Meta-analyses en het ACSM-standpunt, maar geen wielrenners, en de effecten zijn op kracht en spier gemeten. |
| Kracht en fietsen combineren | **Matig** | Meta-analyses over de volgorde, meestal niet bij wielrenners. De rustregels in de app zijn een eigen keuze. |
| Wielrennen en je botten | **Matig** | Een systematische review over lage botdichtheid bij renners, en een meta-analyse over springen bij volwassenen. Bij renners zelf is er één studie, met collageen erbij. |
| Lage rugpijn bij wielrenners | **Beperkt** | Kleine vergelijkende studies; drie kleine studies naar een bikefit. Of de series rugpijn voorkomen, is niet onderzocht. |
| Wat core-training wel en niet doet | **Matig** | Eén meta-analyse (22 studies), maar niet bij wielrenners. Het artikel zegt al dat er geen bewijs is voor extra watt. |
| Kracht op de fiets | **Beperkt** | Eén onderzoeksgroep, alleen mannen, buiten op een helling. Gelijk aan het protocol. |
| Kracht als je ouder wordt | **Matig** | Het ACSM-standpunt, plus één niet volledig gerandomiseerde studie bij masters. |
| Rekken vlak voor de rit | **Matig** | Meerdere meta-analyses, maar over krachttests en sprongen, niet over fietsen (regel 2). |
| Stijve hamstrings en rugpijn | **Beperkt** | Eén systematische review van cohortstudies, met een klein verband, niet bij wielrenners. |

## Telling

| | Sterk | Matig | Beperkt | Afgeraden |
|---|---|---|---|---|
| Trainen | 3 | 11 | 6 | – |
| Voeding | 7 | 11 | 4 | 3 |
| Core & mobiliteit | – | 8 | 4 | – |
| **Totaal (57)** | **10** | **30** | **14** | **3** |

Kracht heeft geen *sterk*, omdat bijna al het bewijs klein is of niet bij
wielrenners is gedaan. Dat klopt met de toets van fase 4.

## Waar het staat

- **Op elk artikel**, onder de samenvatting, naast Veelbelovend of
  Experimenteel.
- **In de drie kennisbanklijsten**, achter de titel, met een korte legenda
  bovenaan. De legenda toont alleen de niveaus die in die kennisbank voorkomen.
- **In ZWBieb**: in de leeszaal, met legenda en zoeken op niveau, en bij een
  onderwerp in het blok "In de leeszaal".
- **In de coachchat**: elk artikel gaat met zijn niveau mee. De coach zegt erbij
  als zijn antwoord op beperkt bewijs steunt, en raadt een afgeraden middel af.
- **Op `/hulp`**: de criteria in het kort.
