import { describe, expect, it } from "vitest";
import {
  ZWB_SUMMARY_HEADER,
  briljantSummaryFrom,
  buildZwbSummaryBlock,
  composeDescription,
  fitnessTrendLabel,
  loadDeltaPct,
  pickPlannedWorkout,
  stripZwbSummary,
  unicodeBold,
  type BriljantSummary,
  type ZwbSummaryInput,
} from "@/lib/training/strava-summary";
import { TIP_VARIANTS } from "@/lib/training/strava-summary-tips";

const STONE: BriljantSummary = {
  points: 427,
  level: "Platina",
  nextLevel: "Amethist",
  toNext: 73,
  delta4w: 12,
  growFacet: "Sprint",
};

const FULL: ZwbSummaryInput = {
  activityId: 1002,
  plannedTitle: "3x10 min drempel",
  plannedIntensity: "threshold",
  plannedMinutes: 75,
  plannedLoad: 76,
  actualLoad: 82,
  detectedIntensity: "threshold",
  ctl: 49.94,
  briljant: STONE,
  readinessLevel: 4,
  readinessTitle: "FRIS GENOEG",
  readinessScore: 72,
  fitnessTrend: "improving",
};

const EMPTY_INPUT: ZwbSummaryInput = {
  activityId: 1000,
  plannedTitle: null,
  plannedIntensity: null,
  plannedMinutes: null,
  plannedLoad: null,
  actualLoad: null,
  detectedIntensity: null,
  ctl: null,
  briljant: null,
  readinessLevel: null,
  readinessTitle: null,
  readinessScore: null,
  fitnessTrend: "unknown",
};

describe("unicodeBold", () => {
  it("zet letters en cijfers om en laat de rest staan", () => {
    expect(unicodeBold("Ab-9")).toBe("𝗔𝗯-𝟵");
    expect(ZWB_SUMMARY_HEADER).toBe("𝗭𝗪𝗕𝗲𝘁𝗲𝗿 𝘄𝗼𝗿𝗸𝗼𝘂𝘁-𝘀𝗮𝗺𝗲𝗻𝘃𝗮𝘁𝘁𝗶𝗻𝗴");
  });
});

describe("buildZwbSummaryBlock", () => {
  it("bouwt het volledige blok", () => {
    // 82 tegen 76 TSS is 8% boven plan: "volgens-plan" valt erbuiten, dus de
    // tip gaat over de stijgende fitheid (variant 1002 % 3 = 0).
    expect(buildZwbSummaryBlock(FULL)).toBe(
      [
        ZWB_SUMMARY_HEADER,
        "💎 ZWBriljant Platina · 427 punten, nog 73 tot Amethist",
        "🎯 3x10 min drempel (75 min) → gereden als drempel",
        "⚡ 82 TSS, 8% boven plan",
        "🔋 Gereedscore 72, fris genoeg · fitheid stijgt",
        "💬 Je fitheid stijgt al een paar weken. Gewoon zo doorgaan.",
      ].join("\n"),
    );
  });

  it("laat regels zonder gegevens weg, maar houdt kop, plan en tip", () => {
    expect(buildZwbSummaryBlock(EMPTY_INPUT)).toBe(
      [
        ZWB_SUMMARY_HEADER,
        "🎯 Vrije rit",
        `💬 ${TIP_VARIANTS["vrije-rit"][1000 % 3]}`,
      ].join("\n"),
    );
  });

  it("valt zonder steen terug op CTL met een Nederlandse komma", () => {
    expect(buildZwbSummaryBlock({ ...FULL, briljant: null })).toContain(
      "\n📈 CTL 49,9\n",
    );
    expect(buildZwbSummaryBlock({ ...EMPTY_INPUT, ctl: 50 })).toContain(
      "📈 CTL 50,0",
    );
  });

  it("toont in Diamant de groei in vier weken", () => {
    const diamant = { ...STONE, points: 1020, level: "Diamant", nextLevel: null, toNext: 0 };
    expect(buildZwbSummaryBlock({ ...FULL, briljant: diamant })).toContain(
      "💎 ZWBriljant Diamant · 1.020 punten, +12 in 4 weken",
    );
    expect(
      buildZwbSummaryBlock({ ...FULL, briljant: { ...diamant, delta4w: null } }),
    ).toContain("💎 ZWBriljant Diamant · 1.020 punten\n");
  });

  it("noemt een vrije rit met het gedetecteerde type", () => {
    const block = buildZwbSummaryBlock({
      ...EMPTY_INPUT,
      actualLoad: 60,
      detectedIntensity: "endurance",
    });
    expect(block).toContain("🎯 Vrije rit → gereden als duur");
    expect(block).toContain("⚡ 60 TSS\n");
  });

  it("valt terug op het intensiteitslabel als er geen titel is", () => {
    const block = buildZwbSummaryBlock({
      ...EMPTY_INPUT,
      plannedIntensity: "tempo",
      plannedMinutes: 60,
    });
    expect(block).toContain("🎯 Tempo (60 min)");
  });

  it("toont een onbekende intensiteit ruw in plaats van leeg", () => {
    const block = buildZwbSummaryBlock({
      ...EMPTY_INPUT,
      detectedIntensity: "sweetspot",
    });
    expect(block).toContain("gereden als sweetspot");
  });

  it("laat de gereedscore weg bij niveau 0, maar houdt de fitheid", () => {
    const block = buildZwbSummaryBlock({ ...FULL, readinessLevel: 0 });
    expect(block).toContain("🔋 Fitheid stijgt");
    expect(block).not.toContain("Gereedscore");
  });

  it("zegt het als de rit precies op plan lag", () => {
    expect(buildZwbSummaryBlock({ ...FULL, actualLoad: 76 })).toContain(
      "⚡ 76 TSS, precies volgens plan",
    );
    expect(buildZwbSummaryBlock({ ...FULL, actualLoad: 70, plannedLoad: 80 })).toContain(
      "⚡ 70 TSS, 13% onder plan",
    );
  });
});

