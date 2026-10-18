import { describe, expect, it } from "vitest";
import { buildField, MAX_EXTRAPOLATE_MS, type DsEntrant } from "@/lib/ds/field";
import { DS_AFTER_MS, DS_LEAD_MS, dsAfterMs, inDsWindow, ridersToCheck } from "@/lib/ds/schedule";
import { decodePlayerState } from "@/lib/zwift/player-state-pb";

const NOW = 1_800_000_000_000;

function rider(id: string, distanceM: number, options: Partial<DsEntrant> & { ageMs?: number; speedKmh?: number; power?: number } = {}): DsEntrant {
  return {
    zwiftId: id,
    name: options.name ?? `Renner ${id}`,
    zwb: options.zwb ?? false,
    weightKg: options.weightKg ?? null,
    sample:
      options.sample === null
        ? null
        : {
            stateAt: NOW - (options.ageMs ?? 0),
            eventDistanceM: distanceM,
            speedKmh: options.speedKmh ?? 36, // 10 m/s
            power: options.power ?? null,
          },
  };
}

describe("buildField", () => {
  it("schat iedereen door naar hetzelfde moment", () => {
    const field = buildField([rider("a", 1000, { ageMs: 30_000 }), rider("b", 1250)], { now: NOW, routeM: null });
    // a reed 30 s door met 10 m/s: 1300 m, dus vóór b.
    expect(field.riders.map((r) => [r.zwiftId, Math.round(r.distanceM)])).toEqual([["a", 1300], ["b", 1250]]);
    expect(field.riders[1].gapS).toBeCloseTo(5);
  });

  it("gebruikt na 20 s de snelheid van het veld, niet die van een oude afdaling", () => {
    const field = buildField(
      [rider("oud", 1000, { ageMs: 120_000, speedKmh: 54 }), rider("vers1", 2295, { speedKmh: 36 }), rider("vers2", 2285, { speedKmh: 36 })],
      { now: NOW, routeM: null },
    );
    // 20 s op 15 m/s, dan 100 s op 10 m/s: 1300 m verder, in plaats van 1800.
    expect(field.riders.find((r) => r.zwiftId === "oud")?.distanceM).toBeCloseTo(2300);
    expect(field.groups).toHaveLength(1);
  });

  it("schat een status van twee minuten helemaal door, zodat een groep bij elkaar blijft", () => {
    const field = buildField([rider("a", 1000, { ageMs: 120_000 }), rider("b", 2190)], { now: NOW, routeM: null });
    expect(field.riders.find((r) => r.zwiftId === "a")?.distanceM).toBeCloseTo(2200);
    expect(field.groups).toHaveLength(1);
    expect(MAX_EXTRAPOLATE_MS).toBeGreaterThanOrEqual(120_000);
  });

  it("deelt in groepen bij meer dan vijf seconden ertussen", () => {
    const field = buildField(
      [rider("a", 2000), rider("b", 1990), rider("c", 1960), rider("d", 1900), rider("e", 1300)],
      { now: NOW, routeM: null },
    );
    expect(field.groups.map((g) => g.riders.map((r) => r.zwiftId))).toEqual([["a", "b", "c"], ["d"], ["e"]]);
    expect(field.groups.map((g) => Math.round(g.gapS))).toEqual([0, 10, 70]);
    expect(field.riders.find((r) => r.zwiftId === "d")?.position).toBe(4);
  });

  it("rekent achterstanden met één snelheid, zodat ze van voor naar achter oplopen", () => {
    const field = buildField(
      [rider("a", 2000), rider("b", 1800, { speedKmh: 36 }), rider("c", 1700, { speedKmh: 15 }), rider("d", 1500, { speedKmh: 36 })],
      { now: NOW, routeM: null },
    );
    const gaps = field.groups.map((g) => Math.round(g.gapS));
    expect(gaps).toEqual([...gaps].sort((x, y) => x - y));
    expect(field.riders.find((r) => r.zwiftId === "c")?.gapS).toBeCloseTo(30);
  });

  it("zet binnengekomen renners apart en voor in de plaatsen", () => {
    const field = buildField([rider("a", 30_100), rider("b", 29_000)], { now: NOW, routeM: 30_000 });
    expect(field.finished.map((r) => r.zwiftId)).toEqual(["a"]);
    expect(field.riders.find((r) => r.zwiftId === "b")).toMatchObject({ position: 2, gapS: 0, group: 0 });
    expect(field.leaderM).toBe(29_000);
  });

  it("laat renners zonder of met een oude status buiten het veld", () => {
    const field = buildField(
      [rider("a", 1000), rider("b", 900, { sample: null }), rider("c", 800, { ageMs: 4 * 60_000 })],
      { now: NOW, routeM: null },
    );
    expect(field.riders.map((r) => r.zwiftId)).toEqual(["a"]);
    expect(field.unseen.map((r) => r.zwiftId)).toEqual(["b", "c"]);
  });

  it("rekent W/kg alleen met een bekend gewicht", () => {
    const field = buildField(
      [rider("a", 1000, { power: 300, weightKg: 75 }), rider("b", 990, { power: 250 })],
      { now: NOW, routeM: null },
    );
    expect(field.riders[0].wkg).toBeCloseTo(4);
    expect(field.riders[1]).toMatchObject({ wkg: null, watts: 250 });
  });

  it("rekent gemiddeld vermogen uit arbeid en rijtijd, en geeft helling en groepsgemiddelde", () => {
    const withWork = (id: string, distanceM: number, kj: number, power: number): DsEntrant => {
      const entrant = rider(id, distanceM, { power, weightKg: 70 });
      return { ...entrant, sample: { ...entrant.sample!, kj, elapsedS: 1000, cadenceRpm: 90, draft: 120 } };
    };
    const field = buildField([withWork("a", 1000, 210, 280), withWork("b", 995, 245, 350)], {
      now: NOW,
      routeM: null,
      gradeAt: (m) => (m > 900 ? 6 : 0),
    });
    expect(field.riders[0]).toMatchObject({ avgWatts: 210, cadenceRpm: 90, draft: 120, gradePct: 6 });
    expect(field.riders[0].avgWkg).toBeCloseTo(3);
    expect(field.groups[0].wkg).toBeCloseTo(4.5);
    expect(field.groups[0].gradePct).toBe(6);
  });

  it("geeft geen gemiddelde in de eerste halve minuut", () => {
    const entrant = rider("a", 100, { power: 200, weightKg: 70 });
    const field = buildField([{ ...entrant, sample: { ...entrant.sample!, kj: 2, elapsedS: 10 } }], { now: NOW, routeM: null });
    expect(field.riders[0].avgWatts).toBeNull();
  });

  it("geeft de volgende sprint of KOM", () => {
    const field = buildField([rider("a", 4000)], {
      now: NOW,
      routeM: null,
      marks: [{ name: "KOM", atM: 9000 }, { name: "Sprint", atM: 5000 }, { name: "Vorige", atM: 1000 }],
    });
    expect(field.riders[0].next).toEqual({ name: "Sprint", inM: 1000 });
  });
});

