# Prestatie-onderzoek, 2026-09-30

Aanleiding: de app werd merkbaar trager in gebruik. Onderzocht in de code en op
productie (Supabase CLI met alleen-lezen-queries, de Supabase- en
Netlify-dashboards). Het vervolg staat in `PLAN.md`, ronde "Database slank en
snel".

## Conclusie

De vertraging zat vooral in de database, niet in de app. De database draait op
het Free-plan (Nano: 0,5 GB geheugen, gedeelde CPU) en groeide in de week van 14
september van ~0,3 naar 1,3 GB. Achtergrondjobs gebruikten 14× zoveel databasetijd
als de leden zelf, en één query daarvan nam ~40% van alle databasetijd zonder iets
op te leveren.

## Metingen op productie (2026-09-30)

| | Waarde |
|---|---|
| Plan / compute | Free, Nano (0,5 GB geheugen, gedeelde CPU) |
| Databasegrootte | 1,31 GB; Free-limiet 0,5 GB ("Exceeding usage limits") |
| Disk | 83% (1,6 van 2 GB) |
| Geheugen | 1,75 GB vastgelegd tegen een limiet van 1,02 GB: veel swap |
| Egress in de cyclus | 5,8 GB; Free-limiet 5 GB, met nog 11 dagen te gaan |
| Databasetijd sinds mei | service_role 59.211 s, authenticated 4.138 s |

Grootste tabellen: `strava_activity_segment_efforts` 1,02 GB (496.000 rijen, waarvan
425.000 in de week van 14 september, door de historie-inhaalslag),
`strava_activities` 112 MB (13 MB heap, 92 MB TOAST van `raw`), `live_positions`
51 MB.

### Zwaarste queries (pg_stat_statements)

| Query | Aanroepen | Gemiddeld | Totaal |
|---|---|---|---|
| `segment_geometry_priority` (RPC, elke 5 min) | 6.196 | 4,6 s (max 8 s) | 7,8 uur |
| segmentpogingen per lid, OFFSET-paginering | 17.131 | 0,5 s | 2,5 uur |
| ritten per lid voor de segmentstap | 9.236 | 0,45 s | 1,2 uur |
| `delete from live_positions` (opruimjob) | 3.922 | 0,8 s | 0,8 uur |
| dashboard-activiteitenfeed (leden) | 4.182 | 0,3 s (max 3,1 s) | 0,3 uur |

## Oorzaken

1. **`segment_geometry_priority` (0156) telde bij elke aanroep alle pogingen.**
   Gemiddeld 4,6 s en geregeld afgebroken op de statement timeout van 8 s. De app
   wacht maar 2 s (`PRIORITY_TIMEOUT_MS`), en afbreken stopt alleen het wachten,
   niet de query. De database rekende dus elke 5 minuten door voor een antwoord
   dat nooit aankwam. De inhaalslag haalde 20–60 lijnen per dag, van 78.746
   wachtende.
2. **`raw` van segmentpogingen.** Ongeveer 670 MB was de volledige Strava-effort.
   De database leest alleen `raw->>'source'` en `raw->'segment'->>'private'`
   (nagekeken in alle functies en views op productie, en in de app).
3. **Geen index op `strava_activities.start_date`.** De dashboardfeed doorliep alle
   25.600 ritten: 377 ms, ook met alles in het geheugen.
4. **RLS.** De Supabase-advisor meldde 144 policies met een kale `auth.uid()`, die
   per rij wordt uitgevoerd.
5. **1000-rijengrens.** De clubstatistieken haalden 13 weken ritten van alle leden
   op zonder paginering. Op 2026-09-30 waren dat er 1.090, dus de totalen misten
   stilletjes ritten. Het dashboard en `/polls` haalden alle stemmen van alle polls
   op, en de kalender alle events ooit (124, nog onder de grens).
6. **Eventdag-verversingslus (code).** In `event-live-ticker.tsx` hing het
   realtime-effect aan `sessionById`. Elke `router.refresh()` gaf nieuwe props, dus
   een nieuw kanaal, en elke nieuwe verbinding vroeg weer een refresh aan. Een
   eventpagina op de dag zelf werd zo om de paar seconden volledig opnieuw op de
   server opgebouwd, ook in een verborgen tab. Leden vroegen `live_positions`
   26.062 keer op, bij 21 actieve gebruikers; dat past hierbij, maar is niet
   bewezen.
7. **Per klik vijf keer `auth.getUser()`** (middleware, layout, page en twee keer
   via `getCurrentUserAccess`), elk een netwerkrondje naar Supabase Auth.

Geen oorzaak: geheugenlekken aan de clientkant. Timers, listeners, kaarten en
three.js ruimen netjes op.

## Wat is gebouwd

Zie `PLAN.md` voor de commit. Samengevat: migraties `0200` (indexen), `0201`
(`raw` inkorten met een trigger, de KOM-trigger alleen bij relevante wijzigingen,
een voorrangslijst die alleen `zwb_segment_koms` leest) en `0202` (RLS mechanisch
omhullen). Verder de eventdaglus, de chatfilter per event, `React.cache()` voor
gebruiker en rechten, poll-stemmen via de poll zelf, paginering voor de
clubstatistieken, een datumvenster op de kalender, een kleinere KOM-batch, en
`scripts/db-health.mjs` voor de wekelijkse check.

## Productiestappen, in deze volgorde

Geen van deze stappen kan lokaal getest worden (geen Docker of Supabase-config).
De migraties zijn met PGlite getest (`tests/unit/segment-database.test.ts`,
`tests/unit/rls-initplan-migration.test.ts`).

1. `0200_query_indexes.sql`, `0201_slim_segment_efforts.sql` en
   `0202_rls_initplan.sql` toepassen. Alle drie werken ook met de code die nu live
   staat.
2. `node scripts/slim-segment-efforts.mjs`: kort de bestaande rijen in batches van
   20.000 in, met een gewone VACUUM ertussen (disk op 83%).
3. `node scripts/slim-segment-efforts.mjs --full`: VACUUM FULL, zodat de
   databasegrootte echt daalt. Zet de tabel even op slot. Verwachting: van ~1 GB
   naar ~0,2–0,3 GB. Of de hele database daarmee onder 0,5 GB komt, is nog niet
   gemeten.
4. De code deployen.
5. Op cron-job.org bij "ZWB Strava webhooks" `?segmentBackfill=0` weer uit de URL
   halen (sinds 2026-09-30 uit). Pas na stap 2: de 3.314 buitenritten zonder
   pogingen voegen naar schatting 100.000–150.000 rijen toe.
6. `npm run db:health` en het rapport nalezen.

## Bewust niet gedaan

- **`getClaims()` in plaats van `getUser()`.** Controleert de JWT lokaal, maar
  alleen met asymmetrische JWT-sleutels; niet nagegaan welke het project gebruikt.
- **De 36 meldingen "multiple_permissive_policies".** Samenvoegen verandert per
  tabel wie wat mag; dat is een ontwerpkeuze per tabel.
- **`strava_activities.raw` inkorten** (92 MB TOAST). Die wordt op veel meer
  plekken gelezen (privacy, apparaat, importbron, coltijden).
- **OFFSET-paginering over segmentpogingen** (`src/lib/segments/sync.ts`). Wordt
  vanzelf veel goedkoper zodra `raw` klein is; opnieuw bekijken als de wekelijkse
  check hem blijft noemen.
- **Upgrade naar Pro.** Een keuze voor de eigenaar; eerst kijken wat stap 2–3 doen.
