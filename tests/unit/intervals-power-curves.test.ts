import { describe, expect, it } from "vitest";
import { parsePowerCurveEntries, parsePowerCurveSet } from "@/lib/intervals/client";

/** Antwoordvorm van /power-curves?curves=90d,90d-kj0,90d-kj1. */
const payload = {
  list: [
    {
      id: "90d",
      after_kj: 0,
      secs: [5, 60, 300, 1200],
      values: [900, 600, 400, 320],
      watts_per_kg: [12, 8, 5.33, 4.27],
    },
    {
      id: "90d-kj1",
      after_kj: 2000,
      secs: [5, 60, 300, 1200],
      values: [780, 500, 340, 280],
    },
    {
      id: "90d-kj0",
      after_kj: 1000,
      secs: [5, 60, 300, 1200],
      values: [850, 560, 370, 300],
    },
  ],
};

describe("parsePowerCurveSet", () => {
  it("splitst de verse curve van de vermoeide curves en sorteert op kJ", () => {
    const result = parsePowerCurveSet(payload);
    expect(result.points.map((point) => point.watts)).toEqual([900, 600, 400, 320]);
    expect(result.fatigueCurves.map((curve) => curve.afterKj)).toEqual([1000, 2000]);
    expect(result.fatigueCurves[0].points.map((point) => point.watts)).toEqual([
      850, 560, 370, 300,
    ]);
  });

  it("houdt curves zonder after_kj als verse curve en levert geen dubbele drempels", () => {
    const result = parsePowerCurveSet({
      list: [
        { id: "90d", secs: [60, 300], values: [600, 400] },
        { id: "90d-kj0", after_kj: 1000, secs: [60, 300], values: [560, 370] },
        { id: "90d-kj1", after_kj: 1000, secs: [60, 300], values: [555, 365] },
      ],
    });
    expect(result.points).toHaveLength(2);
    expect(result.fatigueCurves).toHaveLength(1);
  });

  it("valt terug op één curve als er geen list in het antwoord zit", () => {
    const result = parsePowerCurveSet({ secs: [60, 300], values: [600, 400] });
    expect(result.points.map((point) => point.seconds)).toEqual([60, 300]);
    expect(result.fatigueCurves).toEqual([]);
  });
});

describe("parsePowerCurveEntries", () => {
  it("geeft elke curve met id en drempel, ook zonder after_kj via het achtervoegsel", () => {
    const entries = parsePowerCurveEntries(
      {
        list: [
          { id: "r.2026-07-28.2026-10-25", after_kj: 0, secs: [60, 1200], values: [480, 282] },
          { id: "r.2026-10-25.2026-10-25-kj0", secs: [60, 1200], values: [450, 262] },
          { id: "r.2026-10-25.2026-10-25-kj1", after_kj: 2000, secs: [60, 1200], values: [400, 230] },
          // Zonder after_kj en zonder bekende drempel: weg.
          { id: "r.2026-10-25.2026-10-25-kj5", secs: [60, 1200], values: [1, 1] },
        ],
      },
      [1000, 2000],
    );
    expect(entries.map((entry) => [entry.id, entry.afterKj])).toEqual([
      ["r.2026-07-28.2026-10-25", 0],
      ["r.2026-10-25.2026-10-25-kj0", 1000],
      ["r.2026-10-25.2026-10-25-kj1", 2000],
    ]);
    expect(entries[1].points.map((point) => point.watts)).toEqual([450, 262]);
  });
});
