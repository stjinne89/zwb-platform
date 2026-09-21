# Gebruiksanalyse ZWBasis — 17 september 2026

Bestuursrapport: https://claude.ai/artifact/AG71T4abuLqhU6pYr3RgrM

## Methode

- Alleen-lezende tellingen via de Supabase REST-API (service role) op productie,
  uitsluitend geaggregeerd. Geen namen of per-lid-gegevens uitgelezen of vastgelegd.
- "Leden" = 34 accounts exclusief het ene beheerdersaccount (ook het
  ontwikkel-/testaccount). "30 dagen" = 2026-08-18 t/m 2026-09-17.
- **Niet gemeten:** paginabezoek (bestaat niet in de app) en inloggen (Supabase
  Auth per gebruiker is bewust niet uitgelezen). Leespagina's (Stats, Leden,
  Achievements, ZWBlokken, Sponsors, WhatsApp-groepen, Media) zijn daardoor
  onbeoordeeld.
- Regels code: TypeScript per map (route + lib + api), zonder tests. Orde van
  grootte, geen exacte grenzen.

## Kerncijfers

| | |
|---|---|
| Accounts | 35 (33 met rol betalend lid) |
| Actief 30 d (eigen actie óf rit binnen) | 18 |
| Eigen actie 30 d | 14 |
| Nooit eigen actie én geen rit 90 d | 6 |
| Aanmeldingen per maand | mei 6 · jun 13 · jul 12 · aug 4 · sep 0 |
| Nog actief per cohort | mei 6/6 · jun 7/13 · jul 2/12 · aug 3/4 |
| Code | ~115.400 regels, 158 migraties, 453 commits sinds 2026-05-20 |

## Per onderdeel (leden ooit / 30 d)

| Onderdeel | Ooit | 30 d | Toelichting |
|---|---|---|---|
| Ritdata binnen (Strava/intervals) | 15 | 13 | 287 ritten in 30 d; 10 actieve Strava-koppelingen |
| Achievements ontvangen | 12 | 8 | 4.126 awards; 222 van 404 badges nooit uitgereikt |
| ZWBlokken/segmenten/cols | 9 | 9 | automatisch |
| Teams: ingedeeld | 23 | 5 | teamresultaten, ZRL-uitslagen, TTT, opstellingen, beschikbaarheid: 0 rijen |
| Polls: gestemd | 17 | 2 | 1 poll ooit (2026-05-27) |
| Kalender aan/afmelden | 14 | 4 | 14 voorbije clubritten, 24× "ja"; 49/61 events door beheerder |
| ZWBeter Worden eigen invoer | 10 | 8 | doel/beschikbaarheid/seizoensdoel/FTP/bevestiging |
| Samen fietsen live | 10 | 3 | 49 sessies: jun 23, jul 1, aug 1, sep 12 |
| ZWBeter Worden schema | 7 | 5 | 332 generaties (312 adaptaties, 42 mislukt); 2.679/3.119 workouts vervangen; top-3 accounts 89% |
| Mijn garage: fiets | 7 | 5 | 30 fietsen |
| Push aangezet | 4 | 0 | 7 abonnementen; aflevering niet gelogd |
| Event-chat | 4 | 0 | 16 berichten totaal |
| Core & mobiliteit | 3 | 3 | 7 sessies |
| Event-foto's | 3 | 1 | 50 foto's bij 8 events |
| Onderhoud slijtdelen | 1 | 1 | 5 onderdelen |
| Vraag en Aanbod | 1 | 0 | 1 post, 0 reacties/likes |
| Ritverslagen | 1 | 0 | 1 verslag |
| Pacingplan | 1 | 1 | sinds 2026-09-01, 4 generaties |
| Verjaardagen (felicitaties/foto's) | 0 | 0 | 13 delen verjaardag; 1 rit, 0 RSVP's |
| Klachtenlogboek | 0 | 0 | |
| Omnium | 0 | 0 | 1 seizoen, 0 edities |
| Media | – | – | 254 items uit één import 20–21 mei; niets nieuws sinds mei |

## Bevindingen die geen gebruikscijfer zijn

- **WTRL-resultatensync faalt sinds 2026-06-03** (HTTP 401), terwijl
  `integration_health` WTRL 306/306 keer als ok meldt: de health-check test
  bereikbaarheid, niet de sync.
- Tokengebruik van trainingsgeneraties wordt niet opgeslagen
  (`training_ai_generations.response_json` bevat alleen het schema), dus de
  AI-kosten zijn uit de database niet te bepalen. Pacing slaat `usage` wel op.
- `push_subscriptions.last_used_at` wordt niet bijgewerkt (`lib/push/send.ts`),
  en `intervals_connections.last_synced_at` staat overal leeg; beide zeggen dus
  niets over gebruik.
- Trainer-feedback in tekst: 2 (gelijk aan 2026-08-20), bij 65 beoordelingen met status.
