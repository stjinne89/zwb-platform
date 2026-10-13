# Naleving van het voedingsplan: wat maximaal kan

Opgesteld 2026-10-14 op verzoek van de eigenaar. Dit is een afweegdocument, geen
besluit en geen bouwopdracht. Er is nog niets van gebouwd.

**Vraag.** Leden kunnen hun eten vastleggen, onder meer met een foto, en zien of
ze hun voedingsplan halen, in elk geval op macronutriënten. Uitgangspunt: het
maximale dat technisch kan, ook waar dat tegen eerdere besluiten ingaat.

**Kort antwoord.** Het kan, en het meeste kan met wat er al ligt. De foto is
daarbij de zwakste schakel: goed genoeg om een maaltijd snel in te voeren, niet
goed genoeg om zonder controle van het lid op te rekenen. De sterkste versie
gebruikt de foto daarom alleen om te herkennen wat er op het bord ligt, laat
het lid de hoeveelheden bevestigen en rekent de macro's zelf uit met NEVO. De
grootste winst zit niet in het tellen achteraf, maar in het dagmenu dat zich
aanpast aan wat je al gegeten hebt.

---

## 1. Wat dit terugdraait

`PLAN.md` sluit drie dingen uit die dit plan nodig heeft. Wie voor dit plan
kiest, draait ze bewust terug:

| Eerder besluit | Grond | Wat dit plan ermee doet |
| --- | --- | --- |
| Geen eetdagboek, geen kcal-doel, geen afvalfunctie | IOC REDs-consensus: focus op tellen en gewicht is in de wielersport een risico | Het eetdagboek komt er. Kcal en afvallen hoeven niet mee, zie §6 |
| Geen AI-recepten of AI-tips | AI kan macro's en richtlijnen verzinnen | AI herkent alleen voedingsmiddelen en schat grammen; de macro's blijven uit NEVO komen |
| Geen opgeslagen dieetvoorkeur | Kan een aandoening verraden | Een eetdagboek verraadt hetzelfde, en meer. Dat is niet te vermijden, alleen af te schermen |

Ook `src/lib/nutrition/targets.ts` zegt het in de code: "Er is bewust geen
kcal-doel".

## 2. Wat er al ligt

- **Doelen per dag en per moment.** Dagtype uit schema en ritten, koolhydraten
  en eiwit in g/kg, koolhydraten per uur onderweg (`src/lib/nutrition/`).
- **NEVO.** 2.328 voedingsmiddelen met voedingswaarden en een zoekfunctie
  (`food-search.ts`), al gebruikt voor eigen recepten.
- **120 recepten** met berekende macro's en porties op maat.
- **AI-koppeling.** OpenAI via `OPENAI_API_KEY` (`src/lib/training/ai.ts`),
  met privacyversie `2026-09-17` voor vrije tekst naar OpenAI.
- **Foto-upload.** Supabase Storage wordt al gebruikt voor eventfoto's,
  avatars en fietsen.
- **Arbeid op de fiets.** Ritten uit Strava en intervals.icu, met vermogen.
- **Trainerinzage en coachchat**, met een bestaand model voor wie wat mag zien.

Nieuw nodig: een tabel voor wat er gegeten is, het invoerscherm, de
fotoherkenning, de barcodebron en de overzichten.

## 3. Invoer: zes routes, van exact naar geschat

Naleving staat of valt met hoe weinig moeite invoeren kost. De maximale versie
biedt alle routes en laat het lid de snelste kiezen.

1. **Recept afvinken.** Eén tik op een recept uit het dagmenu of het
   receptenboek, met de portie die er al staat. Exact, want met NEVO berekend.
2. **Foto.** Zie §4.
3. **Barcode.** Verpakte producten en sportvoeding (gels, repen, drank) via
   Open Food Facts. NEVO kent geen merken, en juist sportvoeding staat er
   nauwelijks in. De camera-API voor barcodes (`BarcodeDetector`) werkt niet in
   elke browser, in het bijzonder niet betrouwbaar op iOS; daar is een
   JavaScript-bibliotheek als terugval nodig. Niet getest.
4. **Tekst of spraak.** "Bord pasta met kip en een glas melk." Dezelfde
   herkenningsstap als bij de foto, zonder beeld.
