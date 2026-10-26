# Regelmotor naspelen

Gegenereerd door `scripts/engine-replay.mjs` op 533 opgeslagen generaties.
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
| dagelijkse aanpassing | 126 | 0 | 18% | 10% | 48% | 13% |
| bijwerking | 119 | 0 | 83% | 13% | 100% | 100% |
| nieuw schema | 15 | 0 | 100% | 27% | 100% | 100% |
| dag-aanpassing (lid) | 3 | 0 | 67% | 0% | 100% | 33% |

Per regel: het aandeel generaties met minstens één bevinding.

| Regel | Ernst | dagelijkse aanpassing: AI / motor | bijwerking: AI / motor | nieuw schema: AI / motor | dag-aanpassing (lid): AI / motor |
|---|---|---:|---:|---:|---:|
| ongeldige-datum | fout | 0% / 0% | 1% / 0% | 0% / 0% | 0% / 0% |
| beschikbaarheid | fout | 0% / 0% | 2% / 0% | 13% / 0% | 0% / 0% |
| vaste-afspraak | fout | 2% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| weekplafond | fout | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| piekweek | fout | 0% / 0% | 0% / 7% | 13% / 13% | 0% / 0% |
| opbouwgroei | waarschuwing | 0% / 0% | 23% / 37% | 7% / 40% | 0% / 0% |
| herstelweek | waarschuwing | 0% / 0% | 10% / 20% | 13% / 47% | 0% / 0% |
| onder-recente-belasting | fout | 0% / 0% | 6% / 13% | 27% / 27% | 0% / 0% |
| blokintensiteit | fout | 4% / 0% | 43% / 0% | 53% / 0% | 67% / 0% |
| workoutintensiteit | fout | 2% / 0% | 32% / 0% | 53% / 0% | 33% / 0% |
| drempelblok-lang | fout | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| boven-ftp-lang | fout | 0% / 0% | 3% / 0% | 7% / 0% | 0% / 0% |
| korte-herstelrit | fout | 12% / 10% | 69% / 0% | 100% / 0% | 0% / 0% |
| rustdag-als-workout | waarschuwing | 15% / 0% | 0% / 0% | 0% / 0% | 33% / 0% |
| taper-zonder-piek | fout | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| sleutelsessies-aaneen | fout | 0% / 0% | 1% / 0% | 0% / 0% | 0% / 0% |
| sleutelsessie-voor-race | fout | 0% / 0% | 1% / 0% | 0% / 0% | 0% / 0% |

## Alle generaties

| Soort | Aantal | Motor faalde | Met fout: AI | Met fout: motor | Iets gewijzigd: AI | Iets gewijzigd: motor |
|---|---:|---:|---:|---:|---:|---:|
| dagelijkse aanpassing | 269 | 0 | 48% | 45% | 75% | 47% |
| bijwerking | 206 | 0 | 90% | 13% | 100% | 100% |
| nieuw schema | 33 | 0 | 100% | 24% | 100% | 100% |
| dag-aanpassing (lid) | 22 | 0 | 59% | 0% | 100% | 36% |
| bijwerking (oud) | 3 | 0 | 100% | 0% | 100% | 100% |

Per regel: het aandeel generaties met minstens één bevinding.

| Regel | Ernst | dagelijkse aanpassing: AI / motor | bijwerking: AI / motor | nieuw schema: AI / motor | dag-aanpassing (lid): AI / motor | bijwerking (oud): AI / motor |
|---|---|---:|---:|---:|---:|---:|
| ongeldige-datum | fout | 0% / 0% | 1% / 0% | 6% / 0% | 0% / 0% | 0% / 0% |
| beschikbaarheid | fout | 0% / 0% | 4% / 0% | 12% / 0% | 0% / 0% | 0% / 0% |
| vaste-afspraak | fout | 1% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| weekplafond | fout | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| piekweek | fout | 0% / 0% | 1% / 4% | 24% / 15% | 0% / 0% | 0% / 0% |
| opbouwgroei | waarschuwing | 0% / 0% | 29% / 47% | 15% / 45% | 0% / 0% | 0% / 0% |
| herstelweek | waarschuwing | 0% / 0% | 9% / 12% | 30% / 24% | 0% / 0% | 0% / 0% |
| onder-recente-belasting | fout | 0% / 0% | 15% / 13% | 36% / 24% | 0% / 0% | 0% / 0% |
| blokintensiteit | fout | 9% / 0% | 67% / 0% | 73% / 0% | 45% / 0% | 100% / 0% |
| workoutintensiteit | fout | 7% / 0% | 60% / 0% | 76% / 0% | 36% / 0% | 67% / 0% |
| drempelblok-lang | fout | 0% / 0% | 8% / 0% | 3% / 0% | 0% / 0% | 0% / 0% |
| boven-ftp-lang | fout | 0% / 0% | 8% / 0% | 18% / 0% | 0% / 0% | 0% / 0% |
| korte-herstelrit | fout | 41% / 45% | 82% / 0% | 97% / 0% | 18% / 0% | 100% / 0% |
| rustdag-als-workout | waarschuwing | 21% / 0% | 6% / 0% | 12% / 0% | 14% / 0% | 0% / 0% |
| taper-zonder-piek | fout | 0% / 0% | 3% / 0% | 3% / 0% | 0% / 0% | 0% / 0% |
| sleutelsessies-aaneen | fout | 0% / 0% | 4% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
| sleutelsessie-voor-race | fout | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |

## Waar de motor faalde

Nergens.
