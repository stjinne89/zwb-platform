# Dubbele ritten in `strava_activities` (2026-10-18)

Onderzoek naar ritten die twee keer in `strava_activities` staan, met een
opruimvoorstel. **Het voorstel is niet uitgevoerd**: het wist ledendata en wacht
op goedkeuring van de eigenaar. Alle cijfers zijn op 2026-10-18 alleen-lezend
uit productie gehaald (Supabase-connector, project zwb-platform).

## Oorzaak bij een bronwissel

De intervals-sync (`src/lib/intervals/ride-sync.ts`) haalt na de eerste run elk
uur 30 dagen op. intervals.icu filtert op de **kalenderdag**
(`oldest=YYYY-MM-DD`, `fetchIntervalsActivities`), dus de lijst begint om 00:00
lokaal van de dag 30 dagen terug. De bestaande ritten werden opgehaald vanaf
`now − 29 dagen`, met één venster voor twee doelen: de verwijderregel (die moet
smal) en de ontdubbeling (die moet alles zien wat binnenkomt).

Een rit in die rand van ruim een dag stond dus wel in de lijst van
intervals.icu, maar zijn Strava-versie niet in `existing`. `dedupeRides` zag
geen botsing en de intervals-versie werd opgeslagen naast de Strava-rit. Een uur
later is de rit nog verder uit het venster, dus ook de verwijderregel ziet hem
nooit meer: de dubbele rij blijft staan.

Het bewijs bij de eigenaar: elke intervals-kopie is opgeslagen ruim 29 dagen na
de rit (rit 11 sept → `synced_at` 11 okt 22:00; 15 sept → 15 okt 23:00; 19 sept
12:29 → 18 okt 15:32, toen `now − 29 d` = 19 sept 15:32). Ritten binnen het
venster werden wel correct overgeslagen.

Het treft alleen leden met dezelfde rit onder een ander id: wie Strava
ontkoppelde met "ritten bewaren" (`member_keep_data`) en daarna intervals.icu
als bron kreeg, of wie recente ritten via CSV/GPX importeerde. De andere
richting (eerst intervals, dan Strava koppelen) is afgedekt: de Strava-callback
wist de intervals-ritten van dat lid (`api/strava/callback/route.ts`).

## De fix

`rideCompareFrom` (`src/lib/intervals/rides.ts`): de bestaande ritten worden
geladen vanaf een dag vóór de oudste rit die intervals.icu teruggaf (en minstens
een dag vóór het verwijdervenster). De verwijderregel kijkt alleen naar rijen
vanaf `removeFrom`, zoals voorheen. Bijeffect: een eigen intervals-rit in de
rand wordt niet meer zonder spoor en `gps_col_times` herschreven.

Zolang de fix niet live staat, komt er bij de eigenaar nog een dubbele rit bij
voor elke Strava-rit van 19 sept t/m 1 okt met een intervals-tegenhanger (13
Strava-ritten in die periode; Zwift-ritten tellen niet, die geeft intervals.icu
als stub).

## Wat er nu dubbel staat

Paren met start binnen 120 s en afstand binnen 5% (de regel van `isSameRide`):
**25 paren bij 8 leden**. De opdracht noemde 26 rijen bij 9 leden; dat verschil
is niet uitgezocht (vermoedelijk een iets andere afstandsregel). Drie soorten:

| Soort | Paren | Leden | Oorzaak |
| --- | --- | --- | --- |
| A. intervals-kopie naast Strava-rit | 6 | 1 (eigenaar) | de randfout hierboven |
| B. twee Strava-ritten (positief id, uit de API) | 13 | 4 | het lid nam de rit twee keer op en uploadde beide naar Strava (bv. Wahoo + Strava-app, "Dubbel opname Grand Colombier") |
| C. twee ritten uit een Strava-export (`strava_csv`) | 6 | 4 | idem B, via de CSV-import; plus één paar met twee negatieve ids (lid `73be005d`, 16 aug, "Bike Beer BBQ rit"/"…Ride", geïmporteerd op 16 en 25 aug) |

