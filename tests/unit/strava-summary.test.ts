import { describe, expect, it } from "vitest";
import {
  ZWB_SUMMARY_HEADER,
  buildZwbSummaryBlock,
  composeDescription,
  fitnessStatusLabel,
  pickPlannedWorkout,
  stripZwbSummary,
  workoutScoreLabel,
  type ZwbSummaryInput,
} from "@/lib/training/strava-summary";

const FULL: ZwbSummaryInput = {
  plannedTitle: "3x10 min drempel",
  plannedIntensity: "threshold",
  plannedMinutes: 75,
  plannedLoad: 76,
  actualLoad: 82,
  detectedIntensity: "threshold",
  ctl: 49.94,
  readinessLevel: 4,
  readinessTitle: "FRIS GENOEG",
  readinessScore: 72,
  fitnessTrend: "improving",
};

const EMPTY_INPUT: ZwbSummaryInput = {
  plannedTitle: null,
  plannedIntensity: null,
  plannedMinutes: null,
  plannedLoad: null,
  actualLoad: null,
  detectedIntensity: null,
  ctl: null,
  readinessLevel: null,
  readinessTitle: null,
  readinessScore: null,
  fitnessTrend: "unknown",
};

describe("buildZwbSummaryBlock", () => {
  it("bouwt het volledige blok", () => {
    expect(buildZwbSummaryBlock(FULL)).toBe(
      [
        "📊 ZWBeter Worden",
        "Gepland: 3x10 min drempel",
        "Geplande duur: 75 min",
        "Gedetecteerd type: Drempel",
        "Workout score: +8% (82 vs 76 TSS)",
        "📈 Progressie",
        "CTL: 49,9",
        "Gereedscore: 72 (niveau 4 – FRIS GENOEG)",
        "Fitness-status: Verbeterend",
      ].join("\n"),
    );
  });

  it("zet elke ontbrekende waarde op - maar houdt beide kopregels", () => {
    const block = buildZwbSummaryBlock(EMPTY_INPUT);
    const lines = block.split("\n");
    expect(lines[0]).toBe("📊 ZWBeter Worden");
    expect(lines[5]).toBe("📈 Progressie");
    for (const line of [...lines.slice(1, 5), ...lines.slice(6)]) {
      expect(line.endsWith(": -")).toBe(true);
    }
  });

  it("valt terug op het intensiteitslabel als er geen titel is", () => {
    const block = buildZwbSummaryBlock({
      ...EMPTY_INPUT,
      plannedIntensity: "rest",
    });
    expect(block).toContain("Gepland: Rust");
  });

  it("toont een onbekende intensiteit ruw in plaats van leeg", () => {
    const block = buildZwbSummaryBlock({
      ...EMPTY_INPUT,
      detectedIntensity: "sweetspot",
    });
    expect(block).toContain("Gedetecteerd type: sweetspot");
  });

  it("laat de gereedscore weg bij niveau 0", () => {
    const block = buildZwbSummaryBlock({
      ...FULL,
      readinessLevel: 0,
    });
    expect(block).toContain("Gereedscore: -");
  });

  it("formatteert CTL met een Nederlandse komma", () => {
    expect(buildZwbSummaryBlock({ ...EMPTY_INPUT, ctl: 49.94 })).toContain(
      "CTL: 49,9",
    );
    expect(buildZwbSummaryBlock({ ...EMPTY_INPUT, ctl: 50 })).toContain(
      "CTL: 50,0",
    );
  });
});

describe("workoutScoreLabel", () => {
  it("rekent het verschil in procenten uit", () => {
    expect(workoutScoreLabel(82, 76)).toBe("+8% (82 vs 76 TSS)");
  });

  it("rondt negatieve verschillen symmetrisch af", () => {
    // -12,5% moet -13% worden, niet -12 (Math.round rondt .5 omhoog).
    expect(workoutScoreLabel(70, 80)).toBe("-13% (70 vs 80 TSS)");
  });

  it("geeft 0% bij een gelijke belasting", () => {
    expect(workoutScoreLabel(80, 80)).toBe("0% (80 vs 80 TSS)");
  });

  it("geeft - bij een ontbrekende of nul geplande belasting", () => {
    expect(workoutScoreLabel(80, 0)).toBe("-");
    expect(workoutScoreLabel(80, null)).toBe("-");
    expect(workoutScoreLabel(null, 80)).toBe("-");
    expect(workoutScoreLabel(null, null)).toBe("-");
  });
});

describe("fitnessStatusLabel", () => {
  it("dekt alle vier de richtingen", () => {
    expect(fitnessStatusLabel("improving")).toBe("Verbeterend");
    expect(fitnessStatusLabel("stable")).toBe("Stabiel");
    expect(fitnessStatusLabel("declining")).toBe("Afnemend");
    expect(fitnessStatusLabel("unknown")).toBe("-");
  });
});

