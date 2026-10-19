import { describe, expect, it } from "vitest";
import type { Vector3 } from "three";
import { BB, CRANK, createPose, FOREARM, SHIN, skinTone, solvePose, THIGH, UPPER_ARM } from "@/app/(app)/zwbgame/rider-model";

// Limbs bend in the bike's side plane, so lengths are measured there.
const side = (a: Vector3, b: Vector3) => Math.hypot(a.y - b.y, a.z - b.z);
const positions = { hoods: [0, 0], tuck: [1, 0], stand: [0, 1] } as const;
const angles = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);

describe("rider pose", () => {
  for (const [name, [tuck, stand]] of Object.entries(positions)) {
    it(`${name}: both feet stay on the pedals all the way round, with limbs at their length`, () => {
      const pose = createPose();
      for (const crank of angles) {
        solvePose(pose, tuck, stand, crank);
        for (const s of pose.sides) {
          expect(side(s.hip, s.knee)).toBeCloseTo(THIGH, 3);
          expect(side(s.knee, s.ankle)).toBeCloseTo(SHIN, 3);
          expect(side(s.shoulder, s.elbow)).toBeCloseTo(UPPER_ARM, 3);
          expect(side(s.elbow, s.hand)).toBeCloseTo(FOREARM, 3);
          expect(side(s.pedal, BB)).toBeCloseTo(CRANK, 6);
          // Knees point forward (−z) of the hip–ankle line; elbows bend back.
          const t = (s.knee.y - s.hip.y) / (s.ankle.y - s.hip.y);
          expect(s.knee.z).toBeLessThan(s.hip.z + (s.ankle.z - s.hip.z) * t);
        }
      }
    });
  }

  it("the cranks stand opposite each other and forward pedalling moves the top pedal forward", () => {
    const pose = solvePose(createPose(), 0, 0, 0);
    const [right, left] = pose.sides;
    expect(right.pedal.y).toBeCloseTo(BB.y + CRANK);
    expect(left.pedal.y).toBeCloseTo(BB.y - CRANK);
    expect(right.pedal.x).toBeCloseTo(-left.pedal.x);
    const before = right.pedal.z;
    solvePose(pose, 0, 0, 0.3);
    expect(pose.sides[0].pedal.z).toBeLessThan(before);
  });

  it("a tuck brings the shoulders down and a standing rider moves the hips forward", () => {
    const hoods = solvePose(createPose(), 0, 0, 0), tuck = solvePose(createPose(), 1, 0, 0), stand = solvePose(createPose(), 0, 1, 0);
    expect(tuck.shoulder.y).toBeLessThan(hoods.shoulder.y - 0.1);
    expect(stand.hip.z).toBeLessThan(hoods.hip.z - 0.1);
  });

  it("skin tone is stable per rider", () => {
    expect(skinTone("rider-7")).toBe(skinTone("rider-7"));
    expect(new Set(Array.from({ length: 40 }, (_, i) => skinTone(String(i)))).size).toBeGreaterThan(2);
  });
});
