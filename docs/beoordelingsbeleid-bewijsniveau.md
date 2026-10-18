# Beoordelingsbeleid: het bewijsniveau van een kennisartikel

**Voorstel 2026-10-18, wacht op akkoord van de eigenaar.** Nog niets van dit
document is gebouwd. Na akkoord vervangt het de criteria in
[bewijsniveau-kennisbank](bewijsniveau-kennisbank.md) en de paragraaf
"Bewijsniveau bij materiaal" in
[materiaal-onderzoek](materiaal-onderzoek-2026-10-17.md). Tot die tijd houden de
tests de niveaus gelijk aan die twee documenten.

De eigenaar vroeg op 2026-10-18 om één beleid voor alle kennisbanken: gelijk
bewijs krijgt overal hetzelfde niveau. Twee dingen zaten niet goed:

- **"Matig" en "beperkt" klinken negatiever dan ze bedoeld zijn.** Ze zeggen wat
  er ontbreekt, niet wat er bekend is.
- **"Veelbelovend" en "experimenteel" klinken positiever dan het niveau.** Een
  blokweek is "Matig bewijs" en "Veelbelovend" tegelijk; dat tweede woord geeft
  een oordeel dat de schaal al geeft.

Daarnaast golden de ruimere regels van materiaal (metingen tellen, sterk ook via
onafhankelijke groepen, geen "Afgeraden") tot nu toe alleen daar. Dit document
trekt dat gelijk, legt het beleid vast voor nieuwe artikelen en de
[kennisbank-scan](../.claude/skills/kennisbank-scan/SKILL.md), en legt alle 73
artikelen er opnieuw langs.

## Kort: wat er verandert

1. **Nieuwe woorden**, één schaal die zegt wat er bekend is: *Stevig
   onderbouwd*, *Onderbouwd* en *Eerste aanwijzingen*.
2. **"Nieuwe methode"** vervangt Veelbelovend en Experimenteel. Het zegt alleen:
   dit is geen standaardtraining. Het oordeel zit in het niveau ernaast.
3. **"Geen effect" in de badge** bij een artikel waarvan de conclusie is dat iets
   niet helpt, bijvoorbeeld *Stevig onderbouwd: geen effect*. "Afgeraden"
   verdwijnt.
4. **Eén set criteria voor alle kennisbanken**, met de regels van materiaal en een
   paar regels die tot nu toe impliciet bleven (zie "Begrenzingen").
5. **Zeven artikelen krijgen een ander niveau**: zes omhoog, één omlaag. Zes
   artikelen krijgen de vorm "geen effect". Zie "Herbeoordeling".

**Twee punten om over te beslissen** staan in "Open punten voor de eigenaar",
onderaan.

## De schaal

| Niveau | Wat het zegt | Sleutel in code |
|---|---|---|
| **Stevig onderbouwd** | Consensus, meta-analyses, of meerdere onafhankelijke groepen die het eens zijn. | `sterk` |
| **Onderbouwd** | Meerdere studies in dezelfde richting, maar klein of van één groep. | `matig` |
| **Eerste aanwijzingen** | Een paar kleine studies, of het mechanisme klopt. | `beperkt` |

De sleutels in code blijven `sterk`, `matig` en `beperkt`. Alleen de getoonde
tekst verandert. Dat houdt de bouwronde klein en er is geen migratie voor nodig:
niveaus staan in code, niet in de database. De protocollen
(`PROTOCOL_EVIDENCE`) gebruiken dezelfde drie woorden.

## Wanneer welk niveau

Het niveau gaat over het **kernadvies**: wat een lid onthoudt uit de titel en de
samenvatting. Twijfel per punt hoort in "Wat dit niet laat zien".

### Stevig onderbouwd

Eén van deze drie routes, en geen begrenzing die het lager zet:

1. **Een consensusstuk, richtlijn of position stand** die het kernadvies zelf
   aanbeveelt. Zegt het stuk dat het bewijs beperkt of wisselend is, dan telt dat
   oordeel, niet het feit dat het een consensusstuk is.
2. **Meerdere meta-analyses die het eens zijn.**
3. **Minstens drie onafhankelijke onderzoeksgroepen** waarvan de proeven of
   metingen met renners of duursporters het eens zijn, in de situatie van het
   advies. Dit was tot nu toe alleen de regel bij materiaal.

### Onderbouwd

- Een meta-analyse of review, of minstens twee gecontroleerde studies, in
  dezelfde richting, op de uitkomst waar het advies over gaat.
- Maar klein, kort, grotendeels van één of twee groepen, of bij een smalle groep
  renners.
- Ook: alles wat volgens de routes hierboven stevig zou zijn, maar waar een
  begrenzing geldt.

### Eerste aanwijzingen

- Eén gecontroleerde studie, of een paar kleine studies.
- Alleen metingen binnen één sessie, alleen het mechanisme, of alleen een
  verband (een cohort- of vergelijkende studie) terwijl het advies over oorzaak
  en gevolg gaat.
- Een advies dat vooral is afgeleid uit ander onderzoek.
- Of studies van vergelijkbare kwaliteit die elkaar tegenspreken.

## Begrenzingen

Geldt er meer dan één, dan wint de laagste.

| # | Wanneer | Hooguit |
|---|---|---|
| 1 | **Alleen een tussenmaat** (eiwitaanmaak, een bloedwaarde, tijd bij VO2max, een krachttest), geen prestatie, gezondheid of klacht. | Onderbouwd |
| 2 | **Niet bij duursporters onderzocht**, terwijl het advies over sport gaat (prestatie, herstel, blessures). Een gezondheidsrichtlijn voor de hele bevolking valt hier niet onder: renners horen bij die bevolking. | Onderbouwd |
| 3 | **Alleen op een pop, een testbank of in een computermodel**, zonder metingen met renners. | Onderbouwd |
| 4 | **De meta-analyse noemt de zekerheid zelf laag.** Bij *zeer laag*, in de situatie van het advies: | Onderbouwd; Eerste aanwijzingen |
| 5 | **De best gecontroleerde studie** (met placebo of blind) vindt niets, terwijl zwakkere studies wel een effect zien. | Onderbouwd |
| 6 | **Studies van vergelijkbare kwaliteit spreken elkaar tegen.** Zijn de betere studies het eens, dan telt hun richting en staat de tegenspraak in het artikel. | Eerste aanwijzingen |

