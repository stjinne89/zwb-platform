import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createForest, groundGeometry, noise2, seeded, terrainLift, type Track } from "@/app/(app)/zwbgame/scenery";

const track: Track = { bend: (d) => Math.sin(d / 450) * 35, height: (d) => Math.sin(d / 300) * 20, length: 3000, seed: "test-route" };

describe("scenery", () => {
  it("noise stays in 0–1 and the seeded generator repeats itself", () => {
    for (let i = 0; i < 500; i++) { const n = noise2(i * 0.37, i * 0.91); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(1); }
    const a = seeded("x"), b = seeded("x");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("the ground is flat beside the road and only rolls further out", () => {
    for (let d = 0; d < 3000; d += 37) for (const x of [-12, -7, 0, 7, 12]) expect(terrainLift(d, x)).toBe(0);
    const far = Array.from({ length: 50 }, (_, i) => terrainLift(i * 61, 150));
    expect(Math.max(...far) - Math.min(...far)).toBeGreaterThan(3);
  });

  it("the ground faces up, so it is drawn from above", () => {
    const g = groundGeometry(track, false);
    const normals = g.getAttribute("normal");
    let up = 0;
    for (let i = 0; i < normals.count; i++) up += normals.getY(i);
    expect(up / normals.count).toBeGreaterThan(0.8);
  });

  it("trees keep off the road, with more room on the camera side, and grow the same every time", () => {
    const scene = new THREE.Scene();
    const forest = createForest(scene, track, false);
    expect(forest.count).toBeGreaterThan(200);
    expect(createForest(new THREE.Scene(), track, false).count).toBe(forest.count);
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    for (const mesh of scene.children as THREE.InstancedMesh[]) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix);
        const offset = position.x - track.bend(-position.z);
        // Placement jitters a few metres along the road, where the bend shifts a little.
        expect(Math.abs(offset)).toBeGreaterThan(6.5);
      }
    }
    forest.dispose();
  });
});
