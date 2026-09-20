# Routevoorstel voor buitenritten — onderzoek

Datum: 2026-09-20
Status: onderzoek, niets gebouwd. Ronde 1 van deze feature ging over de
Zwift-kant (eventvoorstellen bij een geplande training); dit document is de
voorbereiding op ronde 2, zodat die niet opnieuw hoeft te beginnen.

## De vraag

Stel bij een geplande training een of meer buitenroutes voor vanaf een eigen
vertrekpunt, passend bij wat er gepland staat. Aanvullende vraag van de
eigenaar: *"Kun je wel kijken of je heatmaps kan gebruiken om goede routes te
bouwen?"*

## Antwoord in het kort

1. **Strava kan geen routes maken.** De API leest routes, hij schrijft ze niet.
2. **De Strava-heatmap is niet beschikbaar via de API**, en heatmaps zijn precies
   wat Strava met het API-akkoord van november 2024 bij derden wil stoppen.
3. **Er is wél een heatmap mogelijk, uit eigen data.** De ritlijnen van de leden
   staan al in onze database. Een persoonlijke heatmap kost nul extra API-calls
   en raakt geen enkele voorwaarde.
4. **Routes genereren kan met open software** (BRouter of GraphHopper). De
   kostenpost is hosting, niet de software.
5. **Het onderscheidende stuk hebben we al**: windrichting per routepunt.

## 1. Strava

- **Routes aanmaken kan niet.** De v3-API heeft geen `POST /routes`; routes maak
  je alleen in Strava's eigen Routebuilder. Lezen kan wel:
  `GET /athletes/{id}/routes` en `GET /routes/{id}` (met `read_all`).
- **Het API-akkoord van 11 november 2024** verbiedt een derde partij om de
  activiteitsdata van het ene lid aan een ander lid te tonen, en verbiedt gebruik
  van API-data voor het trainen van AI-modellen.
- **Capaciteit.** ZWB zit tegen de atletenlimiet aan en de heraanvraag loopt nog
  (zie `strava-api-resubmission.md`). Een feature die structureel extra
  Strava-calls doet is nu een slecht idee, los van of het mag.

**Conclusie:** Strava is hooguit een bron van *je eigen* opgeslagen routes. Geen
generator, geen heatmap.

## 2. Heatmaps — de vraag van de eigenaar

### Wat niet kan

De Strava Global Heatmap zit **niet in de API**. De enige manier om aan de tegels
te komen is een sessiecookie uit de browser meesturen, en dat is precies de
route die Strava's voorwaarden afsluiten: Strava noemt een heatmap letterlijk als
voorbeeld van data die bij een derde partij zichtbaar wordt voor andere mensen
dan de eigenaar. Er zijn uitzonderingen verleend (JOSM), maar die zijn per geval
onderhandeld. Dit is dus geen kwestie van een sleutel aanvragen.

### Wat wel kan, en beter is

**a. Persoonlijke heatmap uit eigen data — kost niets extra.**
`strava_activities` bewaart de ritlijn al in `raw.map.summary_polyline`;
`src/lib/cols/detector.ts` decodeert hem met `@mapbox/polyline` voor de
col-detector. Daaruit is per lid een heatmap van eigen ritten te bouwen zonder
één extra API-call en zonder enig voorwaardenprobleem: het is zijn eigen data,
getoond aan hemzelf. Een gegenereerde route die over wegen loopt die het lid al
rijdt is aantoonbaar beter dan een die dat niet doet.

Let op: `summary_polyline` is sterk gedecimeerd (dat staat al als waarschuwing in
`0043_cols_wider_radius.sql`). Voor "welke wegen rijdt dit lid" is dat genoeg —
voor het matchen van een exacte weg niet.

**b. Clubbreed — een beslissing voor de eigenaar, geen technische vraag.**
Technisch is het dezelfde data. Maar de ritten van lid A gebruiken om lid B een
route te geven raakt de novemberclausule. Dit is hetzelfde soort afweging als de
staande beslissing om ZwiftPower niet te scrapen. Veilige standaard: persoonlijk,
of clubbreed uitsluitend over leden die daar expliciet ja op zeggen.

**c. Open data in plaats van een heatmap — waarschijnlijk het beste antwoord.**
Een heatmap is een *proxy* voor "hier fietsen mensen graag". De routeprofielen
van BRouter en GraphHopper wegen ondergrond, fietspad, wegtype en verkeersdrukte
al direct uit OpenStreetMap — de onderliggende eigenschap in plaats van het
signaal ervan. Daarbovenop zijn in Nederland open beschikbaar:

- **Fietsknooppunten** (`rcn`-relaties in OSM, maandelijks ververst; ANWB en
  Fietsknoop gebruiken dezelfde bron). Dit netwerk is ontwórpen als "hier fiets
  je prettig". Sterk voor een rustige duurrit, zwakker voor een racefiets:
  knooppuntroutes lopen vaak over gedeelde of onverharde paden.
