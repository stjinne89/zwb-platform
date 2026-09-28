# ZWBgame — bouwplannen voor ZRL en FRR-tours

Opgesteld 28 september 2026, na spelversie 4 (Zwift-engine en Club Ladder, zie
[ZWBgame](zwbgame.md)). **Status (28 september, avond): stap 0, ZRL en FRR zijn gebouwd
(spelversie 5).** Hoe FRR van dit plan afwijkt, staat in de FRR-sectie. Wat van stap 0 nog openstaat, staat hieronder
per punt. Twee rondes op dezelfde
engine, met eerst een gedeelde stap 0. Wat hier "na te lezen" heet, moet vóór de
bouw aan de bron worden gecontroleerd; zonder dat bouwen we een eigen variant en
zeggen we dat ook.

Aanbevolen volgorde: stap 0 → ZRL → FRR. De ZRL-ronde loopt nu (ronde 1 tot 27
oktober, ronde 2 vanaf 17 november), dus oefenen op de route van dinsdag heeft nu
de meeste waarde.

## Stap 0 — gedeeld, vóór beide spelvormen

1. **Segmentpassages in de engine.** Per renner per benoemd segment de tijd bij
   begin en einde vastleggen (`RaceState.passes`, alleen renner-index, segment-index,
   begin, einde). Daaruit volgen FAL (volgorde over de eindstreep van het segment)
   en FTS (tijd over het segment). Bewaard in de race-opslag, zonder namen.
2. **Slipstreamregel per race:** `RaceConfig.draft = "all" | "none" | "team"`. `none`
   voor Race of Truth en individuele tijdrit, `team` voor de ploegentijdrit. Nu
   zit de beschutting vast in `stepRace` (`shelter`); dat wordt een filter.
3. **Gespreide start:** `startOffset` per renner (seconden), voor een iTT per renner.
   Een renner rijdt pas als de klok zijn start passeert. *Nog niet gebouwd: de
   ZRL-ploegentijdrit heeft hem niet nodig (ploegen starten samen, alleen het eigen
   wiel telt); komt met FRR.*
4. **Groter veld.** ZRL en FRR hebben 30 tot 60 renners. `stepRace` sorteert nu per
   renner alle renners voor zich (n² log n). Eén sortering per stap en een venster
   rond de eigen index; meten dat 60 renners onder ~2 ms per stap blijven.
   *Gebouwd: één sortering per stap. Gemeten met 30 renners: 0,4–0,7 s per race;
   60 renners niet gemeten.*
5. **Routes uit de clubkalender.** Naast `LADDER_ROUTES` de route van een ZWB-event
   van het type `zrl` of `flamme_rouge` in de komende 14 dagen, met
   `events.zwift_route_id` en `laps` (dezelfde velden als het pacingplan). In de
   lobby: "Oefen de ZRL van dinsdag". Valt terug op de vaste lijst als het event
   geen route heeft of het profiel ontbreekt.
6. **Langere races.** ZRL is 25–45 km, een FRR-etappe 30–60 km. `timeScale` is nu
   begrensd op 10; voor 60 km (±90 min) wordt dat 12–14 om onder 8 minuten te
   blijven. Beeld controleren: de berm-markeringen staan al op 24 m.
7. **Segmentbewuste bots.** Rollen per ploeg: een puntenjager (sprinter) rijdt voor
   FAL op sprintbogen, een klimmer voor FTS op KOM's, de rest voor de finish.
   Bots rijden een FTS-segment op tempo (W′ doseren over de lengte). *Gebouwd als
   één puntenjager per ploeg; een KOM rijdt hij nu op aanvalstempo, nog niet
   gedoseerd.*
8. **Scoring als losse functie per spelvorm** (`ladder.ts` is het model): puur,
   testbaar, zonder React.

Tests stap 0: passages kloppen met de posities (ook over ronden), `draft: "none"`
geeft nooit beschutting, `team` alleen achter een ploeggenoot, gespreide start, en
een veld van 60 renners haalt de tijd per stap.

## ZRL (WTRL Zwift Racing League)

**Regels die al in de repo staan** (`docs/live-zrl-dashboard.md`, gelezen van
wtrl.racing/zrl/resources op 22 september 2026), puntenrace:

| Onderdeel | Regel |
| --- | --- |
| FAL | Per passage krijgt de eerste het aantal starters, dan telkens 1 minder. |
| FTS | Per segment over de hele race: top 10, 15-12-10-8-6-5-4-3-2-1. |
| FIN | De eerste finisher krijgt het aantal starters, aflopend. |
| Podium | 10-8-6-4-2 voor de eerste vijf. |
| DNF | Punten vervallen en schuiven niet door. |
| Team | Som van de renners; volle leaguepunten alleen met 4 starters. |

Ploeg: maximaal 10 op de roster, 5 per race (`MAX_PER_RACE`). Week 1 van een ronde
is altijd een Race of Truth (puntenrace zonder stayeren).

**Hergebruik.** `scoreRace` uit `src/lib/zrl-live/scoring.ts` rekent de puntenrace
al uit passages: de engine levert `Passage` (athleteId = renner-index, `ts` =
racetijd in ms, `elapsed` = tijd over het segment) en de finishvolgorde. Geen
nieuwe telling schrijven.

**Spelvormen in de game.**
- *Puntenrace*: `scoreRace` op de engine-passages.
- *Race of Truth*: puntenrace met `draft: "none"`.
- *Scratch*: finishvolgorde. Nagelezen 28 september: finish plus podium.
- *Ploegentijdrit*: `draft: "team"`, ploegen gespreid gestart. Bediening: "Op kop"
  en "Wissel" naast de standen; bots wisselen op W′. Nagelezen: de vierde renner
  bepaalt de tijd, er zijn geen individuele punten, en met minder dan vier finishers
  heeft een ploeg geen uitslag. *Gebouwd zonder aparte knoppen: in het wiel is
  Meerijden sneller dan de kop, dus de beurten wisselen vanzelf.*

**Veld.** Zes tot acht ploegen van vijf, rond jouw niveau (zoals de ladder). Jouw
ploeg is je ZWB-ZRL-team (`teams.type = 'zrl'` via `team_members`), anders
clubgenoten van jouw niveau. De tegenstanders zijn clubploegen: echte WTRL-teams
hebben we niet, en WTRL verbiedt het ophalen van hun gegevens
(`src/lib/teams/zrl-season.ts`).

**Wat je leert.** Een FAL-sprint winnen kost W′ die je voor de finish nodig hebt.
Een FTS-segment wint wie het segment goed doseert, niet wie het eerst boven is.
Taken verdelen in je ploeg: puntenjager, klimmer, finisher. In de Race of Truth:
je eigen tempo rijden zonder wiel.

**UI.** Een segmentbalk: volgend segment, FAL/FTS, afstand. Een live puntentabel
per ploeg en per renner. Ploegorders krijgen er "Pak de FAL" bij (een ploeggenoot
jaagt op de volgende sprintboog). Uitleg gaat naar `/hulp#zwbgame`, niet in het
scherm.

**Optioneel, eigen keuze:** een mini-ronde van vier races met een ploegenklassement
in de browser. Leaguepunten (nagelezen): evenveel als er ploegen zijn voor de winnaar, dan één
minder. *Mini-ronde niet gebouwd.*

**Tests.** De engine-passages door `scoreRace` geven dezelfde uitkomst als een met
de hand uitgerekende race. Race of Truth zonder beschutting. TTT alleen achter
ploeggenoten, met de juiste ploegtijd. DNF-punten vervallen. De puntenjager-bot
pakt vaker de FAL dan een gewone bot. En een race van 60 renners blijft
deterministisch bij opslaan en hervatten.

**Grootte:** een eigen ronde, ongeveer een dag bouwen na stap 0.

## FRR-tour (Flamme Rouge Racing)

**Regels** (flammerougeracing.com/tour-rules, gelezen 28 september 2026):
- Klassen: tien FRHC-klassen gelijk aan de vELO-klassen van ZwiftRacing.app.
- **GC:** het laagste opgetelde **eGAP**: per etappe de tijd achter de winnaar van
  jouw klasse en geslacht. Alleen wie alle etappes rijdt, komt in de klassementen.