Regel 1, 2 en 3 stonden al in het beleid (3 alleen bij materiaal). Regel 4, 5 en
6 zijn nieuw opgeschreven, maar werden al zo toegepast: bij *Maakt zwaar
krachtwerk je sneller op de fiets?* (4), *Ademspiertraining* (5) en
*Trainen met bloedstroombeperking* (6).

## Wat telt als bron

De soorten zijn die in `EVIDENCE_KINDS` (`src/lib/nutrition/library.ts`), voor
alle kennisbanken gelijk:

| Soort | Wat | Telt mee voor |
|---|---|---|
| **Consensus** | Consensusstuk of position stand van een vakorganisatie (IOC, UCI, ACSM, ISSN). | Route 1 |
| **Richtlijn** | Richtlijn van een overheid of instituut (Gezondheidsraad, AIS). | Route 1 |
| **Review** | Systematische review, meta-analyse, of een overzicht dat veel studies samenvat. | Route 2 (alleen meta-analyses); Onderbouwd |
| **Studie** | Een gecontroleerde proef, cohortstudie of vergelijkende studie met mensen. | Route 3; Onderbouwd; Eerste aanwijzingen |
| **Meting** | Een gepubliceerde meting in een windtunnel, op een testbank of in het veld. | Route 3 (alleen met renners); anders begrenzing 3 |

Daarbij:

- **Alleen gepubliceerd en door vakgenoten beoordeeld.** Tests van fabrikanten,
  testsites en preprints tellen niet. Ze mogen wel als achtergrond in het artikel
  staan, met die beperking erbij.
- **Onafhankelijk** betekent: geen gedeelde auteurs of onderzoeksgroep. Dezelfde
  groep met nieuwe co-auteurs telt als één groep.
- **Een berekening met een rekenmodel** krijgt het niveau van dat model. Het model
  van Martin (1998) is door drie groepen tegen metingen getoetst, dus een
  berekening ermee is stevig onderbouwd, zolang het artikel zegt onder welke
  omstandigheden (snelheid, alleen of in een groep, wegdek).
- **Een eigen keuze van ZWB** (een grens, een frequentie, een vertaling naar een
  workout) telt niet mee voor het niveau. Die staat als beperking bij het
  artikel.

## De conclusie "geen effect"

Een niveau zegt hoe zeker we zijn van de conclusie, ook als die conclusie is dat
iets niet helpt. Zonder meer leest "Ketonen — Stevig onderbouwd" als "ketonen
werken". Daarom staat de conclusie dan in de badge:

> **Stevig onderbouwd: geen effect**

- **Wanneer:** het kernadvies is dat een middel, product of aanpak niet doet
  waarvoor mensen het gebruiken, en dat is ook onderzocht.
- **Niet bij "niet onderzocht".** Ontbreekt het onderzoek, dan is dat geen bewijs
  dat iets niet werkt. Zo'n artikel (aero-sokken, visolie voor prestatie) krijgt
  een gewoon niveau, en de samenvatting zegt dat het niet is aangetoond.
- **Niet bij een keuze tussen twee dingen die allebei werken**, zoals
  gepolariseerd of piramidaal trainen of de lengte van je cranks. "Geen effect"
  zou daar lezen alsof trainen of cranks niets doen.
- **"Afgeraden" verdwijnt** als niveau, ook bij voeding. Wat zwak is aan het
  onderzoek, staat in het artikel. Dat besloot de eigenaar al voor materiaal
  (2026-10-18).
- De coach raadt een middel met "geen effect" niet aan als iets wat helpt.

Nu voor zes artikelen: *Wat niet werkt*, *Ketonen*, *Low-carb en keto*,
*Neusstrips*, *Compressiekleding* en *Inlegzolen*. Bij *Low-carb en keto* is de
conclusie strenger dan "geen effect"; zie open punt 1.

## Nieuwe methode

**"Nieuwe methode"** vervangt Veelbelovend en Experimenteel. Het zegt alleen dat
iets geen standaardtraining is: een methode uit recent onderzoek die nog geen
vast onderdeel is van een gewoon trainingsschema. Hoe goed hij onderbouwd is,
zegt het bewijsniveau ernaast.

- **Waar:** bij workouts, protocollen en de vijf kennisartikelen die nu een label
  hebben (*Blokweken*, *VO2max met wisselend vermogen*, *Sprints als
  onderhoud*, *Brain endurance training*, *Trainen met bloedstroombeperking*).
  Op een artikel zegt het hetzelfde als op de workout; daarom blijft het daar
  ook.
- **Eén uiterlijk:** neutraal, zonder groene of oranje kleur en zonder icoon dat
  iets belooft. De twee kleuren en iconen nu zijn juist het oordeel dat weg moet.
- **Data blijft zoals hij is.** De kolom `method_label` en migratie `0246`
  houden de waarden `veelbelovend` en `experimenteel`; beide tonen "Nieuwe
  methode". Een migratie die alles naar één waarde zet, levert niets op en kan
  op productie niet lokaal getest worden. De AI-coach en de regelmotor blijven
  die waarden gebruiken; de prompt zegt al dat het label niet in titel of
  beschrijving hoort.
- **Naar intervals.icu** gaat "Nieuwe methode." vooraan in de beschrijving, in
  plaats van "Veelbelovend." of "Experimenteel.".

