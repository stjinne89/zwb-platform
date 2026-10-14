---
name: zrl-analyse
description: Analyse van een gereden ZRL-race voor één ZWB-team: efficiëntie en kwaliteit per renner en voor de ploeg, naast de planning (opstelling, ZwiftGopher-plan, TTT-bot). Draait op de eigen pc van de eigenaar, met .env.local en het botlogboek. Gebruik bij "analyseer de ZRL van <datum> voor <team>".
argument-hint: "[team] [datum], bv. Bdev 2026-10-13"
---

# ZRL-race analyseren: per renner en voor de ploeg

Opdracht van de eigenaar (2026-10-14): "Maak op basis van de gegevens van de ZRL
van gisteren voor team Bdev en de planning een analyse van de efficiëntie en de
kwaliteit van de prestatie, per renner en voor het hele team." Eerste keer:
**ZWB Bdev, 13 oktober 2026**, de ZRL-ploegentijdrit van 20:08 tot 20:50 (18:08 UTC).
Zonder argumenten geldt die race.

Dit kan niet in een cloudsessie: daar blokkeert het netwerk zwift.com, en
`.env.local` en `bot/.cache/` ontbreken. Op de eigen pc wel.

## Spelregels

- **Alleen lezen.** Niets schrijven naar Supabase, niets bevriezen, geen
  `POST /api/zrl/freeze`, geen follows bij Zwift. Geen code wijzigen voor deze
  analyse. Een hulpscript hoort in `.tmp/`.
- **Persoonsgegevens blijven lokaal.** Ruwe data en het rapport komen in
  `.tmp/zrl-analyse/<datum>-<team>/` (staat in `.gitignore`). Niets daarvan
  committen, en niet in `PLAN.md` of `docs/` zetten: vermogen, gewicht en
  hartslag van ploeggenoten horen niet in git. Publiceren (doc, artifact) alleen
  als de eigenaar daarom vraagt.
- **WTRL niet ophalen.** WTRL verbiedt het ophalen en verwerken van hun
  uitslagen (`src/lib/teams/wtrl-results.ts`). Een eindplaats of tijd van WTRL
  gebruik je alleen als de eigenaar die zelf opgeeft.
- **Trainingsdata van leden alleen na een ja van de eigenaar.**
  `intervals_activities` en `strava_activities` zijn volgens RLS alleen voor het
  lid en zijn trainer. De service-role omzeilt dat. Vraag het eerst. De race-data
  van Zwift (wat ook in de game en op ZwiftPower te zien is) is de basis.
- **Zwift ontzien.** `race-results/entries` staat 2 verzoeken per seconde toe
  voor het hele serviceaccount: vraag ze één voor één op met ≥550 ms ertussen
  (zie `RESULTS_SPACING_MS` in `src/lib/events/zwift-club.ts`). Niet draaien
  tijdens een live ZRL-avond.
- **Gemeten en aangenomen scheiden.** Bij elk getal moet de bron te herleiden
  zijn. Ontbreekt iets, dan staat dat in het rapport. Niets invullen of schatten
  zonder dat te zeggen.

## Stap 1: bronnen verzamelen

Leg alles ruw vast in de map uit de spelregels, één bestand per bron, en noteer
in `bronnen.md` wat lukte en wat niet.

1. **Team en event (Supabase, service-role uit `.env.local`).**
   - `teams`: het team waarvan de naam op het argument eindigt (bv. "ZWB Bdev").
     `zrlCategoryFromTeamName` in `src/lib/events/zwift-route.ts` kent de vormen.
   - `events` op die datum met `team_id` van dat team: `id`, `title`,
     `start_at`, `zwift_event_id`, `zwift_route_id`, `laps`.
   - `team_event_lineups` voor dat event en team: de opstelling (`slot`, `role`,
     `note`) met de `profiles` erbij (naam, `zwift_id`). Dat is "de planning" van
     wie er zou rijden.
   - `ttt_plans` voor dat event (`api_response`, `export_snapshot`): alleen als
     de planner van het platform is gebruikt. Op 13 oktober kwam het plan uit
     ZwiftGopher.
   - `zrl_race_snapshots` met `zwift_event_id`: de bevroren ruwe Zwift-data
     (startlijst, uitslag, segmentpassages; vorm `RaceData` in
     `src/lib/zrl-live/snapshot.ts`). Kan ontbreken: of de freeze-job draait is
     niet vastgesteld (PLAN.md, "Handwerk op productie", ZRL).
   - `zrl_team_results` voor het event: plaats en punten van het team, zoals het
     platform ze telde.

