# Claude naspelen

Is Claude een goede vervanger voor OpenAI in de trainings-AI? Gemeten op
2026-10-24 met `scripts/claude-replay.mjs`: opgeslagen GPT-5.5-generaties opnieuw
door Claude, met dezelfde systeemprompt (`prompt_text`), invoer
(`prompt_summary`) en hetzelfde JSON-schema (`planSchema`). Beide antwoorden gaan
langs de meetlat (`checkTrainingPlan`, zie [schema-meetlat](schema-meetlat.md)).

Alleen generaties van het profiel van de eigenaar: Anthropic staat nog niet als
verwerker in de privacyverklaring. De uitvoer met ledendata staat in `.tmp/`;
hier alleen tellingen.

## Alle soorten, Claude Opus 5.5 met dezelfde effort als de app

Effort per soort zoals de app hem aan OpenAI geeft: dagelijkse aanpassing en
dag-aanpassing `low`, bijwerking en nieuw schema `medium`.

| Soort | Aantal | Met fout: OpenAI | Met fout: Claude | Fouten totaal O / C | Gem. sec Claude | Kosten Claude per stuk |
|---|---:|---:|---:|---:|---:|---:|
| dagelijkse aanpassing | 5 | 0% | 0% | 0 / 0 | 9 | $0,11 |
| bijwerking | 5 | 60% | 20% | 21 / 2 | 341 | $1,06 |
| nieuw schema | 5 | 100% | 100% | 78 / 68 | 92 | $0,25 |
| dag-aanpassing (lid) | 4 | 75% | 75% | 9 / 5 | 17 | $0,07 |

- **Dagelijkse aanpassing:** Claude liet het schema alle vijf keer ongemoeid (lege
  lijst); GPT-5.5 paste drie van de vijf keer iets aan. Welke van de twee gelijk
  had, zegt de meetlat niet; dat moet uit de blinde vergelijking komen.
- **Nieuw schema:** de vijf generaties zijn van mei tot juli, van vóór de huidige
  prompt en meetlat. Beide breken veel regels; weinig zeggend.
- Bij de dag-aanpassing kwam Claude eerst met een lege lijst terug, omdat
  `minItems` uit het schema was gehaald. Met `minItems: 1` (dat Claude wel
  ondersteunt) niet meer; alleen die run telt hierboven.

## Bijwerking: drie Claude-varianten op dezelfde vijf

| Variant | Met fout | Fouten totaal | Gem. sec | Kosten per stuk | Uitvoertokens |
|---|---:|---:|---:|---:|---:|
| GPT-5.5 (opgeslagen) | 3/5 | 21 | – | – | – |
| Opus 5.5, medium | 1/5 | 2 | 341 | $1,06 | ~47.000 |
| Opus 5.5, low | 1/5 | 2 | 252 | $0,83 | ~37.000 |
| Sonnet 5.5, medium | 2/5 | 12 | 234 | $0,50 | ~45.000 |

Opus op `low` breekt even weinig regels als op `medium`, is een kwart goedkoper en
anderhalve minuut sneller. Het grootste deel van de uitvoer is het schema zelf
(~60.000 tekens JSON voor ruim 50 workouts), dus lager dan dit gaan de kosten per
bijwerking niet zonder een kleiner antwoord.

## Wat dat per maand kost

Op het volume van 25 september – 24 oktober (alle leden: 114 bijwerkingen, 97
dagelijkse aanpassingen, 14 nieuwe schema's; coachchat, weekoverzicht en voeding
zijn klein):

| Opzet | Per maand, geschat |
|---|---:|
| Alles Opus 5.5 zoals de app nu | ~$135 |
| Opus 5.5, bijwerking op `low` | ~$110 |
| Opus 5.5, bijwerking met Sonnet 5.5 | ~$71 |

Het Max-abonnement geeft $100 API-tegoed per maand.

**OpenAI kost nu weinig door gratis tokens.** Het dashboard toont $23,20 over
dezelfde 30 dagen, maar de organisatie staat ingeschreven voor "complimentary
daily tokens": in ruil daarvoor staat *Share inputs and outputs with OpenAI* op
*Enabled for all projects*. Alleen wat boven het dagtegoed uitkomt wordt betaald
(vandaar de pieken op drukke dagen als 30 september, met tien bijwerkingen). Wat
het zonder delen zou kosten is niet gemeten; uit de tokens per bijwerking geschat
grofweg $60–80 per maand.

## Niet gemeten

- Hoe lang GPT-5.5 over een generatie doet: `completed_at` is het moment van
  ophalen, niet van klaar zijn.
- Coachchat, weekoverzicht, pacing en voedingsherkenning: hun context staat niet
  volledig opgeslagen, dus naspelen kan niet exact.
- De inhoudelijke kwaliteit: daarvoor is `compare.html` (blind, A/B).
