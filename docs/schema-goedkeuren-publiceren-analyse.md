# Schema goedkeuren en publiceren: analyse en voorstel

**2026-10-26.** Alleen analyse, geen code en geen migratie. Bronnen: de code op
`f2209ae3` en de productiedatabase (alleen gelezen, via de Supabase-connector).
Niet in de app doorgeklikt: daarvoor is een ingelogd trainersaccount nodig.

Aanleiding: nu ZWBeter meer gebruikt wordt, roept het goedkeuren en publiceren
van een trainingsschema vragen op.

## 1. Hoe het nu werkt

Een basisschema doorloopt vijf statussen: `draft` (Concept) → `review` →
`approved` (Goedgekeurd) → `published` (Gepubliceerd) → `archived` (Archief).
Elke workout heeft daarnaast een eigen `publish_status`: `pending`, `published`
of `failed`.

**Trainer, voor een lid:**

1. Het lid vult op `/zwbeter-worden/doelen` een doel in en wijst een trainer aan.
2. De trainer opent de cockpit → tab Doelen → kiest het lid → ziet een tekstvak
   met de ruwe AI-prompt (monospace, 7 regels) → `AI-concept maken`.
3. Na het pollen staat er "AI-concept aangemaakt." Er is geen link naar het
   concept.
4. De trainer gaat naar de tab Schema. Het concept staat onderaan in "Schema's
   maken en beheren", onder vijf andere kaarten (bijwerken, FTP-test,
   bibliotheek, kalender, afgewerkt).