Het onderscheid tussen veelbelovend en experimenteel gaat niet verloren: het zit
in het niveau. De blokweken zijn *Onderbouwd*, de VO2max-varianten met wisselend
vermogen *Eerste aanwijzingen*.

## Protocollen

Protocollen gebruiken dezelfde schaal en dezelfde regels. Een protocol dat bij
een artikel hoort, krijgt **hooguit** het niveau van dat artikel. Het mag lager
zijn als het protocol een precies schema voorschrijft dat zelf minder getest is:
*Voor de rit* is stevig onderbouwd, het protocol *Koolhydraten laden* (36–48 uur,
10–12 g/kg) onderbouwd (besluit eigenaar, 2026-10-17). Dezelfde verhouding geldt
nu voor *Darmtraining* en *Herstel tussen sessies*, die omhoog gaan terwijl hun
protocollen blijven.

Eén protocol verandert mee: **Kracht op de fiets** gaat van Eerste aanwijzingen
naar **Onderbouwd**, gelijk aan zijn artikel. De overige protocollen zijn in deze
ronde niet opnieuw beoordeeld; zie "Bewust niet".

## Werkwijze voor een nieuw artikel

Dit is wat de [kennisbank-scan](../.claude/skills/kennisbank-scan/SKILL.md) en
iedereen die een artikel schrijft, volgt.

1. **Schrijf het kernadvies in één zin**, zoals in de samenvatting. Is de
   conclusie dat iets niet helpt, en is dat onderzocht, noteer dan "geen effect".
2. **Bepaal per bron** de soort, de groep (wie zijn de auteurs), de populatie, de
   uitkomst en de situatie. Telt de bron voor het kernadvies, of alleen voor een
   punt?
3. **Kies het hoogste niveau** waarvan de voorwaarden gelden.
4. **Pas de begrenzingen toe.** De laagste wint.
5. **Haal eigen keuzes van ZWB eruit** en zet ze bij de beperkingen.
6. **Vergelijk met een ijkpunt** hieronder. Lijkt het bewijs op dat van een
   artikel met een ander niveau, dan is een van de twee fout.
7. **Schrijf de reden** in één of twee zinnen in de tabel, met de bronnen kort
   genoemd. De tabel gaat vóór de code; de test eist dat ze gelijk zijn.
8. **Hoort er een protocol bij**, controleer dan dat het protocol niet hoger staat
   dan het artikel.

Een ander niveau voor een bestaand artikel is een voorstel onder **Label** in de
maandelijkse scan, en pas na akkoord een wijziging in deze tabel en de code.

### IJkpunten

| Niveau | Artikel | Waarom het een goed voorbeeld is |
|---|---|---|
| Stevig, route 1 | *Brandstof volgens de training* | Het UCI-consensusstuk beveelt het kernadvies zelf aan. |
| Stevig, route 2 | *Taper naar een wedstrijd* | Twee meta-analyses die het eens zijn. |
| Stevig, route 3 | *Klopt je vermogensmeter?* | Veel onafhankelijke validatiestudies met renners. |
| Stevig, geen effect | *Ketonen* | Twee meta-analyses vonden geen effect op prestatie. |
| Onderbouwd, één groep | *Korte intervallen (30/15)* | Twee proeven bij fietsers, allebei van één groep. |
| Onderbouwd, begrenzing 1 | *Eiwit* | Consensus, maar het bewijs meet eiwitaanmaak. |
| Onderbouwd, begrenzing 3 | *Helm* | Vooral een pop, een testhoofd of een model. |
| Eerste aanwijzingen, tegenspraak | *Lage cadans* | Eén positieve proef, een negatieve proef, een review zonder sterk bewijs. |
| Eerste aanwijzingen, één sessie | *VO2max met wisselend vermogen* | Alleen metingen binnen één sessie. |
| Eerste aanwijzingen, afgeleid | *Indoor fietsen en Zwift* | Afgeleid van buitenwedstrijden. |

## Herbeoordeling per artikel

Alle 73 artikelen langs de regels hierboven. "Nu" is het goedgekeurde niveau,
in de oude woorden. In de kolom "Wijziging": **↑** of **↓** is een ander niveau,
**vorm** is de conclusie "geen effect", **label** is "Nieuwe methode" in plaats
van Veelbelovend of Experimenteel. Een leeg vak: alleen de nieuwe woorden.

### Trainen (20)

