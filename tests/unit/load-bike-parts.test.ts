import { describe, expect, it } from "vitest";
import { loadBikeParts } from "@/lib/pacing/ride-context";

// Supabase geeft per verzoek hoogstens 1000 rijen. Op 2026-11-09 telde de
// fietslijst 1031 rijen en viel de Zwift TT (alfabetisch achteraan) eraf.

function fakeClient(total: number, maxRows = 1000) {
  const rows = Array.from({ length: total }, (_, i) => ({
    part: "frame",
    name: i === total - 1 ? "Zwift TT" : `Frame ${String(i).padStart(4, "0")}`,
    kind: i === total - 1 ? "tt" : "road",
    test_frame: "",
    stage: 0,
    cda_delta: "0.001",
    kg_delta: "-0.2",
    fixed_wheels: false,
  }));
  const calls: Array<[number, number]> = [];
  const query = {
    select: () => query,
    order: () => query,
    range: async (from: number, to: number) => {
      calls.push([from, to]);
      return { data: rows.slice(from, Math.min(to + 1, from + maxRows)), error: null };
    },
  };
  return { client: { from: () => query }, calls };
}

describe("loadBikeParts", () => {
  it("leest voorbij de grens van 1000 rijen", async () => {
    const { client, calls } = fakeClient(1031);
    const parts = await loadBikeParts(client);
    expect(parts).toHaveLength(1031);
    expect(parts.at(-1)).toMatchObject({ name: "Zwift TT", kind: "tt", cdaDelta: 0.001, kgDelta: -0.2 });
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("stopt na één verzoek als de lijst kleiner is", async () => {
    const { client, calls } = fakeClient(12);
    expect(await loadBikeParts(client)).toHaveLength(12);
    expect(calls).toHaveLength(1);
  });
});