2. **Zwift (serviceaccount uit `.env.local`).** Hergebruik
   `src/lib/events/zwift-club.ts` in plaats van eigen calls te schrijven. Buiten
   Next draaien kan door een script in `.tmp/` te bundelen:
   `npx esbuild .tmp/<script>.ts --bundle --platform=node --format=esm --packages=external --alias:@=./src --outfile=.tmp/<script>.mjs`
   en dan `node --env-file=.env.local .tmp/<script>.mjs`. Getest op 2026-10-14
   met `zwift-club.ts`, `route-segments.ts`, `scoring.ts` en
   `supabase/admin.ts` (zonder netwerk). Zonder `--packages=external` faalt het
   op een dynamische `require`. Importeer `src/lib/zrl-live/snapshot.ts` niet:
   die haalt `next/cache` binnen en start dan niet buiten Next. Neem
   `zrlFormatOf` en het type `RaceData` daaruit over.
   - `fetchZwiftEvent(id)`: subgroepen, start, `timeGapBetweenRowsMs`, route en
     ronden. Bepaal de subgroep van het team via de Zwift-ID's uit de opstelling
     (`fetchEntrants`).
   - `race-results/entries?event_subgroup_id=…`: `fetchSubgroupResults` houdt
     alleen rang en tijd over. Bewaar voor de renners van het team de **hele ruwe
     rij**. Schrijf eerst op welke velden er zijn (zoals `describePowerFields`
     doet) voor je ze gebruikt; verwacht, maar niet gecontroleerd: gemiddeld
     vermogen, hartslag, gewicht en het type vermogensmeter. Het type meter is
     belangrijk voor de kwaliteit: zPower meet niet.
   - Segmentpassages per segment van de route (`routeSegments` in
     `src/lib/zwift/route-segments.ts`, `fetchSegmentResults` met `from`/`to`
     rond de race en `athleteId` per renner): tijd, **gemiddeld vermogen** en
     gewicht per renner per segment. Of Zwift ze een dag later nog geeft, is niet
     gemeten. Lukt het niet, gebruik dan de passages uit de snapshot (zonder
     vermogen).
   - Uitslag en passages van de **andere ploegen in dezelfde subgroep** horen er
     ook bij, voor de vergelijking per segment.

3. **TTT-bot.** `bot/.cache/ttt-<datum>.log`, regels met een UTC-tijd vooraan.
   Staat het er niet, vraag dan op welke pc de bot draaide.
   - `plan deel <n> <naam>: <renner> <W>W <s>s, …`: elk geladen plan. Op
     13 oktober is het plan van deel 2 over deel 1 heen geladen (zie
     `docs/ttt-discord-bot.md`, "De eerste race"). Er staan dus twee planregels
     met "deel 1", en de race reed op de laatste.
   - `klok <zin>`: de wissels en het aftellen op de klok.
   - `coach {"kind":"leader"|"power"|"dropped"|"back"|"four-left"|"pace",…}`:
     wie Sauce vooraan zag, hoeveel watt iemand naast het doel zat (`delta`),
     lossen en terugkomen. Renners staan erin met Zwift-ID.
   - `vrij rijden aan` / `vrij rijden uit`: de klimmen, waar geen rotatie gold.
   - `zegt <zin>`: wat de ploeg echt hoorde.

4. **ZwiftGopher-plannen.** Vraag de eigenaar om de links van Export JSON voor
   deel 1 en deel 2 (`…/TTT/?save=<blob>`, met `&json=true` krijg je JSON; vorm
   in `parseGopherPlan`, `bot/src/plan.ts`). Daarin staan per renner de volgorde,
   het kopvermogen en de kopduur, en de doelsnelheid op het vlakke. Zonder de
   links gelden de planregels uit het logboek, maar dan ontbreekt deel 1.

5. **Wat de eigenaar zelf kan aanvullen.** De ZwiftPower-pagina van de race
   (als export of tekst), FIT-bestanden, de eindplaats op WTRL, en wie er wel of
   niet in Discord zat.

Leg de bronnen voor aan de eigenaar voordat je gaat rekenen: wat is binnen, wat
ontbreekt, en kunnen de ontbrekende stukken nog worden aangeleverd?

## Stap 2: rekenen

Bepaal eerst de opzet van de race: TTT of massarace (`zrlFormatOf`), de route
met segmenten en klimmen, en de ploegtijd. In een TTT telt de vierde renner over
de streep. Daarna:

**Per renner**

