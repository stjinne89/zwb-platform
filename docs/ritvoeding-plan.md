# Ritvoeding: voorstel na de vergelijking met Musette

Voorstel van 2026-10-25. **Volgorde en de besluiten van §2 akkoord van de
eigenaar op 2026-10-25.** Aanleiding: een vergelijking van
ZWBeter voeden met musette.io, een gratis planner voor eten en drinken tijdens
een training. Dit document is de bouwvolgorde; elke stap wordt een eigen ronde
in `PLAN.md`, zoals bij
[naleving-voeding-plan.md](naleving-voeding-plan.md).

**Wat het wordt.** Het "tijdens de rit" van ZWBeter voeden gaat van een getal
("60–90 g per uur") naar een plan dat je kunt inpakken: welke bidons, welke
repen, wanneer. Dat plan staat bij elke rit en elk event op de kalender, zodat
je dagen vooruit ziet wat je klaar moet zetten. Met een vochtdoel uit je eigen zweettest, een doel dat met de
zwaarte van de rit meeschuift, en een plafond dat volgt uit je darmtraining.
Daarnaast een rekenfout in het dagmenu die er los van speelt.

---

## 1. Wat Musette doet, en wat wij al hebben

| Musette | ZWBeter voeden nu |
|---|---|
| Per training koolhydraten, vocht en natrium per uur | Alleen koolhydraten per uur, naar ritduur (`rideCarbsPerHour`) |
| Doel schuift met de Intensity Factor | Alleen duur; de intensiteit telt wel voor het dagtype |
| Bidonrecepten en paklijst uit je eigen producten | Eén receptportie per uur, uit 12 clubrecepten voor onderweg |
| Zweettest (wegen voor en na) met betrouwbaarheid per test | Kennisbanktekst "weeg jezelf voor en na" |
| Plafond per "darmniveau", tot 140+ g/u | Protocollen darmtraining (tot 120) en darmtraining-150, los van het ritdoel |
| Productkeuze op glucose:fructose | Tekst "boven 60 g per uur: meng glucose en fructose" |
| Voorraad met waarschuwing bij weinig | Niets |
| Mail op de ochtend van de training | Push of Telegram de avond voor een zware, lange of wedstrijddag |
| Geen bronnen genoemd, AI kiest de producten | Bronnen per getal, regelgebaseerd |

De tweede app met die naam, musetteapp.com, maakt een dagmenu met recepten. Die
splitst het dagdoel in "eten onderweg" en "eten aan tafel". Dat leidde naar stap 1.

## 2. Besluiten (akkoord eigenaar, 2026-10-25)

| # | Punt | Voorstel | Waarom |
|---|---|---|---|
| 1 | Volgorde t.o.v. de featurepauze | Stap 1 nu (rekenfout), de rest na het besluit over de pauze | `PLAN.md` zegt: stabiliteit gaat voor nieuwe features |
| 2 | Ondergrens tafelkoolhydraten (stap 1) | Nooit minder dan het midden van een rustdag, 4 g/kg | Aftrekken mag niet uitkomen op "eet minder" (REDs, §7 van [voeding-wielrennen.md](voeding-wielrennen.md)) |
| 3 | Intensiteit (stap 3) | Binnen de bestaande band: zwaar naar boven, rustig naar beneden; geen nieuwe getallen | Richtlijnen geven banden naar duur; Fleitas-Paniagua 2026 zag alleen winst na zware inspanning |
| 4 | Darmtraining als plafond (stap 4) | Boven 90 g/u alleen als optie voor wie de darmtraining volgt of afrondde, nooit als standaard | Ons eigen protocol zegt: sneller worden boven 90 g/u is niet aangetoond |
| 5 | Zweettest: wat bewaren (stap 5) | Alleen de uitkomst in ml/u, met datum, duur en omstandigheid; geen lichaamsgewicht | Geen weegcultuur; de naleving heeft al "geen koppeling met gewicht" |
| 6 | Natrium | Geen mg-doel; alleen "zout in je bidon" bij lang of warm | Zoutverlies verschilt te sterk per persoon; uit gewicht is het niet te meten |
| 7 | Privacy van de zweettest | Eigen toestemming bij de eerste test, alinea op `/privacy` zonder nieuwe versie, vooraf voorleggen | Zelfde route als het eetdagboek |

## 3. Bouwvolgorde

Elke stap is een eigen ronde met eigen commit, `PLAN.md`-blok en, waar nodig,
een tekst op `/hulp`. Het ritplan komt direct na de rekenfout (besluit eigenaar,
2026-10-25): dat is wat leden zien. Stap 3 en 4 verfijnen daarna alleen het
doel per uur waarmee het ritplan rekent; tot dan gebruikt het het midden van de
bestaande band.