5. **Zoeken in NEVO.** Handmatig, met grammen. Bestaat al voor recepten.
6. **Herhalen.** Eerdere maaltijden en favorieten met één tik opnieuw.

Onderweg op de fiets is een eigen geval: een rit van drie uur met vier gels en
twee bidons moet in een paar tikken, niet per item.

## 4. De foto

### Wat de literatuur zegt

Gelezen zijn samenvattingen en fragmenten, niet de volledige artikelen; de
exacte foutmarges staan er dus niet bij.

- Algemene AI-modellen schatten **koolhydraten en energie het best**, eiwit en
  vet duidelijk slechter. Vet wordt stelselmatig verkeerd geschat omdat het
  onzichtbaar is (olie, saus, boter).
- **Grote porties worden onderschat.** Dat is voor wielrenners op een zware dag
  precies de verkeerde kant.
- **Samengestelde maaltijden** gaan veel slechter dan losse producten. In een
  studie met koolhydraten tellen bij diabetes zat het model bij groente en fruit
  in ruim 9 van de 10 gevallen binnen 10 g, bij samengestelde maaltijden in
  minder dan de helft.
- Een onderzoek dat drie modellen vergeleek, concludeert dat ze nog niet
  geschikt zijn voor nauwkeurige voedingsbeoordeling bij sporters.
- Wat helpt: een **referentie voor de grootte**, een **ingrediëntenlijst** of
  bereidingswijze erbij, en de taak **in twee stappen** doen: eerst benoemen wat
  er ligt, dan rekenen. Sterkere modellen doen het aantoonbaar beter dan
  lichtere.

### Wat dat voor het ontwerp betekent

- **Twee stappen.** Het model benoemt de onderdelen en schat per onderdeel de
  grammen. De koppeling aan een NEVO-product en de macro's doet ZWB zelf. Zo
  verzint het model geen voedingswaarden, alleen hoeveelheden.
