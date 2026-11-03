# Database terug onder Free: bewaartermijn voor trainingsdata

Onderzoek van 2026-11-03, alleen lezend op productie. Gebouwd in migratie
`0304_training_storage_retention.sql` (beide voorstellen, met een trigger voor de
prompt); toegepast op 2026-11-03, database daarna 259 MB (was 275).

## Aanleiding

Het project staat sinds 2026-11-02 op Pro. De eigenaar wil per de cyclus van
2026-12-02 terug naar Free (database 500 MB, egress 5 GB per maand, disk 2 GB
zonder automatische groei). De database groeide van 215 MB (2026-10-13) naar
275 MB (2026-11-03), ongeveer 20 MB per week. In dat tempo is 500 MB rond half
januari 2027 bereikt.

## Waar de groei zit (2026-10-13 → 2026-11-03, uit de db-health-momentopnamen)

| Tabel | Nu | Groei in 3 weken | Aard |
|---|---|---|---|
| strava_activities | 127,5 MB | +12,5 MB | echte ritten; vorige week 0 |
| training_workouts | 17,6 MB | +10,6 MB | **vooral vervangen voorstellen** |
| intervals_activities | 18,5 MB | +9,1 MB | import sinds "Ritten via intervals.icu"; vorige week +1 MB |
| training_ai_generations | 17 MB | +8,6 MB | **vooral herhaalde prompttekst** |
| overige | | ~+19 MB | verspreid, elk ≤ 2 MB |

De twee vetgedrukte tabellen zijn een derde van de groei, en dat deel is op te
ruimen zonder dat een lid of trainer iets kwijtraakt.

## training_workouts: vervangen workouts

- 11.191 rijen, waarvan **9.985 (89%) vervangen** (`superseded_at` gezet), allemaal
  `origin = 'ai'`.
- In 28 dagen kwamen er 7.248 rijen bij: ~1.800 per week, ~100 per rijdend lid.
  Elke herziening (dagvoorstel of plan-update, samen ~100 per week) zet het hele
  venster opnieuw neer, gemiddeld ~18 workouts, en markeert de vorige als vervangen
  (`retireWorkoutRows` in `src/lib/training/publish.ts`).
- Het commentaar daar zegt dat vervangen rijen blijven "zodat zichtbaar blijft wat
  er oorspronkelijk gepland stond". Geen scherm toont ze: alle lezers in `src/`
  gebruiken `superseded_at` alleen om ze over te slaan. De enige die ze echt leest
  is `replan-window.ts`, en die kijkt alleen naar rijen die sinds de vorige
  herziening zijn vervangen (dagen, geen weken). Verder leest
  `scripts/cleanup-orphan-intervals-events.mjs` ze.
- **Geen van de vervangen rijen heeft nog een `intervals_event_id`**: het opruimen
  in intervals.icu is dus al gebeurd. 10 vervangen rijen hebben een
  rapportage (`training_workout_reports`, cascade bij verwijderen): die moeten
  blijven.
- Verwijzingen: `strava_activity_summaries` en `training_ftp_tests` → set null;
  `outdoor_route_suggestions` en `training_workout_reports` → cascade.

**Voorstel:** een dagelijkse opruiming die vervangen workouts verwijdert als
`superseded_at` ouder is dan 30 dagen, `status = 'planned'`, er geen
`intervals_event_id` meer is en er geen rapportage aan hangt. Nu zijn dat er
~3.300; in evenwicht blijft de tabel rond ~8.000 rijen in plaats van ~1.800 per
week te groeien. Past in de bestaande job "ZWB trainingsaanpassingen" of als
eigen route naast `/api/live/cleanup` (en dan wél een fout bij het wissen
teruggeven, anders dan die route nu doet).

Alternatief bij de bron: een herziening die een workout ongewijzigd laat, laat de
rij staan in plaats van hem te vervangen en opnieuw in te voegen. Dat raakt de
planningslogica en is dus groter; de opruiming is ook dan nog nodig.

## training_ai_generations: prompttekst

- 821 generaties, toast 16 MB. `prompt_text` is gemiddeld ~24.000 tekens
  (~12 kB opgeslagen) en neemt **~9,5 MB**; `response_json` ~2,8 MB.
- Er zijn maar **60 verschillende prompts op 821 rijen**; sinds de overstap op
  Claude (2026-10-26) 8 op 186. Het is de systeemprompt, die alleen per versie van
  de regels verandert, en hij wordt bij elke generatie opnieuw opgeslagen.
- De app leest `prompt_text` nergens terug. Alleen de analysescripts
  `scripts/claude-replay.mjs` en `scripts/schema-meetlat.mjs` gebruiken hem.
  `response_json` en `prompt_summary` zijn wel nodig: de trainerstab
  "Vergelijken" en `training_engine_comparisons` (cascade bij verwijderen van
  een generatie) gebruiken ze.

**Voorstel:** de prompt één keer opslaan in een kleine tabel (bijvoorbeeld
`training_ai_prompts` met hash en tekst) en per generatie alleen de hash bewaren.
Bestaande rijen omzetten in de migratie. De twee scripts lezen dan via die tabel.
Niets gaat verloren; de tabel krimpt van ~17 naar ~8 MB en de groei van ~1,2 MB
per week valt grotendeels weg. Generaties zelf niet verwijderen: dan verdwijnen de
oordelen in "Vergelijken".

Eenvoudiger alternatief: `prompt_text` leegmaken na 60 dagen. Dat kost de
mogelijkheid om oude generaties opnieuw af te spelen met `claude-replay`.

## Ruimte terugkrijgen

Verwijderen maakt de ruimte vrij voor hergebruik, maar de database wordt pas
kleiner na `vacuum full` op de twee tabellen. Die zijn klein (samen ~35 MB), dus
het slot duurt seconden en de WAL blijft beperkt. Eenmalig, na de eerste
opruiming, door de eigenaar.

## Verwachting

Met beide ingrepen en de vacuum: eenmalig ~15 MB terug, en de groei zakt van
~20 naar ~7 à 10 MB per week (vooral echte ritten in `strava_activities`). Dan
ligt 500 MB eerder rond de zomer van 2027 dan in januari. Een schatting: de
winter brengt meer Zwift-ritten, en `intervals_activities` moet na de import
nog laten zien hoe hard hij vanzelf groeit.

Egress (~0,13 GB per dag, ~4 GB per maand) blijft los hiervan krap onder de 5 GB
van Free.
