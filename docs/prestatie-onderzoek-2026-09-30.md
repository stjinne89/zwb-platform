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

Zie `PLAN.md` voor de commit. Samengevat: migraties `0208` (indexen), `0209`
(`raw` inkorten met een trigger, de KOM-trigger alleen bij relevante wijzigingen,
een voorrangslijst die alleen `zwb_segment_koms` leest), `0210` (RLS mechanisch
omhullen) en `0211` (de index van de oude voorrangslijst weg). Verder de eventdaglus, de chatfilter per event, `React.cache()` voor
gebruiker en rechten, poll-stemmen via de poll zelf, paginering voor de
clubstatistieken, een datumvenster op de kalender, een kleinere KOM-batch, en
`scripts/db-health.mjs` voor de wekelijkse check.

## Productiestappen

Geen van deze stappen kan lokaal getest worden (geen Docker of Supabase-config).
De migraties zijn met PGlite getest (`tests/unit/segment-database.test.ts`,
`tests/unit/rls-initplan-migration.test.ts`).

1. ~~`0208_query_indexes.sql`, `0209_slim_segment_efforts.sql` en
   `0210_rls_initplan.sql` toepassen.~~ Gedaan door de eigenaar, 2026-10-01; de
   advisor meldt geen `auth_rls_initplan` meer.
2. ~~De code deployen.~~ Gepusht op 2026-10-01 (`311d0b0`).
3. ~~De bestaande rijen inkorten met `scripts/slim-segment-efforts.mjs`.~~ Gedaan op
   2026-10-01, in twee keer; zie het incident hieronder. Daarna stond de WAL weer op
   128 MB en de disk rond 77%. Het script is verwijderd, want de tabel zelf
   verdwijnt (stap 4).
4. Ruimte teruggeven: `0212_remove_segment_explorer.sql`, pas ná de deploy van de
   code zonder verkenner. Zie "Ruimte teruggeven" hieronder.
5. Op cron-job.org bij "ZWB Strava webhooks" `?segmentBackfill=0` weer uit de URL
   halen (sinds 2026-09-30 uit). De ruimte die het inkorten in de tabel vrijmaakt
   (~290 MB na de eerste 220.000 rijen) is ruim genoeg voor de 3.314 buitenritten
   zonder pogingen (~150.000 rijen van ~285 bytes, ~45 MB).
6. `npm run db:health` en het rapport nalezen.

## Incident 2026-10-01: database op alleen-lezen

De eerste versie van `scripts/slim-segment-efforts.mjs` deed batches van 20.000
rijen direct achter elkaar, met een gewone VACUUM ertussen. Na elf batches
(220.000 rijen) zette Supabase de database op alleen-lezen: de disk stond op 1,90
van 2 GB, de grens van 95%. De app kon ruim twintig minuten niets wegschrijven
(~07:53 tot ~08:14 UTC). Er is geen data verloren.

Twee inschattingen waren fout:

- **De WAL.** Er was gerekend met tijdelijk dubbele rijen, niet met het
  schrijflogboek. De database zelf groeide niet (1.337 → 1.341 MB), de WAL wel:
  van 128 naar 432 MB. `max_wal_size` is hier 1 GB, op een disk van 2 GB.
- **Waar `raw` staat.** In de tabel zelf, niet in TOAST (heap 896 MB, TOAST
  8 kB): een effort van ~1,3 kB blijft onder de TOAST-drempel. Een gewone VACUUM
  maakt de ruimte dus herbruikbaar, maar geeft niets terug aan de schijf.

Herstel: `checkpoint` mag niet (de rol heeft geen `pg_checkpoint`), en in
alleen-lezen slaat Postgres zijn eigen checkpoints over omdat er niets geschreven
wordt, dus de WAL kromp niet vanzelf. Met akkoord van de eigenaar is in één
lees-schrijftransactie (`begin read write; … commit;`) de index
`segment_efforts_priority` verwijderd (32 MB, vastgelegd in
`0211_drop_segment_efforts_priority_index.sql`) en `live_positions` geleegd
(57 MB; live-volgposities van afgelopen ritten, vooral een OwnTracks-test van
14–19 september, die na 30 dagen toch gewist worden). Daarmee kwam de disk onder
95% en ging de database vanzelf weer open.

Wat is aangepast: het script werkte daarna in batches van 2.500 met 30 s pauze (~35 MB
WAL per checkpoint), meet vóór elke batch database + WAL, wacht zodra het gebruik
boven het laagste punt tot dan toe uitkomt en stopt bij 93,5%.

Na het herstel bleef de WAL-map 432 MB, dus de disk rond 91,5%. Postgres bewaart
gebruikte WAL-bestanden als lege bestanden voor later en ruimt ze pas op als er
weer zoveel geschreven is; bij het gewone schrijftempo van de app duurt dat dagen.
Rustig doorschrijven maakt die bestanden op, waarna de map krimpt. Een vaste grens
van 85% zou het script dus blokkeren op het moment dat het juist helpt.
`db-health.mjs` meldt het diskgebruik en de alleen-lezen-stand.

Les: op deze disk is de WAL de krappe factor bij elke grote schrijfactie, niet
de tabel. Reken bij een bulkupdate met de WAL die tussen twee checkpoints
(5 minuten) ontstaat, en doe hem gespreid.

## Ruimte teruggeven

De heap van `strava_activity_segment_efforts` bleef na het inkorten 896 MB: de
vrije ruimte zit ín het bestand. `VACUUM FULL` schrijft een kopie van tabel en
indexen en nog eens zoveel WAL vóórdat de oude bestanden verdwijnen (naar schatting
~540 MB bij ~470 MB vrij), en past dus niet veilig op 2 GB.

**Besluit van de eigenaar (2026-10-01): de tabel gaat helemaal weg.** De
segmentverkenner en de ZWB KOM's verdwijnen, de collecties blijven. `DROP TABLE`
geeft de ruimte direct terug, zonder kopie en vrijwel zonder WAL. Migratie
`0212_remove_segment_explorer.sql`; verwachte databasegrootte daarna ~210 MB. Wat
er wegvalt, wat blijft en hoe de collecties zonder pogingentabel werken staat in
`PLAN.md`, ronde "Segmentverkenner en ZWB KOM's verwijderd".

Van de databasetijd van achtergrondjobs die na 0209 overbleef (31.300 s sinds mei)
was ~19.500 s (62%) segmentwerk: pogingen per lid doorlopen (8.800 s), ritten zoeken
voor de inhaalslag (5.600 s), pogingen wegschrijven (2.400 s), KOM's doorrekenen
(1.600 s) en segmentlijnen (1.100 s). Van de databasetijd van leden (4.138 s) was
~460 s (11%) de verkenner en het KOM-blok. Niet gemeten: het effect op de laadtijd
van een pagina.

Overwogen en niet gekozen: een maand Pro (25 dollar) om de VACUUM FULL wel te
kunnen doen, en de ruimte laten staan.

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
- **Upgrade naar Pro.** Een keuze voor de eigenaar; zie "Ruimte teruggeven".