| Artikel | Nu | Voorstel | Wijziging | Waarom |
|---|---|---|---|---|
| Lage cadans | Beperkt | **Eerste aanwijzingen** | | Eén positieve proef bij jonge vrouwen, een review zonder sterk bewijs en een negatieve torque-proef: tegenspraak (begrenzing 6). |
| Zones: een afspraak, geen grens in je lijf | Matig | **Stevig onderbouwd** | **↑** | Route 3: minstens vijf onafhankelijke groepen (Iannetta en Inglis, Jamnick, Borszcz, Wong, Denham) laten zien dat een vaste procent van je FTP per renner iets anders betekent. Klein en vooral bij mannen, net als bij de vermogensmeter. De ZWB-zones zelf zijn een afspraak en tellen niet mee. |
| Lange ritten en duurvermogen | Beperkt | **Eerste aanwijzingen** | | Dat duurvermogen telt, beschrijven meerdere groepen. Hoe je het traint, en dat is het advies, is nauwelijks in proeven getest. Gelijk aan het protocol Duurtest. |
| Korte intervallen (30/15) | Matig | **Onderbouwd** | | Twee gecontroleerde proeven bij fietsers, allebei van één groep; de andere studies meten binnen één sessie. |
| Intervallen: tempo, drempel, VO2max en anaeroob | Matig | **Onderbouwd** | | Meerdere meta-analyses die het eens zijn, maar vooral op VO2max (begrenzing 1) en bij niet of matig getrainde mensen. |
| Gepolariseerd of piramidaal | Sterk | **Stevig onderbouwd** | | Twee meta-analyses komen uit op weinig of geen verschil. Geen vorm "geen effect": beide verdelingen werken. |
| Rustige ritten rustig | Matig | **Onderbouwd** | | Hoe getrainde renners hun tijd verdelen, is goed beschreven; dat tempo op een rustige dag de harde dag schaadt, rust op een paar proeven, deels bij lopers. |
| Je FTP: wat de test meet | Matig | **Stevig onderbouwd** | **↑** | Route 3: minstens vijf onafhankelijke groepen (Borszcz en Costa, Inglis en Murias, Valenzuela, Wong en Hopker, McGrath, Karsten) zijn het eens dat de test goed herhaalbaar is maar je drempel per renner een paar procent mist. Geen tussenmaat: het artikel gaat over wat de test meet. |
| Opbouwen: hoe snel mag het? | Matig | **Eerste aanwijzingen** | **↓** | Dat geleidelijk opbouwen helpt, rust op verbanden uit cohortstudies; de enige gecontroleerde proef vond geen effect, en de systematische review noemt het bewijs beperkt. Bijna alles bij hardlopers. |
| Warming-up | Matig | **Onderbouwd** | | Een meta-analyse en proeven bij fietsers, maar over twintig minuten spreken twee proeven elkaar tegen (Barranco-Gil tegen Tramontin). |
| Taper naar een wedstrijd | Sterk | **Stevig onderbouwd** | | Twee meta-analyses die het eens zijn, plus een proef bij elite-fietsers. |
| Herstel meten: HRV, rusthartslag en slaap | Matig | **Onderbouwd** | | Kleine proeven bij fietsers en reviews, met een bescheiden winst. De aanpak met een weekgemiddelde komt grotendeels uit één kring onderzoekers. |
| Hittetraining | Sterk | **Stevig onderbouwd** | | Een consensusstuk voor acclimatisatie. Het deel over hemoglobine is onderbouwd, net als het protocol Hitte lang; dat staat in het artikel. |
| Ademspiertraining | Matig | **Onderbouwd** | | Meta-analyses vinden winst, maar de proef met een nep-ademtrainer vond niets (begrenzing 5). |
| Koud water na de training | Matig | **Onderbouwd** | | Eén meta-analyse en een review; het deel over duurtraining is dun. |
| Blokweken | Matig | **Onderbouwd** | label | Proeven bij fietsers en een meta-analyse van matige kwaliteit, bijna alles van één groep. |
| VO2max met wisselend vermogen | Beperkt | **Eerste aanwijzingen** | label | Alleen metingen binnen één sessie (tijd bij VO2max, een tussenmaat). |
| Sprints als onderhoud | Beperkt | **Eerste aanwijzingen** | label | Per situatie (een drukke week, na het seizoen) één kleine proef, vooral bij elite-renners. |
| Brain endurance training | Beperkt | **Eerste aanwijzingen** | label | Kleine studies van grotendeels dezelfde onderzoekers; wie fris begint, zoals in een wedstrijd, heeft een onzeker effect (begrenzing 4, zeer laag). |
| Trainen met bloedstroombeperking | Beperkt | **Eerste aanwijzingen** | label | Twee meta-analyses spreken elkaar tegen, en er is één kleine proef bij fietsers (begrenzing 6). |

### Voeding (25)