describe("ridersToCheck", () => {
  it("eerst ZWB'ers, dan wie bij hen rijdt, dan wie nooit gemeten is, dan de oudste rest", () => {
    const picked = ridersToCheck(
      [
        { zwiftId: "oud", zwb: false, checkedAt: NOW - 30 * 60_000, absent: false },
        { zwiftId: "buur", zwb: false, near: true, checkedAt: NOW - 25_000, absent: false },
        { zwiftId: "zwb", zwb: true, checkedAt: NOW - 15_000, absent: false },
        { zwiftId: "nieuw", zwb: false, checkedAt: null, absent: false },
        { zwiftId: "vers", zwb: false, checkedAt: NOW - 30_000, absent: false },
      ],
      NOW,
      10,
    );
    expect(picked).toEqual(["zwb", "buur", "nieuw", "oud"]);
  });

  it("houdt een ZWB'er vers in een groot veld waar de rest al lang wacht", () => {
    const rows = [
      ...Array.from({ length: 150 }, (_, i) => ({ zwiftId: `r${i}`, zwb: false, checkedAt: NOW - (5 + i) * 60_000, absent: false })),
      { zwiftId: "zwb", zwb: true, checkedAt: NOW - 11_000, absent: false },
    ];
    expect(ridersToCheck(rows, NOW, 8)[0]).toBe("zwb");
  });

  it("vraagt wie niet in de wereld was pas na een minuut opnieuw, en houdt zich aan het maximum", () => {
    const rows = [
      { zwiftId: "weg", zwb: true, checkedAt: NOW - 30_000, absent: true },
      { zwiftId: "a", zwb: false, checkedAt: NOW - 70_000, absent: false },
      { zwiftId: "b", zwb: false, checkedAt: NOW - 90_000, absent: false },
    ];
    expect(ridersToCheck(rows, NOW, 1)).toEqual(["b"]);
    expect(ridersToCheck(rows, NOW, 0)).toEqual([]);
  });
});