### Stap 1. Dagmenu: ritkoolhydraten tellen mee in het dagdoel

**Probleem.** `mealTarget` (`src/lib/nutrition/targets.ts`) geeft ontbijt,
lunch, diner en tussendoor samen 85% van het midden van het dagdoel. Voor de
rit, tijdens de rit en na de rit komen daar bovenop. Rekenvoorbeeld, 70 kg,
lange dag met een rit van 4 uur: 595 + 70 + 300 + 70 = 1035 g, ongeveer
14,8 g/kg, terwijl de band tot 12 gaat. Ook een matige of zware ritdag komt net
boven de band uit. Dit is rekenwerk op de doelen; de geschaalde porties wijken
af en het is niet in de app nagekeken.

**Oplossing.** Eerst de ritmomenten (voor, tijdens × uren, na) van het midden
van het dagdoel aftrekken, dan de rest in de bestaande verhouding over de
maaltijden verdelen. De rest gaat nooit onder de ondergrens van besluit 2.
`topUpMenu` (het menu dat meerekent met wat je al at) volgt dezelfde verdeling.

**Testen.** Een eenheidstest die bij 55, 70 en 90 kg en elk dagtype het
dagtotaal van het menu binnen de band legt. De bestaande test "elk moment haalt
85% van het doel" en de afwisseling (7 tot 14 recepten per moment) opnieuw
draaien: kleinere doelen kunnen onder de schaalgrens van 0,5 vallen.

Geen migratie.

### Stap 2. Het ritplan: van gram per uur naar inpakken

Dit is de kern van wat Musette toevoegt: bij elke rit of elk event op de
kalender zie je, ook dagen vooruit, wat je klaar moet zetten. Nu staat er
alleen iets op de dagkaart van vandaag; het schema, de eventpagina en de
racebriefing zeggen niets over eten.

**Waar het staat.**
- **Bij elke geplande training in het schema** (`zwbeter-worden/schema`), voor
  elke datum, niet alleen vandaag. Een event waarvoor je "Ik doe mee" kiest,
  staat via `refreshEventWorkouts` al als training in het schema en krijgt zo
  ook een ritplan.
- **Op de eventpagina en in de racebriefing** (`events/[id]`,
  `events/[id]/briefing`), met de duur uit de pacing als die er is, anders de
  geplande duur. Bij een lange wedstrijd een link naar het protocol
  koolhydraten laden, met de dag waarop je moet beginnen.
- **In de boodschappenlijst** (`voeding/boodschappen`): wat je voor de ritten
  van die week nodig hebt, naast de recepten.
- **Op de dagkaart en in de herinnering van de avond vooraf**, zoals nu.

**Wat erin staat.**

- **Totaal.** Doel per uur × ritduur, bijvoorbeeld "3 uur × 80 g = 240 g".
- **Wat je meeneemt.** Gekozen uit de 12 clubrecepten voor onderweg en uit wat
  het lid eerder bij "Tijdens de rit" heeft vastgelegd (producten met barcode,
  met `carbs_g` en `serving_g` uit `nutrition_products`). Bidons eerst, dan vast
  eten; kiezen op passende hoeveelheid, zoals het dagmenu doet.
- **Wanneer.** Een eenvoudig schema per 20 minuten, beginnend in het eerste
  kwartier, zoals de darmtraining het voorschrijft.
- **Met één tik vastleggen.** Het plan als één maaltijd "Tijdens de rit" in het
  eetdagboek. Dat lost het open punt uit naleving-voeding-plan.md §4 op: een rit
  van drie uur met vier gels en twee bidons in een paar tikken.

Geen migratie als "eerder vastgelegd" de voorraad is; een eigen lijst met
ritvoeding zou er wel een vragen en is daarom niet het voorstel. Het plan wordt
uit de geplande training berekend, niet opgeslagen: verschuift de training,
dan schuift het plan mee.

Te groot voor één ronde. Voorstel: **2a** de berekening en de weergave bij de
training in het schema, **2b** eventpagina en briefing, **2c** dagkaart,
herinnering, boodschappenlijst en vastleggen met één tik.

### Stap 3. Het ritdoel volgt de zwaarte

`rideCarbsPerHour(duur)` wordt `rideCarbsPerHour(duur, intensiteit)`. De band
blijft gelijk; wat verschuift is het doel waarmee de tip en de receptportie
rekenen, ook in het ritplan van stap 2:

