# Protocollen: wat aantoonbaar werkt voor wielrenners

Onderzoek voor de protocollen in ZWBeter (trainen en voeden), 2026-10-14.
De vraag van de eigenaar: hittetraining, supplementen, de nieuwste vormen met
lage cadans, en verder alles wat voor wielrenners bewezen effectief is.

**Hoe gecontroleerd.** Elke DOI is opgezocht in Crossref (titel, tijdschrift,
jaargang, pagina's). Van de meeste bronnen is alleen de samenvatting gelezen,
via Europe PMC of de uitgever. Volledig gelezen: Hebisz & Hebisz 2024 (opzet,
cadansen, uitkomsten). Een getal dat alleen uit een tweede bron kwam (blog,
coachingsite) staat hier niet als feit.

**Wat een protocol is.** Iets wat je uitvoert, met dagen, taken en soms een
dosis. Een kennisartikel legt uit; een protocol zegt wat je wanneer doet. De
inhoud staat in code: `src/lib/protocols/training.ts` en `nutrition.ts`.

## Overzicht

| Protocol | Bewijs | Besluit |
|---|---|---|
| Hitte-acclimatisatie voor een warme wedstrijd | sterk | gebouwd (trainen) |
| Hittetraining voor hemoglobine | matig | gebouwd (trainen) |
| Kerntemperatuur met een CORE-sensor bij hitte | sensor zwak gevalideerd | gebouwd (trainen), via intervals.icu |
| Lage cadans bij VO2max en sprints | beperkt (was matig; zie [bewijsniveau-kennisbank](bewijsniveau-kennisbank.md), 2026-10-17) | gebouwd (trainen), via de AI-coach |
| Ademspiertraining | matig | gebouwd (trainen) |
| Taper | sterk | AI-regel aangescherpt, geen protocol |
| Cafeïne | sterk | gebouwd (voeden, wedstrijd) |
| Natriumbicarbonaat | sterk voor 1-10 min | gebouwd (voeden, wedstrijd) |
| Nitraat (bietensap) | matig | gebouwd (voeden, wedstrijd) |
| IJsslush in de hitte | matig | gebouwd (voeden, wedstrijd) |
| Koolhydraten laden | matig | gebouwd (voeden, wedstrijd) |
| Bèta-alanine | sterk voor 1-4 min | gebouwd (voeden, opbouw) |
| Creatine | sterk voor sprint en kracht | gebouwd (voeden, opbouw) |
| Darmtraining naar 90-120 g/u | matig | gebouwd (voeden, opbouw) |
| Glycerol in de hitte | matig | gebouwd (voeden, wedstrijd), tweede ronde |
| Herstellen na een zware wedstrijd | matig | gebouwd (voeden, herstel), tweede ronde |
| Kersensap | matig, alleen als je vooraf begint | gebouwd (voeden, herstel), tweede ronde |
| Vitamine D in de winter | richtlijn | gebouwd (voeden, gezondheid), tweede ronde |
| Collageen bij revalidatie | beperkt | gebouwd (voeden, gezondheid), tweede ronde |
| Korte intervallen 30/15 | matig | kennisartikel |
| Gepolariseerd trainen | geen verschil | kennisartikel |
| Koud water na training | remt kracht | kennisartikel |
| Ketonen | geen effect | kennisartikel (voeding), afgeraden |
| Visolie, probiotica, mondspoelen, BCAA, magnesium, CBD | beperkt tot geen | kennisartikel (voeding), tweede ronde |
| Sleep low / train low | gemengd | niet gebouwd |
| HRV-gestuurd trainen | zwak | niet gebouwd |

## Trainen

### Hitte-acclimatisatie (kort)

- Consensus: 60-90 minuten per dag, één tot twee weken; het meeste komt in de
  eerste week.
  [Racinais e.a. 2015](https://doi.org/10.1136/bjsports-2015-094915)
- Zes dagen 40 minuten heet bad (40 °C) direct na een rustige loop: lagere
  rectale temperatuur in rust en tijdens inspanning, tijdrit van 5 km in 33 °C
  4,9% sneller, in 18 °C geen verschil. Zeventien mannen, niet aan hitte gewend.
  [Zurawlew e.a. 2016](https://doi.org/10.1111/sms.12638)
- Bayesiaanse meta-regressie: elke extra sessie en langere of warmere sessies
  geven meer aanpassing.
  [McDonald e.a. 2025](https://doi.org/10.1002/cph4.70017)

**Afgeleid, niet getest:** thuis binnen rijden zonder ventilator en met een
extra laag als hittesessie. De studies gebruikten een hittekamer, een bad of
een hittepak. De prikkel is dezelfde (hogere kerntemperatuur). Zonder sensor
meet de app die niet; met een CORE-sensor wel, zie "Kerntemperatuur met een
CORE-sensor" hieronder (2026-10-14). De opbouw (-14 t/m -4 elke dag, daarna hooguit twee korte
sessies) is een eigen invulling van de consensus.

### Hittetraining voor hemoglobine (lang)

- Vijf weken, vijf keer per week 50 minuten in een hittekamer of hittepak:
  hemoglobinemassa +2,4 à 2,6% tegen -0,7% in de controlegroep. Drie weken
  onderhoud met drie sessies per week hield de massa hoger dan stoppen, maar
  niet significant hoger dan de controlegroep.
  [Rønnestad e.a. 2022](https://doi.org/10.1249/MSS.0000000000002928)
- Eerder: 5 weken, 50 minuten op 38 °C.
  [Rønnestad e.a. 2021](https://doi.org/10.1113/EP088544);
  5,5 week, 1 uur bij 60% VO2peak op 40 °C.
  [Oberholzer e.a. 2019](https://doi.org/10.3389/fphys.2019.01379)

**Beperking:** kleine groepen, vooral (top)renners, grotendeels één groep
onderzoekers. VO2max in koel weer niet altijd beter.

### Kerntemperatuur met een CORE-sensor (2026-10-14)

Vraag van de eigenaar: kan de hittetraining met de CORE-sensor werken, via
intervals.icu?

**Hoe de data binnenkomt.** De CORE-sensor stuurt kerntemperatuur,
huidtemperatuur en de Heat Strain Index naar de fietscomputer (Connect IQ-veld
op Garmin; bij Wahoo een voorlopige oplossing). intervals.icu leest ze uit het
FIT-bestand als streams `core_temperature`, `skin_temperature` en
`heat_strain_index`, vult gaten tot 30 seconden op met de laatste waarde en
toont ze als grafiek. Een dataveld met een eigen naam kan met een voorvoegsel
binnenkomen (gemeld: `0_95_heat_strain_index`). Een rit die via Strava in
intervals.icu komt, heeft geen streams.

Oudere Wahoo's (ELEMNT, BOLT en ROAM vóór de BOLT 3, dus ook de BOLT 2 van de
eigenaar) kennen geen temperatuursensor. CORE's handleiding laat ze de sensor
als spierzuurstofsensor koppelen; de kerntemperatuur staat dan in graden in het
veld THb. Op het forum zag iemand met een BOLT 2 de kanalen THb en THb(2) in
intervals.icu. De app valt daarom terug op een THb-stream als er geen
`core_temperature` is, en alleen als de mediaan van de mogelijke waarden
(34 tot 43) op of boven 36 ligt en minstens de helft van de metingen in dat
bereik valt. Echte hemoglobine (12 tot 15 g/dl) valt erbuiten; staan kern en
huid op twee kanalen, dan geldt die met de hoogste mediaan als kern. Hoe
intervals.icu die streams precies noemt, is niet vastgesteld; de app herkent elk
type dat met `thb` begint. Bronnen: de helppagina van CORE over
intervals.icu en draadjes op het intervals.icu-forum; die konden vanuit de
bouwomgeving niet worden geopend, alleen de zoekresultaten zijn gelezen.

**De drempel van 38,5 °C.** In de hittepakstudies werkten renners naar een
kerntemperatuur rond 38,5 °C (secundaire verslagen van het werk van Rønnestad;
een casusreeks met hittepakken kwam uit op een mediaan van 38,7 °C rectaal).
Niet in de oorspronkelijke artikelen nagelezen. **Eigen keuze:** een
hittesessie telt bij 30 minuten op of boven 38,5 °C, een korte sessie in de
laatste dagen voor een wedstrijd bij 10 minuten. Die minuten komen niet uit een
studie; ze zijn gekozen zodat een sessie van 50 tot 60 minuten met een
opwarmfase van ongeveer twintig minuten ze haalt.

**Hoe betrouwbaar is de sensor.** Bij fietsers was de herhaalbaarheid goed
(verschil tussen twee gelijke ritten 0,02 °C), maar ongeveer de helft van de
metingen week meer dan 0,3 °C af van een rectale meting, in 19 én 31 °C. De
auteurs concluderen dat de sensor geen geldige maat voor de kerntemperatuur is.
[Verdel e.a. 2021](https://doi.org/10.3390/s21175932). Daarom: de app toont de
waarde als richting en vinkt af, maar het lid kan het vinkje weghalen.

**Aanvulling wetenschappelijke toets fase 6 (2026-10-16).** Er zijn inmiddels
vier validatiestudies, en ze spreken elkaar tegen over de richting van de fout:
- Bij hockeysters zat de sensor te laag, meer naarmate het warmer werd, met
  41–60 % van de metingen meer dan 0,3 °C ernaast.
  [Goods e.a. 2023](https://doi.org/10.1080/17461391.2023.2193953)
- Bij fietsers in de hitte zat hij in de tweede helft van de rit ~0,3 °C te
  hoog, meer bij meer onderhuids vet.
  [McLaughlin e.a. 2025](https://doi.org/10.1016/j.jtherbio.2025.104241)
- In een vergelijking van drie sensoren zat hij systematisch iets te hoog.
  [Daanen e.a. 2023](https://doi.org/10.1016/j.jtherbio.2023.103480)

De beperking in beide hitteprotocollen noemt dat nu. De drempel van 38,5 °C en
de 30 minuten blijven: met het vinkje dat het lid kan weghalen, past de opzet
bij een fout van deze grootte.

**Bewust niet gebruikt: de Heat Strain Index.** CORE deelt de HSI in vier
zones in en noemt zone 3 de trainingszone (advies: 45 tot 60 minuten erin, twee
tot drie keer per week). De zonegrenzen en de rekenregel zijn van de fabrikant
en niet openbaar getoetst, en het advies is minder dan wat de protocollen
voorschrijven. De studies stuurden op kerntemperatuur.

### Lage cadans

Zie ook punt 8 in [lange-ritten-variatie.md](lange-ritten-variatie.md).

- Acht weken gepolariseerd, met sprints van 30 seconden (8 tot 12 per sessie)
  en intervallen van 4 minuten op 90-100% van het maximale aerobe vermogen,
  allemaal op 50-70 toeren tegen boven de 80: VO2max +8,7% tegen +4,6%,
  maximaal vermogen +8,1% tegen +3,0%, interactie significant. 24 vrouwen van
  17-20 jaar, goed getraind. De tekst noemt 50-60 toeren bij de sprints en
  60-70 bij de intervallen; die verdeling neemt het protocol over.
  [Hebisz & Hebisz 2024](https://doi.org/10.1371/journal.pone.0311833)
- Systematische review: geen sterk bewijs, hooguit op matige tot maximale
  intensiteit. [Hansen & Rønnestad 2017](https://doi.org/10.1123/ijspp.2016-0574)
- Torque (5 x 4 minuten op 70% van het VO2max-vermogen bij 50 toeren, tien
  weken) tegen squats: alleen squats verbeterden het vermogen. Negen per groep.
  [de Pablos e.a. 2025](https://www.jsc-journal.com/index.php/JSC/issue/view/56)
  Geen DOI gevonden.

**Besluit:** geen eigen workouts. De AI-coach zet de cadans in de notitie van
de VO2max- en sprintblokken zolang het protocol loopt, en laat het aantal
sleutelsessies aan de periodisering. Hebisz liet elke vier dagen een sprint- en
een intervalsessie rijden; dat is voor de meeste clubrenners te veel en wordt
niet overgenomen.

### Taper

- Meta-analyse: twee weken, volume 41-60% omlaag, intensiteit en frequentie
  gelijk. [Bosquet e.a. 2007](https://doi.org/10.1249/mss.0b013e31806010e0)
- Meta-analyse bij duursporters: hooguit 21 dagen, volume geleidelijk 41-60%
  omlaag, intensiteit en frequentie gelijk; tijdrit beter, VO2max niet.
  [Wang e.a. 2023](https://doi.org/10.1371/journal.pone.0282838)

**Besluit:** de AI-prompt zei "laatste 1-2 weken volume omlaag". Nu: één tot
hooguit drie weken, geleidelijk 40-60% omlaag, intensiteit en aantal
trainingen gelijk. Geen protocol: de taper volgt al uit doel en jaarplan.

### Ademspiertraining

- Dubbelblind, zes weken, 30 inademingen twee keer per dag op 50% van de
  maximale inademingsdruk: tijdrit 20 en 40 km 3,8 en 4,6% sneller.
  [Romer e.a. 2002](https://doi.org/10.1080/026404102760000053)
- Meta-analyses: winst in tijdrit en constante belasting, niet in oplopende
  tests; groter bij minder getrainden en langere inspanning.
  [Illi e.a. 2012](https://doi.org/10.1007/BF03262290),
  [HajGhanbari e.a. 2013](https://doi.org/10.1519/JSC.0b013e318269f73f)

### 30/15-intervallen

- Tien weken, 3 x 13 x 30/15 tegen 4 x 5 minuten bij gelijke ervaren
  zwaarte: VO2max +8,7% tegen +2,6%.
  [Rønnestad e.a. 2015](https://doi.org/10.1111/sms.12165)
- Toprenners, drie weken met negen sessies: 20-minutentest +4,7% tegen -1,4%,
  VO2max niet verschillend.
  [Rønnestad e.a. 2020](https://doi.org/10.1111/sms.13627)

Kennisartikel; geen protocol, omdat het een gewone workoutvorm is die de AI en
de trainer al kunnen plannen.

### Gepolariseerd of piramidaal

Klein voordeel op VO2max voor gepolariseerd, geen verschil op tijdrit.
[Oliveira e.a. 2024](https://doi.org/10.1007/s40279-024-02034-z). Een tweede
analyse (Zinner & Seiler 2025) vond volgens samenvattingen geen verschil; de
DOI is niet gevonden, dus die staat niet in de app.

### Koud water na de training

Remt de signalen en de langetermijnwinst van krachttraining; bij duurwerk
weinig effect op de lange termijn.
[Broatch e.a. 2018](https://doi.org/10.1007/s40279-018-0910-8)

## Voeden

De tweede supplementronde (glycerol, herstel, kersensap, vitamine D, collageen,
en de supplementen zonder protocol) staat in
[supplementen-onderzoek.md](supplementen-onderzoek.md).

Doses staan per kg en worden met het gewicht van het lid omgerekend, met een
plafond per inname. Supplementprotocollen zijn er vanaf 18 jaar (AIS).

| Protocol | Dosis | Bron |
|---|---|---|
| Cafeïne | 3-6 mg/kg, ~60 min vooraf, plafond 400 mg | [Guest e.a. 2021](https://doi.org/10.1186/s12970-020-00383-4), [Maughan e.a. 2018](https://doi.org/10.1136/bjsports-2018-099027) |
| Natriumbicarbonaat | 0,2-0,3 g/kg, 90-180 min vooraf, plafond 30 g | [Grgic e.a. 2021](https://doi.org/10.1186/s12970-021-00458-w) |
| Nitraat | 6-8 mmol per dag, 6 dagen laden, 2-3 u vooraf | [Jones e.a. 2018](https://doi.org/10.1146/annurev-nutr-082117-051622) |
| IJsslush | 7,5 g/kg in 30 min vooraf, plafond 750 g | [Bongers e.a. 2015](https://doi.org/10.1136/bjsports-2013-092928), [Choo e.a. 2018](https://doi.org/10.1080/17461391.2017.1405077) |
| Koolhydraten laden | 10-12 g/kg per dag, 2 dagen; ontbijt 1-4 g/kg | [Burke e.a. 2011](https://doi.org/10.1080/02640414.2011.585473), UCI 2026 |
| Bèta-alanine | 3,2-6,4 g/dag in giften ≤1,6 g, 8 weken | [Trexler e.a. 2015](https://doi.org/10.1186/s12970-015-0090-y), [Saunders e.a. 2017](https://doi.org/10.1136/bjsports-2016-096396) |
| Creatine | 0,3 g/kg 5 dagen, daarna 3-5 g/dag | [Kreider e.a. 2017](https://doi.org/10.1186/s12970-017-0173-z) |
| Darmtraining | 60 → 110-120 g/u in zes weken, 2 ritten per week | [Jeukendrup 2017](https://doi.org/10.1007/s40279-017-0690-6), [Podlogar e.a. 2022](https://doi.org/10.1007/s00421-022-05019-w), [Costa e.a. 2017](https://doi.org/10.1139/apnm-2016-0453), [Miall e.a. 2018](https://doi.org/10.1111/sms.12912) |
| Darmtraining 150 (beperkt bewijs) | 130 → 150 g/u in drie weken, 2 ritten van ≥ 3 uur per week, alleen na 120 g/u zonder klachten | [Morton e.a. 2026](https://doi.org/10.1016/j.tjnut.2026.101442), [Wilson 2025](https://doi.org/10.1007/s40279-025-02372-6), [Ravikanti e.a. 2025](https://doi.org/10.1152/japplphysiol.00665.2025) |

**Afgeleid of eigen keuze:**
- Plafonds per inname (400 mg cafeïne, 30 g bicarbonaat, 750 g slush) zijn
  eigen grenzen, geen waarden uit de bronnen.
- 7,5 g/kg ijsslush is de hoeveelheid uit de meeste studies in de
  meta-analyses; die studies zelf zijn niet afzonderlijk nagelezen.
- De stappen van 10 g per week bij darmtraining zijn een afleiding; er is geen
  vast onderzocht schema.
- **Darmtraining 150 (2026-10-16).** Op verzoek van de eigenaar, na een
  literatuurcheck die op een advies van maximaal 120 g/u uitkwam. Wat er is:
  - Gecontroleerd onderzoek gaat tot 120 g/u. 120 g/u werd in elke vorm goed
    opgenomen ([Hearris e.a. 2022](https://doi.org/10.1152/japplphysiol.00091.2022)).
  - 120 g/u gaf meer oxidatie van ingenomen koolhydraten dan 90 g/u (1,51 tegen
    1,29 g/min), maar spaarde het eigen glycogeen niet extra
    ([Podlogar e.a. 2022](https://doi.org/10.1007/s00421-022-05019-w)).
  - Bij elite-marathonlopers gaf 120 g/u meer oxidatie en een betere
    loopeconomie, maar ook de meeste misselijkheid en krampen
    ([Ravikanti e.a. 2025](https://doi.org/10.1152/japplphysiol.00665.2025)).
  - De oxidatie van ingenomen koolhydraten loopt dood rond 1,5–1,7 g/min, ofwel
    90–100 g/u.
  - 120–200 g/u komt in de praktijk voor, maar is niet onderbouwd. De
    bovengrens voor getrainde renners ligt mogelijk op 120 g/u
    ([Morton e.a. 2026](https://doi.org/10.1016/j.tjnut.2026.101442)).
  - Voor ≥ 100 g/u is er geen duidelijke prestatiewinst, mogelijk wel in
    meerdaagse koersen ([Wilson 2025](https://doi.org/10.1007/s40279-025-02372-6)).
  - Darmtraining werkt, maar is getest tot 90 g/u, bij hardlopers, over twee
    weken. Ongeveer 47–60 % minder klachten en minder malabsorptie
    ([Costa e.a. 2017](https://doi.org/10.1139/apnm-2016-0453);
    [Miall e.a. 2018](https://doi.org/10.1111/sms.12912);
    review [Martinez e.a. 2023](https://doi.org/10.1007/s40279-023-01841-0)).
    Bij topsporters gaf het geen extra prestatiewinst
    ([King e.a. 2022](https://doi.org/10.3390/nu14091929)). Bij 90 g/u had
    38 % malabsorptie ([Rauch e.a. 2022](https://doi.org/10.3389/fphys.2021.773054)).

  Daarom een eigen protocol met beperkt bewijs, geen verlenging van
  darmtraining: het lid start het bewust, alleen als 120 g/u zonder klachten
  gaat, op ritten van minstens drie uur, met een stopregel. Het schema van drie
  stappen van 10 g is een afleiding, net als bij darmtraining.
- Het uitproberen op een training in de twee weken voor de wedstrijd is een
  aanbeveling uit de reviews, geen getest protocol.

**Ketonen.** Meta-analyse van dertien proeven: geen effect op prestatie.
[Valenzuela e.a. 2020](https://doi.org/10.1123/ijspp.2019-0918). Kennisartikel,
geen protocol.

## Niet gebouwd

- **Sleep low / train low.** +3,2% in één week bij elf renners (Marquet 2016),
  maar vier weken bij renners gaf geen winst (Riis). Te wisselend voor een
  protocol, en het raakt de energiebeschikbaarheid waar het REDs-consensusstuk
  voor waarschuwt.
- **HRV-gestuurd trainen.** Eén meta-analyse (2020) met methodekritiek; de
  AI-coach weegt readiness en HRV al mee.
- **Glycerol.** *Ingehaald op 2026-10-14 (tweede ronde): toch gebouwd als
  protocol, zie [supplementen-onderzoek.md](supplementen-onderzoek.md).* Eerst
  weggelaten als niche (hyperhydratie in de hitte) met vaak maagklachten.
- **Hoogtestage.** Niet uit te voeren vanuit de app; hittetraining is het
  alternatief.
- **Een cadansveld op een blok.** Blijft zoals besloten bij `0228`: de cadans
  staat in de notitie. Zwift en de fietscomputer tonen hem dus niet als doel.

## Niet nagekeken

De teksten zijn niet door een sportarts, sportdiëtist of trainer nagekeken.