| Artikel | Nu | Voorstel | Wijziging | Waarom |
|---|---|---|---|---|
| Brandstof volgens de training | Sterk | **Stevig onderbouwd** | | Het UCI-consensusstuk en het ACSM-standpunt. De banden per dagtype zijn niet apart getest; dat staat in de beperkingen. |
| Voor de rit en koolhydraatstapelen | Sterk | **Stevig onderbouwd** | | Consensusstukken (UCI, ACSM, ISSN). Het protocol Koolhydraten laden blijft onderbouwd. |
| Koolhydraten tijdens de rit | Sterk | **Stevig onderbouwd** | | Het UCI-consensusstuk, reviews en proeven met gelabelde koolhydraten. Boven 90 g per uur is dunner; dat staat in het artikel. |
| Darmtraining en maagklachten | Matig | **Stevig onderbouwd** | **↑** | Route 1: het position statement van Sports Dietitians Australia en de Ultra Sports Science Foundation (2025) rekent darmtraining tot de aanpakken met "mostly consistent beneficial outcomes" tegen maagklachten (nagekeken in PubMed, zie "Hoe beoordeeld"). Het gaat om klachten, niet om prestatie, en het stuk komt grotendeels van de groep die de proeven deed; dat hoort in de beperkingen. De protocollen blijven: *Darmtraining* onderbouwd, *Darmtraining 150* eerste aanwijzingen. |
| Vocht en zout | Sterk | **Stevig onderbouwd** | | Consensusstukken en een meta-analyse over drinken op dorst. |
| Indoor fietsen en Zwift | Beperkt | **Eerste aanwijzingen** | | Afgeleid van buitenwedstrijden en een UCI-review. |
| Eiwit | Matig | **Onderbouwd** | | Consensus, maar het bewijs meet vooral eiwitaanmaak (begrenzing 1). |
| Herstel tussen sessies | Matig | **Stevig onderbouwd** | **↑** | Route 1: dat snel aanvullen telt als je binnen ongeveer acht uur weer zwaar traint, en anders het dagtotaal, staat in het UCI-, ACSM- en ISSN-stuk. Eiwit erbij is een punt in het artikel en geen kernadvies; daar spreken twee proeven elkaar tegen. Het protocol Herstel na wedstrijd blijft onderbouwd, zoals bij *Voor de rit*. |
| Genoeg eten: energiebeschikbaarheid en REDs | Sterk | **Stevig onderbouwd** | | Het IOC-consensusstuk van 2023 en het UCI-stuk. |
| Vrouwen en voeding | Matig | **Onderbouwd** | | IJzer en energie staan in consensusstukken, maar de boodschap over de cyclusfase rust op een meta-analyse die de studies zelf van lage kwaliteit noemt (begrenzing 4) en één proef. |
| IJzer | Matig | **Onderbouwd** | | Een review van het onderzoek bij sporters en een gecontroleerde proef over de dosering, die niet bij sporters was. |
| Botgezondheid | Matig | **Onderbouwd** | | De UCI-review en het IOC-stuk beschrijven het probleem; het voedingsadvies is afgeleid, en de maaltijdstudie mat bloedwaarden (begrenzing 1). |
| Weerstand en ziek zijn | Matig | **Onderbouwd** | | Een UCI-review en Cochrane-reviews, maar die gaan over mensen onder zware belasting in het algemeen, niet over renners. |
| Ouder worden als renner | Matig | **Onderbouwd** | | Consistente reviews, vooral bij oudere niet-sporters (begrenzing 2). |
| Supplementen en sportvoeding | Sterk | **Stevig onderbouwd** | | Het IOC-consensusstuk en het AIS-framework. Per supplement geeft het protocol het niveau. |
| Kersensap en andere polyfenolen | Matig | **Onderbouwd** | | Meta-analyses met lage tot matige zekerheid (begrenzing 4), deels betaald door de industrie. |
| Collageen en gelatine | Beperkt | **Eerste aanwijzingen** | | Kleine studies met tegenstrijdige uitkomsten, geen bij wielrenners. |
| Vitamine D | Matig | **Onderbouwd** | | De richtlijn gaat over wie weinig buiten komt; dat wie in de winter binnen traint daaronder valt, is een afleiding. Voor prestatie alleen winst bij een tekort. |
| Visolie en omega-3 | Beperkt | **Eerste aanwijzingen** | | Voor prestatie vooral mechanisme en kleine studies, zelden bij fietsers. Niet onderzocht is geen "geen effect". |
| Probiotica | Beperkt | **Eerste aanwijzingen** | | Het ISSN-standpunt zegt zelf dat het effect per stam verschilt; de studies zijn klein en wisselend. |
| Mondspoelen met koolhydraten of menthol | Matig | **Onderbouwd** | | Per middel één meta-analyse, met een klein effect dat afhangt van de situatie. |
| Wat niet werkt | Afgeraden | **Onderbouwd: geen effect** | **vorm** | Een Cochrane-review over magnesium (vooral bij ouderen, begrenzing 2), reviews over BCAA's (eiwitaanmaak, begrenzing 1) en CBD, en een proef over vitamine C en E. Bij CBD is er geen onderzoek; dat zegt het artikel al. |
| Ketonen | Afgeraden | **Stevig onderbouwd: geen effect** | **vorm** | Route 2: twee meta-analyses vonden geen effect op prestatie. Het herstelonderzoek is één groep; dat staat in het artikel. |
| Low-carb en keto | Afgeraden | **Onderbouwd: nadelig** *(of: geen effect, zie open punt 1)* | **vorm** | Eén sterke proef, bij snelwandelaars van wereldniveau, en een UCI-review die in dezelfde richting wijst; grotendeels van één groep. |
| Gezonde basis | Sterk | **Stevig onderbouwd** | | De Richtlijnen goede voeding. Een gezondheidsrichtlijn voor de hele bevolking, dus begrenzing 2 geldt niet; voor prestatie zegt hij niets, en dat staat in de beperkingen. |

### Core & mobiliteit (12)

| Artikel | Nu | Voorstel | Wijziging | Waarom |
|---|---|---|---|---|
| Maakt zwaar krachtwerk je sneller op de fiets? | Matig | **Onderbouwd** | | Een meta-analyse van 17 studies en proeven bij fietsers, maar de meta-analyse noemt de zekerheid laag (begrenzing 4). |
| Het gymprogramma: opbouw in drie blokken | Beperkt | **Onderbouwd** | **↑** | Het schema is in twee gecontroleerde proeven bij goed getrainde renners getest (Rønnestad 2010, Vikmoen 2017), allebei van één groep. Dat is dezelfde situatie als *Korte intervallen (30/15)*. De afwijkingen in de app (rust, rek in plaats van Smith-machine, twaalf weken) zijn eigen keuzes en tellen niet mee. |
| Kracht vasthouden in het seizoen | Matig | **Onderbouwd** | | Eén kleine proef bij fietsers, plus een review over onderhoud in het algemeen (begrenzing 2) die dezelfde kant op wijst. |
| Thuis met lichtere gewichten | Matig | **Onderbouwd** | | Meta-analyses en het ACSM-standpunt, maar geen wielrenners en alleen kracht en spier (begrenzing 1 en 2). |
| Kracht en fietsen combineren | Matig | **Onderbouwd** | | Meta-analyses over de volgorde, meestal niet bij wielrenners (begrenzing 2). De rustregels zijn een eigen keuze. |
| Wielrennen en je botten | Matig | **Onderbouwd** | | Een systematische review over lage botdichtheid bij renners; dat springen helpt, komt uit een meta-analyse bij volwassenen (begrenzing 2) en één studie bij renners, met collageen erbij. |
| Lage rugpijn bij wielrenners | Beperkt | **Eerste aanwijzingen** | | Kleine vergelijkende studies; of houding de pijn veroorzaakt, laten ze niet zien. Of de series rugpijn voorkomen, is niet onderzocht. |
| Wat core-training wel en niet doet | Matig | **Onderbouwd** | | Eén meta-analyse (22 studies), niet bij wielrenners (begrenzing 2). Dat het geen watt oplevert, is niet aangetoond, dus geen vorm "geen effect". |
| Kracht op de fiets | Beperkt | **Onderbouwd** | **↑** | Drie gecontroleerde proeven bij goed getrainde en profrenners (Valenzuela 2021, Barranco-Gil 2024, Pallarés 2025) in dezelfde richting, uit één Spaans netwerk, alleen mannen. Het protocol gaat mee naar onderbouwd. |
| Kracht als je ouder wordt | Matig | **Onderbouwd** | | Het ACSM-standpunt (begrenzing 2), plus één niet volledig gerandomiseerde studie bij masters. |
| Rekken vlak voor de rit | Matig | **Onderbouwd** | | Meerdere meta-analyses die het eens zijn, maar over krachttests en sprongen, niet over fietsen (begrenzing 1). |
| Stijve hamstrings en rugpijn | Beperkt | **Eerste aanwijzingen** | | Eén systematische review van cohortstudies met een klein verband; het advies gaat over oorzaak en gevolg. |