- **LF-routes** van het Landelijk Fietsplatform, open data via het Nationaal
  Georegister.

**d. Eigen clubsignaal.** `zwb_segment_maps` (migratie `0152`) en
`strava_activity_segment_efforts` (`0072`) weten al welke segmenten ZWB'ers
rijden. Dat is een clubeigen populariteitssignaal uit data die we zelf hebben
verzameld.

## 3. Routes genereren

| | GraphHopper | BRouter |
|---|---|---|
| Licentie | Apache-2.0 | MIT |
| Rondrit | native (`algorithm=round_trip` met `distance`, `heading`, `seed`) | zelf waypoints zetten |
| Hoogtedata | ja | ja |
| Profielen | racefiets, MTB, trekking | volledig instelbaar (`.brf`) |
| Hosted | betaalde Directions API met gratis staffel | `brouter.de` / `bikerouter.de` |

GraphHopper is de kortste weg naar "geef me een rondje van 60 km": één call met
een afstand en een richting. Met BRouter zet je zelf twee à drie punten op een
cirkel met straal ≈ afstand / 2π en route je daardoorheen — meer werk, maar de
profielen zijn fijner af te stellen en de licentie is vrijer.

**Eerlijke kostenpost:** Netlify draait geen routeserver. Dit vraagt óf een
GraphHopper-sleutel binnen de gratis staffel, óf een kleine eigen instance. Dat
is de enige echte investering in deze feature.

## 4. Wind — het stuk dat er al ligt

`src/lib/weather.ts` heeft `fetchWindForecast`, `fetchRouteForecast` en
`classifyWind`; `src/lib/gpx.ts` heeft `gpxBearing`. Drie routevarianten
genereren met `heading` op de windrichting en op ±120° daarvan levert meteen de
"meerdere opties" die gevraagd zijn, én een reden waarom ze verschillen: heen
tegen de wind in, terug mee. Geen enkele routeplanner op de markt doet dit goed.

Het weer is ook de brug tussen de twee helften van deze feature: bij regen of
harde wind is het Zwift-voorstel uit ronde 1 het betere antwoord, bij mooi weer
de buitenroute.

## 5. Vertrekpunt

Keuze van de eigenaar (2026-09-20): **een punt op de kaart prikken**, geen adres
en geen postcode.

- Leaflet zit al in het project, en `kalender/nieuw/_form.tsx` leidt al
  `start_lat`/`start_lon` af uit een GPX — dezelfde bouwstenen.
- Een lid wil er meer dan één: thuis, een clubstart, een parkeerplaats bij een
  heuvel. Dus een tabel `profile_start_points`, geen kolom op `profiles`.
- Coördinaat afgerond opslaan, en nooit zichtbaar voor andere leden.
- **Nog te beslissen:** of hier een privacyversiebump bij hoort
  (`src/lib/privacy.ts`). Dit platform bewaarde tot nu toe bewust géén start- of
  eindlocatie van ritten — zie de toelichting in `0111_zwblokken.sql`, waar de
  eerste en laatste kilometer van elke rit juist worden weggelaten. Een
  vertrekpunt opslaan is een echte verschuiving ten opzichte van die lijn, ook
  als het lid het zelf aanwijst.

## 6. Wat er dan nog moet gebeuren

De gegenereerde GPX gaat rechtstreeks door de keten die er al staat:
`parseGpx` → `detectClimbs` → `sampleRoute` → `fetchRouteForecast`. Wat nieuw is:

1. Vertrekpunten (tabel, kaartkiezer, privacybesluit).
2. Een routebron (hosting-besluit: GraphHopper-sleutel of eigen instance).
3. Van geplande training naar routevraag: duur + intensiteit → afstand en
   hoogtemeters. Hiervoor kan het snelheidsmodel uit
   `src/lib/training/zwift-match.ts` (`estimateEventMinutes`) hergebruikt worden,
   omgekeerd toegepast.
4. Drie varianten scoren en tonen, in dezelfde vorm als de Zwift-voorstellen.
5. Optioneel: de persoonlijke heatmap als voorkeurslaag over de generator.

## Bronnen

- Strava API-akkoord (nov 2024): <https://press.strava.com/articles/updates-to-stravas-api-agreement>
- Strava Global Heatmap niet in de API: <https://communityhub.strava.com/developers-api-7/global-heatmap-api-2100>
- GraphHopper routing-API: <https://github.com/graphhopper/graphhopper/blob/master/docs/web/api-doc.md>
- BRouter: <https://brouter.de/brouter/>
- komoot API alleen voor partners: <https://support.komoot.com/hc/en-us/articles/10331570510618-komoot-API>
- Ride with GPS API: <https://github.com/ridewithgps/developers>
- Open-Meteo (al in gebruik): <https://open-meteo.com/en/docs>
