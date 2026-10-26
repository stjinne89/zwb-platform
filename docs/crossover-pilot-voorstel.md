# Voorstel: crossover-pilot regelmotor tegen AI

**2026-10-26. Voorstel, niets gebouwd.** Wacht op een besluit van de eigenaar.
Achtergrond: [eigen-regelmotor](eigen-regelmotor.md),
[naspelen](regelmotor-naspelen.md), [literatuurtoets](regelmotor-literatuurtoets.md).

## Waarom een proef, en wat hij wel en niet kan zeggen

De meetlat toetst regels, de literatuurtoets bandbreedtes; op beide houdt de motor
zich even goed of beter dan de AI, en de literatuur kan tussen de twee niet kiezen.
Het blinde oordeel van trainers (tabblad Vergelijken) zegt wat ervaren mensen van
de schema's vinden. Wat geen van drieën zegt: **hoe het lid een schema volhoudt en
hoe het voelt.** Dat kan alleen een proef.

**Wat deze proef níét kan:** aantonen dat de motor iemand fitter maakt. Sinds
2026-09-17 hadden 18 leden een AI-schema. Een FTP-winst van een paar procent in
zes weken verdwijnt bij zo'n groep in de ruis van testdag, slaap en seizoen; om
een verschil van die grootte te zien, zijn tientallen tot honderden deelnemers per
arm nodig. FTP wordt daarom wel gemeten, maar niet als beslissende uitkomst.

**Wat hij wél kan:** laten zien of leden de motorschema's minstens zo goed volgen,
of ze niet zwaarder of slechter aanvoelen, en of er geen extra signalen van
overbelasting komen. Daarmee is de vraag voor de eigenaar: *is de motor niet
slechter in de praktijk?* (niet-inferioriteit), niet *is hij beter?*

## Opzet

- **Crossover, AB/BA.** Elk lid krijgt twee periodes van zes weken: de ene helft
  eerst motor dan AI, de andere helft andersom. Loting per lid, gestratificeerd op
  doel (ZRL tegen de rest), zodat beide volgordes een vergelijkbare mix hebben.
  Elk lid is zijn eigen vergelijking; dat is bij kleine aantallen de enige opzet
  die iets oplevert.
- **Geen uitwasperiode**, want stoppen met trainen is geen optie. Overdracht van
  de eerste periode naar de tweede vangen we op door alleen de **laatste vier weken
  van elke periode** te analyseren.
- **Wie meedoet.** Leden met een lopend schema en een gekoppelde Strava- of
  intervals.icu-account (anders is naleving niet te meten), die er expliciet voor
  kiezen. Niet: leden met een A-doel binnen de twaalf weken (een taper midden in
  een wissel vertroebelt beide) en leden die net terugkomen van ziekte of blessure.
  Doel: minstens 10 deelnemers, liever 14 of meer.
- **Blind?** Voor het lid niet goed mogelijk: titels en teksten van de motor zijn
  sjabloonzinnen. We zeggen niet welke periode welke is, maar rekenen erop dat een
  deel het raadt. Trainers keuren de concepten zoals nu en zien wel wie het maakte.
- **Alles blijft verder gelijk.** Dezelfde invoer, dezelfde trainer, dezelfde
  publicatie naar intervals.icu, dezelfde dagaanpassingen — alleen wie het schema en
  de aanpassingen maakt, wisselt. In de motorperiode maakt de motor ook de
  dagelijkse aanpassingen en bijwerkingen.

## Metingen

Alles komt uit gegevens die ZWB al verzamelt, per lid per periode (laatste vier
weken).

| Uitkomst | Waar het vandaan komt | Rol |
|---|---|---|
| **Naleving**: aandeel geplande trainingen "volgens plan" (80-115 % van de geplande belasting) | `complianceForWorkouts` / `summarizeCompliance` in `compliance.ts`, rit gekoppeld via Strava of intervals.icu | **Primair** |
| Gemist: aandeel niet-gereden trainingen | idem | secundair |
| Beleving: aandeel "zwaar" of "slecht" en RPE tegen de geplande intensiteit | `training_workout_reports` (athlete_feel, athlete_rpe) | secundair |
| Overbelasting: dagen met TSB ≤ −20, en dalende HRV of stijgende rust-HR | intervals.icu-wellness, `wellness.ts` | veiligheid |
| Ingrepen van de trainer: aantal aangepaste of vervangen workouts | wordt nu niet vastgelegd (`training_workouts` heeft alleen `updated_at`); zie punt 6 hieronder | secundair |
| Verloop CTL tegen het plan | intervals.icu | beschrijvend |
| FTP: test aan het begin, na periode 1 en na periode 2 | bestaande FTP-testflow (`ftp-test.ts`) | beschrijvend, zie boven |
| Oordeel van het lid na elke periode: één vraag (1-5) en een open veld | nieuw, zie onder | secundair |