| Intensiteit | Doel binnen de band |
|---|---|
| `recovery`, `endurance` | onderkant |
| `tempo` | midden (zoals nu) |
| `threshold`, `vo2max`, `anaerobic`, `race` | bovenkant |

Bij meerdere sessies op één dag telt de rit waar het om gaat, niet de zwaarste
van de dag. Geen migratie. De grenzen zijn een vertaling van ZWB en komen zo in
[voeding-wielrennen.md](voeding-wielrennen.md) §3.

### Stap 4. Darmtraining bepaalt het plafond

Wie de darmtraining volgt, krijgt bij een rit van 150 minuten of langer het
getal van de huidige week als doel ("deze week: 100 g per uur"), ook boven 90.
Wie hem afrondde, ziet 120 als keuze, niet als standaard. Zonder protocol blijft
90 de bovenkant. De gegevens staan al in `member_protocols`. Geen migratie.

### Stap 5. Zweettest en vochtdoel

- **De test.** Een korte invoer: gewicht voor, gewicht na, gedronken ml, duur,
  binnen of buiten, warm of niet. ZWB rekent het zweetverlies per uur uit en
  bewaart alleen dat (besluit 5). Een plausibiliteitscheck, zoals Musette: een
  test korter dan 45 minuten of een uitkomst buiten 0,2–3 l/u telt niet mee.
- **Het doel.** Vocht per uur = gemeten zweetverlies, zo dat je onder ~2%
  verlies blijft en niet meer drinkt dan je zweet (§6 van voeding-wielrennen.md).
  Zonder test toont ZWB geen getal, alleen de uitnodiging om te meten.
- **In het ritplan.** Het vochtdoel bepaalt het aantal bidons in het ritplan (stap 2).
- **Als protocol.** "Zweettest" in `src/lib/protocols/nutrition.ts`, met een
  binnen- en een buitentest. Het protocolkader kent alleen afvinken; de invoer
  van de uitkomst is nieuw.

Migratie: een tabel voor de uitkomsten, eigen RLS, in de data-export. Alleen
tegen PGlite te testen; toepassen op productie alleen op verzoek.

## 4. Bewust niet

- **Voorraadbeheer met waarschuwingen.** Te veel beheer voor een clubapp; wat je
  eerder vastlegde is genoeg als voorraad.
- **Glucose:fructose per product.** Open Food Facts levert geen fructose, en
  afleiden uit de ingrediëntenlijst is onbetrouwbaar. De clubrecepten zijn al
  op een mix gebouwd; de tekst blijft.
- **Natrium als mg-doel.** Zie besluit 6.
- **Plafonds boven 120 g/u als standaard.** Darmtraining-150 blijft een protocol
  dat je bewust start.
- **AI die het plan maakt.** Regelgebaseerd blijft het uitgangspunt van de
  voedingsmodule.
- **Kcal uit kJ** (musetteapp.com). Botst met de REDs-keuze.
- **Een ochtendmail.** De herinnering van de avond vooraf krijgt het ritplan;
  geen tweede bericht.
- **Eetmomenten in de FIT-workout** (`/api/training/workouts/[id]/fit`).
  Losse stappen zouden de opbouw van de training breken; geparkeerd voor het
  plannenboek.

## 5. Open punten

- Het rekenvoorbeeld van stap 1 is niet in de app nagekeken.
- Of leden een paklijst gebruiken, is niet bekend; na stap 2 meten in de
  gebruiksanalyse.
- De drempels van stap 3 en de plausibiliteitsgrenzen van stap 5 zijn keuzes van
  ZWB, geen getallen uit de bronnen.
- De voedingsinhoud is nog steeds niet door een (sport)diëtist nagekeken.

## Bronnen

- Musette: [musette.io](https://www.musette.io/), [zweettest](https://www.musette.io/blog/from-estimated-to-measured-sweat-testing-in-musette/), [voeding per training](https://www.musette.io/blog/musette-fueling-science-why-your-fueling-needs-change-from-workout-to-workout/), [koolhydraatingrediënten](https://www.musette.io/blog/fueling-smarter-how-to-analyze-carb-ingredients-and-pick-products-for-your-workouts/)
- [musetteapp.com](https://musetteapp.com/)
- Fleitas-Paniagua PR, et al. (2026). *Scand J Med Sci Sports* 36(5):e70288 (staat in `src/lib/nutrition/library.ts`).
- Intern: [voeding-wielrennen.md](voeding-wielrennen.md) §3, §6 en §7; [naleving-voeding-plan.md](naleving-voeding-plan.md) §4 en §6.
