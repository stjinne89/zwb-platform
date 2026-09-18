# Coachchat in ZWBeter Worden

Achtergrond bij de ronde van 17 september 2026, bijgewerkt op 18 september 2026
toen de coach er de trainingsdata bij kreeg. `PLAN.md` heeft de samenvatting;
dit stuk bewaart de afwegingen die daar niet in passen.

## Waarom

De redenering achter een trainingsschema zat in één tekstveld. `createPlanFromAiGeneration()`
plakt de omschrijving van de AI en zijn cautions samen in `training_plans.summary`, met
`Let op: ` ervoor; `src/lib/training/plan-summary.ts` haalt ze er weer uit en
`PlanCautions` toont er hoogstens vier bij de eerstvolgende workout. Dat component zei over
zichzelf al dat het een noodgreep was:

> Bewust tijdelijk: zolang we nog leren hoe streng die regels in de praktijk uitpakken, is
> dit de goedkoopste manier om mee te kijken.

Het probleem is niet dat die regels er staan, maar dat er niets achter zit. Een lid dat leest
"er staat vandaag negentig minuten omdat je woensdag maar een uur beschikbaar hebt" en
vervolgens wil weten *waarom dat dan niet naar donderdag schuift*, loopt dood. En andersom:
wie iets weet wat het schema zou moeten weten — twee weken ziek, een doel dat verschuift — kan
dat alleen indirect kwijt door aan de beschikbaarheidsschuifjes te trekken.

## Vier keuzes, vooraf gemaakt

| Keuze | Besluit | Alternatief dat afviel |
|---|---|---|
| Wie antwoordt | AI-coach; trainer leest mee en praat mee | Alleen mens-op-mens (lid wacht op een trainer voor een uitlegvraag); AI-concept dat de trainer eerst vrijgeeft (zelfde wachttijd terug, plus werk voor de trainer) |
| Structuur | Eén doorlopend gesprek per lid | Draad per schema (een herziening loopt bij elke beschikbaarheidswijziging, dus de historie zou continu versnipperen); draad per workout (overlapt met de bestaande beoordeel-flow) |
| Invloed op schema | Gemarkeerd bericht roept `requestReplan()` aan | Eerst akkoord van de trainer (lid wacht); niets (dan blijft de helft van de vraag onvervuld) |
| Inzage | Lid + trainers met een actieve koppeling | `current_user_can_train_profile()` hergebruiken, waarmee ook `training.manage_assignments` meeleest |

Die laatste is de enige plek in de trainingsmodule waar we van `current_user_can_train_profile()`
afwijken. De reden staat in de migratie en hier nog eens: schema's en belasting zijn cijfers,
een chat is vrije tekst waarin gezondheid en privéomstandigheden voorbijkomen. De
privacyverklaring belooft het lid dat zulke gegevens bij hem en zijn aangewezen trainer
blijven. `tests/unit/training-chat-migration.test.ts` zet die afwijking vast, inclusief de
tegenproef dat bestuur `training_plans` wél gewoon leest.

## Wat de coach ziet

`src/lib/training/chat-context.ts`, opgebouwd uit loaders die `draft.ts` al gebruikt:

- Het plan van de eerstvolgende workout (niet het basisplan) — na een herziening is dát de
  redenering achter wat er nu staat. Zelfde keuze als `loadPlanCautions()` op de Vandaag-pagina.
- `summaryWithoutCautions()` als omschrijving en `cautionsFromSummary()` als losse lijst. De
  volledige lijst, niet de ingekorte `memberCautions()`: de vier die het lid ziet zijn een
  weergavekeuze, geen kennisgrens.
- **`training_ai_generations.prompt_summary` van de generatie die dit plan opleverde.** Dit is
  het scharnierpunt. Zonder dit kan de coach herhalen wát er is besloten, niet waaróm — de
  CTL, de beschikbaarheid en de recente belasting waarop het model zijn keuze baseerde staan
  nergens anders. `athleteName` gaat eruit voordat het opnieuw naar OpenAI gaat.
- De komende 21 dagen workouts met hun blokken, het actieve doel, de beschikbaarheid, het
  seizoensplan, en de naleving uit `buildComplianceContext()` — sinds 18 september niet meer
  alleen de samenvatting, maar ook gepland-naast-gereden per training (twaalf stuks), met de
  RPE en de opmerking die het lid er zelf bij schreef.
- Hersteldata alleen bij `wellness_opt_in`.
- **De trainingsdata zelf** (`src/lib/training/training-data.ts`, sinds 18 september 2026): de
  laatste twaalf ritten met duur, afstand, hoogtemeters, TSS, IF, vermogen en hartslag; de
  belasting per week over twaalf weken; het rijritme van de laatste vier weken; FTP, gewicht,
  FTP-tests en het gesynchroniseerde vermogensprofiel; en CTL/ATL/TSB uit intervals.icu. Plus
  `bron`: wanneer de laatste rit binnenkwam en waar de vorm vandaan komt, zodat de coach kan
  zeggen hoe vers zijn cijfers zijn in plaats van een oud getal als vandaag te presenteren.

De cijfers komen uit dezelfde bronnen als de Belasting- en Vermogen-pagina — TSS uit NP en
FTP, en alleen bij een echte vermogensmeter — zodat coach en pagina niet uit elkaar lopen.

### Waarom er nu tóch één live call is