describe("loadDeltaPct", () => {
  it("rekent het verschil in procenten uit", () => {
    expect(loadDeltaPct(82, 76)).toBe(8);
  });

  it("rondt negatieve verschillen symmetrisch af", () => {
    // -12,5% moet -13% worden, niet -12 (Math.round rondt .5 omhoog).
    expect(loadDeltaPct(70, 80)).toBe(-13);
  });

  it("geeft 0 bij een gelijke belasting, ook net eronder", () => {
    expect(loadDeltaPct(80, 80)).toBe(0);
    expect(Object.is(loadDeltaPct(79.9, 80), 0)).toBe(true);
  });

  it("geeft null bij een ontbrekende of nul geplande belasting", () => {
    expect(loadDeltaPct(80, 0)).toBeNull();
    expect(loadDeltaPct(80, null)).toBeNull();
    expect(loadDeltaPct(null, 80)).toBeNull();
  });
});

describe("fitnessTrendLabel", () => {
  it("dekt alle vier de richtingen", () => {
    expect(fitnessTrendLabel("improving")).toBe("fitheid stijgt");
    expect(fitnessTrendLabel("stable")).toBe("fitheid blijft gelijk");
    expect(fitnessTrendLabel("declining")).toBe("fitheid zakt");
    expect(fitnessTrendLabel("unknown")).toBeNull();
  });
});

describe("briljantSummaryFrom", () => {
  const facets = { sprint: 3.2, anaeroob: 4.1, vo2max: 4.5, drempel: 4.6, fitheid: 4.0 };

  it("neemt de laatste snapshot met klasse, punten en het onderdeel met de meeste winst", () => {
    const stone = briljantSummaryFrom(
      [
        { week: "2026-09-21", score: 4.05, facets, consistency: null },
        { week: "2026-10-19", score: 4.27, facets, consistency: null },
      ],
      "2026-10-25",
    );
    expect(stone).toEqual({
      points: 427,
      level: "Platina",
      nextLevel: "Amethist",
      toNext: 73,
      delta4w: 22,
      // Sprint staat het laagst, maar weegt 5%; 5% beter op VO2max levert meer op.
      growFacet: "VO2max",
    });
  });

  it("geeft null zonder score of bij een oude snapshot", () => {
    expect(briljantSummaryFrom([], "2026-10-25")).toBeNull();
    expect(
      briljantSummaryFrom([{ week: "2026-10-19", score: null, facets, consistency: null }], "2026-10-25"),
    ).toBeNull();
    expect(
      briljantSummaryFrom([{ week: "2026-08-03", score: 4.27, facets, consistency: null }], "2026-10-25"),
    ).toBeNull();
  });

  it("laat de groei leeg zonder snapshot van vier weken eerder", () => {
    const stone = briljantSummaryFrom(
      [{ week: "2026-10-19", score: 9.5, facets, consistency: null }],
      "2026-10-25",
    );
    expect(stone).toMatchObject({ level: "Diamant", nextLevel: null, toNext: 0, delta4w: null });
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
    const drifted = block.replace("427 punten", "431 punten");
    expect(stripZwbSummary(`Lekkere rit!\n\n${drifted}`, block)).toBe(
      "Lekkere rit!",
    );
  });

  it("ruimt een blok in de oude opbouw op, ook zonder opgeslagen tekst", () => {
    const old = [
      "📊 ZWBeter Worden",
      "Gepland: 3x10 min drempel",
      "Geplande duur: 75 min",
      "Gedetecteerd type: Drempel",
      "Workout score: +8% (82 vs 76 TSS)",
      "📈 Progressie",
      "CTL: 49,9",
      "Gereedscore: 72 (niveau 4 – FRIS GENOEG)",
      "Fitness-status: Verbeterend",
    ].join("\n");
    expect(stripZwbSummary(`Lekkere rit!\n\n${old}`, null)).toBe("Lekkere rit!");
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