5. Daar staan drie knoppen: `Naar review`, `Goedkeuren`, `Publiceren`.
   Publiceren is grijs tot er is goedgekeurd ("Keur het schema eerst goed
   voordat je publiceert.").

**Lid dat zichzelf coacht** (trainer = "Ikzelf"): dezelfde weg door de
cockpit, maar `draft.ts` publiceert zo'n schema automatisch. De knoppen komen
pas in beeld als dat mislukt.

**Aanpassingen** (dag, `plan_update`, `daily`) gaan altijd automatisch door.

## 2. Wat de data laat zien (laatste 60 dagen)

| | Aantal | Opmerking |
|---|---|---|
| Aanpassingen, automatisch gepubliceerd | ~410 | Geen knop nodig, geen klachten |
| Basisschema's van een trainer, gepubliceerd | 8 | Gemiddeld **0,5 uur** tussen aanmaken en publiceren |
| Schema's met status `review` | 2 | Allebei 80+ dagen oud, afgelopen, nooit verder |
| Schema's met status `approved`, niet gepubliceerd | 4 | Twee daarvan staan wel al (deels) in intervals.icu |
| Concepten van een trainer die nu openstaan | 2 | 4 dagen oud, **55 komende trainingen** samen |

De twee openstaande concepten zijn van leden zonder ander lopend schema. Hun
55 trainingen staan in hun eigen kalender en als "Eerstvolgende workout" op
Vandaag, maar zitten niet in intervals.icu en dus niet in Zwift of op de Wahoo.

## 3. Wat er misgaat

**A. Eén besluit, twee knoppen.** Goedkeuren en publiceren gebeuren in de
praktijk direct na elkaar (0,5 uur). Goedkeuren alleen is zelfs schadelijk:
`setPlanStatus("approved")` archiveert het lopende schema
(`archiveOtherBasePlans`), terwijl de nieuwe trainingen nog niet in intervals.icu
staan en de oude daar blijven. ZWB toont dan het nieuwe schema, de fietscomputer
het oude.

**B. "Naar review" doet niets.** Geen pagina of telling leest de status
`review`. Wie erop klikt, parkeert een schema zonder dat iemand het ziet. Het
woord botst ook met de tab Beoordelen, die over gereden workouts gaat.

**C. Technische woorden op het scherm van het lid.** Vandaag
(`page.tsx:310`) en de lijst op Schema (`schema/page.tsx:422`) tonen de kale
`publish_status`: "pending", "published", "failed". De trainerkalender ook
(`calendar-editor.tsx:269`).

**D. Het lid ziet een concept alsof het zijn schema is.**
`loadMemberWorkouts` filtert alleen de dagvoorstellen eruit, geen concept van een
basisschema. Dit is waarschijnlijk de grootste bron van vragen: "mijn training
staat in ZWB maar niet in Zwift".

**E. Een titel wijzigen zet een lopend schema terug op Concept.**
`updateTrainingPlan` zet altijd `status: "draft"`. Een tikfout herstellen in een
gepubliceerd schema laat het badge "Concept" zien terwijl alle trainingen in
intervals.icu staan, en de trainer moet opnieuw goedkeuren en publiceren.

**F. Wijzigen gaat soms vanzelf, soms niet.** Een bestaande workout aanpassen
of vervangen gaat meteen naar intervals.icu. Een workout uit de bibliotheek
toevoegen (`addWorkoutFromTemplate`) blijft `pending` tot iemand "Opnieuw
publiceren" klikt. `/hulp` zegt: "Pas je een schema aan? Publiceer opnieuw".
Dat klopt maar half.

**G. Zelf coachen via de trainercockpit.** Wie zichzelf coacht, moet zichzelf
als trainer aanwijzen ("Ikzelf"), naar de cockpit gaan, zichzelf in de
rennerkiezer kiezen en langs een AI-prompt die bedoeld is voor ontwikkelaars.

**H. Het concept is lastig te vinden.** Na "AI-concept aangemaakt." zit er geen
weg naar het concept, terwijl `planId` in de respons zit. Het beheerblok staat
onderaan de pagina. De trainerkalender laat concept- en lopende trainingen door
elkaar zien, zonder onderscheid.

## 4. Voorstel

Het principe: **een schema is óf een concept, óf het loopt.** Lopen betekent:
het staat in ZWB én in intervals.icu, en wijzigingen gaan er vanzelf heen.

### Statussen voor de gebruiker

| Nu | Voorstel | Wat de gebruiker ziet |
|---|---|---|
| Concept, Review | Concept | Alleen de trainer ziet het |
| Goedgekeurd, Gepubliceerd | Loopt | Lid ziet het, staat in intervals.icu |
| Archief | Afgelopen | Alleen in de geschiedenis |

In de database kan `approved` blijven bestaan voor oude rijen. De UI hoeft het
niet meer te tonen.

### Nieuwe flow voor de trainer

1. Doelen → `Maak concept` (prompt standaard ingeklapt of weg).
2. Klaar → in het formulier: **Concept klaar → Bekijken** (naar Schema met dat
   concept open).
3. Bovenaan de tab Schema een conceptkaart:
   *"Nieuw concept · 37 trainingen · vanaf 3 nov · vervangt Basis winter"* met
   `Publiceren voor <naam>`, `Bekijk in kalender` en `Weggooien`.
4. Eén klik op Publiceren: goedkeuren + naar intervals.icu + het oude schema
   afsluiten, in één actie.
5. Daarna gaan wijzigingen vanzelf. Een knop "Opnieuw versturen" verschijnt
   alleen als er trainingen niet zijn aangekomen: *"2 trainingen niet in
   intervals.icu"*.

### Nieuwe flow voor wie zichzelf coacht

Op het doel zelf, op `/zwbeter-worden/doelen`: `Maak mijn schema`. Daarna loopt
het (dat doet `draft.ts` nu al). Geen cockpit, geen rennerkiezer, geen prompt.

### Voor het lid

- Concepttrainingen van de trainer zie je niet. Op de schemakaart staat
  hooguit één regel: *"Je trainer maakt een nieuw schema."*
- Geen "pending/published" meer. Een training die loopt, toont niets extra's;
  een training die niet aankwam toont *"Niet in intervals.icu"*.

## 5. In rondes

**Ronde 1: klein, geen migratie.** Gebouwd op 2026-10-26 (zie `PLAN.md`); §1
en §3 A, B, C, E en deels H beschrijven daarmee de stand vóór die ronde.
- `PlanActions`: één knop `Publiceren` die eerst goedkeurt en dan publiceert;
  `Naar review` en `Goedkeuren` weg. In `publishTrainingPlan` `approved_by`/`approved_at`
  meezetten en de statuscheck laten vallen.
- `setPlanStatus("approved")` niet meer vanuit de UI aanroepen; het archiveren
  gebeurt al bij publiceren.
- `updateTrainingPlan`: status niet terugzetten naar `draft`.
- Nederlandse labels of niets in plaats van `publish_status` (C).
- Link "Concept klaar → Bekijken" in `AiDraftForm` (H).

**Ronde 2: gedrag.** Gebouwd op 2026-10-26 (zie `PLAN.md`); daarmee zijn ook
§3 D, F en de rest van H opgelost.
- Concepttrainingen uit `loadMemberWorkouts` filteren, plus de ene regel op de
  schemakaart (D).
- `addWorkoutFromTemplate` pusht direct als het schema loopt (F); dan kan
  "Opnieuw publiceren" weg en alleen terugkomen bij mislukte trainingen.
- Conceptkaart bovenaan de tab Schema; concepttrainingen gestippeld in de
  trainerkalender (H).
- `/hulp`: de zin "Publiceer opnieuw" aanpassen.

**Ronde 3: zelf coachen en opruimen.**
- `Maak mijn schema` op het doel voor wie zichzelf coacht (G).
- De AI-prompt alleen nog achter "Geavanceerd" of helemaal weg.
- Migratie: `review` → `draft`; `approved` met alleen gepubliceerde workouts →
  `published`. Niet lokaal te testen (geen Docker/Supabase-config).

## 6. Bewust niet

- **Goedkeuring door een tweede persoon** (vier-ogenprincipe). Er is één trainer
  per lid en de data laat geen behoefte zien; de reviewstatus is nooit gebruikt.
- **Het lid laten goedkeuren wat de trainer maakte.** Dat voegt een stap toe
  waar we er juist een weghalen.
- **De statuswaarden in de database hernoemen.** Alleen de labels veranderen;
  oude rijen en queries blijven werken.
- **Publiceren zonder intervals.icu-koppeling.** Blijft geblokkeerd, met een
  korte reden bij de knop. Een schema alleen in ZWB vraagt een eigen besluit
  (FIT-download hangt nu aan een intervals-event).

## 7. Open vragen voor de eigenaar

1. Mag het "Naar review"-moment echt weg, of gebruikt een trainer het als
   geheugensteun? (In de data: nee.)
2. Moet een lid zien dát er een concept klaarligt, of pas als het loopt?
3. Ronde 1 en 2 samen in één push, of eerst ronde 1 los?
