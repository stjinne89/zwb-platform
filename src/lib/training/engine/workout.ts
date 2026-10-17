// Een sessie uit de catalogus als GeneratedWorkout: het formaat van de
// AI-uitvoer, zodat insertPlanWorkouts() en de meetlat er niets anders aan zien.

import type { CatalogSession, GeneratedWorkout } from "@/lib/training/engine/types";

export function sessionToWorkout(
  date: string,
  session: CatalogSession,
  extra: { note?: string; methodLabel?: GeneratedWorkout["methodLabel"] } = {},
): GeneratedWorkout {
  return {
    date,
    title: session.title,
    description: extra.note ? `${session.description} ${extra.note}`.trim() : session.description,
    durationMinutes: session.durationMinutes,
    intensity: session.intensity,
    targetType: session.targetType,
    structure: session.blocks.map((block) => ({
      label: block.label,
      durationMinutes: block.durationMinutes,
      target: block.target,
      notes: block.notes,
      intensity: block.intensity,
      burstSeconds: block.onOff ? 0 : (block.burstSeconds ?? 0),
      onSeconds: block.onOff?.onSeconds ?? 0,
      offSeconds: block.onOff?.offSeconds ?? 0,
      offTarget: block.onOff?.offTarget ?? "",
    })),
    methodLabel: extra.methodLabel ?? session.methodLabel,
  };
}
