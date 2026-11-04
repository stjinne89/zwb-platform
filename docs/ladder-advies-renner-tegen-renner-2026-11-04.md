# Ladderadvies: renner tegen renner (2026-11-04)

Onderzoek bij de ronde "Club Ladder: advies renner tegen renner, intervals.icu
eerst" in `PLAN.md`. Alles alleen-lezend op productie (Supabase-connector),
gerekend in een wegwerpscript buiten de repo.

## 1. Waarom Gina niet meetelde

- Selectie ZWBandits tegen SZ Loki (event `dcd6c769…`): Gina van Rossum, Gonda
  Beltman, Harmen Reinders, Jeroen Janssen, Koen Jansen.
- Het advies kende twee bronnen: 90 dagen van ZwiftRacing
  (`zwift_rider_metrics.power_wkg`), anders de ladderraces. Gina had geen van
  beide (`velo_fetched_at` leeg, 0 ladderrijen). Haar Zwift-ID kwam op
  2026-11-04; de laatste ophaalronde voor de anderen was 2026-11-03 21:27 UTC.
- De ladderpagina vulde ZwiftRacing niet aan: `loadScores` doet dat alleen voor
  de bronnen `velo2`/`zrs`, en de pagina rekent sinds 0301 met legacy vELO.
- Haar intervals.icu-curve bestond wel (1 min 392 W, 5 min 254 W, 20 min
  222 W), zonder gewicht: haar gewicht (59 kg, profiel) kwam om 12:12:36 UTC,
  vóór de code die daarop opnieuw synct live stond (12:16:17 UTC in de logs).

## 2. intervals.icu tegenover ZwiftRacing

16 leden met beide bronnen (W/kg = watt uit `rider_power_profiles` gedeeld door
het gewicht uit intervals.icu of het profiel). Log-verschil intervals.icu min
ZwiftRacing:

| Duur | Gemiddeld | Mediaan | SD |
|---|---|---|---|
| 15 s | +5,8% | +2,3% | 9,7% |
| 1 min | +6,0% | +3,7% | 7,3% |
| 5 min | +0,9% | +0,1% | 3,4% |
| 20 min | −0,1% | −0,1% | 2,8% |

Bij 5 van de 16 zijn 5 en 20 minuten gelijk (binnen 1%): hun beste inspanningen
zijn Zwift-races. Gevolg: met intervals.icu voor ons en ZwiftRacing voor de
tegenstander valt het advies op korte duren gemiddeld een paar procent in ons
voordeel uit. Niet gecorrigeerd (te weinig renners voor een vaste correctie).

## 3. Winstkans met toeval (gebouwd en weer verwijderd)

Eerst gebouwd: per renner sterkte op het parcours plus normaal verdeeld toeval,
4000 gesimuleerde races; bij 5 tegen 5 wint wie minstens 13 van de 25 duels
wint (15 punten plus de gewonnen duels). De eigenaar wilde geen toeval maar een
directe vergelijking; de code is weg. De ijking, voor als het terugkomt:

- Data: 45 bewaarde ladderraces met renners (416 rijen), 2025-12-18 tot
  2026-11-04. Paargewijze probit (kans dat i voor j finisht) op de finishvolgorde,
  sterkte zoals `routeRatings`, met de routeweging en het gewicht.
- σ per renner (log-W/kg): 0,21 met 90 dagen van ZwiftRacing (161 renners),
  ~0,6 met alleen vermogen uit hun andere ladderraces (69 renners, randwaarde).
  Een paar met 10% verschil: de sterkere finisht in ~63% voor de ander.
- Volgorde-overeenkomst per paar: 59% met ladderraces (leave-one-out), 67% met
  90 dagen, 71% met het vermogen uit de race zelf (lekt de uitslag).
- Spreiding van de sterkte binnen een ploeg: mediaan 0,09.
- Kanttekeningen: de 90-dagenwaarde is van nu, niet van de racedag (lekt bij
  recente races, veroudert bij oude); paren in één race zijn niet onafhankelijk;
  maar 7 races hadden aan beide kanten genoeg vermogen om de winstkans achteraf
  te toetsen, te weinig voor een uitspraak.