describe("stripZwbSummary", () => {
  const block = buildZwbSummaryBlock(FULL);

  it("haalt het opgeslagen blok en de lege regel ervoor weg", () => {
    expect(stripZwbSummary(`Lekkere rit!\n\n${block}`, block)).toBe(
      "Lekkere rit!",
    );
  });

  it("levert een lege string als het blok de hele beschrijving was", () => {
    expect(stripZwbSummary(block, block)).toBe("");
  });

  it("valt terug op de kopregel als de opgeslagen tekst niet meer matcht", () => {
    const drifted = block.replace("CTL: 49,9", "CTL: 51,2");
    expect(stripZwbSummary(`Lekkere rit!\n\n${drifted}`, block)).toBe(
      "Lekkere rit!",
    );
  });

  it("knipt niet als er vreemde tekst onder het blok staat", () => {
    const withOwnText = `Lekkere rit!\n\n${block}\n\nEn dit schreef ik zelf.`;
    expect(stripZwbSummary(withOwnText, null)).toBe(withOwnText);
  });

  it("haalt het blok wel weg als het letterlijk bekend is, ook met eigen tekst eronder", () => {
    const withOwnText = `Boven\n\n${block}\n\nOnder`;
    expect(stripZwbSummary(withOwnText, block)).toBe("Boven\n\nOnder");
  });

  it("laat een beschrijving zonder ZWB-blok ongemoeid", () => {
    expect(stripZwbSummary("Gewoon een rit", block)).toBe("Gewoon een rit");
    expect(stripZwbSummary(null, block)).toBe("");
    expect(stripZwbSummary("", block)).toBe("");
    expect(stripZwbSummary("   ", block)).toBe("");
  });

  it("verdraagt Windows-regeleindes", () => {
    const crlf = `Lekkere rit!\r\n\r\n${block.replace(/\n/g, "\r\n")}`;
    expect(stripZwbSummary(crlf, block)).toBe("Lekkere rit!");
  });

  it("gebruikt de laatste kopregel als die per ongeluk dubbel staat", () => {
    const doubled = `Boven\n\n${ZWB_SUMMARY_HEADER}\n\n${block}`;
    expect(stripZwbSummary(doubled, null)).toBe(`Boven\n\n${ZWB_SUMMARY_HEADER}`);
  });
});

describe("composeDescription", () => {
  const block = buildZwbSummaryBlock(FULL);

  it("geeft alleen het blok bij een lege beschrijving", () => {
    expect(composeDescription("", block)).toBe(block);
    expect(composeDescription("   \n\n", block)).toBe(block);
  });

  it("houdt precies één lege regel tussen tekst en blok", () => {
    expect(composeDescription("Rit\n\n\n", block)).toBe(`Rit\n\n${block}`);
  });

  it("is de omgekeerde van stripZwbSummary", () => {
    for (const previous of [
      block,
      `Lekkere rit!\n\n${block}`,
      `Boven\n\n${block}\n\nOnder`,
    ]) {
      const base = stripZwbSummary(previous, block);
      if (previous.endsWith(block)) {
        expect(composeDescription(base, block)).toBe(previous);
      } else {
        // Blok in het midden: het komt onderaan terug, niet op de oude plek.
        expect(composeDescription(base, block)).toBe(`Boven\n\nOnder\n\n${block}`);
      }
    }
  });
});

describe("pickPlannedWorkout", () => {
  const workouts = [
    {
      id: "a",
      scheduled_at: "2026-07-30T09:00:00+02:00",
      duration_minutes: 60,
      intensity: "endurance",
    },
    {
      id: "b",
      scheduled_at: "2026-07-30T18:00:00+02:00",
      duration_minutes: 120,
      intensity: "threshold",
    },
    {
      id: "c",
      scheduled_at: "2026-07-29T09:00:00+02:00",
      duration_minutes: 90,
      intensity: "tempo",
    },
    {
      id: "rust",
      scheduled_at: "2026-07-30T07:00:00+02:00",
      duration_minutes: 0,
      intensity: "rest",
    },
  ];

  it("kiest de workout van dezelfde dag met de dichtstbijzijnde duur", () => {
    const start = new Date("2026-07-30T10:00:00+02:00");
    expect(pickPlannedWorkout(workouts, start, 115)?.id).toBe("b");
    expect(pickPlannedWorkout(workouts, start, 55)?.id).toBe("a");
  });

  it("negeert rustdagen", () => {
    const start = new Date("2026-07-30T10:00:00+02:00");
    expect(pickPlannedWorkout(workouts, start, 1)?.id).not.toBe("rust");
  });

  it("pakt de vroegst geplande niet-rustdag als de rijtijd onbekend is", () => {
    const start = new Date("2026-07-30T10:00:00+02:00");
    expect(pickPlannedWorkout(workouts, start, null)?.id).toBe("a");
  });

  it("geeft null als er die dag niets gepland stond", () => {
    expect(
      pickPlannedWorkout(workouts, new Date("2026-07-28T10:00:00+02:00"), 60),
    ).toBeNull();
  });

  it("rekent met de Amsterdamse dag, niet met UTC", () => {
    // 23:30 CEST op 30 juli is 21:30 UTC — nog steeds 30 juli in Amsterdam.
    const late = new Date("2026-07-30T23:30:00+02:00");
    expect(pickPlannedWorkout(workouts, late, 60)?.id).toBe("a");
    // 00:30 CEST op 30 juli is 22:30 UTC op de 29e; daar hoort workout c bij.
    const early = new Date("2026-07-30T00:30:00+02:00");
    expect(pickPlannedWorkout(workouts, early, 90)?.id).toBe("a");
    expect(
      pickPlannedWorkout(workouts, new Date("2026-07-29T23:30:00+02:00"), 90)?.id,
    ).toBe("c");
  });
});
