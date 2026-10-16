# Trainingsmethodes: wat is veelbelovend, en wat nog experimenteel

Onderzoek voor ZWBeter, 2026-10-16. De vraag van de eigenaar: zoek via PubMed en
Consensus naar trainingsmethodes, protocollen en workouts die veelbelovend zijn.
Experimenteel mag, maar dan moet de app dat zeggen zodra we het bouwen.

**Hoe gezocht.** Twaalf zoekvragen in Consensus en PubMed (blokperiodisering,
intervalvormen en tijd bij VO2max, sprintintervallen, durability,
"double threshold", brain endurance training, bloedstroombeperking, ischemische
preconditionering). Van alle bronnen is alleen de samenvatting gelezen, via
PubMed of Consensus. De DOI's komen uit die twee bronnen en zijn hier niet
opnieuw in Crossref nagelopen, anders dan in
[protocollen-onderzoek.md](protocollen-onderzoek.md). Doe dat bij het bouwen.

**Wat al in de app zit, en hier dus niet terugkomt:** hittetraining, lage
cadans, 30/15, taper, ademspiertraining, gepolariseerd of piramidaal, koud
water, de elf lange ritten (met de sprints van Almquist, "fris en moe" en de
cadansritten) en de duurtest. Zie [protocollen-onderzoek.md](protocollen-onderzoek.md)
en [lange-ritten-variatie.md](lange-ritten-variatie.md).

## Labels

Drie labels, zodat een lid in de app ziet hoe hard het bewijs is:

| Label | Betekenis |
|---|---|
| **Veelbelovend** | Gecontroleerde trainingsstudies bij fietsers met een duidelijk effect, maar klein, kort of alleen bij goed getrainde renners. |
| **Experimenteel** | Het mechanisme of een eenmalige meting wijst de goede kant op, maar er is geen trainingsstudie bij fietsers die het effect over weken laat zien, of de studies spreken elkaar tegen. |
| **Niet bouwen** | Geen effect boven placebo, niet uit te voeren vanuit de app, of een risico dat het voordeel niet waard is. |

**Gebouwd (2026-10-16), anders dan eerst voorgesteld.** Het voorstel was
`experimenteel` als vierde waarde van `PROTOCOL_EVIDENCE`. Het werd een apart
label, `methodLabel` (`src/lib/training/method-label.ts`), met de waarden
`veelbelovend` en `experimenteel`. Reden: het bewijsniveau (sterk, matig,
beperkt) zegt hoeveel onderzoek er is, het label of het effect op prestatie al
vaststaat; een blokweek is "matig bewijs" én "veelbelovend". Het label staat op
workouts (kolom `method_label`, migratie `0246`), protocollen en
kennisartikelen, en gaat vooraan in de beschrijving naar intervals.icu.

## Overzicht

| Methode | Label | Voorstel |
|---|---|---|
| Drempelblokweek (6 sessies in 7 dagen) | Veelbelovend | protocol |
| HIT-blokweek (5 sessies 30/15 in 6 dagen) | Veelbelovend | protocol, samen met de drempelblokweek |
| VO2max-intervallen met snelle start of wisselend vermogen | **Experimenteel** | workoutvariant via de AI-coach |
| Sprintintervallen als onderhoud bij weinig tijd | Veelbelovend | AI-regel voor drukke weken |
| Sprints in één rustige rit in de overgangsperiode | Veelbelovend | AI-regel voor de weken na het seizoen |
| Brain endurance training | **Experimenteel** | eventueel protocol, met label |
| Trainen met bloedstroombeperking (BFR) | **Experimenteel** | niet bouwen als protocol |
| Ischemische preconditionering vóór een wedstrijd | Niet bouwen | hooguit een zin in een kennisartikel |
| "Double threshold" met lactaatmeter | Niet bouwen | geen fietsstudies, lactaatmeter nodig |
| Trillingen tijdens intervallen | Niet bouwen | niet uit te voeren, studies spreken elkaar tegen |

## Veelbelovend

### Blokweken: zes drempelsessies of vijf 30/15-sessies in één week