De eerste versie zei: *bewust géén live intervals.icu-call, want die kost bij elk bericht een
netwerkronde die kan mislukken, en de CTL/TSB die ertoe doet — die waarop het schema is gebouwd
— staat al in de generatie-invoer.* **Dat argument klopt niet meer.** Zodra het lid over zijn
trainingsdata mag beginnen, gaat de vraag over vandaag en niet over het moment waarop het schema
werd gemaakt; die CTL kan weken oud zijn, en hem als actueel presenteren is erger dan hem niet
hebben. CTL/ATL/TSB staan nergens in onze database (`profile_wellness` bewaart herstelwaarden,
geen belasting), dus de enige bron is intervals.icu.

De bezwaren blijven wel staan, en daarom is de call ingekaderd: hij gebeurt alleen bij een
koppeling met sleutels, hij heeft een eigen budget van vier seconden (`withBudget()`), en een
mislukking of een tijdsoverschrijding levert `vorm: null` op in plaats van een fout. De
systeemprompt zegt dat een leeg veld "we weten het niet" betekent. De POST-route kreeg
`maxDuration = 30`, gelijk aan de andere AI-routes.

## De achtergrondcall

Een reasoning-call duurt tientallen seconden; server-werk wordt hier korter afgekapt. Dezelfde
oplossing als bij de schema-generaties: `background: true` op de Responses API plus een
bewaard `response_id`.

1. `POST` zet het bericht van het lid neer én meteen een lege coach-rij met `status='pending'`.
2. De eerstvolgende `GET` — de chat pollt toch al — haalt het antwoord op en vult de rij.
3. Zolang er een rij openstaat pollt de client elke 3 s in plaats van elke 20 s. Realtime helpt
   hier niet: het afronden gebeurt in onze eigen GET.
4. Een netwerkfout richting OpenAI laat de rij staan en probeert het bij de volgende GET
   opnieuw. Pas na vijf minuten wordt de rij `failed` met een leesbare regel.

`startTrainingPlanDraftBackground()` was niet te hergebruiken: die dwingt het `json_schema` van
een heel plan af. Vandaar `startCoachAnswerBackground()` / `retrieveCoachAnswerBackground()`
ernaast in `ai.ts`, zodat `requireOpenAiKey()` en `fetchOpenAiResponse()` privé blijven.

Afgewogen alternatieven: een synchrone call in de POST (valt af op de timeout) en `after()` uit
`next/server` (de functie kan bevroren worden nadat het antwoord is verstuurd, en dan verdwijnt
het werk zonder spoor).

## Kosten

Elk antwoord kost geld. Twee remmen, met hetzelfde motief als de vijf-minuten-cooldown in
`replan.ts`:

- `rateLimitHit("training-chat", ip, 20, 60)` — tegen floods.
- `rateLimitHit("training-chat-ai", profileId, 25, 86400)` — 25 antwoorden per lid per dag.
  Boven de limiet komt het bericht er wél in, want de trainer leest het; alleen het
  AI-antwoord blijft uit, met een nette melding in het gesprek.

## Privacy

- Nieuwe privacyversie `2026-09-17` in `src/lib/privacy.ts`. Dat laat **élk lid opnieuw
  tekenen** via `PrivacyConsentDialog`. Dat is hier de bedoeling: er komt een verwerking bij
  (vrije tekst, mogelijk over gezondheid, naar OpenAI) die de oude toestemming niet dekt.
- De ontvangerregel over OpenAI klopte niet meer zodra het lid zelf tekst typt en is aangepast.
- Het gesprek zit in de data-export (`src/app/api/account/export/route.ts`; dat is een
  expliciete tabellenlijst, geen automatiek) en verdwijnt met het account via
  `on delete cascade`.
- Geen automatische opschoning zoals bij `event_chat_messages`. Een gesprek over de opbouw van
  een seizoen hoort een seizoen te overleven.

## Bewust niet gebouwd

- **Leesbevestiging per trainer.** Zou bij meerdere trainers een tweede tabel kosten. De teller
  in de rennerkiezer (leden-berichten ná het laatste trainer-bericht) doet het werk zonder
  extra opslag.
- **Bijlagen.** Tekst volstaat voor "waarom staat hier negentig minuten".
- **De coach laten schrijven in het schema.** Hij legt uit; wijzigen loopt via `requestReplan()`
  en de bestaande knoppen, met de trainer ertussen.
- **Clubbrede chat.** Blijft geparkeerd; zie het onderzoeksstuk achter in `PLAN.md`.
- **Rit-voor-rit-analyse met vermogensbestanden.** De coach krijgt de samenvattende cijfers van
  een rit, niet de vermogens- of hartslagstreams. Die streams halen we per rit alleen op om
  zonetijden te vullen (`zone-times-fill.ts`); ze per chatbericht meesturen kost een call per
  rit en levert een prompt die het venster vult.
- **Een nieuwe privacyversie voor de trainingsdata in de chat.** De ontvanger (OpenAI), het doel
  en de categorie (trainingsgegevens) veranderen niet: dezelfde gegevens gingen al mee naar
  OpenAI bij het opbouwen van een schema. Wat verandert is de detaillering — per rit in plaats
  van samengevat, inclusief de titel die het lid zelf aan een rit gaf. De tekst op `/privacy` is
  daarop aangepast zonder versiebump, zodat niet élk lid opnieuw moet tekenen. Wie dat te ruim
  vindt, zet er een versie bij in `src/lib/privacy.ts`; dat is een beslissing van de eigenaar.

## Eén ding dat opviel en niet is opgelost

`draft.ts` stuurt `athleteName` mee in elke schema-generatie, terwijl de privacyverklaring zegt
dat er "geen directe identificatiegegevens waar vermijdbaar" naar OpenAI gaan. De coachchat
haalt de naam eruit voordat de generatie-invoer opnieuw wordt verstuurd, maar de generaties
zelf zijn niet aangepast — dat valt buiten deze ronde en hoort een eigen beslissing te zijn.
