# Onderhoud per fietstype

Onderzoeksnotitie voor Mijn garage (fase B). Bepaalt welke onderdelen de garage
per discipline voorstelt, met welke maat er gerekend wordt en welke intervallen
daarbij horen. Lees dit voordat ik de catalogus in code zet — de getallen zijn
een voorstel, geen wet.

## Wat er nu staat, en waarom dat knelt

De module rekent alles in kilometers, met drie ranges per onderdeel (`low`,
`normal`, `high`) en tien onderdeeltypes die voor elke fiets gelijk zijn. Twee
problemen:

**Kilometers zijn niet altijd de goede maat.** Remvloeistof trekt water aan of
je nu rijdt of niet. Stuurlint gaat kapot van zweet en zon. Kabels corroderen.
Verende delen worden door de fabrikant in *draaiuren* voorgeschreven. Voor die
onderdelen is een kilometerteller de verkeerde wekker.

**Een fiets is geen fiets.** Een mtb-ketting haalt ruwweg de helft van een
wegketting, een mtb heeft vering en een dropper, en een binnenfiets heeft
nauwelijks remslijtage maar wél een zweetprobleem dat buitenfietsen niet kennen.

## Voorstel: twee maten

| Maat | Waarvoor | Peildatum |
|---|---|---|
| `km` | ketting, cassette, bladen, banden, remblokken, trapas | `strava_bikes.distance_m` minus baseline |
| `months` | kabels, stuurlint, remvloeistof, vering, dropper, sealant, trainerband | `installed_at`, bij vervanging `replaced_at` |