| Maat | Bron | Wat het zegt |
|---|---|---|
| Kopvermogen tegenover het plan, in W en % | coach `power` (delta), segmentvermogen, plan | Plantrouw: harder of zachter dan afgesproken |
| Kopduur tegenover het plan, en aantal kopbeurten | `klok`, coach `leader`, plan | Beurt volgemaakt, te vroeg af, overgeslagen |
| Vertraging na "Wissel" tot echt vooraan | `klok` naast coach `leader` | Hoe vlot de overname ging (op 13 oktober mediaan 14 s) |
| Aandeel in de koptijd tegenover het geplande aandeel | idem | Werkverdeling |
| Gemiddeld vermogen en W/kg over de race en per segment, als % van FTP | Zwift-resultaat en passages, FTP | Hoe zwaar het voor de renner was, en of er reserve over bleef |
| Verloop over de race (eerste tegenover laatste deel) | segmentvermogen | Ingeteld of gelijkmatig |
| Lossen en terugkomen, en waar | coach `dropped`/`back`, passages | Of de belasting ergens te hoog lag (klim) |
| Type vermogensmeter | ruwe resultaatrij | Hoe betrouwbaar de wattages zijn |

**Ploeg**

- **Ploegtijd en plaats.** De tijd van de vierde renner en de plaats in de
  subgroep, uit Zwift, naast `zrl_team_results`. De WTRL-plaats alleen als de
  eigenaar die opgeeft.
- **Per segment naast de andere ploegen.** Gebruik `scoreRace` en de `splits`
  uit `src/lib/zrl-live/scoring.ts` op de `RaceData`, en niet een eigen
  rij-indeling (regels en valkuilen: `docs/live-zrl-dashboard.md`,
  "Tussentijden in een ploegentijdrit"). Waar verloor of won de ploeg tijd: op
  het vlakke of op de klimmen?
- **Rotatie-efficiëntie.** De geplande cyclus (de som van de kopduren) naast de
  echte tijd tussen wissels; de tijd die bij de overnames verloren ging; het
  aantal keer dat de rotatie werd verlegd of iemand werd overgeslagen.
- **Samenhang.** Hoe ver de renners uit elkaar finishten, en of de ploeg na een
  lossing doorreed of wachtte.
- **Het plan zelf.** Paste het plan bij de renners? Reed iedereen structureel
  boven het doel, dan stond het plan te laag. Loste iemand op de klim, dan was
  die daar te zwaar. Betrek de verwisseling van deel 1 en 2 hierbij: vergelijk
  per stuk met het plan dat echt gold én met het plan dat bedoeld was.
- **Opstelling.** Wie stond er in `team_event_lineups` en wie reed er echt? Een
  vervanger of een ontbrekende renner verklaart soms een deel van het verschil.

Splits de klimmen ("vrij rijden") overal af: daar gold geen kopbeurtplan.

## Stap 3: rapport

Schrijf `analyse.md` in de map uit de spelregels, in het Nederlands. Opbouw:

1. **In het kort**: vijf regels. Uitslag, de grootste winst, het grootste
   verlies, de belangrijkste les.
2. **De ploeg**: ploegtijd, plaats, verloop per segment naast de andere ploegen,
   rotatie-efficiëntie, samenhang, het plan zelf.
3. **Per renner**: per renner een kort blok met tabel. Wat goed ging, wat beter
   kan, en de oorzaak waar die uit de data blijkt.
4. **Plan tegenover uitvoering**: één tabel met alle renners, gepland en echt.
5. **Voor de volgende ploegentijdrit**: drie tot vijf concrete afspraken
   (kopduur, watt per renner, volgorde, de overname, het plan voor de klimmen).
   Ook wat de bot anders zou kunnen doen, als de data dat laat zien; aanpassen
   is een aparte ronde.
6. **Wat de data niet zegt**: ontbrekende bronnen, aannames, en welke
   wattages van een minder betrouwbare meter komen.

Toon: opbouwend. Het zijn ploeggenoten en het rapport kan in de teamchat
belanden. Beschrijf wat er gebeurde en wat er beter kan, en zet renners niet
tegen elkaar af. Vergelijk iedere renner met het eigen plan en de eigen FTP, niet
met de sterkste renner.

Geef de eigenaar aan het eind het pad naar het rapport, de belangrijkste
conclusies in een paar regels, en wat er nog ontbreekt om het rapport sterker te
maken.

## PLAN.md

De analyse zelf is geen code en komt niet in `PLAN.md`. Leidt ze tot een
aanpassing (bijvoorbeeld de drempels van de bot in `bot/src/coach.ts`), dan is
dat een eigen ronde, met de conclusie zonder persoonsgegevens in `PLAN.md` en
`docs/ttt-discord-bot.md`, in dezelfde commit als de code.
