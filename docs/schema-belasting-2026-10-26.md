# Te voorzichtig en te veel duur: het schema stuurde op uren

**Onderzocht op 2026-10-26**, na meldingen van meerdere leden dat schema's te
voorzichtig opbouwen en veel duur bevatten. Gemeten in productie (alleen lezen,
via de Supabase-connector): de laatste generatie per lid van de afgelopen zestig
dagen (18 leden) en de geplande AI-workouts van 26 oktober tot 23 november.

## Conclusie

Het schema plande in uren en niet in belasting. De prompt werkte toe naar
`goal.maxHoursPerWeek` (piekweek ≥ 85 % daarvan) en hield `recentLoad.hoursPerWeek`
als ondergrens. Hoeveel belasting er in die uren zat, telde nergens mee. De AI
vulde de uren met rustige duur. Het gevolg: wel meer uren, maar evenveel of
minder belasting dan het lid nu al rijdt. Dat voelt te voorzichtig en tegelijk
als "veel duur".

Daarbij was `maxHoursPerWeek` verkeerd gelezen. Het lid geeft beschikbare tijd
op, en dat getal werd het doel van de opbouw. Besluit van de eigenaar
(2026-10-26): beschikbaarheid is alleen de tijd die er is. Wat het lid aankan
volgt uit de CTL, en de verdeling volgt de kennisbank (trainingsleer). Er is geen
maximum aan het aantal sleutelsessies, zeker niet in de winter met meer binnen
rijden.

## Wat de schema's lieten zien

- 68 % van de geplande AI-sessies was duur (`endurance`), gemiddeld 96 minuten.
- 85-96 % van de geplande minuten lag in zone 1-2, inclusief inrijden en herstel
  tussen intervallen. Boven drempel lag 1-8 %.
- De gemiddelde sessie was 1,4 tot 2,3 keer zo lang als wat het lid gewend is
  (`recentLoad.avgDurationMinutes`), bijvoorbeeld 106 tegen 47 minuten. De regel
  "geen hersteltraining onder 90 minuten" maakt van korte ritten rustdagen, dus
  er blijven minder en langere ritten over.
- Geplande belasting, geschat uit de zone van elk blok: 41-47 TSS per uur. Per
  week lag die bij de meeste leden op of onder CTL × 7, en bij een paar
  20-50 % eronder.

## De drie aannames

**1. Zonder historie begint een lid bij 0: deels waar.** Van de 288 generaties
(nieuw en bijwerking) hadden er 9 (3-4 leden) `recentLoad.hoursPerWeek = 0`. Alle 9
hadden een CTL boven 20 in intervals.icu. `buildRecentLoad()` las alleen
`strava_activities`: bij één lid kwamen de ritten pas drie dagen na het schema
binnen, een ander had er geen enkele in ZWB terwijl zijn CTL 78 was. De AI begon
daar niet bij nul, want hij gebruikte de CTL, maar de ondergrens viel weg. Er
was nergens een ondergrens in belasting, ook niet voor leden mét historie.

**2. Eén race geeft minder intensieve trainingen: waar.**

| Week | Sleutelsessies van de AI | Weken zonder sleutelsessie |
|---|---|---|
| geen race (82 weken) | 0,77 | 35 % |
| 1 race (27 weken) | 0,22 | 81 % |
| 2+ races (10 weken) | 0,10 | 90 % |

De race verving de training in plaats van erbij te komen. De ZRL-regel zei "één
VO2max-, anaerobe of raceprikkel" en de race telde als die prikkel. Ook zonder race
noemde de prompt nergens een aantal sleutelsessies per week.

**3. Winter en indoor: waar, en dit weegt het zwaarst.** Gereden in de laatste 28
dagen (TSS uit NP en FTP): binnen 55-80 TSS per uur (mediaan ongeveer 62), buiten
42-60. Bij dezelfde leden lag binnen zo'n 20-30 % hoger. Gepland: 41-47. De prompt
kende geen TSS, geen indoor en geen seizoen. `goal.preferredMode` ging wel mee in
de invoer, maar geen regel gebruikte het.

De naleving liet het ook zien: bij meerdere leden werden rustige ritten "vaak
langer of harder" gereden dan gepland, en de AI antwoordde met "houd het echt
rustig".

## Wat er veranderd is

Zie PLAN.md, ronde "Schema stuurt op belasting uit de CTL" (2026-10-26).

## Voorbehoud

- De geplande TSS is een schatting uit de zone van elk blok (midden van de band).
  Een gereden rit met NP komt zo'n 5 % hoger uit. Vaste races en de optionele
  rustdagrit zitten er niet in.
- Bij drie leden liep het schema in de gemeten week af; die tellen niet mee in de
  vergelijking van uren per week.
- Een kleine groep (18 leden), één moment in het seizoen.
