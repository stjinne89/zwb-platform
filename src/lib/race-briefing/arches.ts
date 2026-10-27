// Welke powerup je bij welke boog krijgt, voor het racebriefje. Puur: geen I/O.

import { ARCH_IDS } from "@/lib/zwift/arch-ids";
import type { ArchReward } from "@/lib/zwift/powerups";
import { segmentLabel, type BriefingSegment } from "./route";

/** Eén boog (of het startvak, km 0) met wat hij geeft. */
export type ArchPowerup = { km: number; label: string; reward: ArchReward };

/**
 * Het startvak en daarna elke boog met een bekende archId, op volgorde van de
 * kilometer. Een boog op de streep valt weg: daar heb je niets meer aan. Een
 * segment waarvan we de archId niet kennen, staat er niet in; beter niets dan
 * een gok.
 */
export function archPowerupList(input: {
  segments: BriefingSegment[];
  totalKm: number;
  arches: Map<number, ArchReward> | null;
  start: ArchReward | null;
}): ArchPowerup[] {
  const out: ArchPowerup[] = [];
  if (input.start) out.push({ km: 0, label: "start", reward: input.start });
  if (input.arches) {
    for (const segment of input.segments) {
      const archId = ARCH_IDS[segment.slug];
      const reward = archId === undefined ? undefined : input.arches.get(archId);
      if (!reward || segment.endKm >= input.totalKm - 0.05) continue;
      out.push({ km: segment.endKm, label: segmentLabel(segment), reward });
    }
  }
  return out.sort((a, b) => a.km - b.km);
}