### Materiaal (16)

De niveaus zijn op 2026-10-18 al langs bijna dezelfde regels gelegd en
veranderen niet. Wel krijgen drie artikelen de vorm "geen effect".

| Artikel | Nu | Voorstel | Wijziging | Waarom |
|---|---|---|---|---|
| Waar je watt heen gaan | Sterk | **Stevig onderbouwd** | | Route 3: het rekenmodel is door drie groepen tegen metingen getoetst. |
| Houding: de grootste winst | Sterk | **Stevig onderbouwd** | | Route 3: metingen met renners van vier groepen zijn het eens. |
| Helm | Matig | **Onderbouwd** | | Eén studie met renners; de rest een pop, testhoofd of model (begrenzing 3). |
| Kleding en pak | Matig | **Onderbouwd** | | Vooral cilinders en poppen (begrenzing 3). |
| Sokken en overschoenen | Beperkt | **Eerste aanwijzingen** | | Eén windtunnelstudie naar schoenen; naar aero-sokken is niets gepubliceerd. Niet onderzocht, dus geen vorm "geen effect". |
| Wielen en frame | Matig | **Onderbouwd** | | Windtunnel aan het wiel, een computermodel en een rekenmodel; geen metingen met renners (begrenzing 3). |
| Banden en bandenspanning | Sterk | **Stevig onderbouwd** | | Route 3: veldmetingen met renners van vier groepen. |
| Ketting en smering | Matig | **Onderbouwd** | | Meerdere onafhankelijke testbanken, maar alleen op een testbank (begrenzing 3). |
| Ventilator bij binnen fietsen | Sterk | **Stevig onderbouwd** | | Route 3: gecontroleerde proeven van vier groepen. |
| Klopt je vermogensmeter? | Sterk | **Stevig onderbouwd** | | Route 3: veel onafhankelijke validatiestudies, en een overzicht van 74 studies. |
| Zadelhoogte, bikefit en schoenplaatjes | Matig | **Onderbouwd** | | Zadelhoogte via de kniehoek is goed onderbouwd; een bikefit als geheel niet. |
| Cranklengte | Sterk | **Stevig onderbouwd** | | Route 3: vijf onafhankelijke proeven. Geen vorm "geen effect": elke gangbare lengte werkt. |
| Gewicht van fiets en uitrusting | Sterk | **Stevig onderbouwd** | | Een berekening met het getoetste rekenmodel. |
| Neusstrips | Matig | **Onderbouwd: geen effect** | **vorm** | Een meta-analyse en een proef bij fietsers vinden geen effect; de meta-analyse bij lopers die een klein voordeel zag, noemt de zekerheid zeer laag. De betere studies zijn het eens (begrenzing 6). |
| Compressiekleding | Sterk | **Stevig onderbouwd: geen effect** | **vorm** | Route 2: meerdere meta-analyses zijn het eens dat je er niet sneller van wordt. |
| Inlegzolen | Matig | **Onderbouwd: geen effect** | **vorm** | Een systematische review en losse proeven, ook met een nepzool, vinden geen winst in vermogen; klein en wisselend van kwaliteit. |

## Telling

| | Stevig onderbouwd | Onderbouwd | Eerste aanwijzingen | Waarvan "geen effect" |
|---|---|---|---|---|
| Trainen (20) | 5 *(was 3)* | 8 *(was 11)* | 7 *(was 6)* | – |
| Voeding (25) | 10 *(was 7)* | 11 *(was 11)* | 4 *(was 4)* | 3 *(waren Afgeraden)* |
| Core & mobiliteit (12) | – | 10 *(was 8)* | 2 *(was 4)* | – |
| Materiaal (16) | 8 | 7 | 1 | 3 |
| **Totaal (73)** | **23** *(was 18)* | **36** *(was 37)* | **14** *(was 15)* | **6** |

**De zeven verschuivingen:**

- **Omhoog door route 3** (onafhankelijke groepen, tot nu toe alleen bij
  materiaal): *Zones* en *Je FTP*. Hun bewijs lijkt op dat van *Klopt je
  vermogensmeter?*, dat al stevig was.
- **Omhoog door route 1** (een consensusstuk dat het kernadvies zelf aanbeveelt):
  *Darmtraining* en *Herstel tussen sessies*. Ze waren lager gezet om gelijk te
  blijven met hun protocol; volgens de regel bij *Voor de rit* mag een protocol
  lager staan dan zijn artikel.
- **Omhoog door de ondergrens van Onderbouwd** (minstens twee gecontroleerde
  studies in dezelfde richting): *Het gymprogramma* en *Kracht op de fiets*.
  Hun bewijs lijkt op dat van *Korte intervallen (30/15)*.
- **Omlaag door verbanden**: *Opbouwen*. Het advies gaat over oorzaak en gevolg,
  en het bewijs is vooral verbanden; de enige proef vond niets.

Kracht heeft nog steeds geen *Stevig onderbouwd*: bijna al het bewijs is klein,
van één groep, of niet bij wielrenners gedaan.

## Wat de bouwronde raakt

Zo is de bouwronde voorspelbaar. Geen migratie, geen database.

### Woorden en badges

