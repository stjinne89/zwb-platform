# Routevoorstel voor buitenritten — onderzoek en bouw

Datum: 2026-09-20, bijgewerkt 2026-09-21
Status: **gebouwd** (migratie `0173`). Dit document begon als onderzoek en is bij
de bouw bijgewerkt; wat er nu staat beschrijft wat er daadwerkelijk draait, met
de afwegingen erbij. De keuzes die nog openstaan staan onderaan.

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

## 6. Wat er gebouwd is

| Onderdeel | Waar |
|---|---|
| Vertrekpunten (tabel, RLS, afronding in de database) | migratie `0173` |
| Kaartkiezer op `/profiel#vertrekpunten` | `profiel/_components/start-points.tsx` |
| Gedeeld snelheidsmodel, beide richtingen | `lib/training/ride-physics.ts` |
| Doel + scoring van een rondje | `lib/training/outdoor-target.ts` |
| Keerpunten van een rondje (pure meetkunde) | `lib/outdoor/roundtrip.ts` |
| Routeplanner-client (BRouter, optioneel GraphHopper) | `lib/outdoor/router.ts` |
| Genereren, scoren, bewaren | `lib/training/outdoor-suggestions.ts` |
| Weergave bij de training | `zwbeter-worden/_components/outdoor-route-suggestions.tsx` |
| GPX-download | `api/training/outdoor-routes/[id]/gpx` |

Drie keuzes die tijdens het bouwen anders uitpakten dan hierboven gedacht:

**BRouter werd de standaard, niet GraphHopper.** GraphHopper heeft weliswaar een
echte rondrit-stand, maar vraagt een sleutel — en dan werkt de feature niet
zonder dat iemand eerst een account aanmaakt. BRouter is sleutelloos, dus doet
het meteen. De rondrit die GraphHopper cadeau geeft, maken we zelf: drie
keerpunten op een driehoek om het vertrekpunt. Dat is bovendien pure meetkunde,
en dus zonder netwerk te testen. GraphHopper blijft beschikbaar via
`OUTDOOR_ROUTER=graphhopper`.

**Het snelheidsmodel is gedeeld met de Zwift-matcher.** Die vraagt "hoe lang
duurt deze rit?", het routevoorstel vraagt het omgekeerde. Twee kopieën zouden na
de eerste bijstelling uit elkaar lopen, en dan stelt ZWB een rondje van twee uur
voor dat hij daarna zelf op anderhalf uur schat. Nu staat het één keer in
`ride-physics.ts`, met een aparte buitenstraf (`OUTDOOR_SPEED_PENALTY`) voor
kruisingen en verkeerslichten.

**De rondjes worden bewaard, de Zwift-voorstellen niet.** Een Zwift-voorstel is
een sortering over data die er al is en kan elke keer opnieuw; een rondje kost
een call naar een gratis externe dienst. Dat mag niet bij elke paginaweergave
gebeuren. Vandaar een knop, en daarna staat het er tot het lid opnieuw vraagt.

## 7. Wat bewust niet is gebouwd

- **De persoonlijke heatmap als voorkeurslaag.** De data ligt er
  (`summary_polyline`), maar BRouter kiest zijn wegen al op ondergrond, fietspad
  en drukte — dat is de eigenschap waar een heatmap een benadering van is. Eerst
  kijken of de rondjes zonder al goed genoeg zijn; anders bouw je complexiteit
  voor een probleem dat er niet is.
- **Een clubbrede heatmap.** Raakt de Strava-clausule van november 2024; wacht op
  een expliciete beslissing van de eigenaar, zoals destijds bij ZwiftPower.
- **Fietsknooppunten als routebron.** Sterk voor een rustige duurrit, zwak voor
  een racefiets (gedeelde en onverharde paden). Pas zinnig als blijkt dat leden
  de gegenereerde rondjes te druk vinden.
- **Een route terugschrijven naar Strava of Komoot.** Strava kán het niet via de
  API en Komoot heeft geen publieke API. GPX-download dekt de behoefte.
- **Meerdere vertrekpunten slim kiezen.** Het lid kiest zelf uit zijn lijst; ZWB
  raadt niet welk vertrekpunt bij welke training hoort.

## 8. Rechtstreeks naar de fietscomputer — onderzocht 2026-09-21

Vraag van de eigenaar: kan een voorgesteld rondje direct naar een Wahoo ELEMNT of
een Garmin?

