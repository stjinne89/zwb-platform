# Naleving van het voedingsplan: besloten plan

Besloten door de eigenaar op 2026-10-14, met akkoord van het bestuur om het
volledig te bouwen. **Stap 1 tot en met 5 zijn gebouwd; de meting (stap 0)
nog niet.** Dit document is de
bouwvolgorde; elke stap wordt een eigen ronde in `PLAN.md`.

**Wat het wordt.** Leden kunnen vastleggen wat ze eten, onder meer met een foto,
en zien of ze hun koolhydraat- en eiwitdoelen halen. De foto herkent wat er op
het bord ligt, het lid bevestigt de hoeveelheden, en ZWB rekent de macro's zelf
uit met NEVO. De grootste winst zit in het dagmenu dat meerekent met wat je al
gegeten hebt.

---

## 1. Besluiten

| # | Punt | Besluit | Gevolg |
| --- | --- | --- | --- |
| 1 | Eetdagboek | Voor iedereen, opt-in | Geen proefgroep |
| 2 | Macro's | Alleen koolhydraten en eiwit | Geen kcal, geen vet, geen energiebeschikbaarheid |
| 3 | Foto's | Direct weggooien | Geen opslag; alleen de lijst met grammen blijft |
| 4 | Privacy | Alleen deelnemers tekenen | Eigen toestemming bij aanzetten, geen nieuwe privacyversie |
| 5 | Inzage | Alleen het lid; de trainer met een eigen schakelaar | De AI-coach krijgt de naleving niet |
| 6 | AI-kosten | Eerst meten | Daglimiet van 6 foto's per lid; maandplafond na de meting |
| 7 | Diëtist | Geen controle | De ontwerpregels van §6 zijn de enige waarborg |
| 8 | Timing | Bestuur akkoord | Niet wachten op de featurepauze |

## 2. Wat dit terugdraait, en wat blijft

- **Ingetrokken:** "geen eetdagboek" uit de voedingsrondes in `PLAN.md`. De
  grond daarvoor (IOC REDs-consensus: tellen kan ontsporen) is niet weerlegd;
  het risico wordt verkleind met de regels van §6.
- **Aangepast:** "geen AI-recepten of AI-tips". AI herkent voedingsmiddelen en
  schat grammen; recepten, tips en voedingswaarden blijven zonder AI.