Alleen A is een ingestfout. B en C staan ook bij Strava zelf twee keer; ZWB
neemt over wat Strava heeft. Bij het paar met negatieve ids in C is niet
vastgesteld waarom de import-ontdubbeling (`planRideImport`) het niet tegenhield.

## Opruimvoorstel (niet uitgevoerd)

### A — de zes intervals-kopieën van de eigenaar wissen (aanbevolen)

Rijen: `-1000191882842`, `-1000191882841`, `-1000191882835`, `-1000191882830`,
`-1000191882826`, `-1000191882821` (11, 15 en 19 sept). De Strava-versie blijft:
die was er eerst, en drie trainingsrapporten (`training_workout_reports`) zijn
aan de Strava-ritten gekoppeld. Naar de zes kopieën verwijst niets: geen
blokken, cols, segmenten, samenvattingen of rapporten (gecontroleerd).

Voer dit pas uit **nadat de fix live staat**; anders zet de uurlijkse sync de rit
van 19 sept er zolang die in het ophaalvenster valt (tot ca. 20 okt) opnieuw bij.

```sql
-- Eerst tellen: verwacht 6 rijen, alle van 431e47d4-….
delete from strava_activities d
using strava_activities k
where d.profile_id = k.profile_id
  and d.id <= -1000000000000                 -- intervals-rit
  and d.raw->>'import_source' = 'intervals'
  and k.id > -1000000000000                  -- Strava- of importrit
  and abs(extract(epoch from d.start_date - k.start_date)) <= 120
  and abs(d.distance_m - k.distance_m) <= 0.05 * greatest(d.distance_m, k.distance_m, 1000)
returning d.id, d.profile_id, d.start_date;
```

Daarna voor de eigenaar het nawerk draaien (cols, badges, ZWBlokken), of
wachten op de volgende sync met een wijziging. De kilometers in de week-awards
van die weken worden niet vanzelf herberekend.

### B en C — niet automatisch wissen (aanbevolen)

Dit zijn echte, losse activiteiten van het lid bij Strava. Wissen in ZWB is een
keuze namens het lid over welke opname de echte is. Twee mogelijkheden voor de
eigenaar:

1. Laten staan, en lezers laten ontdubbelen zoals Stats al doet.
2. Per lid de armste opname wissen (zonder vermogen/spoor, of de kortste).
   Drie leden met soort B (`fa68ece0`, `7ee1f9cc`, `f1e8e8f0`) hebben een
   actieve Strava-koppeling: een update-event of de reconcile van 30 dagen zet
   een gewiste rit terug (bij `fa68ece0` staat er een van 7 okt). Voor hen is
   wissen bij Strava zelf de echte oplossing. De andere vijf leden hebben geen
   Strava-koppeling.

## Andere lezers

Stats ontdubbelt bij het lezen sinds commit `2970a109` (nog op een eigen branch,
niet op `main`). De andere lezers doen dat niet; na opruiming A raakt alleen
soort B/C ze nog:

| Lezer | Bestand | Gevolg van een dubbele rij |
| --- | --- | --- |
| Week-awards (badges) | `lib/achievements/awards.ts` | km, hm, tijd en kudo's per week dubbel |
| Mijlpaalbadges | `lib/achievements/milestone-evaluators.ts` | tellers (aantal ritten) dubbel; "langste rit" niet |
| Clubstatistiek dashboard | `dashboard/_components/club-stats.tsx` | km, hm, uren en aantal dubbel |
| Ledenprofiel | `leden/[id]/_components/rider-stats.tsx` | idem |
| Cols | `lib/cols/detector.ts` | `times_climbed` één te hoog |
| ZWBeter-belasting en planner | `lib/training/training-data.ts`, `zwbeter-worden/belasting/page.tsx` | volume en belasting van die dag dubbel |
| ZWBlokken | `lib/zwblokken/sync.ts`, `zwift-sync.ts` | geen: upsert per blok |
| Pacingplan | `lib/pacing/draft.ts` | geen: slaat intervals-rijen over |
