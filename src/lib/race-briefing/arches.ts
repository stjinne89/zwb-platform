// Welke powerup je bij welke boog krijgt, voor het racebriefje. Puur: geen I/O.

import { ARCH_IDS } from "@/lib/zwift/arch-ids";
import type { ArchReward } from "@/lib/zwift/powerups";
import { segmentLabel, type BriefingSegment } from "./route";

/** Eén boog (of het startvak, km 0) met wat hij geeft; null is een greep uit de kansverdeling. */
export type ArchPowerup = { km: number; label: string; reward: ArchReward | null };

/** Wat een boog zonder vaste powerup kan geven; percent null als alleen de soort bekend is. */
export type PowerupOdds = { powerup: ArchReward; percent: number | null };

/**
 * Het startvak en daarna de bogen, op volgorde van de kilometer. Een boog op de
 * streep valt weg: daar heb je niets meer aan.
 *
 * Met `arches` (de ZRL-tag arch_powerup) staat een boog die erin voorkomt er
 * met zijn vaste powerup; een boog met bekende archId die er niet in staat,
 * deelt uit de kansverdeling (`random`). Een segment waarvan we de archId niet
 * kennen, valt weg: beter niets dan een gok. Zonder die tag deelt elke boog uit
 * de kansverdeling. Twee segmenten die op dezelfde plek eindigen, delen één boog.
 */
export function archPowerupList(input: {
  segments: BriefingSegment[];
  totalKm: number;
  arches: Map<number, ArchReward> | null;
  start: ArchReward | null;
  random?: boolean;
}): ArchPowerup[] {
  const out: ArchPowerup[] = [];
  if (input.start) out.push({ km: 0, label: "start", reward: input.start });
  for (const segment of input.segments) {
    if (segment.endKm >= input.totalKm - 0.05) continue;
    const archId = ARCH_IDS[segment.slug];
    if (input.arches && archId === undefined) continue;
    const reward = archId === undefined ? undefined : input.arches?.get(archId);
    if (reward) out.push({ km: segment.endKm, label: segmentLabel(segment), reward });
    else if (input.random && !out.some((arch) => arch.km > 0 && Math.abs(arch.km - segment.endKm) < 0.05)) {
      out.push({ km: segment.endKm, label: segmentLabel(segment), reward: null });
    }
  }
  return out.sort((a, b) => a.km - b.km);
}

/**
 * De kansverdeling, aangevuld met wat arch_powerup uitdeelt bij bogen die we
 * niet op de route kunnen plaatsen (zonder kans): zo staat elke mogelijke
 * powerup op het briefje, ook als de plek onbekend is.
 */
export function powerupOddsWithArches(odds: PowerupOdds[], arches: Map<number, ArchReward> | null, placed: ArchPowerup[]): PowerupOdds[] {
  if (odds.length === 0 || !arches) return odds;
  const out = [...odds];
  for (const reward of arches.values()) {
    if (!out.some((item) => item.powerup === reward) && !placed.some((arch) => arch.km > 0 && arch.reward === reward)) out.push({ powerup: reward, percent: null });
  }
  return out;
}