- **Het lid bevestigt.** Na de foto staat er een lijst ("witte rijst 250 g,
  kipfilet 120 g, broccoli 80 g") met een schuif per regel. Pas na bevestigen
  telt het mee. Dit is geen formaliteit: zonder deze stap is het getal niet te
  vertrouwen.
- **Vragen wat niet te zien is.** Olie, boter, saus en suiker in de drank
  vraagt de app expliciet.
- **Bandbreedte in plaats van één getal.** "70–95 g koolhydraten" is eerlijker
  dan "83 g", en past bij de doelen, die ook banden zijn.
- **Context meegeven.** Het dagmenu van die dag en de recepten van het lid
  maken herkenning makkelijker: wie het recept van vandaag fotografeert, hoeft
  alleen de portie te bevestigen.
- **Leren van correcties.** Wat een lid steeds bijstelt (altijd meer rijst dan
  geschat) kan als persoonlijke correctie terugkomen.

### Wat niet oplosbaar is

Verborgen vet, wat er in een smoothie of stamppot zit, en de diepte van een bord
of kom. Dat blijft schatten, ook met een beter model.

## 5. Wat het lid ermee ziet

Oplopend van eenvoudig naar maximaal.

1. **Dagbalk.** Koolhydraten en eiwit van vandaag tegen de band van het
   dagtype, per moment uitgesplitst.
2. **Rond de rit.** Gehaalde gram per uur onderweg tegen het doel voor die
   ritduur, en of de herstelmaaltijd er was. Dit is voor wielrenners de meest
   concrete naleving, en de plek waar de meeste winst ligt.
3. **Dagmenu dat meerekent.** "Je hebt nog 180 g koolhydraten en 40 g eiwit te
   gaan: dit avondeten past." De menukeuze en portie schuiven mee met wat al
   gegeten is. Dit maakt van achteraf tellen iets waar je vooraf iets aan hebt.
4. **Weekoverzicht.** Op hoeveel dagen de band is gehaald, uitgesplitst naar
   dagtype. Het patroon "op zware dagen structureel te weinig" is de inzicht die
   een los dagcijfer niet geeft.
5. **Koppeling met training.** Naast het logboek: hoe ging de training na een
   goed of slecht gevoede dag. Alleen als beschrijving; een oorzakelijk verband
   is uit deze data niet te bewijzen.
6. **Herinneringen.** Een pushbericht voor een lange rit ("morgen 4 uur: vandaag
   8–12 g/kg") of na een training zonder herstelmaaltijd.
7. **Coachchat en trainer.** De AI-coach krijgt de naleving als context; de
   trainer kan meekijken. Alleen met aparte toestemming van het lid.
8. **Energiebeschikbaarheid.** Met vermogensdata is de arbeid op de fiets
   bekend, met het eetdagboek de inname. Daarmee is te signaleren dat iemand
   dagen achter elkaar ver te weinig eet voor wat hij traint. Dit is het
   gevoeligste onderdeel: het vraagt een energieschatting (kcal), die nu bewust
   nergens in beeld komt, en de schatting van vet is de zwakste van de foto.
   Alleen verdedigbaar als beschermend signaal ("je eet te weinig, ga naar een
   sportarts"), nooit als doel om onder te blijven.

Wat technisch ook kan maar ik afraad: ranglijsten, reeksen ("14 dagen op rij
gehaald"), zichtbaarheid voor de club, en een koppeling met gewicht of
afvallen. Dat zijn precies de mechanismen die tellen dwangmatig maken.

## 6. Risico's

**Gezondheid (REDs).** Het eerdere besluit is niet achterhaald: tellen kan bij
een deel van de sporters ontsporen. Het is te verkleinen, niet weg te nemen:

- alleen een ondergrens tonen ("genoeg gegeten?"), nooit "te veel";
- geen kcal in beeld, geen vet als doel, geen koppeling met gewicht;
- opt-in, met een pauzeknop en volledig wissen;
- geen reeksen, geen vergelijking met anderen;
- de bestaande verwijzing naar sportarts en sportdiëtist blijft staan.

De voedingsinhoud is nog steeds niet door een (sport)diëtist nagekeken. Voor
een functie die leden vertelt of ze genoeg eten, weegt dat zwaarder dan voor een
receptenboek.

**Privacy.**

- Een eetdagboek is een nieuwe categorie gegevens. `src/lib/privacy.ts` vraagt
  daarvoor een nieuwe privacyversie, dus elk lid tekent opnieuw. Anders dan bij
  de receptvoorkeuren is dit geen hergebruik van al opgegeven data.
- Eten kan gezondheid en geloof verraden (glutenvrij, halal, een dieet). Of dat
  het juridisch tot bijzondere persoonsgegevens maakt, is niet uitgezocht;
  behandel het als gevoelig.
- Foto's gaan naar OpenAI. Er kunnen mensen, een huis of een scherm op staan, en
  een foto kan een locatie bevatten. Die locatie moet er voor het versturen af.
- De veiligste keuze is de foto niet bewaren: herkennen, weggooien, alleen de
  lijst met grammen houden. Het lid ziet dan later geen foto terug.
- Zichtbaarheid: standaard alleen het lid zelf, met RLS zoals bij de eigen
  recepten. Trainerinzage en coachchat elk met een eigen schakelaar.

**Betrouwbaarheid.** Een getal dat er exact uitziet en het niet is, is slechter
dan geen getal. Vandaar de bandbreedte en de bevestigstap.

## 7. Kosten en limieten

Niets hiervan is gemeten; dat hoort in de proef van §9.

- **AI-kosten.** Eén aanroep met beeld per foto. Bij een paar foto's per lid
  per dag telt dat op; een daglimiet per lid en een maandplafond zijn nodig. De
  literatuur wijst erop dat een lichter model merkbaar slechter schat, dus
  bezuinigen op het model kost nauwkeurigheid.
- **Opslag.** Zonder bewaarde foto's alleen kleine rijen. De database staat op
  215 MB van de 512 MB (2026-10-13); een eetdagboek van honderd leden is daar
  klein bij. Met bewaarde foto's wordt Storage de beperking.
- **Wachttijd.** Een aanroep met beeld duurt seconden. Het scherm moet daar
  tegen kunnen, en de aanroep moet binnen de tijdslimiet van een Netlify-functie
  blijven.
- **Egress.** Foto's verkleinen op het toestel voor het versturen.

## 8. Techniek in grote lijnen

- **Tabellen.** Een maaltijd (lid, datum, moment, bron: recept, foto, barcode,
  tekst, handmatig) en regels per voedingsmiddel (NEVO-id of barcodeproduct,
  grammen, en of het lid de schatting heeft aangepast). RLS: alleen de eigenaar.
  De eerstvolgende vrije migratie is na `0230_training_preferences.sql`.
- **Barcodeproducten.** Een kleine eigen tabel als cache van Open Food Facts,
  zodat een product maar één keer wordt opgehaald.
- **Herkenning.** Een serveractie die de verkleinde foto naar het model stuurt
  en een vaste structuur terugkrijgt (onderdeel, grammen, onzekerheid). De
  koppeling aan NEVO gaat via de bestaande zoekfunctie.
- **Rekenwerk.** De bestaande functies voor porties en doelen; nieuw is het
  optellen per dag en per moment en "wat is er nog te gaan".
- **Niet lokaal te testen.** Migraties alleen tegen PGlite; de camera, de
  barcode-scan en de herkenning alleen op een echte telefoon.

## 9. Volgorde, als het doorgaat

Elke stap is los bruikbaar en na elke stap kan het stoppen.

0. **Proef, zonder dat leden iets zien.** Twintig tot dertig eigen maaltijden
   wegen, fotograferen en door de herkenning halen. Meten: fout op koolhydraten
   en eiwit met en zonder bevestigstap, kosten per foto, wachttijd. Hier valt
   het besluit of de foto de moeite waard is.
1. **Eetdagboek zonder AI.** Recept afvinken, NEVO zoeken, herhalen, en de
   dagbalk. Dit levert naleving op met exacte getallen en raakt alleen het
   besluit over het eetdagboek.
2. **Rond de rit en barcode.** Sportvoeding scannen, gram per uur onderweg.
3. **Foto en tekst**, met de bevestigstap, als de proef dat rechtvaardigt.
4. **Dagmenu dat meerekent en het weekoverzicht.**
5. **Herinneringen, coachchat, trainerinzage.**
6. **Energiebeschikbaarheid**, alleen na overleg met een sportarts of
   sportdiëtist.

Stap 1 en 4 samen geven het grootste deel van de waarde zonder foto.

## 10. Wat de eigenaar moet beslissen

1. Gaat het besluit "geen eetdagboek" van tafel? Zo ja: voor iedereen, of als
   proef met een kleine groep?
2. Kcal en vet: nergens in beeld (alleen koolhydraten en eiwit), of ook die?
3. Foto's bewaren of direct weggooien?
4. Een nieuwe privacyversie waarbij elk lid opnieuw tekent: nu, of samen met
   een andere wijziging?
5. Mag de trainer meekijken, en de AI-coach?
6. Een plafond voor de AI-kosten per maand.
7. Eerst een (sport)diëtist laten meekijken, of achteraf?
8. Past dit binnen de featurepauze die het bestuur overweegt?

## Bronnen

- [Performance Evaluation of 3 Large Language Models for Nutritional Content Estimation from Food Images](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12513282/)
- [Decomposing Food Images for Better Nutrition Analysis: A Nutritionist-Inspired Two-Step Multimodal LLM Approach](https://mlanthology.org/cvprw/2025/khlaisamniang2025cvprw-decomposing)
- [Nutrients 17(4), 607](https://mdpi-res.com/d_attachment/nutrients/nutrients-17-00607/article_deploy/nutrients-17-00607.pdf)
- [Nutrients 18, 966](https://mdpi-res.com/d_attachment/nutrients/nutrients-18-00966/article_deploy/nutrients-18-00966.pdf)
- [Nutrients 18, 2017](https://mdpi-res.com/d_attachment/nutrients/nutrients-18-02017/article_deploy/nutrients-18-02017.pdf)
- [2023 IOC consensus statement on Relative Energy Deficiency in Sport (REDs)](https://pubmed.ncbi.nlm.nih.gov/37752011/)
- Intern: [voeding-wielrennen.md](voeding-wielrennen.md), `PLAN.md` ("Voedingsmodule" en "Voeding, deel 2", onder "Bewust niet gedaan").
