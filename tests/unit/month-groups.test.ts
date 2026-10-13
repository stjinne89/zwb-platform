import { describe, expect, it } from "vitest";
import { groupByMonth } from "@/lib/events/month-groups";

const group = (keys: string[], today = "2026-10-13") =>
  groupByMonth(keys, (key) => key, today).map((entry) => [entry.label, entry.items.length]);

describe("groupByMonth", () => {
  it("geeft de lopende maand geen kopje en elke volgende maand wel", () => {
    expect(group(["2026-10-14", "2026-10-25", "2026-11-02", "2026-12-06"])).toEqual([
      [null, 2],
      ["november", 1],
      ["december", 1],
    ]);
  });

  it("zet het jaar erbij zodra dat afwijkt van nu", () => {
    expect(group(["2026-12-31", "2027-01-03"])).toEqual([
      ["december", 1],
      ["januari 2027", 1],
    ]);
  });

  it("houdt een al lopende tour uit een eerdere maand bij de lopende maand", () => {
    expect(group(["2026-09-28", "2026-10-14"])).toEqual([[null, 2]]);
  });

  it("begint met een kopje als er deze maand niets meer is", () => {
    expect(group(["2026-11-02"])).toEqual([["november", 1]]);
  });
});
