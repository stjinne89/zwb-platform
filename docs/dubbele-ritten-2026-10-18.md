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

Stats ontdubbelt bij het lezen sinds commit `2970a109` (op `main` sinds
2026-10-18). Sinds de tweede ronde van 2026-10-18 doen de lezers hieronder
dat ook, met `uniqueRides` (`src/lib/rides/unique-rides.ts`): zelfde lid, start
binnen 120 s, afstand binnen 5%. Van twee opnames blijft die met vermogen (voor
de cols: die met een spoor), bij gelijke stand de Strava-rit.

| Lezer | Bestand | Zonder ontdubbelen | Nu |
| --- | --- | --- | --- |
| Week-awards (badges) | `lib/achievements/awards.ts` | km, hm, tijd en kudo's per week dubbel | één keer |
| Mijlpaalbadges | `lib/achievements/milestone-evaluators.ts` | tellers (aantal ritten) dubbel | één keer |
| Clubstatistiek dashboard | `dashboard/_components/club-stats.tsx` | km, hm, uren en aantal dubbel | één keer |
| Ledenprofiel | `leden/[id]/_components/rider-stats.tsx` | idem | één keer |
| Cols | `lib/cols/detector.ts` | `times_climbed` één te hoog | één keer |
| Belasting en weekgrafiek | `rideLoadRows` (`lib/training/ride-metrics.ts`) | belasting van die dag dubbel | één keer |
| Planner (coach-context) | `trainingDataFrom` (`lib/training/training-data.ts`) | volume en belasting dubbel | één keer |
| Dag-aanpassing, "vandaag gereden" | `todayRidesFrom` (`lib/training/adapt-context.ts`) | rit twee keer | één keer |
| ZWBlokken | `lib/zwblokken/sync.ts`, `zwift-sync.ts` | geen: upsert per blok | ongewijzigd |
| Pacingplan | `lib/pacing/draft.ts` | geen: slaat intervals-rijen over | ongewijzigd |

Niet aangepast, met reden: het koppelen van ritten aan trainingen (naleving,
`completion.ts`, `compliance.ts`, de ongeplande ritten in het schema en de
context van gisteren). Daar hangt een trainingsrapport aan één bepaald rit-id;
wegfilteren kan juist de gekoppelde opname laten verdwijnen. Een dubbele opname
verschijnt daar hooguit als extra ongeplande rit. Ook niet: kalender, welkom,
voeding en de badgepagina, die tellen geen totalen over ritten op.

## Weekbadges: de run zag maar 1000 ritten

Gevonden tijdens het ontdubbelen. `awardCompletedAchievementWeeks`
(`src/lib/achievements/awards.ts`) haalde alle ritten van alle leden in één
select op. `strava_activities` heeft 29.936 rijen; PostgREST geeft er per select
hooguit 1000 (de instelling staat niet in de rolconfig van de database, dus de
standaard van Supabase; dat de grens geldt, bleek eerder al bij het clubblok op
het dashboard). Elke run rekende dus op een andere willekeurige deelverzameling,
en omdat een award per lid wordt opgeslagen, bleven de winnaars van eerdere
runs staan.

Gemeten op 2026-10-18 (alleen lezen, week uit de starttijd, zonder
ontdubbeling):

| | Aantal |
| --- | --- |
| Weekbadges in `achievement_awards` | 3.220 |
| Daarvan de echte winnaar | 296 |
| Juiste winnaars volgens de ritten | 2.561 |
| Een volledige herberekening haalt weg / kent toe | 2.924 / 2.265 |
| Idem, alleen de laatste 8 weken (vanaf 17 aug) | 38 / 19 |
| Leden die badges verliezen (van de 16 met weekbadges) | 16 |

Daarnaast hebben 2.405 Strava-ritten, gesynct tussen 26 juni en 6 augustus 2026,
een zondag als `achievement_week` in plaats van de maandag. De huidige ingest
rekent maandag; de run rekent de week nu zelf uit de starttijd. De pagina met
weekstanden (`stats/achievements/page.tsx`) filtert nog op de kolom.

### De fix

De run leest gepagineerd en standaard alleen de laatste 8 afgesloten weken
(`AWARD_WEEKS`). Per herrekende week blijft per badge één winnaar: een eerdere
winnaar die het niet meer is, verliest de badge. Een melding gaat alleen nog uit
voor de week die net af is. `POST /api/achievements/finalize?weeks=all`
herrekent de hele historie.

### Voorstel (niet uitgevoerd)

1. **Bij het live zetten** gebeurt stap a vanzelf bij de eerstvolgende run
   (elke intervals-sync met een wijziging, de beheeractie "badges vastleggen",
   de finalize-route): de laatste 8 weken worden rechtgezet, 38 badges eraf en
   19 erbij. Wie dat niet wil, zet de fix niet live.
2. **Daarna, als de eigenaar akkoord is:** eenmalig
   `POST /api/achievements/finalize?weeks=all` (runbook sectie 2). Dat zet de
   hele historie recht: ongeveer 2.900 badges eraf, 2.300 erbij. Alle 16 leden
   met weekbadges zien hun aantal veranderen. Er gaan geen meldingen uit.
3. **Los daarvan:** de 2.405 zondag-weken rechtzetten, zodat de weekstanden-pagina
   dezelfde weken toont als de badges:

   ```sql
   -- Eerst tellen: verwacht 2.405 rijen.
   update strava_activities
   set achievement_week = date_trunc('week', start_date at time zone 'UTC')::date
   where extract(isodow from achievement_week) <> 1;
   ```
