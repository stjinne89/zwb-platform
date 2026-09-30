import { describe, expect, it } from "vitest";
import { slimSegmentEffortRaw } from "@/lib/segments/effort-raw";

describe("slimSegmentEffortRaw", () => {
  it("keeps only the fields the database reads", () => {
    const effort = {
      id: 1, name: "Klim", hidden: true, athlete: { id: 9 }, activity: { id: 2 }, average_watts: 250,
      segment: { id: 99, name: "Klim", private: false, city: "X" },
    };
    expect(slimSegmentEffortRaw(effort)).toEqual({ hidden: true, segment: { private: false } });
  });
  it("keeps the gps source marker", () => {
    expect(slimSegmentEffortRaw({ source: "gps" })).toEqual({ source: "gps" });
  });
  it("drops a segment without a private flag and ignores non-objects", () => {
    expect(slimSegmentEffortRaw({ segment: { name: "x" } })).toEqual({});
    expect(slimSegmentEffortRaw(null)).toBeNull();
    expect(slimSegmentEffortRaw([1])).toBeNull();
  });
});
