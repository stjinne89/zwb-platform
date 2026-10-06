# Warming-up per wedstrijdtype

Onderzoek van 2026-10-06, bij de vijf warming-ups in de workoutbibliotheek
(migratie `0221_workout_library_warmups.sql`).

De studies leveren **principes**, geen ranglijst per wedstrijdtype. Er is geen
onderzoek dat een warming-up voor een Zwift-scratchrace vergelijkt met een voor
een puntenrace. De koppeling aan elk type hieronder is een afleiding uit de
principes en uit wat de wedstrijd vraagt.

## Principes

1. **Een actieve warming-up helpt** via spiertemperatuur, een snellere
   VO2-opstart en potentiëring. De vorm met het meeste bewijs is een kort aeroob
   deel met 4-5 korte activaties of stukjes wedstrijdtempo.
   [McGowan e.a. 2015](https://link.springer.com/article/10.1007/s40279-015-0376-x)
2. **Priming.** Een blok boven de lactaatdrempel van rond zes minuten maakt de
   VO2-kinetiek tot zeker twintig minuten later sneller. Te weinig herstel erna
   werkt averechts.
   [Bailey e.a. 2009](https://journals.physiology.org/doi/full/10.1152/japplphysiol.00810.2009),
   [review 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10115720/)
3. **Minder is meer.** Een klassieke warming-up van 50 minuten tot 95% van de
   maximale hartslag met vier sprints maakt moe; een korte, lichtere gaf 6,2%
   meer piekvermogen.
   [Tomaras & MacIntosh 2011](https://www.researchgate.net/publication/51106401_Less_is_more_Standard_warm-up_causes_fatigue_and_less_warm-up_permits_greater_cycling_power_output)
4. **Hoe korter en harder de wedstrijd, hoe meer de warming-up telt.** Bij lange
   duur kost hij vooral glycogeen en warmte (McGowan 2015).
5. **Zwift-starts** vragen tot ongeveer 150% FTP gedurende 1-3 minuten, en in de
   startpen kun je doortrappen.
   [Carmichael](https://roadbikeaction.com/chris-carmichaels-best-warm-ups-for-zwift-racing/),
   [Zwift Insider](https://zwiftinsider.com/zwift-race-start-5-tips/)

## Bursts van 6 seconden

- **Wat het kost.** Een sprint van 6 seconden draait vrijwel geheel op
  fosfocreatine (tot ongeveer 55% verbruikt) en maakt weinig lactaat. Na 30
  seconden is ongeveer 70% terug; na vijf sprints op rij nog maar 45%. Tien keer
  6 seconden met 30 seconden rust kost 27% vermogen.
  [Dawson e.a. 1997](https://www.researchgate.net/publication/13978912_Muscle_phosphocreatine_repletion_following_single_and_repeated_short_sprint_efforts),
  [Mendez-Villanueva e.a. 2012](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3524088/)
  Gevolg: minstens 54 seconden tussen twee bursts, en hooguit vier.
- **Wat het oplevert.** Potentiëring na een maximale contractie verdwijnt in 4-6
  minuten. Korte maximale sets gaven na vier minuten een 3,9% snellere eerste
  trapomwenteling en 6,2% meer piekkoppel; drie sprints van 3 seconden gaven een
  hoger piekvermogen.
  [MacIntosh e.a. 2012](https://www.researchgate.net/publication/224767656_Should_postactivation_potentiation_be_the_goal_of_your_warm-up),
  [Munro e.a. 2016](https://pubmed.ncbi.nlm.nih.gov/27483990/),
  [re-warm-up 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9465751/)
  Gevolg: bursts aan het eind, de laatste enkele minuten voor de start. Het
  effect zit in start en sprint, niet in duurvermogen.
- **Volgorde.** Wedstrijdtempo en sprints met kort herstel ervoor verlaagden het
  vermogen in een test van vier minuten.
  [Christensen & Bangsbo 2015](https://journals.humankinetics.com/view/journals/ijspp/10/3/article-p353.xml)
  Gevolg: eerst het priming-blok, dan herstel, dan pas de bursts.
- **Tijdritten: dun bewijs.** Extra protocollen bovenop een korte warming-up
  gaven geen winst op 1 km.
  [Wilson e.a. 2020](https://pubmed.ncbi.nlm.nih.gov/32294619/)
  Team Sky reed voor tijdritten toch 3 x 6 seconden, uitdrukkelijk als
  versnelling en niet als volle sprint.
  [Team Sky-protocol](https://cycletechreview.com/2014/features/team-sky-warm-up/)
  Gevolg: in de tijdrit en ploegentijdrit submaximaal en weinig; voluit alleen
  waar start of sprint de wedstrijd beslist.

## De vijf warming-ups

Doelen in %FTP. Een burst is een blok van een minuut dat begint met 6 seconden
en daarna losdraait.

| Warming-up | Min | Opbouw | Waarom |
|---|---|---|---|
| Tijdrit | 25 | 5 @50-60 · 4 @60-75 · 3 @80-90 · 2 @95-100 · 3 los · 1 @105-115 · 2 los · 3 bursts (versnelling) · 2 los | Constant hoog vermogen vanaf de eerste seconde: priming weegt het zwaarst. Bursts licht, omdat het bewijs dun is. |
| ZRL lang (scratch en puntenrace) | 21 | 5 @50-60 · 4 @65-80 · 2 @90-100 · 2 los · 1 @110-120 · 2 los · 4 bursts (voluit) · 1 los | De start is het zwaarste stuk en sprints beslissen: vier activaties, het maximum dat het herstel van fosfocreatine toelaat. De laatste burst valt binnen het venster van de potentiëring. |
| Ploegentijdrit | 25 | 5 @50-60 · 4 @60-80 · 3 @85-95 · 2 los · 2 x (1 @110-120 kop, 1 @80-85 wiel) · 3 los · 2 bursts (versnelling) · 2 los | Het ritme van de race zelf, plus twee versnellingen voor het op gang brengen van de trein. |
| Lange wedstrijd | 12 | 5 @50-60 · 3 @65-75 · 1 @90-100 · 1 los · 1 burst · 1 los | Glycogeen en warmte sparen. Eén burst kost vrijwel niets. |
| ZRL kort | 10 | 3 @50-60 · 3 @65-85 · 1 @100-110 · 1 los · 2 bursts | Het minimum dat principe 1 en 2 nog raakt. |

Scratch en puntenrace delen één warming-up: een verschil tussen die twee is
uit de literatuur niet te verdedigen.

## Open

De burst gaat naar intervals.icu als een stap van 6 seconden op 150-200% FTP.
Of een stap met vrij rijden (ERG uit) beter werkt, en of de FIT-generator van
intervals.icu die aankan, is niet getest: dat vraagt een push naar een echt
account. In ERG loopt een smart trainer bij 6 seconden een paar tellen achter.