describe("dsAfterMs", () => {
  it("houdt een lange rit open tot de afstand op 25 km/u gereden is, plus een halfuur", () => {
    expect(dsAfterMs(null)).toBe(DS_AFTER_MS);
    expect(dsAfterMs(30)).toBe(DS_AFTER_MS);
    expect(dsAfterMs(100)).toBe(4.5 * 3600 * 1000);
    expect(inDsWindow(NOW, NOW + 2.2 * 3600 * 1000, 103)).toBe(true);
    expect(inDsWindow(NOW, NOW + 2.2 * 3600 * 1000)).toBe(false);
  });
});

describe("inDsWindow", () => {
  it("is open van een kwartier voor tot twee uur na de start", () => {
    expect(inDsWindow(NOW, NOW - DS_LEAD_MS)).toBe(true);
    expect(inDsWindow(NOW, NOW - DS_LEAD_MS - 1)).toBe(false);
    expect(inDsWindow(NOW, NOW + DS_AFTER_MS)).toBe(true);
    expect(inDsWindow(NOW, NOW + DS_AFTER_MS + 1)).toBe(false);
  });
});

describe("decodePlayerState", () => {
  function varint(value: bigint): number[] {
    let v = BigInt.asUintN(64, value);
    const out: number[] = [];
    do {
      let byte = Number(v & BigInt(0x7f));
      v >>= BigInt(7);
      if (v > BigInt(0)) byte |= 0x80;
      out.push(byte);
    } while (v > BigInt(0));
    return out;
  }
  const int = (no: number, value: number) => [...varint(BigInt(no << 3)), ...varint(BigInt(value))];
  const float = (no: number, value: number) => {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setFloat32(0, value, true);
    return [...varint(BigInt((no << 3) | 5)), ...bytes];
  };

  it("leest afstand, snelheid en vermogen, en geen hartslag", () => {
    const state = decodePlayerState(
      new Uint8Array([
        ...int(1, 4235693),
        ...int(2, 378_223_807_762),
        ...int(6, 41_500_000),
        ...int(9, 1_500_000),
        ...int(10, 37),
        ...int(11, 158),
        ...int(16, 1560),
        ...int(24, 125_000),
        ...int(12, 312),
        ...int(29, 7381538),
        ...float(34, 236_591),
      ]),
    );
    expect(state).toMatchObject({
      athleteId: 4235693,
      ts: 378_223_807_762 + 1_414_016_074_400,
      power: 312,
      speedKmh: 41.5,
      eventDistanceM: 2365.91,
      eventSubgroupId: 7381538,
      cadenceRpm: 90,
      draft: 37,
      elapsedS: 1560,
    });
    expect(state?.kj).toBeCloseTo(450);
    expect(state).not.toHaveProperty("heartrate");
  });

  it("geeft null zonder renner", () => {
    expect(decodePlayerState(new Uint8Array())).toBeNull();
  });
});
