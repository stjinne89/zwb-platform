# Voorstel: een doeltijd als trainingsdoel

Vraag van een lid (oktober 2026): kan het platform een trainingsplan bouwen
vanuit de eindtijd die ik in een gran fondo wil rijden?

## Conclusie

Een schema dat een eindtijd *belooft* is niet te onderbouwen; een schema dat de
doeltijd als *toetssteen* gebruikt wel. Daarom geen nieuwe schemagenerator,
maar drie dingen bovenop wat er al is:

1. **Haalbaarheidsoordeel.** Met de huidige vorm, het parcours en het
   pacingmodel: wat is de snelste haalbare tijd, en hoeveel CP is er nodig voor
   de doeltijd? Afgezet tegen een vuistregel voor wat een renner in de tijd tot
   de doeldatum redelijkerwijs wint.
2. **Nadruk in het schema.** Waar de tijd op dit parcours zit (klimmen of vlak,
   duur, verval laat in de rit) gaat als `goal.targetTime.emphasis` naar de
   schema-AI. De periodisering, de uren en de herstelregels blijven zoals ze
   zijn.
3. **Tussentijdse prognose.** Elke week (en na elke wijziging in CP of
   gewicht) een nieuwe prognose, zodat het lid ziet of het de goede kant op
   gaat.

## Wat wel en niet te onderbouwen is

**Benodigd vermogen voor een tijd: goed.** Het pacingmodel rekent al van een
eindtijd terug naar een plan (`fitPlanToTime`, wens 7), met CP, W′, de
vermogenscurve en de durability uit de vermoeidheidscurves. Grootste
onzekerheden in een gran fondo: rijden in een groep, wind, stops en CdA.

**Groei van CP in een paar maanden: alleen als bandbreedte.** Bij getrainde
renners vonden studies na drie tot zes weken +3,5 % CP (Mitchell 2019,
doi:10.1152/japplphysiol.01082.2017), +5 % CP (Galán-Rioja 2022,
doi:10.23736/s0025-7826.22.04028-5), +5,5 % FTP tegen +1,2 % in de controlegroep
(Bennett 2021, doi:10.1371/journal.pone.0260959), en +9 % drempelvermogen bij
gepolariseerd trainen tegen +2 % bij drempeltraining (Neal 2013,
doi:10.1152/japplphysiol.00652.2012). Over zeven maanden ging het maximale
lactaat-steady-state-vermogen maar 12 W omhoog (Inglis 2020,
doi:10.1123/ijspp.2019-0214): de groei vlakt af. Per persoon verschilt het
sterk, en zelfs bij dezelfde persoon is de reactie op hetzelfde blok slecht te
herhalen (Odden 2026, doi:10.1152/japplphysiol.00154.2026). Een voorspelling
per lid is dus niet te maken; een vuistregel voor de redelijke bovenkant wel.

**Vuistregel (een eigen keuze, geen grens uit onderzoek):** 0,75 % CP per week
voor de eerste twaalf weken, daarna 0,25 % per week, met een maximum van 12 %.
Valt de benodigde groei daarbinnen, dan heet het oordeel "haalbaar met groei";
tot twee keer zoveel "ambitieus"; daarboven "niet realistisch voor deze
datum". Zonder doeldatum noemt het oordeel alleen de benodigde groei.

## Keuzes van de eigenaar (2026-10-20)

- **Gewicht als gevoeligheid, niet als doel.** Het oordeel noemt hoeveel tijd
  één kilo op dit parcours scheelt, naast wat één procent CP scheelt. Er komt
  geen streefgewicht en geen "of X kg lichter": het besluit "geen
  afvalfunctie" uit de voedingsrondes (IOC REDs-consensus) blijft staan.
- **Parcours uit een ZWB-event of een eigen GPX.** Een event moet een GPX
  hebben; Zwift-routes vallen buiten deze ronde. Van een eigen GPX bewaart het
  platform alleen het hoogteprofiel (afstand en helling per 100 m, plus de
  klimmen), geen coördinaten: zo staat er geen locatiedata van het lid in de
  database, ook niet als de route bij huis begint.
- **Alleen of in een groep, te kiezen bij het doel.** In een groep rekent het
  model met 25 % minder luchtweerstand over de hele rit. Een AANNAME: achter
  één renner scheelt het 27 tot 49 % (Blocken 2013,
  doi:10.1016/j.compfluid.2012.11.012; Barry 2014,
  doi:10.1016/j.proeng.2014.06.131), midden in een peloton tot 90 % en meer
  (Blocken 2018, doi:10.1016/j.jweia.2018.06.011). In een gran fondo zit je
  ook op kop, in een gat of alleen op een klim, dus het gemiddelde ligt lager.
  Op een klim is het effect in het model vanzelf klein: daar is de snelheid
  laag.

## Nadruk: de regels

Uit de doorrekening met de huidige vorm, hoogstens drie, in deze volgorde:

| Nadruk | Wanneer |
|---|---|
| Klimmen (drempel en VO2max in klimduur) | ≥ 35 % van de rijtijd op klimmen |
| Drempel en sweetspot in lange blokken | anders |
| Lange duurritten | doeltijd ≥ 2,5 uur en de langste rit van de laatste 8 weken < 75 % daarvan |
| Duurvermogen laat in de rit | doeltijd ≥ 3 uur en verval ≥ 8 % of onbekend |

Zonder vermoeidheidscurves rekent het model zonder verval, net als het
pacingplan; de prognose is dan aan de snelle kant. Dat staat erbij, en
"duurvermogen" komt dan in de nadruk.

## Bewust niet

- **Geen eigen periodisering vanuit de doeltijd.** Opbouw, taper, uren en
  herstel blijven de bestaande regels van de schema-AI.
- **Geen belofte.** De AI noemt geen verwachte finishtijd en zegt bij een
  onrealistisch oordeel in de cautions dat de doeltijd waarschijnlijk buiten
  bereik ligt.
- **Geen wind, geen stops.** Net als in het pacingplan.
- **Geen Zwift-routes als doelparcours.** Die vragen de Zwift-fysica en
  eventregels; een doeltijd in Zwift kan al via het pacingplan van het event.