- `src/lib/protocols/types.ts`: `PROTOCOL_EVIDENCE_LABELS` naar de nieuwe woorden.
  De artikelen nemen die over.
- `src/lib/knowledge/evidence.ts`:
  - `afgeraden` uit `ARTICLE_EVIDENCE`;
  - een veld voor de conclusie (`geen-effect`, en `nadelig` als open punt 1 zo
    uitvalt), met één functie die de badgetekst maakt ("Stevig onderbouwd: geen
    effect");
  - één legenda voor alle kennisbanken; `MATERIAAL_EVIDENCE_LEGEND` verdwijnt;
  - het commentaar bovenaan.
- `src/lib/training/method-label.ts`: beide waarden tonen "Nieuwe methode"; het
  commentaar; `describeWithMethodLabel` (zie intervals.icu).
- `src/components/evidence-badge.tsx`:
  - de stijl van `afgeraden` eruit, de conclusie in de badge;
  - in de legenda één regel "Nieuwe methode" in plaats van twee, en een regel
    "geen effect" als die in de lijst voorkomt.
- `src/components/method-label-badge.tsx`: één neutrale stijl, geen
  Sparkles/FlaskConical.
- `src/app/(app)/zwbeter-worden/_components/protocols/protocol-views.tsx`: heeft
  een eigen `EvidenceBadge` met maar twee stijlen; vervangen door de gedeelde
  badge, zodat een protocol er hetzelfde uitziet als een artikel.

### Artikelen en hun velden

- `src/lib/nutrition/library.ts`:
  - `geen-bewijs`, `ketonen`, `low-carb-keto`: niveau plus conclusie in plaats
    van `afgeraden`; `darmtraining` en `herstel` naar `sterk`;
  - het type `NutritionArticle` krijgt het conclusieveld;
  - de tekst bij *Supplementen en sportvoeding*: "Veelbelovend, maar het bewijs is
    dun of wisselend" en "Sterk onderbouwd voor prestatie: … nitraat … glycerol"
    botsen met de nieuwe woorden en met de protocollen (nitraat en glycerol zijn
    onderbouwd). Herschrijven.
- `src/lib/training/training-library.ts`: `zones` en `ftp-test` naar `sterk`,
  `opbouwen` naar `beperkt`; het type `TrainingArticle` krijgt het conclusieveld.
- `src/lib/training/strength-library.ts`: `het-gymprogramma` en
  `kracht-op-de-fiets` naar `matig`.
- `src/lib/materiaal/library.ts`: de conclusie bij `neusstrips`,
  `compressiekleding` en `inlegzolen`; het commentaar bovenaan (regel 14). De
  zinnen "Er is sterk bewijs …" en "geen sterk bewijs" bij de zadelhoogte citeren
  de review; nalopen of ze naast de nieuwe badge nog goed lezen.
- `src/lib/protocols/training.ts`: het protocol `kracht-op-de-fiets` naar
  `matig`.

### Plekken die het tonen (volgen de code hierboven, maar nalopen)

- De vier kennisbanklijsten met legenda:
  `src/app/(app)/zwbeter-worden/kennis/page.tsx`, `voeding/kennis/page.tsx`,
  `core/kennis/page.tsx`, `materiaal/kennis/page.tsx` (die laatste geeft nu
  `MATERIAAL_EVIDENCE_LEGEND` mee; dat vervalt).
- Artikelpagina's: `_components/protocols/knowledge-article.tsx` en
  `core/kennis/[slug]/page.tsx`.
- ZWBieb: `zwbieb/leeszaal/page.tsx` (legenda), `leeszaal/shelf-browser.tsx`
  (zoeken op niveau en label: ook op "geen effect"), `zwbieb/_components/overview.tsx`
  ("In de leeszaal"), en `src/lib/zwbieb/shelves.ts`, dat de conclusie moet
  doorgeven.
- Rekenaar: `materiaal/rekenaar/rekenaar.tsx`. "Stevig onderbouwd" is langer dan
  "Sterk bewijs"; op 375 px bekijken.
- Trainer: `trainer/_components/workout-library-panel.tsx` (badge per workout via
  `workout-support.ts`), `trainer/_components/calendar-editor.tsx` (de keuzelijst
  zet " - Veelbelovend" achter de titel).
- Schema van het lid: `_components/member-calendar.tsx`,
  `_components/workout-blocks.tsx`, `_components/workout-calendar.tsx` (tooltip,
  in kleine letters).
- Protocollen: `protocol-views.tsx` (lijst en detail).

### Coach

- `src/lib/knowledge/coach.ts`: het kennisblok zet "Bewijs: …" met de conclusie
  erbij, en "Label: Nieuwe methode".
- `src/lib/training/coach-chat.ts` (regels 72–76): de prompt noemt Veelbelovend,
  Experimenteel, Sterk, Matig, Beperkt en Afgeraden. Wordt: de drie nieuwe woorden;
  bij Eerste aanwijzingen zegt de coach dat erbij; bij "geen effect" raadt hij het
  middel niet aan als iets wat helpt; bij Nieuwe methode zegt hij dat het geen
  standaardtraining is en weegt hij naar het niveau.
- `src/lib/training/workouts.ts`, `ai.ts` en de regelmotor (`engine/`) gebruiken
  `veelbelovend` en `experimenteel` als waarden. Die blijven; geen wijziging.

### intervals.icu

- `src/lib/training/publish.ts` zet het label via `describeWithMethodLabel`
  vooraan in de beschrijving. Die wordt "Nieuwe methode.".
- **Al gepubliceerde workouts** hebben nog "Veelbelovend." of "Experimenteel."
  vooraan. Bij de volgende synchronisatie wordt de beschrijving opnieuw opgebouwd
  uit de beschrijving in ZWB, die het label niet bevat, dus dan klopt hij weer.
  Workouts die niet meer gesynchroniseerd worden, houden de oude tekst.
  `describeWithMethodLabel` moet een oud voorvoegsel weghalen in plaats van er een
  tweede voor te zetten. Dat is niet lokaal te testen tegen intervals.icu zelf.

### /hulp

- `src/app/(app)/hulp/page.tsx`:
  - blok "Bewijsniveau": de nieuwe woorden, de drie routes naar Stevig
    onderbouwd, de begrenzingen in het kort, en "geen effect";
  - blok "Veelbelovend en experimenteel" wordt "Nieuwe methode";
  - blok "De kennisbank" bij materiaal: de regels over metingen gelden nu overal,
    dus dat stuk kan kort en verwijst naar het blok "Bewijsniveau".
- `src/app/(app)/hulp/help-search.tsx` (regel 239): de zoektermen
  (veelbelovend, experimenteel, sterk) aanvullen met de nieuwe woorden.

### Tests

- `tests/unit/article-evidence.test.ts`: leest dit document in plaats van
  `bewijsniveau-kennisbank.md`; vergelijkt met de volle naam van het niveau; de
  test op Afgeraden wordt een test dat precies de zes artikelen een conclusie
  hebben; lage cadans en kracht op de fiets gelijk aan hun protocol.
- `tests/unit/materiaal.test.ts`: leest dit document; de regel "geen afgeraden"
  vervalt, want dat niveau bestaat niet meer.
- `tests/unit/coach-knowledge.test.ts`: de regel "Bewijs: …" met conclusie.
- `tests/unit/workout-on-off.test.ts`: `describeWithMethodLabel` geeft "Nieuwe
  methode.", en haalt een oud voorvoegsel weg.
- Blijven gelijk: `workout-method-labels-migration.test.ts`,
  `engine/catalog.test.ts`, `engine/compose.test.ts` (die testen de waarden, niet
  de tekst).

### Documenten en scan

- `docs/bewijsniveau-kennisbank.md` en de paragraaf "Bewijsniveau bij materiaal":
  een verwijzing naar dit document; de oude tabellen blijven als geschiedenis.
- `docs/trainingsmethodes-onderzoek-2026-10-16.md`, paragraaf "Labels": een
  regel dat de labels nu als "Nieuwe methode" getoond worden.
- `.claude/skills/kennisbank-scan/SKILL.md` (regels 104–133): verwijst naar dit
  document en de werkwijze, en naar "Nieuwe methode" in plaats van de twee labels.
- `scripts/kennisbank-inventaris.mjs`: zet de conclusie bij "Bewijs:".
- `PLAN.md`: de zinnen die zeggen dat het niveau naast Veelbelovend en
  Experimenteel staat, en dat er een niveau Afgeraden is, corrigeren (blokken
  "Opgeleverd — bewijsniveau per kennisartikel" en "Opgeleverd — veelbelovende en
  experimentele trainingsmethodes").

## Bewust niet

- **Een vierde niveau, of "Afgeraden" houden.** Het niveau zegt hoe zeker we
  zijn, de conclusie wat er uit het onderzoek komt. Twee dingen in één woord
  stoppen gaf juist het probleem.
- **De sleutels in code hernoemen** (`sterk` naar `stevig` enzovoort). Dat raakt
  tientallen plekken en tests zonder dat een lid iets anders ziet.
- **Een migratie voor `method_label`.** Zie "Nieuwe methode".
- **Alle protocollen opnieuw beoordelen.** Ze vallen onder hetzelfde beleid, maar
  hun niveaus zijn bij het protocolonderzoek per schema bepaald, en geen van hen
  staat hoger dan zijn artikel. De maandelijkse scan kan per protocol een ander
  niveau voorstellen.
- **Het niveau afleiden uit de soorten bronnen.** Een consensusstuk in de lijst
  zegt niet dat het kernadvies ervan afhangt; het blijft een oordeel per
  artikel. De werkwijze hierboven maakt dat oordeel wel navolgbaar.
- **De samenvatting van *Hittetraining* opsplitsen.** Daar staan acclimatisatie
  (stevig) en hemoglobine (onderbouwd) samen in. Het kernadvies is de
  acclimatisatie; de beperking over hemoglobine staat er al.

## Hoe beoordeeld

- Op de bronnen die nu bij elk artikel in de app staan, met hun soort, auteurs en
  de beperkingen die het artikel noemt, en de redenen in de twee bestaande
  tabellen.
- **Eén keer opnieuw gezocht**, in PubMed: bij *Darmtraining* was niet uit de
  bronnen af te leiden of het position statement darmtraining zelf aanbeveelt.
  Het abstract zegt dat darmtraining hoort bij de aanpakken met "mostly
  consistent beneficial outcomes" voor maagklachten
  ([Costa 2025](https://doi.org/10.1007/s40279-025-02186-6)). Verder geen nieuwe
  literatuur gezocht of gelezen.
- Welke auteurs bij welke groep horen, is afgeleid uit de bronvermeldingen in de
  app, niet uit de artikelen zelf.

## Open punten voor de eigenaar

1. **Low-carb en keto: "geen effect" of "nadelig"?** De conclusie van het artikel
   is strenger dan "helpt niet": je wordt er bij wedstrijdtempo minder efficiënt
   van. *Onderbouwd: geen effect* zou dat verzachten. **Voorstel:** een tweede
   conclusievorm *nadelig*, nu alleen voor dit artikel. Zonder die vorm wordt het
   *Onderbouwd: geen effect* en blijft "af te raden" in de samenvatting staan.
2. **Akkoord op de zeven verschuivingen** (*Zones*, *Je FTP*, *Darmtraining*,
   *Herstel tussen sessies*, *Het gymprogramma* en *Kracht op de fiets* omhoog;
   *Opbouwen* omlaag), en daarmee op het protocol *Kracht op de fiets* naar
   onderbouwd. Ze volgen uit de regels, maar dit zijn de plekken waar een lid iets
   anders gaat zien.
