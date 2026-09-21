# Zwift-wedstrijden in het pacingplan: wat er te meten viel

21 september 2026. Onderzoek voor de ronde "Pacingplan voor Zwift: format,
fiets, slipstream, wegdek en powerups" in `PLAN.md`. Alles hieronder is op die
dag gemeten of gelezen, niet aangenomen, tenzij er **aanname** staat.

## 1. Spelregels uit de Zwift-event-API

`GET https://us-or-rly101.zwift.com/api/public/events/upcoming` (200 events,
zonder login). Relevant per event **én** per subgroep:

| Veld | Gemeten waarden | Betekenis voor het plan |
| --- | --- | --- |
| `eventType` | `RACE` 59, `GROUP_RIDE` 110, `GROUP_WORKOUT` 24, `TIME_TRIAL` 7 | voorstel voor het format |
| `rulesSet` | `NO_POWERUPS`, `NO_DRAFTING`, `NO_TT_BIKES`, `ENFORCE_NO_ZPOWER`, `ENFORCE_HRM`, `LADIES_ONLY`, `ALLOWS_LATE_JOIN`, `SHOW_RACE_RESULTS`, `TEST_BIT_10` | drafting, powerups, tijdritfiets |
| `tags` | `powerup_percent="0,50,8,50"`, `disable powerups`, `doubledraft`, `ttbikesdraft`, `fwheel_override=…`, `rwheel_override=…`, `disable_bike_upgrade_physics`, `timestamp=…` | welke powerups, dubbele slipstream, opgelegde wielen, upgrades uit |
| `bikeHash` | op 1 van 200 events gevuld (subgroep) | opgelegd frame, id uit `zwift-data` |

- Regels staan niet altijd op event en subgroep gelijk (`NO_TT_BIKES`: 94 keer
  op het event, 240 keer op een subgroep). Daarom de vereniging.
- `powerup_percent` is een lijst van paren *id, kans*. De nummering komt uit de
  community (Zwift publiceert hem niet): 0 veer, 1 draft boost, 4 burrito,
  5 aerohelm, 6 spook, 7 stoomwals, 8 aambeeld; 2, 3 en 10 zijn XP en
  dergelijke. **Aanname** voor de ids die niet in een echt event voorkwamen.
- De wielen van `fwheel_override`/`rwheel_override` (bijvoorbeeld 2489344011 bij
  de DURA-ACE-reeks) staan niet in `zwift-data` 1.50.0. Het plan weet dus dát
  wielen zijn opgelegd, niet welke; het rekent dan met de standaardwielen.
- Een uitsnede van vijf echte events staat in
  `tests/fixtures/zwift/event-rules.json`.

## 2. Fietsen: de ZwiftInsider-sheet

`zwift-data` heeft `bikeFrames` (166), `bikeFrontWheels` (85) en
`bikeRearWheels` met alleen id, naam, bouwjaar en `isTT`: geen gewicht, geen
aero. ZwifterBikes heeft geen eigen data of API; het rekent met de openbare
testsheet van ZwiftInsider (`1S0pTN_hBMddX0GhCqSOd6fPlIJeWtw0xr6Y1M6PzNJY`).
Die is als CSV op te halen (`/export?format=csv&gid=…`, met een redirect naar
googleusercontent.com). Geen licentie of API voor hergebruik; de eigenaar koos
er op 21 september 2026 bewust toch voor.

| Tabblad | gid | Inhoud |
| --- | --- | --- |
| Frames | `173681512` | 295 rijen: frame, testwielen, fietstype (Road, TT, Gravel, MTB, Halo, Funny, Handcycle, Recumbent), prijs, level, 183 cm, 75 kg, 150 of 300 W, dan per stage 0–5 de gemiddelde snelheid (mph) en het tijdverschil, eerst Tempus Fugit (kolom 8 + 2·stage), dan Alpe du Zwift (kolom 20 + 2·stage). Stage 0 en 5 zijn vrijwel altijd ingevuld, 1–4 ongeveer de helft. |
| Wielen | `1966597556` | 214 rijen: wielset gemeten op Zwift Carbon, Zwift TT of Zwift Gravel, bij 150 en 300 W. |
| Basis | `226321014` | Zwift Carbon + Zwift 32mm Carbon en Zwift TT, met de opmerking dat sinds juni 2026 alles 2 s trager is op het vlak. |

