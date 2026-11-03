# Claude-kosten, 2026-11-03

Waarom de Anthropic-rekening na de overstap (2026-10-26) zo hard oploopt, en waar
het goedkoper kan. Gemeten op 2026-11-03 uit `ai_jobs` (het `usage`-veld, de
laatste zeven dagen), `training_ai_generations` (tien weken) en de
Anthropic-console.

## Wat het kost

- **Console:** $96,56 in de eerste ~10 dagen, $7–17 per dag. Tegoed op
  2026-11-03: **$2,89**. Is dat op, dan faalt elke AI-aanroep.
- **`ai_jobs`, zeven dagen:** ~$65, dus ~$280 per maand. Het Max-abonnement geeft
  $100 per maand.

Prijzen: Opus 5.5 $4 in / $20 uit per miljoen tokens, Sonnet 5.5 $2 / $10,
cache lezen $0,20, cache schrijven 1,25× invoer.

| Soort | Aantal / 7 dagen | Gem. invoer | Gem. uitvoer | Per stuk | Per week |
|---|---:|---:|---:|---:|---:|
| bijwerking (`plan_update`) | 81 | 25.300 | 27.800 | ~$0,66 | **~$53** |
| dagelijkse aanpassing (`daily`) | 63 | 21.400 | 830 | ~$0,10 | ~$6,40 |
| nieuw schema | 2 | 19.400 | 46.400 | ~$1,00 | ~$2 |
| coachchat + weekoverzicht | 20 | ~4.500 + 56.000 cache-schrijf | ~650 | ~$0,09 | ~$1,90 |
| dag-aanpassing, pacing | 3 | | | | <$1 |

**80% van de rekening is de bijwerking.** De uitvoer is het hele resterende
schema (gemiddeld 32 workouts, ~48.000 tekens JSON) plus het denkwerk.

## Waarom zoveel bijwerkingen

De raming in [claude-naspelen](claude-naspelen.md) ging uit van 114 bijwerkingen
per maand. Het zijn er nu ~350 per maand (59 in de week van 19 oktober, 87 in die
van 26 oktober).

Elke kleine wijziging start via `requestReplan()` een volledige herziening tot de
einddatum van het schema. Redenen, laatste acht dagen:

| Aanleiding | Aantal |
|---|---:|
| Beschikbaarheid van een week gewijzigd | 38 |
| Race of rit toegezegd / afgezegd / opstelling gewijzigd | ~25 |
| Ingeplande rit vervallen, eigen rit ingepland | ~8 |
| Eenmalig: "schemaregels vernieuwd" (alle leden) | 10 |
| Overig (voorkeuren, jaarplan, FTP, chat) | ~10 |

De demping is te kort: `REPLAN_COOLDOWN_MS` is vijf minuten, en wat de cooldown
laat liggen start `settleOwnReplans()` bij het eerstvolgende bezoek aan het
schema alsnog. Eén lid had 23 bijwerkingen in zes dagen, zes op één ochtend
(07:02–09:10). Een ander schoof op één avond drie keer aan de beschikbaarheid
(17:32, 18:14, 20:42, 20:50).

Na een beschikbaarheidswijziging draait `fitScheduleToAvailability()` al, gratis:
een dag zonder tijd is direct vrij. De AI-herziening erna herschrijft daarnaast
alle weken tot het einde van het schema, ook als alleen deze week veranderde.

## Waar het goedkoper kan

Gerangschikt op besparing. Samen ruim onder de $100 per maand. **1 en 2 zijn
gebouwd** (PLAN.md, "Herzieningen 's nachts gebundeld"); 3 tot en met 5 niet.

1. **Bijwerkingen bundelen: één per lid per dag.** Een wijziging zet alleen het
   verzoek klaar (`markReplanPending`, bestaat al); de herziening gaat pas na
   een rustige periode of 's nachts. Op de afgelopen week: 81 → 39 (−52%,
   ~$27/week). Een wachttijd van een uur in plaats van vijf minuten haalt −23%,
   drie uur −41%. Nadeel: het lid ziet zijn wijziging niet meer binnen enkele
   minuten in het schema terug, behalve wat `fitScheduleToAvailability` al doet.
2. **Kleiner antwoord: alleen de komende twee weken herschrijven.** De rest van
   het schema blijft staan. Uitvoer per bijwerking naar schatting −60 tot −70%.
   Raakt de opbouw van het schema; vraagt een aanpassing van de
   plan-update-prompt, `preparePlanUpdate` en `createPlanFromAiGeneration`, en
   een herhaling van het naspelen.
3. **Sonnet 5.5 voor de bijwerking.** Halve prijs, alleen een env-waarde
   (`ANTHROPIC_MODEL_PLAN_UPDATE=claude-sonnet-5-5`) plus een redeploy. Bij het
   naspelen brak Sonnet 12 regels tegen 2 voor Opus op dezelfde vijf.
   Een kwaliteitsafweging die de eigenaar maakt.
4. **Systeemprompt van de trainings-AI cachen** (`cacheSystem: true` in
   `trainingClaudeRequest`). Die prompt is ~10.000 tokens en gaat nu elke keer
   vol mee. Levert alleen iets op als aanroepen binnen vijf minuten op elkaar
   volgen, zoals in de uurlijkse cron van de dagelijkse aanpassing: ~$2/week.
5. **Coach: cache niet schrijven.** Elke vraag schrijft 56.000 tokens weg
   (1,25× de prijs) en wordt bijna nooit binnen vijf minuten gelezen; nu
   duurder dan zonder cache. Klein (~$0,30/week).

## Bewust niet aanbevolen

- **Effort nog lager:** de bijwerking staat al op `low`; het meeste is het schema
  zelf, niet het denkwerk.
- **Batch-API (−50%) voor de dagelijkse aanpassing:** levert ~$3/week op, maar een
  batch kan tot 24 uur duren. De ophaal-code moet daarvoor anders.
- **Terug naar OpenAI:** dat was goedkoper doordat het delen van data voor gratis
  tokens aanstond. Dat besluit (2026-10-24) was tijdelijk.

## Nu meteen

- Tegoed aanvullen of automatisch bijvullen aanzetten, en in de console een
  uitgavenlimiet zetten.
