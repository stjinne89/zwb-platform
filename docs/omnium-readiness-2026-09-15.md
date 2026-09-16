# Omnium: oplevercontrole editie 1

Datum: 15 september 2026. Branch: `codex/omnium-editie-1`, implementatiecommit
`f104302` op basis van `c5d344d`. De code is lokaal afgerond en getest. Er is
niet gepusht of gedeployd.

## Opgeleverd in de applicatie

- Een editor voor het Engelse seizoensreglement.
- Engelse publieke routes met permanente 308-redirects van de Nederlandse
  routes.
- Zwift-startlijsten per onderdeel, een expliciete subgroep-naar-vELO-mapping,
  handmatige synchronisatie en dagelijkse synchronisatie van komende edities.
- Zwift-uitslagen met milliseconden, jurywaarschuwingen, voorlopige en
  definitieve status, plakfallback en een apart pad voor de tussensprints.
- De gastenregel: na een startlijstsynchronisatie tellen alleen ingeschreven
  renners mee; zonder startlijst telt iedereen mee met een waarschuwing.
- Een transparante OBS-overlay op 1920×1080, per league of roterend.
- Prijzenbeheer, bulkimport van kitcodes, winnaarsvoorstellen, atomaire
  toekenning en de statusreeks `pending` → `sent` → `claimed`.
- Publieke winnaars zonder dat een code in een publieke query terechtkomt.
- Sheet-CSV als uitslagbron en een beheerscherm om dubbele renners atomair
  samen te voegen.

## Database

Migraties `0157_omnium_entrants_results.sql` en
`0158_omnium_award_kit.sql` zijn op 15 september rechtstreeks met
`supabase db query --linked --file` uitgevoerd. De gekoppelde database heeft
geen bruikbare historische vulling in `supabase_migrations`: `migration list`
toont ook de reeds aanwezige oudere schema's alleen als lokaal. `db push` zou
daardoor alle migraties opnieuw proberen; dat pad is bewust niet gebruikt.

De nacontrole bevestigde:

- `entrants_synced_at` en de vier RPC's bestaan;
- de unieke indexen voor prijsscope en kitcode-toekenning bestaan;
- `anon` en `authenticated` hebben geen leesrecht op `omnium_kit_codes`;
- een productie-smoke binnen `BEGIN`/`ROLLBACK` doorliep startlijst, uitslag,
  merge, prijstoekenning en code-reservering met vijf positieve controles;
- de rollback liet geen smoke-seizoen achter.

De inhoudelijke productiestand bleef: 1 seizoen en 0 edities, onderdelen,
renners, prijzen of kitcodes.

## Historische bron

Drive bevat zeven wedstrijdsheets uit voorjaar 2026 en een Master GC. Alle
wedstrijdsheets gebruiken `Pos, Rider, Team, Cat, Prologue, Sprint, Scratch,
Crit, Total`; de bestaande Sheet-CSV-importer ondersteunt dit echte formaat.
Alle 479 wedstrijdregels hebben intern een correct totaal.

De Master GC kan niet blind als identiteitslijst worden gebruikt. Een exacte
vergelijking vond 38 niet-nul GC-vermeldingen zonder dezelfde naam/league in de
betreffende wedstrijdsheet, 41 wedstrijdvermeldingen zonder dezelfde sleutel in
de GC en 3 gelijke sleutels met een ander wedstrijdtotaal. Het merendeel komt
door opgeschoonde of aangeplakte teamnamen en renners die handmatig naar een
andere league zijn gezet. De GC-totalen zelf zijn intern consistent.

Daarom is de historische productie-import nog niet uitgevoerd of gepubliceerd.
Eerst moet per afwijking worden bepaald welke identiteit en league leidend is;
daarna kunnen de zeven edities worden geïmporteerd, dubbelen worden samengevoegd
en de opnieuw berekende GC tegen de oude GC worden gecontroleerd. Bronnen en
werkwijze staan in [omnium-historical-import.md](omnium-historical-import.md).

## Verificatie

- `npx tsc --noEmit`: geslaagd.
- Gerichte ESLint-controle: geslaagd.
- Omnium-unit- en databasetests: 86 geslaagd, 6 live-tests overgeslagen.
- `npm run test:e2e -- --grep omnium`: 8 geslaagd, inclusief vijf 308's.
- `npm run build`: geslaagd; alle publieke en beheer-routes staan in de output.
- Live Zwift-event `5594893`: event- en result-endpoint gaven HTTP 200;
  subgroepen A–E bevestigd. Het oude event bevat nu 0 resultaatregels, zodat
  volledigheid en vertraging tijdens een lopend event nog niet live zijn gemeten.

## Nog nodig voor de eerste editie

De code en databasefuncties staan klaar. Voor de productie-inrichting ontbreken
nog de 24 Zwift-event-ID's, de vijf A–E→vELO-mappings, het definitieve Engelse
reglement, de prijzen per league en de kitcodes. Daarna moeten de zes edities
worden gepland, gevuld en pas na controle gepubliceerd. De volledige beheerketen
en overlay moeten vervolgens tegen één echte, ongepubliceerde testeditie worden
doorlopen. De externe oude site wordt pas na editie 1 omgeleid, volgens het
eerdere besluit.