**Garmin: nee, en niet door ons.** De Garmin Connect **Courses API** is precies de
goede weg — daarmee zetten Komoot en Strava hun routes in Garmin Connect, en van
daar syncen ze vanzelf naar het toestel. Maar het **Garmin Connect Developer
Program staat sinds het voorjaar van 2026 op pauze**: het aanvraagformulier is
weg, nieuwe aanvragen voor Health, Activity, Training, Courses en Women's Health
worden niet verwerkt, en er is geen datum. Bestaande integraties blijven werken;
nieuwe komen er niet bij. Daarbovenop eist het programma een rechtspersoon — geen
persoonlijk gebruik. Zolang dat zo is, is er geen bouwbare route naar Garmin.

**Wahoo: technisch wél mogelijk.** De [Wahoo Cloud API](https://developers.wahooligan.com/)
is self-service met OAuth 2.0 en kent een routes-resource: een FIT-bestand met de
route, plus naam, omschrijving, afstand, stijging en startcoördinaat. Drie dingen
om te weten voordat iemand hieraan begint:

1. **Het moet een FIT-bestand zijn**, geen GPX. Er zit nu geen FIT-encoder in dit
   project; een FIT-course schrijven is echt werk (binair formaat, course- en
   record-berichten, CRC).
2. **Per lid een OAuth-koppeling**, met dezelfde soort flow, tokenopslag en
   verversing als bij Strava. Dat is de bestaande patronen volgen, maar het is
   wel een koppeling erbij om te beheren.
3. **Niet elk toestel.** Routes via de Cloud API verschijnen in de **Wahoo-app**
   en op het toestel, maar niet in de oudere **ELEMNT-app**. Voor leden met een
   oudere BOLT of ROAM levert het dus niets op.

**Wat nu al werkt, zonder iets te bouwen:** de GPX-knop. De Wahoo-app importeert
FIT, GPX en TCX rechtstreeks (ELEMNT ACE, BOLT 3, ROAM 3), en Garmin Connect
importeert een GPX als baan onder Training & Planning. Op een telefoon is dat het
deelmenu, twee tikken.

**Afweging:** de Wahoo-koppeling kost een FIT-encoder plus een OAuth-koppeling, en
bedient alleen Wahoo-rijders met een recent toestel. De winst ten opzichte van
"open de GPX in de Wahoo-app" is één handeling. Voorstel: niet bouwen tot iemand
er expliciet om vraagt, en de GPX-route goed uitleggen op `/hulp`. Als Garmin zijn
programma heropent, verandert die rekensom — dan bedient één stuk werk beide
merken via dezelfde logica.

## 9. Nog te beslissen

- **Privacyversie.** `src/lib/privacy.ts` is *niet* gebumpt. Argument om het niet
  te doen: het lid wijst het punt zelf aan, het gaat naar geen enkele externe
  partij (alleen de coördinaten van de keerpunten gaan naar de routeplanner, niet
  het vertrekpunt als "thuis"), het is voor niemand anders zichtbaar en het is
  afgerond op ~110 m. Argument om het wel te doen: het platform bewaarde tot nu
  toe principieel géén start- of eindlocatie, en dat principe verschuift hier.
  **Dit is een beslissing van de eigenaar, niet van de bouwer.**
- **De omwegfactor** (`DETOUR_FACTOR`, nu 1,25) bepaalt hoe groot de driehoek
  wordt. Geeft de planner structureel te lange of te korte rondjes, dan is dat de
  knop. Pas bij te stellen op echte routes.
- **Het BRouter-profiel**: `fastbike` (racefiets) of `trekking` (rustiger). Nu
  `fastbike`, instelbaar via `OUTDOOR_ROUTE_PROFILE`.

## Bronnen

- Strava API-akkoord (nov 2024): <https://press.strava.com/articles/updates-to-stravas-api-agreement>
- Strava Global Heatmap niet in de API: <https://communityhub.strava.com/developers-api-7/global-heatmap-api-2100>
- GraphHopper routing-API: <https://github.com/graphhopper/graphhopper/blob/master/docs/web/api-doc.md>
- BRouter: <https://brouter.de/brouter/>
- komoot API alleen voor partners: <https://support.komoot.com/hc/en-us/articles/10331570510618-komoot-API>
- Ride with GPS API: <https://github.com/ridewithgps/developers>
- Open-Meteo (al in gebruik): <https://open-meteo.com/en/docs>
