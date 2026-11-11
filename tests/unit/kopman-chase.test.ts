import { describe, expect, it } from "vitest";
import { createBoard, rideSector, startSector } from "@/kopman/engine/board";
import { newSave } from "@/kopman/engine/economy";
import { createRace } from "@/kopman/engine/race";
import { bendsFor, CAMERA_BACK, cameraAt, laneTargets, projector, ROAD_HALF, roadX, roadY, surfaceAhead } from "@/kopman/ui/chase-scene";

const save = newSave(97, "2026-11-11");
const lineup = { riders: save.lineup, kopman: save.kopman! };

describe("Kopman: koersbeeld", () => {
  it("volgt de kopman van achteren en kijkt langs de weg", () => {
    const state = createRace("openingsomloop", 3, lineup);
    const k = state.riders.find((r) => r.id === lineup.kopman)!;
    k.distance = 5000;
    expect(cameraAt(state)).toBe(5000 - CAMERA_BACK);
    const bend = bendsFor(state.raceId, state.seed);
    expect(bendsFor(state.raceId, state.seed)).toEqual(bend);
    expect(roadX(bend, 5000, 0)).toBeCloseTo(0, 6);
    expect(Math.abs(roadX(bend, 5000, 1))).toBeLessThan(0.2);
  });

  it("zet iedereen op de weg, een groep naast elkaar", () => {
    const state = createRace("openingsomloop", 3, lineup);
    const lanes = laneTargets(state);
    expect(lanes.size).toBe(state.riders.length);
    for (const x of lanes.values()) expect(Math.abs(x)).toBeLessThan(ROAD_HALF);
    expect(new Set([...lanes.values()].map((x) => x.toFixed(1))).size).toBeGreaterThan(5);
  });

  it("toont de klim omhoog en de kasseien op de stenen", () => {
    const b = createBoard("noorderkasseien", 2, lineup);
    const state = b.race;
    const arenberg = state.course.features.find((f) => f.kind === "kasseien")!;
    expect(surfaceAhead(state, arenberg.start + 50, 0)).toBe("kasseien");
    expect(surfaceAhead(state, arenberg.start - 500, 0)).toBe("asfalt");
    const climb = createRace("kwaremont", 2, lineup);
    const f = climb.course.features.find((x) => x.kind === "klim")!;
    expect(roadY(climb, f.start, 100)).toBeGreaterThan(3);
    const P = projector(400, 80, 300);
    expect(P.y(0, 10)).toBeGreaterThan(P.y(0, 100));
    startSector(b);
    while (!rideSector(b, 600)) { /* ride */ }
    expect(cameraAt(state)).toBeGreaterThan(0);
  });
});