- **Finishpunten** 1–10: 25, 20, 16, 13, 11, 10, 9, 8, 7, 6; daaronder minstens 1.
  **Na te lezen:** de tabel onder plek 10 (staat als afbeelding op de site).
  Tijdritetappes: dubbele punten.
- **Klimmen** (bolletjes): punten op de snelste tijd (FTS) × moeilijkheid CDR 1–5
  (×1 tot ×5). **Sprints** (groen): FTS × SSR, ×1 / ×1,1 / ×1,3 / ×1,5 / ×1,7.
  **Na te lezen:** hoeveel plekken per segment scoren en met welke tabel.
- **Truien:** GC (eGAP), groen (sprintpunten), bolletjes (klimpunten), blauw
  (finish + sprint + klim).
- **Bezemwagen:** buiten een per etappe gekozen percentage van de tijd van de
  klassewinnaar (voorbeeld 20%) kost 20 punten op het tourtotaal.
- Ploegenklassement en straffen bij klasse-upgrades: niet in de game.

**Spelvorm in de game.** Een tour van drie tot vijf etappes in plaats van 7–21:
vlak, heuvelachtig, een individuele tijdrit (`draft: "none"` en gespreide start) en,
als het routeprofiel er is, een bergetappe. Elke etappe duurt 5–8 minuten. Het
veld is rond jouw niveau; je klasse is het hele veld. Tourstand in de browser:
etappe-uitslagen, eGAP, punten per trui en de huidige etappe. Hervatten gaat per
etappe.

**Eigen keuzes (niet van FRR).** CDR per klim uit hoogtemeters (bijvoorbeeld < 30 m
= 1, < 60 = 2, < 120 = 3, < 250 = 4, anders 5). SSR per sprint: finishsprint
hoger dan een tussensprint. FRR kiest die per etappe zelf; wij leiden ze af en
zeggen dat in de hulp.

**Wat je leert.** Voor het klassement telt tijd, dus een splitsing missen kost je de
tour, ook als je de sprint wint. Punten voor groen of de bolletjes kosten W′ die je
in de finale mist. De tijdrit is W′ doseren zonder wiel. De bezemwagen straft wie te
ver terugvalt.

**UI.** Een touroverzicht met etappes, truien en het GC na elke etappe. De etappe
zelf gebruikt de bestaande HUD met de segmentbalk uit ZRL.

**Tests.** eGAP optellen, alleen volledige deelnemers in een klassement, dubbele
tijdritpunten, CDR- en SSR-factoren, bezemwagenstraf, blauwe trui als optelsom, en
de tourstand hervatbaar en zonder namen in de opslag.

**Routes.** Een bergetappe vraagt lange klimmen (Alpe du Zwift, Ven-Top) in
`zwift_routes`; zonder profiel valt die etappe weg. Dat is productiedata die lokaal
niet te controleren is.

**Grootte:** een eigen ronde, ongeveer anderhalve dag bouwen na stap 0 en ZRL.

**Zo gebouwd (28 september).**
- Vier etappes: vlak, heuvel, tijdrit en slotrit.
- De tijdrit is een Zwift-tijdrit: iedereen start tegelijk, zonder slipstream en
  zonder powerups. Een gespreide start is daardoor niet nodig.
- De FRR-puntentabellen (afbeeldingen) laden niet op hun site. Daarom eigen punten na
  plek 10 en voor segmenten; zie [ZWBgame](zwbgame.md).
- **Niet gebouwd:** klassen, ploegenklassement, koninginnenritten en etappes uit de
  clubkalender.

## Open vragen voor de eigenaar

1. ~~Eerst ZRL, met de route uit de clubkalender~~ — gedaan.
2. ZRL als losse races (gebouwd), of ook een mini-ronde met ploegenklassement?
3. De ploegentijdrit wisselt nu vanzelf. Zijn eigen knoppen voor "Op kop" en
   "Wissel" gewenst?
4. ~~FRR: drie of vijf etappes per tour?~~ Gebouwd met vier. Is dat goed?
5. Je ZRL-team als ploeg: gebruikt je teamlidmaatschap, zoals nu bij de ladder.
   Moet de privacyverklaring daar een zin over krijgen?