**Vooraf vastgelegd besluit** (vóór de start in PLAN.md, zodat de uitkomst niet
achteraf wordt uitgelegd): de motor gaat live als

1. de naleving onder de motor gemiddeld **niet meer dan 5 procentpunt lager** ligt
   dan onder de AI,
2. er onder de motor **niet meer** overbelastingssignalen of "slecht"-meldingen
   zijn,
3. trainers in het blinde vergelijken de motor **niet vaker afwijzen** dan kiezen.

De analyse is per lid gepaard (motor min AI) met een tekentoets of Wilcoxon, plus
de ruwe verschillen per lid. Bij 10-14 leden geeft dat alleen bij grote verschillen
een harde uitspraak; het besluit leunt daarom op de drie voorwaarden samen, niet op
een p-waarde.

**Stopregel.** Twee weken achter elkaar overbelastingssignalen, of een lid dat
aangeeft dat het niet gaat: dat lid gaat terug naar de AI en telt mee als "niet
volgehouden" in de arm waarin het gebeurde.

## Wat er in de app voor nodig is

Niets hiervan is gebouwd.

1. **Motor als bron van een generatie.** Op de plekken waar nu een AI-aanroep
   start — sinds 2026-10-26 Claude, via `AI_PROVIDER` — (`generateAiDraftFromForm`, `startPlanUpdate`, `startBackgroundAdaptation`,
   `startTodayAdjustmentDraft` in `draft.ts`) kiest een pilotschakelaar per lid de
   motor. Die schrijft een `training_ai_generations`-rij met `model`
   `zwb-regelmotor`, status `completed` en het motorschema als `response_json`, en
   loopt daarna via dezelfde weg (`insertPlanWorkouts`) naar een concept. Zo blijft
   alles erna — trainerskeuring, publicatie, naleving — gelijk, en is achteraf per
   schema te zien wie het maakte.
2. **Wie wanneer welke arm heeft.** Een kleine tabel (lid, volgorde, begindatum,
   eventueel stopdatum) met RLS zoals de andere trainingstabellen; alleen de
   eigenaar of `training.manage_assignments` vult hem. Migratie nodig; lokaal niet
   te testen.
3. **Wissel op de overgangsdatum.** Bij de wissel een bijwerking vanaf die dag door
   de nieuwe bron, zodat het lid niet midden in een blok van de ene in de andere
   logica blijft hangen. Kan via de bestaande `startPlanUpdate`.
4. **Toestemming.** Een opt-in per lid, met een korte uitleg op `/hulp` en een
   aangepaste zin in de privacyverklaring: de gegevens zijn dezelfde, het doel
   (vergelijken van twee planners) is nieuw. Volgens de afspraak over het verruimen
   van privacy: tekst eerst aan de eigenaar voorleggen.
5. **Vraag na elke periode.** Eén vraag en een open veld, als melding of in de
   coachchat. Klein; opslaan in dezelfde pilottabel of een eigen tabel.
6. **Ingrepen van de trainer vastleggen.** Wie een workout wijzigt of vervangt,
   staat nergens: een kolom `edited_by` op `training_workouts` (gezet in
   `updateWorkout` en `replaceWorkoutFromTemplate`) volstaat. Migratie nodig.
7. **Analysescript.** Zoals `engine-replay.mjs`: leest de pilottabel en de bestaande
   naleving, beleving en wellness, en schrijft alleen tellingen naar `docs/`.

Geschatte omvang: punt 1 en 3 zijn het meeste werk (de motor moet ook de vorm van
een dagvoorstel en een bijwerking leveren die `draft.ts` verwacht; dat doet hij al
voor het naspelen). Punt 2, 4, 5 en 6 zijn klein. Daarnaast vraagt het van de
eigenaar: deelnemers werven, de loting, en de FTP-tests inplannen.

## Open punten voor de eigenaar

- Zes weken per periode of acht? Langer geeft stabielere naleving, maar meer
  overdracht en een langere proef (nu 12 weken plus voorbereiding).
- Blijft de motor in de motorperiode ook de dagaanpassingen doen (voorstel: ja), of
  alleen de schema's?
- Het open besluit uit het naspelen — piekweek ≥ 85 % tegen "nooit meer dan een
  kwart erbij" — moet vóór de proef genomen zijn, anders test de pilot een regel
  die nog kan veranderen.
- Eerst de volumefout van de motor herstellen (korte rustige ritten worden
  rustdagen, ook als de dag 90 minuten of meer toelaat; zie de literatuurtoets) —
  zonder dat herstel test de pilot een motor die structureel te weinig plant.
- Bij indoor en korte dagen maakt de 90-minutenregel van elke rit een
  kwaliteitssessie. Dat is bewust, maar de pilot is dé kans om te zien of leden dat
  volhouden; die groep apart bekijken.
- De AI-kant in de pilot is Claude, niet GPT: de eerdere vergelijkingen (meetlat,
  naspelen, literatuurtoets) gingen over GPT-antwoorden.
