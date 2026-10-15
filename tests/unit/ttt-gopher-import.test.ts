import { describe, expect, it } from "vitest";
import { gopherJsonUrl, parseGopherExport } from "@/lib/ttt/zwiftgopher";

// Zelfde vorm als een echte Export JSON van 2026-10-13 (versie 1.14.0), met
// verzonnen namen en ID's. Getallen staan er deels als tekst in.
function rider(name: string, order: number, extra: Record<string, unknown> = {}) {
  return {
    name,
    alt_name: "",
    weight: "78.9",
    height: 180,
    ftp: "273",
    wkg300: 354.90000000000003,
    pull_duration: "30",
    adjustment: 0,
    cat: "B",
    zr: true,
    order,
    color: "#ff6600",
    pull_power: 316.5502117657639,
    pull_speed: 44.59,
    IF: 102.97554741632382,
    ...extra,
  };
}

const EXPORT = {
  roster: [],
  riders: {
    "1001": rider("Koen Test [ZWB] ", 0),
    "1004": rider("Stijn  Proef(ZWB)", 3, { pull_duration: "45", weight: 82, ftp: 274 }),
    "1002": rider("Jan Voorbeeld (ZWB)", 1, { pull_power: 348.57 }),
    "1003": rider("Piet Gast", 2, { zr: false, pull_duration: "0" }),
  },
  target_speed: "43.8",
  team: { name: "ZWB Bdev" },
  intensity: "1",
  efficiency: "0",
};

describe("parseGopherExport: JSON", () => {
  it("leest volgorde, naam, Zwift-ID, kopbeurt en waarden", () => {
    const plan = parseGopherExport(JSON.stringify(EXPORT));
    expect(plan).toMatchObject({
      format: "json",
      teamName: "ZWB Bdev",
      targetSpeedKmh: 43.8,
      intensity: 1,
      efficiency: 0,
    });
    expect(
      plan.riders.map((r) => [r.order, r.name, r.zwiftId, r.pullWatts, r.pullSeconds]),
    ).toEqual([
      [1, "Koen Test", "1001", 317, 30],
      [2, "Jan Voorbeeld", "1002", 349, 30],
      [3, "Piet Gast", null, 317, 0],
      [4, "Stijn Proef", "1004", 317, 45],
    ]);
    expect(plan.riders[0]).toMatchObject({
      ftpWatts: 273,
      weightKg: 78.9,
      heightCm: 180,
      power300Watts: 355,
      intensityFactor: 103,
    });
    expect(plan.riders[3]).toMatchObject({ ftpWatts: 274, weightKg: 82 });
  });

  it("weigert JSON zonder renners en een plan zonder kopbeurten", () => {
    expect(() => parseGopherExport('{"version":1,"riders":[]}')).toThrow(/geen export/);
    expect(() => parseGopherExport("{kapot")).toThrow(/geen geldige JSON/);
    const idle = { riders: { "1": rider("A", 0, { pull_duration: "0" }) } };
    expect(() => parseGopherExport(JSON.stringify(idle))).toThrow(/kopbeurt/);
  });
});

describe("parseGopherExport: tekst", () => {
  it("leest tab-gescheiden regels met kopregel en kitkleuren", () => {
    const text = [
      "Rider\tPull Watts\tPull Duration\tKit",
      "Koen Test [ZWB]\t317\t30\t#ff6600",
      "Jan Voorbeeld\t349\t45\t#000000",
      "",
    ].join("\r\n");
    const plan = parseGopherExport(text);
    expect(plan.format).toBe("text");
    expect(plan.riders.map((r) => [r.order, r.name, r.zwiftId, r.pullWatts, r.pullSeconds])).toEqual([
      [1, "Koen Test", null, 317, 30],
      [2, "Jan Voorbeeld", null, 349, 45],
    ]);
  });

  it("leest komma's en pipes, eenheden, minuten en een volgnummer vooraan", () => {
    expect(
      parseGopherExport("Koen,317W,30s,#ff6600\nJan,349 W,1:15,#000").riders.map((r) => [
        r.name,
        r.pullWatts,
        r.pullSeconds,
      ]),
    ).toEqual([
      ["Koen", 317, 30],
      ["Jan", 349, 75],
    ]);
    expect(
      parseGopherExport("1|Koen|317|30|#fff\n2|Jan|349|0|#000").riders.map((r) => [
        r.name,
        r.pullSeconds,
      ]),
    ).toEqual([
      ["Koen", 30],
      ["Jan", 0],
    ]);
  });

  it("meldt een lege of onleesbare tekst", () => {
    expect(() => parseGopherExport("  ")).toThrow(/Plak eerst/);
    expect(() => parseGopherExport("Alleen een zin")).toThrow(/Geen renners/);
  });
});

describe("gopherJsonUrl", () => {
  it("maakt van Export Link het JSON-adres, en negeert andere adressen", () => {
    const save = "YWJj/ZGVm+Z2hp=";
    const wanted = `https://www.zwiftgopher.com/TTT/?save=${encodeURIComponent(save)}&json=true`;
    expect(gopherJsonUrl(`https://www.zwiftgopher.com/TTT/?save=${encodeURIComponent(save)}`)).toBe(wanted);
    expect(gopherJsonUrl(`http://zwiftgopher.com/TTT?save=${encodeURIComponent(save)}&json=true`)).toBe(wanted);
    expect(gopherJsonUrl("https://www.zwiftgopher.com/TTT/")).toBeNull();
    expect(gopherJsonUrl(`https://zwiftgopher.com.elders.example/TTT/?save=x`)).toBeNull();
    expect(gopherJsonUrl(`https://www.zwiftgopher.com/api/x?save=x`)).toBeNull();
    expect(gopherJsonUrl("Koen\t317\t30")).toBeNull();
  });
});
