# Voorstel: training voor vrouwen bij ZWB

Hoort bij `docs/training-en-cyclus.md`. Die notitie gaat over wat het onderzoek
zegt; dit gaat over wat ZWB ermee kan. Breder dan de cyclus alleen, want daar
zit niet de grootste winst.

## Waar de winst wél zit

### 1. Energiebeschikbaarheid bespreekbaar maken

Structureel te weinig eten naast de training is het best onderbouwde risico voor
vrouwelijke duursporters: het verstoort de hormoonhuishouding, verlaagt de
botdichtheid en verhoogt het risico op stressfracturen. Het vervelende is dat het
in het begin op vooruitgang lijkt — lichter worden gaat even samen met betere
cijfers.

**Wat ZWB kan doen:** één keer per seizoen een sportdiëtist laten langskomen.
Geen app-functie, wel de grootste impact per geïnvesteerd uur. En: schrap
gewichtsdoelen uit de trainingsdoelen. Het platform kent nu `goal_type` met
onder meer `ftp` en `base_fitness`; houd dat zo en voeg nooit een
gewichtsstreefdoel toe.

### 2. IJzer op de radar

IJzertekort komt bij sportende vrouwen veel voor en geeft precies de klachten
die je aan training toeschrijft: moe, minder eindsnelheid, slecht herstel. Het
wordt zelden gemeten omdat niemand eraan denkt.

**Wat ZWB kan doen:** in het hulpcentrum een korte tekst met wat de klachten
zijn en dat een huisarts het simpel kan prikken. Meer niet — geen advies, geen
suppletie, dat is medisch terrein.

### 3. Het logboek gebruiken waarvoor het bedoeld is

Het klachtenlogboek dat er nu in zit levert pas iets op als het over meerdere
maanden gevuld is. Dan ziet een lid haar eigen patroon: welke week levert
structureel slechte sessies op, en past het schema daar überhaupt op.

**Wat ZWB kan doen:** trainers leren dat "ik voelde me slecht" een datapunt is
en geen excuus, en dat je een sleutelsessie een dag verschuiven mag zonder dat
het blok mislukt is. Dat is een coachingscultuur-ding, geen functie.

### 4. Het schema flexibeler dan strak maken

Een schema dat op de dag vastligt, botst met een lichaam dat niet elke week
hetzelfde is. Een schema met **twee sleutelsessies per week die binnen die week
mogen schuiven** botst niet.

**Wat ZWB kan doen:** dat is een kleine wijziging in de prompt en in hoe de
trainer het schema presenteert — sleutelsessies markeren, de rest als invulling.
Dit helpt trouwens iedereen met een onregelmatig leven, niet alleen vrouwen.

## Waar ik van af zou blijven

**Fase-gestuurde periodisering.** Zie de onderzoeksnotitie: inconsistent bewijs,
en voor leden met hormonale anticonceptie slaat het nergens op.

**Aparte damesschema's.** Er is geen bewijs dat vrouwen fundamenteel andere
trainingsprikkels nodig hebben. Wat verschilt is de context: klachten,
energiebehoefte, en vaker een dubbele agenda. Dat los je op met flexibiliteit,
niet met een tweede schema-generator.

**Cijfers publiek maken.** ZWB toont FTP en gewicht op profielen, met vinkjes om
het te verbergen. Overweeg of gewicht standaard uit moet staan in plaats van aan.
Dat is één regel in de default van `profile_visibility` en het scheelt iemand die
er gevoelig voor is een vervelend moment.

## Concreet, in volgorde van opbrengst

| | Wat | Waar |
|---|---|---|
| 1 | Sportdiëtist uitnodigen, één avond | Club, geen code |
| 2 | Gewicht standaard verbergen op profielen | `profile_visibility` default |
| 3 | Sleutelsessies markeren, rest mag schuiven | Prompt + trainerscherm |
| 4 | IJzer- en energietekst in het hulpcentrum | `/hulp` |
| 5 | Logboek een seizoen laten lopen, dan evalueren | Bestaat nu |

## Wat ik niet weet

Ik heb geen idee hoeveel vrouwen er in de club rijden, wat zij hiervan zouden
willen, en of ze het in een clubapp willen. Alles hierboven komt uit onderzoek en
niet uit jullie leden. Vraag het ze voordat je punt 3 of 5 bouwt — punt 1, 2 en 4
kunnen sowieso.
