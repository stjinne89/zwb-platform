# Spike — routeprofiel van een Zwift-event zonder .gpx

**Gestart 2026-08-31.** Hoort bij het pacingplan-traject; zie `PLAN.md`.

## De vraag

Voor een pacingplan is een hoogteprofiel nodig. Bij buitenritten komt dat uit de
.gpx die de organisator uploadt. Voor Zwift-events is dat onwerkbaar: het lid
heeft geen .gpx en Zwift levert er geen. Kunnen we het profiel zelf afleiden uit
alleen de Zwift-eventlink?

## Wat al vaststaat (geverifieerd, geen aannames)

1. **De publieke Zwift-event-API is zonder login bereikbaar.**
   `GET https://us-or-rly101.zwift.com/api/public/events/{id}` geeft HTTP 200 JSON
   met `routeId`, `laps`, `distanceInMeters`, `durationInSeconds`, `worldId`/`mapId`
   en per `eventSubgroups`-item de eigen afstand, categorie en `rulesSet`/`tags`
   (o.a. `doubledraft`, `ttbikes`). Getest op een live event.
   `src/lib/events/external-scan.ts` praat al met dezelfde host voor
   `/api/public/events/upcoming`, dus dit is bekend terrein.

2. **`routeId` is te vertalen naar een route.** In `zwift-data` (al een
   dependency, versie 1.48.6) hebben **320 van de 320 routes een `id`** dat
   overeenkomt met de `routeId` uit die event-JSON.

3. **94 % van de fietsroutes heeft een Strava-segment.** Van de 279 fietsroutes
   hebben er **263 een `stravaSegmentId`**. Dat segment beslaat één ronde van de
   route.

4. **De accenten op een route zijn met naam bekend.** `zwift-data` geeft per route
   `segmentsOnRoute` (`{from, to, segment}` in km) en per segment `type`
   (`climb`/`sprint`), `avgIncline` en `climbType`. Voor een Zwift-route is dus
   geen klimdetectie nodig — de Epic KOM staat er met naam en kilometrering in.

5. **Strava's segment-API werkt voor virtuele Zwift-segmenten.**
   `src/lib/cols/watopia.ts` haalt er al `end_latlng` uit om Watopia-cols te
   kalibreren, in dezelfde coördinatenruimte als de VirtualRide-polylines.

## De open vraag

Punt 5 bewijst dat het *segment-object* werkt, niet dat de *streams* werken.
Te bewijzen:

> Geeft `GET /api/v3/segments/{id}/streams?keys=distance,altitude,latlng` voor een
> virtueel Zwift-segment een bruikbare `altitude`-stream, en een `latlng`-stream?

## Methode

Knop **"Test routeprofielen"** op `/beheer/zwift-routes` (achter `events.manage_all`).
Die haalt met de Strava-koppeling van de beheerder zelf de streams op van vier
routes met een bewust uiteenlopend karakter:

| Route | Segment | zwift-data |
|---|---|---|
| `tempus-fugit` | 20350088 | 17,231 km / 26 hm — vlak |
| `road-to-sky` | 22280036 | 17,496 km / 1044 hm — Alpe du Zwift |
| `the-mega-pretzel` | 16939150 | 107,275 km / 1638 hm — lang en gevarieerd |
| `watopias-waistband` | 20469780 | 25,46 km / 95 hm — rollend |

De streams gaan door `profileFromStreams` (resample op 25 m + smoothing over
80 m, gelijk aan `route-sample.ts`) en `shapeFromStreams`. Het resultaat wordt
vergeleken met de afstand en hoogtemeters die `zwift-data` voor die route noemt.

**Slaagcriterium:** afstand binnen 10 %, hoogtemeters binnen 20 %. De hoogte krijgt
een ruimere marge omdat smoothing er per definitie iets af haalt en Zwift zelf
afrondt.

De logica staat in `src/lib/events/zwift-route-streams.ts` en is vastgelegd in
`tests/unit/zwift-route-streams.test.ts` — die tests bewijzen de omrekening, niet
de beschikbaarheid van de data.

## Uitkomst — geslaagd (2026-08-31)

Alle vier de routes gaven zowel een `altitude`- als een `latlng`-stream.

| Route | Afstand stream vs zwift-data | Hoogte stream vs zwift-data | Punten | Vorm |
|---|---|---|---|---|
| `tempus-fugit` | 17,25 km vs 17,231 (+0,1 %) | 19 m vs 26 (−26,4 %) | 691 | ja |
| `road-to-sky` | 17,27 km vs 17,496 (−1,3 %) | 1043 m vs 1044 (−0,1 %) | 692 | ja |
| `the-mega-pretzel` | 107,05 km vs 107,275 (−0,2 %) | 1510 m vs 1638 (−7,8 %) | 4283 | ja |
| `watopias-waistband` | 25,50 km vs 25,46 (+0,2 %) | 84 m vs 95 (−11,5 %) | 1021 | ja |

**Afstand klopt** — de grootste afwijking is 1,3 %, ruim binnen de marge. De
streams beslaan één ronde zonder lead-in, precies wat `route.distance` in
`zwift-data` ook is.

**Hoogtemeters komen systematisch iets lager uit**, en dat hoort zo: de smoothing
telt ruis niet mee als hoogtewinst. Waar echt klimwerk de ruis overstemt is het
verschil verwaarloosbaar — Road to Sky klopt tot op één meter. Op vlak terrein is
het percentage misleidend: Tempus Fugit heeft 26 hoogtemeters over 17 km, dus zeven
meter verschil is meteen 26 %.

**Gevolg voor de toets.** `checkProfile` keurde Tempus Fugit daardoor af, terwijl er
niets mis mee was. De hoogtetoets heeft nu naast de 20 %-marge een absolute
ondergrens van 15 m (`ELEVATION_TOLERANCE_M`); onder dat verschil telt een
percentage niet. Vastgelegd in twee tests: een vlakke route met −26 % blijft "ok",
een klim die er honderden meters naast zit niet.

**Gevolg voor de bouw.** De Zwift-routetak gaat door zoals gepland, inclusief de
SVG-plattegrond uit de `latlng`-stream. Fase 1 (routebibliotheek, migraties 0144 en
0145) is hierop gebouwd.
