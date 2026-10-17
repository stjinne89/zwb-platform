# Regelmotor naspelen

Gegenereerd door `scripts/engine-replay.mjs` op 420 opgeslagen generaties.
Elke generatie draait opnieuw door de motor, op precies de invoer die de AI kreeg;
beide schema's gaan langs dezelfde meetlat (`checkTrainingPlan`). Alleen tellingen,
geen ledendata. Ontwerp: [eigen-regelmotor](eigen-regelmotor.md); meetlat:
[schema-meetlat](schema-meetlat.md).

Let op: oude generaties zijn gemaakt met een prompt waarin nog niet alle regels
stonden. De AI-cijfers over alle generaties zijn daardoor strenger dan eerlijk;
de tabel vanaf 2026-09-17 is de zuivere vergelijking.

## Vanaf 2026-09-17

| Soort | Aantal | Motor faalde | Met fout: AI | Met fout: motor | Iets gewijzigd: AI | Iets gewijzigd: motor |
|---|---:|---:|---:|---:|---:|---:|
| dagelijkse aanpassing | 75 | 0 | 9% | 0% | 47% | 7% |
| bijwerking | 70 | 0 | 59% | 19% | 100% | 100% |
| nieuw schema | 4 | 0 | 50% | 25% | 100% | 100% |
| dag-aanpassing (lid) | 1 | 0 | 0% | 0% | 100% | 0% |

Per regel: het aandeel generaties met minstens één bevinding.

| Regel | Ernst | dagelijkse aanpassing: AI / motor | bijwerking: AI / motor | nieuw schema: AI / motor | dag-aanpassing (lid): AI / motor |
|---|---|---:|---:|---:|---:|
| ongeldige-datum | fout | 0% / 0% | 1% / 0% | 0% / 0% | 0% / 0% |
| beschikbaarheid | fout | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| vaste-afspraak | fout | 3% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| weekplafond | fout | 0% / 0% | 0% / 3% | 0% / 0% | 0% / 0% |
| piekweek | fout | 0% / 0% | 1% / 7% | 25% / 25% | 0% / 0% |
| opbouwgroei | waarschuwing | 0% / 0% | 29% / 19% | 0% / 0% | 0% / 0% |
| herstelweek | waarschuwing | 0% / 0% | 6% / 6% | 25% / 25% | 0% / 0% |
| onder-recente-belasting | fout | 0% / 0% | 16% / 11% | 25% / 0% | 0% / 0% |
| blokintensiteit | fout | 5% / 0% | 40% / 0% | 25% / 0% | 0% / 0% |
| workoutintensiteit | fout | 3% / 0% | 30% / 0% | 25% / 0% | 0% / 0% |
| drempelblok-lang | fout | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| boven-ftp-lang | fout | 0% / 0% | 4% / 0% | 25% / 0% | 0% / 0% |
| korte-herstelrit | fout | 0% / 0% | 1% / 0% | 0% / 0% | 0% / 0% |
| rustdag-als-workout | waarschuwing | 16% / 0% | 0% / 0% | 0% / 0% | 100% / 0% |
| taper-zonder-piek | fout | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| sleutelsessies-aaneen | fout | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| sleutelsessie-voor-race | fout | 0% / 0% | 1% / 0% | 0% / 0% | 0% / 0% |

## Alle generaties

| Soort | Aantal | Motor faalde | Met fout: AI | Met fout: motor | Iets gewijzigd: AI | Iets gewijzigd: motor |
|---|---:|---:|---:|---:|---:|---:|
| dagelijkse aanpassing | 218 | 0 | 50% | 0% | 82% | 52% |
| bijwerking | 157 | 0 | 82% | 22% | 100% | 100% |
| nieuw schema | 22 | 0 | 91% | 41% | 100% | 100% |
| dag-aanpassing (lid) | 20 | 0 | 50% | 5% | 100% | 35% |
| bijwerking (oud) | 3 | 0 | 100% | 0% | 100% | 100% |

Per regel: het aandeel generaties met minstens één bevinding.

| Regel | Ernst | dagelijkse aanpassing: AI / motor | bijwerking: AI / motor | nieuw schema: AI / motor | dag-aanpassing (lid): AI / motor | bijwerking (oud): AI / motor |
|---|---|---:|---:|---:|---:|---:|
| ongeldige-datum | fout | 0% / 0% | 1% / 0% | 9% / 0% | 0% / 0% | 0% / 0% |
| beschikbaarheid | fout | 0% / 0% | 4% / 0% | 9% / 0% | 0% / 0% | 0% / 0% |
| vaste-afspraak | fout | 1% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| weekplafond | fout | 0% / 0% | 0% / 1% | 0% / 0% | 0% / 0% | 0% / 0% |
| piekweek | fout | 0% / 0% | 8% / 16% | 41% / 41% | 0% / 5% | 0% / 0% |
| opbouwgroei | waarschuwing | 0% / 0% | 31% / 8% | 5% / 9% | 0% / 0% | 0% / 0% |
| herstelweek | waarschuwing | 0% / 0% | 7% / 3% | 41% / 9% | 0% / 0% | 0% / 0% |
| onder-recente-belasting | fout | 0% / 0% | 10% / 11% | 5% / 0% | 0% / 0% | 0% / 0% |
| blokintensiteit | fout | 11% / 0% | 73% / 0% | 77% / 0% | 40% / 0% | 100% / 0% |
| workoutintensiteit | fout | 8% / 0% | 68% / 0% | 82% / 0% | 35% / 0% | 67% / 0% |
| drempelblok-lang | fout | 0% / 0% | 10% / 0% | 5% / 0% | 0% / 0% | 0% / 0% |
| boven-ftp-lang | fout | 0% / 0% | 11% / 0% | 27% / 0% | 0% / 0% | 0% / 0% |
| korte-herstelrit | fout | 41% / 0% | 55% / 0% | 77% / 0% | 15% / 0% | 100% / 0% |
| rustdag-als-workout | waarschuwing | 23% / 0% | 8% / 0% | 18% / 0% | 15% / 0% | 0% / 0% |
| taper-zonder-piek | fout | 0% / 0% | 4% / 0% | 5% / 0% | 0% / 0% | 0% / 0% |
| sleutelsessies-aaneen | fout | 0% / 0% | 4% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| sleutelsessie-voor-race | fout | 0% / 0% | 1% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |

## Waar de motor faalde

Nergens.