### IJking van ons model

Met `solveSpeedMs` (rendement 0,97, luchtdichtheid 1,225) en de basisrij van
juni 2026 (24,574 mph bij 300 W, 18,964 mph bij 150 W op het vlak):

- Twee vergelijkingen, twee onbekenden: vrij gefit komt de rolweerstand uit op
  **0,0040**, precies Zwifts bekende waarde voor asfalt met een racefiets. Dat
  bevestigt het model.
- Met Crr 0,004 vast: **CdA 0,3191** voor 183 cm / 75 kg op de referentiefiets.
- Uit de Alpe-tijden (1036 hm over 12,2 km) volgt een totale massa van 77,4 kg,
  dus **2,42 kg** fiets in ons model. Dat is geen weegschaalgewicht: bij vrijwel
  constant vermogen op een klim is de tijd lineair in hoogte plus rolweerstand,
  dus het gemiddelde percentage volstaat, maar Zwifts eigen constanten zitten
  erin. Alleen verschillen tussen fietsen moeten kloppen.
- Per frame en wielset: CdA uit de vlakke tijd en massa uit de klimtijd,
  gemiddeld over 150 en 300 W, als verschil met het referentieframe uit
  hetzelfde tabblad. Voorbeelden: Tarmac SL8 −0,016 CdA en −1,0 kg, Zwift TT
  −0,036 en +2,0 kg, Zwift Mountain +4,6 kg.
- Voor een ander lichaam schaalt de CdA met het frontale oppervlak
  0,0276·h^0,725·m^0,425 + 0,1647 (h in m). Zonder lengte: 175 cm.

## 3. Wegdek

`zwift-data` kent geen wegdek. ZwiftMap (MIT, commit `03b0227`) heeft per
wereld vlakken in `frontend/src/constants/worldConfigs/*.ts`: 156 stuks, vooral
Makuri (91) en Watopia (42), met asfalt als standaard en het eerste passende
vlak als winnaar. Daarbij een tabel met rolweerstand per wegdek en fietstype
(`constants/crr.ts`, bron zwiftinsider.com/crr): onverhard 0,025 racefiets,
0,018 gravel, 0,014 MTB; asfalt 0,004 racefiets, 0,008 gravel.

Onze `zwift_routes.shape` bewaart de vorm van één ronde elke 100 m in dezelfde
Strava-coördinaten als ZwiftMap. Het wegdek per pacingsegment volgt daaruit
zonder nieuwe data. De lead-in heeft geen vorm en telt als asfalt.

## 4. Powerups

Bron zwiftinsider.com/powerups. Veer −10 % lichaamsgewicht, 30 s. Aerohelm
−25 % luchtweerstand, 15 s. Draft boost meer slipstream, 40 s (hoeveel: niet
bekend, **aanname** ×1,5 op de besparing). Stoomwals lagere rolweerstand
ongeacht fiets en wegdek, 30 s (gerekend als 0,004). Aambeeld zwaarder op
≤ −1,5 %, 15 s (hoeveel: niet bekend, **aanname** +10 % lichaamsgewicht).
Burrito, spook en pijlen veranderen je eigen tijd niet.

## 5. Slipstream

Zwift maakt zijn draftmodel niet bekend. **Aanname:** 30 % minder
luchtweerstand in de groep, 15 % op een tijdritfiets, en bij `doubledraft`
twee keer de besparing. Dit is het getal dat het meest de moeite waard is om
ooit te meten, bijvoorbeeld met een eigen rit in een groep tegenover een solo
rit op hetzelfde vermogen.