- **Blijft staan:** geen kcal-doel, geen afvalfunctie, geen vetpercentage, geen
  opgeslagen dieetvoorkeur. `src/lib/nutrition/targets.ts` ("er is bewust geen
  kcal-doel") blijft kloppen.

## 3. Wat er al ligt

- **Doelen per dag en per moment.** Dagtype uit schema en ritten, koolhydraten
  en eiwit in g/kg, koolhydraten per uur onderweg (`src/lib/nutrition/`).
- **NEVO.** 2.328 voedingsmiddelen met een zoekfunctie (`food-search.ts`).
- **120 recepten** met berekende macro's en porties op maat.
- **AI-koppeling.** OpenAI via `OPENAI_API_KEY` (`src/lib/training/ai.ts`).
- **Aparte toestemming per lid.** ZWBgame doet dit al
  (`supabase/migrations/0170_zwbgame.sql`, `data_consent_version`).
- **Trainerinzage**, met een bestaand model voor wie wat mag zien.
- **De tabbalk onder Voeding** (`VOEDING_SECTIONS` in `nav-config.ts`).

## 4. Invoer: zes routes

1. **Recept afvinken.** Eén tik op een recept uit het dagmenu of het
   receptenboek, met de portie die er al staat. Exact, want met NEVO berekend.
2. **Foto.** Zie §5.
3. **Barcode.** Verpakte producten en sportvoeding via Open Food Facts; NEVO
   kent geen merken. De camera-API voor barcodes werkt niet in elke browser, in
   het bijzonder niet betrouwbaar op iOS; daar is een JavaScript-bibliotheek als
   terugval nodig.
4. **Tekst of spraak.** "Bord pasta met kip en een glas melk." Dezelfde
   herkenningsstap als bij de foto, zonder beeld.
5. **Zoeken in NEVO.** Handmatig, met grammen.
6. **Herhalen.** Eerdere maaltijden en favorieten met één tik opnieuw.

Onderweg op de fiets is een eigen geval: een rit van drie uur met vier gels en
twee bidons moet in een paar tikken, niet per item.

## 5. De foto

### Wat de literatuur zegt

Gelezen zijn samenvattingen en fragmenten, niet de volledige artikelen; exacte
foutmarges staan er dus niet bij.

- Algemene AI-modellen schatten **koolhydraten het best**, eiwit slechter. Dat
  past bij besluit 2, maar eiwit blijft de zwakkere van de twee.
- **Grote porties worden onderschat**: voor wielrenners op een zware dag de
  verkeerde kant.
- **Samengestelde maaltijden** gaan veel slechter dan losse producten.
- Wat helpt: een referentie voor de grootte, een ingrediëntenlijst erbij, en de
  taak in twee stappen doen. Sterkere modellen schatten aantoonbaar beter.

### Ontwerp

- **Twee stappen.** Het model benoemt de onderdelen en schat per onderdeel de
  grammen. De koppeling aan NEVO en de macro's doet ZWB zelf.
- **Het lid bevestigt.** Een lijst met een schuif per regel; pas na bevestigen
  telt het mee.
- **Vragen wat niet te zien is**, voor zover het koolhydraten of eiwit raakt:
  suiker in de drank, saus.
- **Bandbreedte in plaats van één getal**, net als de doelen.
- **Context meegeven.** Het dagmenu en de eigen recepten van het lid.
- **De foto wordt niet bewaard.** Verkleind op het toestel, zonder
  locatiegegevens verstuurd, na het antwoord weggegooid.
- **Daglimiet 6 foto's per lid.** Daarboven blijven de andere routes werken.

Niet oplosbaar: wat er in een smoothie of stamppot zit, en de diepte van een
bord of kom.

## 6. Ontwerpregels (vast)

Er is geen proefgroep en geen controle door een diëtist. Deze regels zijn
daarom geen opties:

- Alleen een **ondergrens**: "genoeg gegeten?", nooit "te veel".
- **Geen kcal, geen vet, geen koppeling met gewicht.**
- **Geen reeksen, geen ranglijsten, niets zichtbaar voor de club.**
- **Opt-in**, met een pauzeknop en volledig wissen.
- De verwijzing naar sportarts en sportdiëtist op `/hulp` blijft staan.

## 7. Wat het lid ziet

1. **Dagbalk.** Koolhydraten en eiwit van vandaag tegen de band van het
   dagtype, per moment uitgesplitst.
2. **Rond de rit.** Gram per uur onderweg tegen het doel voor die ritduur, en
   of de herstelmaaltijd er was.
3. **Dagmenu dat meerekent.** "Je hebt nog 180 g koolhydraten en 40 g eiwit te
   gaan: dit avondeten past."
4. **Weekoverzicht.** Op hoeveel dagen de band is gehaald, per dagtype.
5. **Herinneringen.** Een pushbericht voor een lange rit of na een training
   zonder herstelmaaltijd.
6. **Trainerinzage.** Alleen als het lid de schakelaar aanzet.

Vervallen door de besluiten: naleving als context voor de AI-coach (besluit 5)
en energiebeschikbaarheid (besluit 2).

## 8. Privacy

- **Eigen toestemming.** Bij het aanzetten tekent het lid voor het eetdagboek,
  de foto naar OpenAI en, apart, de trainerinzage. Opgeslagen met datum en
  tekstversie, naar het voorbeeld van ZWBgame. Intrekken wist het eetdagboek.
- **`/privacy` krijgt een alinea** over het eetdagboek, zonder nieuwe versie.
- **Bewuste afwijking.** `src/lib/privacy.ts` vraagt bij een nieuwe categorie
  gegevens een nieuwe versie waarbij elk lid opnieuw tekent. Dat gebeurt hier
  niet, op besluit van de eigenaar. Grond: alleen deelnemers leveren deze
  gegevens aan, en zij tekenen er apart voor. Bij de bouw komt deze uitzondering
  ook in het commentaar van `privacy.ts`.
- **Voorleggen.** De alinea voor `/privacy` en de toestemmingstekst gaan vóór
  de push naar de eigenaar.
- **Zichtbaarheid.** Alleen het lid, via RLS. De trainer leest mee als de
  schakelaar aan staat en het lid aan hem is toegewezen.
- Eten kan gezondheid en geloof verraden. Of dat het juridisch tot bijzondere
  persoonsgegevens maakt, is niet uitgezocht.

## 9. Techniek

- **Geen Storage-bucket.** De foto bestaat alleen tijdens de serveractie.
- **Tabellen.**
  - instellingen per lid: aan of uit, toestemming (datum, versie),
    trainer-schakelaar;
  - maaltijden: lid, datum, moment, bron (recept, foto, barcode, tekst,
    handmatig);
  - regels: NEVO-id of barcodeproduct, grammen, of het lid de schatting heeft
    aangepast;
  - barcodeproducten als cache van Open Food Facts.
- **Migraties.** De eerstvolgende na `0230_training_preferences.sql`. Alleen
  tegen PGlite te testen.
- **Herkenning.** Een serveractie die een vaste structuur terugkrijgt
  (onderdeel, grammen, onzekerheid); koppeling aan NEVO via de bestaande
  zoekfunctie. De aanroep moet binnen de tijdslimiet van een Netlify-functie
  blijven.
- **Rekenwerk.** De bestaande functies voor porties en doelen; nieuw is het
  optellen per dag en per moment en "wat is er nog te gaan".
- **Navigatie.** Een vierde tab "Naleving" in `VOEDING_SECTIONS`, voor iedereen
  zichtbaar; wie het niet heeft aangezet, ziet daar alleen de toestemming.
- **Toestemming per onderdeel.** De tekst van stap 1 noemt alleen het
  eetdagboek. Foto en tekst (stap 3) en de trainerinzage (stap 5) krijgen elk
  een eigen schakelaar met een eigen toestemming, zodat niemand opnieuw hoeft
  te tekenen voor iets wat hij niet gebruikt.

## 10. Bouwvolgorde

Elke stap is een eigen ronde met eigen commit, `PLAN.md`-blok en, waar nodig,
een tekst op `/hulp`.

0. **Meting, zonder leden.** Twintig tot dertig eigen maaltijden wegen,
   fotograferen en door de herkenning halen. Meten: fout op koolhydraten en
   eiwit met en zonder bevestigstap, kosten per foto, wachttijd. Hieruit volgt
   het maandplafond en de modelkeuze.
1. **Eetdagboek zonder AI.** Opt-in met toestemming, recept afvinken, NEVO
   zoeken, herhalen, dagbalk, pauzeren en wissen. De privacyteksten.
   *Gebouwd op 2026-10-14 (migratie `0231_nutrition_log.sql`), zie `PLAN.md`.*
2. **Rond de rit en barcode.**
   *Gebouwd op 2026-10-14 (migratie `0233_nutrition_log_products.sql`), zie
   `PLAN.md`. De barcode-terugval voor iOS (een JavaScript-bibliotheek) is
   niet gebouwd: daar typ je het nummer over.*
3. **Foto en tekst**, met de bevestigstap en de daglimiet.
   *Gebouwd op 2026-10-14 (migratie `0234_nutrition_log_recognition.sql`), zie
   `PLAN.md`. Eigen schakelaar met eigen toestemming in plaats van een nieuwe
   `LOG_CONSENT_VERSION`; de daglimiet geldt per 24 uur, voor foto en tekst samen.*
4. **Dagmenu dat meerekent en het weekoverzicht.**
   *Gebouwd op 2026-10-14, zonder migratie, zie `PLAN.md`.*
5. **Herinneringen en trainerinzage.**
   *Gebouwd op 2026-10-14 (migratie `0235_nutrition_log_trainer_reminders.sql`),
   zie `PLAN.md`.*

Stap 0 en stap 1 hangen niet van elkaar af en kunnen tegelijk.

## 11. Open punten

- De meting van stap 0 is niet gedaan: nauwkeurigheid, kosten en wachttijd zijn
  onbekend.
- Barcode scannen op iOS is niet getest.
- De juridische status van eetgegevens is niet uitgezocht.
- De voedingsinhoud is niet door een (sport)diëtist nagekeken (besluit 7).

## Bronnen

- [Performance Evaluation of 3 Large Language Models for Nutritional Content Estimation from Food Images](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12513282/)
- [Decomposing Food Images for Better Nutrition Analysis: A Nutritionist-Inspired Two-Step Multimodal LLM Approach](https://mlanthology.org/cvprw/2025/khlaisamniang2025cvprw-decomposing)
- [Nutrients 17(4), 607](https://mdpi-res.com/d_attachment/nutrients/nutrients-17-00607/article_deploy/nutrients-17-00607.pdf)
- [Nutrients 18, 966](https://mdpi-res.com/d_attachment/nutrients/nutrients-18-00966/article_deploy/nutrients-18-00966.pdf)
- [Nutrients 18, 2017](https://mdpi-res.com/d_attachment/nutrients/nutrients-18-02017/article_deploy/nutrients-18-02017.pdf)
- [2023 IOC consensus statement on Relative Energy Deficiency in Sport (REDs)](https://pubmed.ncbi.nlm.nih.gov/37752011/)
- Intern: [voeding-wielrennen.md](voeding-wielrennen.md), `PLAN.md` ("Voedingsmodule" en "Voeding, deel 2", onder "Bewust niet gedaan").