**Draaiuren kunnen niet.** Fox en RockShox schrijven hun servicebeurten in
ride-hours voor — RockShox 50 uur voor de lowers, 100–200 uur voor een volledige
service; Fox 30–50 uur lowers en 125 uur of jaarlijks voor een overhaul
([Fox](https://tech.ridefox.com/fox_tech_center/owners_manuals/011/Content/Service_Intervals.html),
[Flow](https://flowmountainbike.com/features/flows-guide-to-understanding-suspension-service-intervals-and-upgrade-options/)).
Wij kunnen die uren niet berekenen: `strava_activities` heeft geen `gear_id`,
dus geen enkele rit hangt aan een fiets. Ik reken vering daarom om naar maanden
bij ~3 uur mtb per week. Wie meer rijdt, moet de drempel zelf verlagen — dat
zeggen we ook in beeld.

## De catalogus

Drempels in kilometers tenzij anders vermeld. Kolommen zijn de bestaande
ranges: **vroeg** (`low`) / **normaal** (`normal`) / **oprijden** (`high`).

### Aandrijving

| Onderdeel | Race | Gravel | MTB | Binnen |
|---|---|---|---|---|
| Ketting | 2500 / 4000 / 6000 | 2000 / 3000 / 4500 | 1200 / 2000 / 3000 | 3000 / 5000 / 8000 |
| Cassette | 8000 / 12000 / 18000 | 6000 / 9000 / 13000 | 4000 / 6000 / 9000 | 10000 / 15000 / 22000 |
| Kettingbladen | 15000 / 25000 / 40000 | 12000 / 18000 / 28000 | 8000 / 12000 / 20000 | 20000 / 30000 / 45000 |
| Trapas | 10000 / 20000 / 35000 | 8000 / 15000 / 25000 | 6000 / 12000 / 20000 | 12 / 18 / 24 **mnd** |

De ketting is het scharnierpunt: vervang je die op tijd, dan halen cassette en
bladen twee tot drie kettingen. Bronnen geven voor de weg 1500–3000 mijl
(2400–4800 km), gravel 1500–2000 mijl en mtb 1000–1500 mijl, in natte modder
zelfs 500 mijl
([BikeRadar](https://www.bikeradar.com/advice/workshop/how-to-know-when-its-time-to-replace-your-bicycle-chain),
[road.cc](https://road.cc/content/feature/when-should-you-replace-your-chain-219450),
[Hubtiger](https://hubtiger.com/how-often-do-i-replace-my-bicycle-chain/)).
Meet met een kettingmeter: 0,5% voor 11–13 speed, 0,75% voor 6–10 speed.

**Een binnenfiets heeft wél een kilometerstand.** Wie via Zwift rijdt, synct die
ritten naar Strava en de gearteller loopt gewoon mee. Ketting, cassette en
bladen rekenen daar dus net zo goed in kilometers als buiten — met ruimere
drempels, want er is geen zand, regen of pekel.

De trapas is de uitzondering en staat bewust in maanden. Daar sloopt geen
kilometerstand maar zweet het lager: zweet loopt via de bidonbouten naar de
trapas en tast daar aan
([Zwift Insider](https://zwiftinsider.com/dont-let-zwifting-damage-bike/),
[Cyclingnews](https://www.cyclingnews.com/features/indoor-cycling-tips-five-ways-to-sweatproof-your-bike-for-indoor-riding-and-racing/)).

### Banden

| Onderdeel | Race | Gravel | MTB | Binnen |
|---|---|---|---|---|
| Voorband | 4000 / 6000 / 9000 | 3000 / 4500 / 7000 | 2500 / 4000 / 6000 | — |
| Achterband | 2500 / 4000 / 6000 | 2000 / 3000 / 4500 | 1500 / 2500 / 4000 | — |
| Trainerband | — | — | — | 9 / 15 / 24 **mnd** |
| Tubeless sealant | 3 / 4 / 6 **mnd** | 3 / 4 / 6 **mnd** | 3 / 4 / 6 **mnd** | — |

Opgaven lopen ver uiteen: 3000–5000 km voor de weg, 2000–4000 gravel, 1500–5000
mtb ([WatchMy.bike](https://watchmy.bike/blog/when-to-replace-bike-tires),
[Vittoria](https://int.vittoria.com/blogs/news/how-often-to-replace-bike-tires-a-short-guide)).
De achterband gaat consequent eerder — vandaar twee aparte onderdelen, zoals nu
al. Een trainerband op een wheel-on trainer haalt 300–500 uur, in de praktijk een
half jaar tot twee jaar ([Joyful Triathlete](https://joyfultriathlete.com/tires-wear-and-damage-with-turbo-trainers/)).
Die staat in maanden en niet in kilometers, ook al is de Zwift-kilometerstand
bekend: rubber op een rol gaat net zo goed kapot van hitte en ouderdom als van
afstand. Een direct-drive trainer heeft er sowieso geen.

### Remmen

| Onderdeel | Race | Gravel | MTB | Binnen |
|---|---|---|---|---|
| Remblokken schijf | 3000 / 6000 / 10000 | 2000 / 3500 / 6000 | 700 / 1500 / 2800 | — |
| Remblokken velg | 2000 / 4000 / 7000 | 1500 / 3000 / 5000 | 1000 / 2000 / 3500 | — |
| Remvloeistof | 12 / 18 / 24 **mnd** | 12 / 18 / 24 **mnd** | 12 / 18 / 24 **mnd** | — |

Blokken zijn het onderdeel met de grootste spreiding van allemaal. Organisch in
natte herfstmodder haalt 200–400 km; datzelfde blok op een droge vlakke weg gaat
richting 8000 km. Op technische trails is 500–700 km normaal
([road.cc](https://road.cc/content/feature/all-you-need-know-about-replacing-disc-brake-pads-176649),
[GeekayBikes](https://geekaybikes.com/blogs/news/disc-brake-pad-life)).
Ik heb de mtb-waarde daarom laag gezet: liever een keer te vroeg gewaarschuwd
dan met metaal op metaal een schijf slopen.

Remvloeistof is puur tijd: DOT jaarlijks omdat het water aantrekt, minerale olie
elke 1,5 tot 2 jaar ([Epic Bleed Solutions](https://epicbleedsolutions.com/blogs/faq/how-often-should-i-bleed-my-brakes),
[WatchMy.bike](https://watchmy.bike/blog/brake-fluid-bleed-guide)).

### Bediening en comfort

| Onderdeel | Race | Gravel | MTB | Binnen |
|---|---|---|---|---|
| Kabels en buitenkabels | 18 / 30 / 48 **mnd** | 12 / 24 / 36 **mnd** | 12 / 18 / 30 **mnd** | 12 / 18 / 24 **mnd** |
| Stuurlint | 12 / 18 / 30 **mnd** | 9 / 15 / 24 **mnd** | — | 6 / 9 / 15 **mnd** |
| Handvatten | — | — | 12 / 24 / 36 **mnd** | — |

Binnen staan de intervallen kort omdat zweet zout is en overal in loopt.

### Alleen MTB

| Onderdeel | Vroeg / normaal / oprijden |
|---|---|
| Vering voorvork, lowers | 6 / 9 / 12 **mnd** |
| Vering volledige service | 12 / 18 / 24 **mnd** |
| Achterdemper service | 12 / 18 / 24 **mnd** |
| Dropperpost service | 12 / 18 / 24 **mnd** |

Omgerekend uit de fabrikantsuren bij ~3 uur mtb per week. Rijd je meer, zet de
drempel dan zelf lager.

### Alleen binnen

| Onderdeel | Vroeg / normaal / oprijden |
|---|---|
| Balhoofdlager controleren en invetten | 6 / 9 / 12 **mnd** |
| Zadelpen losmaken en invetten | 6 / 12 / 18 **mnd** |

Het balhoofd ligt recht in de druipzone en zweet laat bouten vastroesten. Dit
zijn controlepunten, geen vervangingen — de garage moet ze dus als "nakijken"
tonen en niet als "vervangen".

## Wat dit betekent voor de code

1. `bike_components` krijgt `wear_metric` (`km` | `months`) en `threshold_value`;
   `threshold_km` wordt overgezet met `wear_metric = 'km'`.
2. `wearPct()` krijgt een tak voor maanden, gerekend vanaf `installed_at` of
   `replaced_at`. De rest van de module blijft met één percentage werken.
3. De catalogus wordt een tabel van discipline × onderdeel, met per cel de drie
   drempels en de standaardmaat. Onderdelen die op een discipline niet bestaan,
   worden daar niet voorgesteld.
4. Nieuwe onderdeeltypes: trainerband, sealant, remvloeistof, handvatten, vering
   lowers, vering volledig, achterdemper, dropper, balhoofd, zadelpen.
5. Statuslabels: bij een controlepunt hoort "nakijken", niet "vervangen".

## Waar ik je aandacht voor vraag

**De spreiding is groot en dat blijft zo.** Remblokken verschillen een factor
twintig tussen droog asfalt en natte modder. Elke drempel hier is een startpunt
dat het lid zelf moet kunnen bijstellen — dat kan al via `custom_threshold`.

**Dit is een wekker, geen keuring.** Niets hiervan vervangt kijken en voelen. Een
ketting meet je met een kettingmeter, blokken beoordeel je op dikte. Dat hoort
zo in beeld te staan en in de gebruikersvoorwaarden.

**Bronnen zijn overwegend vakmedia en fabrikanten, geen onderzoek.** Voor
fabrikantsintervallen (vering, remvloeistof) is dat de juiste bron. Voor
slijtagecijfers zijn het ervaringsgetallen, en die verschillen per artikel.