De bekendste vorm: één week met vijf harde sessies, daarna drie weken met één.
Rønnestad vond na vier weken +4,6% VO2max tegen geen verandering bij twee harde
sessies per week (tien en negen renners)
[Rønnestad e.a. 2014a](https://doi.org/10.1111/j.1600-0838.2012.01485.x), en na
twaalf weken +8,8% tegen +3,7% (acht en zeven renners)
[Rønnestad e.a. 2014b](https://doi.org/10.1111/sms.12016).

Daar staat tegenover:
- Twaalf weken blok tegen een goede klassieke opbouw, met evenveel belasting:
  geen verschil in tijdrit of vermogen (dertig renners)
  [Almquist e.a. 2022](https://doi.org/10.3389/fphys.2022.837634).
- Systematische review: geen periodiseringsmodel aantoonbaar beter over 8-12
  weken [Galán-Rioja e.a. 2023](https://doi.org/10.1123/ijspp.2022-0302).
- Meta-analyse: klein voordeel op VO2max (SMD 0,40), maar de studies scoren
  gemiddeld 3,7 van 10 op kwaliteit
  [Mølmen e.a. 2019](https://doi.org/10.2147/oajsm.s180408).

Nieuwer en voor ZWB bruikbaarder is de **blokweek als losse prikkel**:

- **Drempelblokweek.** Zes sessies in zeven dagen, 5-7 × 10-14 minuten op
  RPE 14-15, gevolgd door zes dagen actief herstel. Tegen zes weken gewone
  training: vermogen bij 4 mmol lactaat +4,0% tegen -1,3%, vermogen bij VO2max
  +2,5% tegen -0,7%. Dertig goed getrainde mannen, cross-over. De intervallen
  lagen op 66% van het VO2max-vermogen en 85% van de maximale hartslag: in ZWB-taal
  sweet spot tot onderkant drempel.
  [Mølmen e.a. 2025](https://doi.org/10.1249/mss.0000000000003706)
- **HIT-blokweek.** Vijf sessies van 5 × 8,75 minuten 30/15 in zes dagen, dan
  zes dagen herstel: vermogen in de laatste minuut van de VO2max-test +3,7%
  tegen +0,7%, sprint +2,8% tegen +1,9%.
  [Solli e.a. 2024](https://doi.org/10.1002/ejsc.12223)
- **Beide naast elkaar** bij dezelfde renners: allebei +3-5% op 15 minuten. De
  drempelweek verbeterde de drempel meer (4,5 tegen 2,1%), de HIT-week neigde
  naar meer sprintvermogen.
  [Rønnestad e.a. 2025](https://doi.org/10.1002/ejsc.70067) (staat al als bron
  in het artikel "Rustige ritten rustig")

**Waarom veelbelovend en niet sterk:** alles komt van één onderzoeksgroep in
Lillehammer, bij renners met een VO2max rond 70, bijna alleen mannen, en over
twee tot vier weken. Een week met zes sessies vraagt zes vrije dagen; de
beschikbaarheid van een lid is een plafond, geen verplichting (zie
`availability.ts`).

**Voorstel:** één protocol "Blokweek" met twee varianten (drempel of 30/15),
anker `start`: zeven dagen blok, zes dagen herstel. Voorwaarden in de app: een
FTP die niet ouder is dan acht weken, minstens vijf beschikbare dagen in die
week, geen A-wedstrijd binnen drie weken, en de readiness weegt mee zoals nu.
Niet tijdens een taper.

### Sprintintervallen als onderhoud bij weinig tijd

- Hooggetrainde renners (VO2max 68) reden zes weken lang twee keer per week
  6 × 30 seconden voluit, met 30% minder totaal volume. VO2max, duurvermogen en
  sprint bleven gelijk, de tijdrit van 4 minuten ging 3,8% vooruit. Twaalf
  sprints per sessie gaf geen extra prestatie.
  [Jeppesen e.a. 2024](https://doi.org/10.1249/mss.0000000000003453)
- Voor VO2max zelf zijn lange intervallen (4 × 4 minuten) beter dan sprints,
  bij getrainde mannen en vrouwen (hardlopen).
  [Hov e.a. 2022](https://doi.org/10.1111/sms.14251),
  [Helgerud e.a. 2023](https://doi.org/10.1111/sms.14470)
- Bij ongetrainden werkt al 2 × 20 seconden voluit in een sessie van tien
  minuten (REHIT); ongeveer 18% reageert niet.
  [Metcalfe e.a. 2024](https://doi.org/10.1139/apnm-2024-0024),
  [Metcalfe e.a. 2021](https://doi.org/10.1139/apnm-2020-0855)

**Voorstel:** geen protocol, maar een regel in de AI-prompt. Als de
beschikbaarheid een of twee weken sterk daalt (vakantie, drukte), houdt het
schema één of twee korte sessies met 6 × 30 seconden voluit en ruime pauze, in
plaats van alles te schrappen. Voor nieuwe of weinig getrainde leden kan
2 × 20 seconden de instap zijn. Label in de notitie: veelbelovend, getest bij
goed getrainde renners over zes weken.

### Sprints in één rustige rit in de overgangsperiode

- Elite-renners verminderden na het seizoen hun training drie weken met ~60%.
  Wie in één rustige rit per week 3 × 3 × 30 seconden voluit reed, hield het
  20-minutenvermogen vast (-1% tegen -3%) en werd sneller op 30 seconden.
  [Almquist e.a. 2020](https://doi.org/10.3389/fphys.2020.01000)
- Zes weken na de start van de nieuwe voorbereiding: 20 minuten +7,3% tegen
  -1,3% (vijf tegen zes renners).
  [Taylor e.a. 2021](https://doi.org/10.1123/ijspp.2020-0594)
- Een voluit-inspanning midden in een rit van drie uur verandert het
  energieverbruik en de RPE van die rit niet.
  [Demay e.a. 2025](https://doi.org/10.1007/s00421-025-06006-7)

De sprintrit zelf staat al in de bibliotheek ("Duur 180 met sprints", naar
Almquist). Nieuw is **wanneer**: in de rustweken na het laatste doel van het
seizoen. **Voorstel:** AI-regel voor de overgangsperiode van het jaarplan: één
rustige rit per week met 3 × 3 × 30 seconden. Label: veelbelovend, kleine
groepen elite-renners.

## Experimenteel

### VO2max-intervallen met snelle start of wisselend vermogen

Het idee: wie binnen een interval begint boven het gemiddelde en eindigt
eronder, of het vermogen laat golven, haalt bij hetzelfde gemiddelde langer
meer dan 90% van zijn VO2max.

- Fietsers, 4 × 4 minuten, start 40 W boven en eind 40 W onder het gemiddelde:
  89% tegen 86% VO2max, meer tijd boven 90%. Lactaat en hartslag hoger.
  [Beltrami e.a. 2021](https://doi.org/10.1123/ijspp.2020-0104)
- Fietsers, wisselend vermogen binnen het blok: 410 tegen 286 seconden boven
  90% VO2max, zonder hogere RPE of lactaat.
  [Bossi e.a. 2020](https://doi.org/10.1123/ijspp.2019-0260)
- Meta-analyse van 239 protocollen: wisselend vermogen geeft meer tijd bij
  VO2max dan gelijkmatig (SMD 0,80).
  [Schoenmakers e.a. 2026](https://doi.org/10.1186/s13102-026-01766-x)
- Langlaufers, 5 × 5 minuten: anderhalve minuut op 100% van de maximale aerobe
  snelheid en dan 85%, tegen constant 90%. Hoger gemiddeld VO2 en een iets
  lagere RPE. [Rønnestad e.a. 2020](https://doi.org/10.1123/ijspp.2018-0360)
- Hoe hoger het percentage VO2max tijdens de intervallen, hoe groter de winst
  over negen weken (22 renners).
  [Odden e.a. 2024](https://doi.org/10.1002/ejsc.12202)

**Waarom experimenteel:** alle vergelijkingen zijn eenmalige metingen. Er is
geen trainingsstudie bij fietsers die laat zien dat deze vorm over weken meer
oplevert dan gelijkmatige intervallen. Odden maakt het aannemelijk, niet
bewezen. Een andere studie met even zware 60-seconden-blokken vond geen
verschil [Wommer e.a. 2021](https://doi.org/10.1055/a-1550-9977).

**Voorstel:** een variant van het VO2max-blok, door de AI-coach te kiezen
naast de gewone 4-5 × 4-5 minuten. Opbouw per interval: de eerste anderhalve
minuut ongeveer 10% boven het gemiddelde doel, de rest ongeveer 5% eronder,
zodat het gemiddelde gelijk blijft. Die getallen zijn een afleiding uit
Beltrami en Rønnestad, geen geteste dosis. In de notitie: "Experimenteel".
Bouw de stappen als losse blokken, niet als helling: Zwift en de fietscomputer
tonen losse stappen betrouwbaar.

### Brain endurance training

Na de training 20-30 minuten een concentratietaak doen (zoals een Stroop-taak:
de kleur van een woord noemen terwijl er een andere kleur staat), zodat
mentale vermoeidheid minder hard aankomt.

- Wegrenners, twee gerandomiseerde proeven (26 en 24 renners), zes weken lang
  vijf keer per week een taak na de training: tijd tot uitputting en tijdrit van
  20 minuten verbeterden meer dan bij de controlegroep, met lagere RPE.
  Fysiologische waarden veranderden niet.
  [Staiano e.a. 2023](https://doi.org/10.1016/j.jsams.2023.05.008)
- Meta-analyse, tien proeven: duidelijk effect als je mentaal vermoeid start
  (SMD 0,82), onzeker als je fris bent. Zekerheid van het bewijs: zeer laag tot
  matig. [Wang e.a. 2026](https://doi.org/10.3389/fpsyg.2026.1858200)
- Alleen de taak, zonder fysieke training, deed niets.
  [Dallaway e.a. 2025](https://doi.org/10.3390/jfmk10040391)

**Waarom experimenteel:** kleine studies, grotendeels van dezelfde mensen,
en het effect op een frisse wedstrijd is onzeker. Wel goedkoop en zonder
fysiek risico.

**Voorstel, als de eigenaar dat wil:** een protocol van zes weken met per
trainingsdag één taak "20 minuten concentratietaak na de training". De taak
zelf in de app bouwen (een Stroop-taak is eenvoudig) is een aparte, grotere
stap. Label: experimenteel. De uitleg over mentale vermoeidheid hoort op
`/hulp` of in een kennisartikel, niet in het protocolscherm.

### Trainen met bloedstroombeperking (BFR)

Banden om de bovenbenen die de bloedtoevoer deels afknijpen, zodat een lage
belasting zwaar aanvoelt.

- Goed getrainde renners, vijf sessies van 6 × 5 minuten in een week: met
  banden reden ze 42% minder vermogen en wonnen evenveel (5 minuten +4%).
  [Zambolin e.a. 2026](https://doi.org/10.1152/japplphysiol.01038.2025)
- Bij getrainde sporters geen extra effect boven dezelfde training zonder
  banden [Castilla-López e.a. 2022](https://doi.org/10.1016/j.jesf.2022.03.004);
  een nieuwere meta-analyse bij duursporters vond wel een matig effect
  [Zhang e.a. 2025](https://doi.org/10.1186/s13102-025-01194-3).
- De bloeddruk loopt hoger op dan bij gewone intervallen.
  [Thomas e.a. 2018](https://doi.org/10.1016/j.jsams.2018.01.013)

**Niet als protocol bouwen.** Je hebt banden nodig en een gemeten
afsluitdruk, de bloeddruk stijgt, en bij getrainde renners is extra winst niet
zeker. De interessante toepassing is minder mechanische belasting bij een
blessure; dat is werk voor een fysiotherapeut, niet voor een app. Hooguit een
kennisartikel met die waarschuwing.

## Niet bouwen

### Ischemische preconditionering vóór een wedstrijd

Vier keer vijf minuten de bloedtoevoer naar de benen afknijpen voor de start.
De grootste meta-analyse (79 studies) vond geen effect boven een placebo met
een lage druk, behalve een klein effect op tijd tot uitputting
[Souza e.a. 2024](https://doi.org/10.1016/j.jshs.2024.101010). Op een tijdrit
geen effect [Zhou e.a. 2025](https://doi.org/10.1139/apnm-2024-0456); na
correctie voor placebo hooguit een triviaal effect (g = 0,10)
[Zhang e.a. 2025](https://doi.org/10.5114/biolsport.2026.154945). Niet bouwen.

### "Double threshold" met lactaatmeter

Twee drempelsessies op één dag, gestuurd op lactaat (Noorse lopers). Er zijn
alleen beschrijvingen en eenmalige metingen bij lopers
[Casado e.a. 2023](https://doi.org/10.3390/ijerph20053782),
[Talsnes e.a. 2024](https://doi.org/10.3389/fphys.2024.1428536), geen
trainingsstudie bij fietsers, en het vraagt een lactaatmeter. De drempelblokweek
hierboven is de vorm die bij fietsers wél getest is.

### Trillingen tijdens intervallen

Eén studie vond meer tijd bij VO2max
[Duc e.a. 2022](https://doi.org/10.1123/ijspp.2021-0572), een tweede niet
[Bossi e.a. 2022](https://doi.org/10.1055/a-1812-7600). Niet uit te voeren op
een gewone trainer.

## Gevonden, al gedekt

- **Durability.** Succesvolle amateurs verliezen na 1000 kJ half zoveel
  vermogen op 20 minuten als minder succesvolle (6,5 tegen 12,5%)
  [Barsumyan e.a. 2025](https://doi.org/10.3389/fspor.2025.1530162). Dat
  ondersteunt de duurtest en "Duur 180 fris en moe". Er is nog steeds geen
  trainingsstudie die laat zien dat intervallen in vermoeide toestand
  durability beter verbeteren dan gewone training; bij ongetrainden deden
  rustig en hard trainen het even goed
  [Matomäki e.a. 2023](https://doi.org/10.3389/fphys.2023.1128111).
- **4 × 8 minuten.** Bij recreatieve fietsers beter dan 4 × 4 en 4 × 16
  [Seiler e.a. 2013](https://doi.org/10.1111/j.1600-0838.2011.01351.x). Een
  bekend resultaat, geen nieuwe methode. Of de AI-coach deze vorm plant, is
  niet nagekeken.

## Wat er gebouwd is (2026-10-16)

- Label `veelbelovend`/`experimenteel` op workouts, protocollen en artikelen.
- Protocollen "Blokweek drempel", "Blokweek 30/15" (veelbelovend) en "Brain
  endurance training" (experimenteel).
- Bibliotheek: drie sweet-spotsessies en een 30/15-sessie voor de blokweek,
  "Sprint 6x30s onderhoud" en "Duur 90 met 3x3 sprints" (veelbelovend), drie
  VO2max-varianten: snelle start, aflopend en wisselend (experimenteel).
- AI-regels voor sprintonderhoud bij weinig tijd, sprints in de
  overgangsperiode en VO2max met wisselend vermogen; de AI geeft per workout
  een `methodLabel` terug.
- Een workoutblok kan nu korte herhalingen dragen (`onOff`, bijvoorbeeld
  30/15), zodat de 30/15-week als losse stappen naar intervals.icu gaat.
- Kennisartikelen: Blokweken, VO2max met wisselend vermogen, Sprints als
  onderhoud, Brain endurance training, Trainen met bloedstroombeperking.

**Bewust niet gebouwd:**
- **REHIT (2 x 20 seconden).** Getest bij ongetrainden; ZWB-leden fietsen al.
  Een sessie van tien minuten met twee sprints kleurt en heet in het schema
  bovendien "Herstel", omdat het kernwerk korter is dan vijf minuten.
- **BFR als protocol of workout.** Alleen een kennisartikel; zie boven.
- **Een Stroop-taak in de app.** Het protocol brain endurance training
  verwijst naar een taak op telefoon of computer. Zelf bouwen is een aparte
  stap.

## Niet nagekeken

De teksten zijn niet door een sportarts of trainer nagekeken. Alleen
samenvattingen gelezen; de opzet van de studies (wie, hoe lang, hoe gemeten)
moet bij het bouwen per bron uit het volledige artikel komen.
