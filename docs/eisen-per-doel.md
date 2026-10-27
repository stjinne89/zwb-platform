# Eisen per doel: wat een doeltijd van je steen vraagt

Wens van de eigenaar (2026-10-26): JOIN gebruikt de JOINscore om te zeggen of je
getraind genoeg bent voor de Amstel Gold Race of de Marmotte. Kan ZWBriljant dat
ook?

## Conclusie

Ja, voor twee onderdelen van de steen, en alleen bij een doel met een doeltijd
(eigenaar: "aankunnen" is een eigen doeltijd):

- **Drempel:** je beste 20 minuten per kilo (`wkg_20m`, dezelfde waarde als de
  steen), maal de factor waarmee je hele vermogensprofiel de doeltijd haalt. Dat
  is dezelfde factor als de benodigde CP in de doeltijdprognose. Is de doeltijd al
  haalbaar, dan zoeken we omlaag tot 0,5: hoeveel minder het mag zijn.
- **Fitheid:** de geschatte belasting van de rit in de doeltijd (uren × IF² × 100,
  met genormaliseerd vermogen over de segmenten van het snelste plan en CP als
  FTP), gedeeld door 7. Daarnaast de CTL van de laatste rit in intervals.icu,
  teruggerekend naar vandaag (× e^(−dagen/42)).

De totaalscore van de steen is de verkeerde maat: sprint, anaeroob, racen en
consistentie tellen daarin mee en beslissen geen toertocht. VO2max krijgt geen
eigen eis, omdat het pacingmodel het hele vermogensprofiel met één factor
opschaalt; een losse VO2max-eis zou hetzelfde getal anders verpakken.

**Durability niet** (eigenaar, 2026-10-26, na het onderzoek hieronder).

## Onderzoek 1: steenverval tegen het verval in de prognose

Vraag: kan de durability-klasse van de steen worden omgerekend naar het CP-verval
dat de doeltijdprognose gebruikt? Dan zou een durability-eis kunnen.

Gerekend op productie (alleen gelezen, 2026-10-26) bij de 17 van de 28 leden met
vermoeidheidscurves in `rider_power_profiles.curve_points_fatigue`, met de echte
functies: `durabilityDecline(fatigueInputs(...))` voor de steen en
`buildDurabilityModel` voor de prognose. Het steenverval is in % per 10 kJ/kg;
"lineair" is dat verval recht doorgetrokken naar de kJ-stand.

| Lid | Steen (%/10 kJ/kg) | Prognose na 1000 kJ | Steen lineair | Prognose na 2000 kJ | Steen lineair |
|---|---|---|---|---|---|
| A | 0,0 | 5,6% | 0,0% | 14,0% | 0,0% |
| B | 0,8 | 3,9% | 1,0% | 25,0% | 2,0% |
| C | 0,1 | 6,4% | 0,2% | 24,3% | 0,4% |
| D | 1,0 | 17,5% | 1,2% | 22,3% | 2,4% |
| E | 0,0 | 6,2% | 0,0% | 14,2% | 0,0% |
| F | 0,0 | 1,7% | 0,0% | – | – |
| G | 11,3 | 13,6% | 14,1% | – | – |
| H | 8,4 | 11,0% | 10,1% | 25,0% | 20,2% |
| I | 8,6 | 9,5% | 10,4% | 24,2% | 20,9% |
| J | 9,4 | 11,8% | 12,8% | 13,5% | 25,0% |
| K | 6,8 | 8,6% | 9,3% | 14,6% | 18,7% |
| L | 5,7 | 21,4% | 8,2% | 25,0% | 16,4% |
| M | 11,0 | 18,9% | 14,2% | – | – |
| N | 10,4 | 19,7% | 16,7% | – | – |
| O | 6,4 | – | – | 25,0% | 13,7% |

Twee leden staan er niet in: hun vermoeide curve had te weinig punten voor een
CP-fit. Bij lid O begint de vermoeide curve pas na 2000 kJ.

Uitkomst: bij leden met een steenverval van 5 of meer klopt het na 1000 kJ
redelijk (binnen een paar procentpunten, op één na). Maar zes leden hebben op de
steen hooguit 1% verval, dus Diamant, terwijl de prognose 2 tot 18% CP-verlies na
1000 kJ en tot 25% na 2000 kJ rekent. De oorzaak zit in wat er gemeten wordt: de
steen neemt het eerste kwart (P25) van het verval over tien duren van 1 tot 20
minuten op de laagste kJ-stand. Een vermoeide beste waarde is een ondergrens, en
wie zijn beste korte inspanningen laat in een rit reed, heeft op die duren geen
verval. De prognose fit CP en W′ op elke kJ-stand en kijkt dus naar het lange
vermogen. Een eis als "durability Goud, jij Diamant" naast een prognose die je laat
inzakken, spreekt zichzelf tegen.

Keuzes die er lagen: durability weglaten, een eis in CP-verlies zonder klasse, of
eerst de steen laten meten zoals de prognose. De eigenaar koos weglaten. Het
verval blijft zichtbaar in de prognose en als nadruk in het schema.

## Onderzoek 2: welke CTL bij welke eventbelasting

Er is geen bron die zegt welke CTL je nodig hebt voor een rit van een bepaalde
belasting. Daarom geijkt op de club zelf (productie, alleen gelezen, 2026-10-26):
fietsritten van drie uur of langer in `intervals_activities`, met de belasting
(`training_load`) en de CTL van die dag (`raw.icu_ctl`, die bij de laatste rit
overeenkomt met de fitheid op de steen).

- 373 ritten van drie uur of langer bij 15 leden; 167 van vier uur of langer.
- Over alle ritten van vier uur of langer: belasting gedeeld door CTL mediaan 2,6,
  P90 5,7. Die verdeling wordt gedragen door twee leden met een CTL boven 100 en elk
  32 lange ritten; voor hen is een lange rit geen rek.
- Per lid de rit die het verst boven de CTL lag: van 2,6 tot 9,5 keer. De helft
  kwam tot 7 keer of verder. Drie leden met een CTL rond 33 reden ritten van 256 tot
  335 TSS uit.

Gekozen: **7**, de mediaan van wat leden hoogstens uitreden. Met P90 over alle
ritten (5,7) zouden die drie leden hun eigen ritten niet aankunnen. Het blijft een
schatting: wie een rit uitrijdt, zegt niets over wie hem niet uitreed, en een rit
uitrijden is iets anders dan hem in een doeltijd rijden. Daarom staat het zo op
`/hulp`.

## Voorbeeld

Een man met 3,56 W/kg op 20 minuten staat op drempel Platina 424. Vraagt de
doeltijd 8% meer, dan is de eis 3,84 W/kg, Platina 486 (op de afronding van de
opslag na). Een Marmotte van achteneenhalf uur met IF 0,68 is ongeveer 393 TSS;
393 ÷ 7 = CTL 56, Platina 460.

## Wat niet gebouwd is

- **Durability**, zie onderzoek 1.
- **Zonder doeltijd** ("rustig uitrijden"): zonder durability blijft alleen een
  fitheidseis over, op een duur die we dan zelf moeten kiezen. Te weinig voor een
  eigen regel; het doel heeft een doeltijd nodig.
- **Bij elk event in de kalender** of op de pacingpagina: de eisen hangen aan de
  bewaarde prognose van een doel, die per week wordt ververst. Eerst één plek.
- **Voor de trainer**: de trainer ziet de doeltijdkaart, maar niet de regels met
  de steen. Anderen zien de steen alleen als het lid hem deelt.
