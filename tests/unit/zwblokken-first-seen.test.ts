import { describe, expect, it } from "vitest";
import { splitByExisting } from "@/lib/zwblokken/sync";

const row = (x: number, y: number, first_seen_at: string) => ({ x, y, first_seen_at });

describe("splitByExisting", () => {
  it("scheidt nieuwe blokken van blokken die eerder bereden zijn dan bekend", () => {
    const rows = [
      row(1, 1, "2015-04-01T08:00:00Z"), // nieuw
      row(2, 2, "2015-04-01T08:00:00Z"), // bekend sinds 2022: oudere rit wint
      row(3, 3, "2024-04-01T08:00:00Z"), // bekend sinds 2022: blijft staan
      row(4, 4, "2022-01-01T08:00:00Z"), // zelfde moment: niets te doen
    ];
    const existing = new Map([
      ["2/2", "2022-01-01T08:00:00+00:00"],
      ["3/3", "2022-01-01T08:00:00+00:00"],
      ["4/4", "2022-01-01T08:00:00+00:00"],
    ]);
    const { fresh, earlier } = splitByExisting(rows, existing);
    expect(fresh.map((r) => `${r.x}/${r.y}`)).toEqual(["1/1"]);
    expect(earlier.map((r) => `${r.x}/${r.y}`)).toEqual(["2/2"]);
  });
});
