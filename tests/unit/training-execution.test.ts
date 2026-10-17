import { describe, expect, it } from "vitest";
import { analyseExecution, plannedTimeline } from "@/lib/training/execution";
import { trainingSuggestions } from "@/lib/training/training-advice";
import type { WorkoutBlock } from "@/lib/training/workouts";

const FTP = 250;

function block(label: string, minutes: number, target: string, intensity: WorkoutBlock["intensity"]): WorkoutBlock {
  return { label, durationMinutes: minutes, target, notes: "", intensity };
}

/** 10 min inrijden, 4 × 4 min op 110% met 3 min rust, 10 min uitrijden. */
const FOUR_BY_FOUR: WorkoutBlock[] = [
  block("Inrijden", 10, "60%", "endurance"),
  ...[1, 2, 3, 4].flatMap((n) => [block(`Herhaling ${n}`, 4, "110%", "threshold"), ...(n < 4 ? [block("Rust", 3, "50%", "recovery")] : [])]),
  block("Uitrijden", 10, "55%", "recovery"),
];

/** Het gereden vermogen: per blok een vaste waarde, met een aanloop voor de start van het schema. */
function ride(blocks: WorkoutBlock[], repWatts: number[], leadIn = 0, easy = 150) {
  const watts: number[] = new Array(leadIn).fill(120);
  let rep = 0;
  for (const b of blocks) {
    const w = b.label.startsWith("Herhaling") ? repWatts[rep++] : easy;
    for (let i = 0; i < b.durationMinutes * 60; i++) watts.push(w);
  }
  return { time: watts.map((_, i) => i), watts };
}

describe("analyseExecution", () => {
  it("meet elke herhaling tegen het doel", () => {
    const e = analyseExecution(ride(FOUR_BY_FOUR, [300, 285, 270, 260]), FOUR_BY_FOUR, FTP);
    expect(e.offset).toBe(0);
    expect(e.reps.map((r) => r.avgWatts)).toEqual([300, 285, 270, 260]);
    expect(e.reps[0]).toMatchObject({ targetWatts: 275, seconds: 240 });
  });

  it("vindt het begin van het schema als de rit met een aanloop begint", () => {
    const e = analyseExecution(ride(FOUR_BY_FOUR, [280, 280, 280, 280], 180), FOUR_BY_FOUR, FTP);
    expect(e.offset).toBe(180);
    expect(e.reps.map((r) => r.avgWatts)).toEqual([280, 280, 280, 280]);
  });

  it("rekent de ontkoppeling alleen bij een lange, gelijkmatige rit", () => {
    const blocks = [block("Duur", 120, "65%", "endurance")];
    const seconds = 120 * 60;
    const watts = new Array(seconds).fill(170);
    // Hartslag loopt op van 130 naar 150: de tweede helft minder watt per slag.
    const heartrate = watts.map((_, i) => 130 + (20 * i) / seconds);
    const e = analyseExecution({ time: watts.map((_, i) => i), watts, heartrate }, blocks, FTP);
    expect(e.reps).toEqual([]);
    expect(e.variability).toBe(1);
    expect(e.decoupling).toBeGreaterThan(5);
    const short = analyseExecution({ time: watts.slice(0, 3600).map((_, i) => i), watts: watts.slice(0, 3600), heartrate }, blocks, FTP);
    expect(short.decoupling).toBeNull();
  });

  it("meet de Duurtest alleen over het werkblok", () => {
    const blocks = [
      block("Inrijden", 10, "55%", "endurance"),
      block("Duurtest", 60, "75%", "endurance"),
      block("Uitrijden", 5, "50%", "recovery"),
    ];
    const watts = [...new Array(600).fill(140), ...new Array(3600).fill(188), ...new Array(300).fill(125)];
    // In het werkblok loopt de hartslag op van 140 naar 150; in- en uitrijden liggen veel lager.
    const heartrate = watts.map((_, i) => (i < 600 ? 110 : i < 4200 ? 140 + (10 * (i - 600)) / 3600 : 115));
    const e = analyseExecution({ time: watts.map((_, i) => i), watts, heartrate }, blocks, FTP);
    expect(e.steady).toMatchObject({ label: "Duurtest", minutes: 55, avgWatts: 188 });
    expect(e.steady!.avgHr).toBeGreaterThan(144);
    // Alleen de drift in het blok: gemiddeld 143,1 → 147,7 bpm per helft is 3,1 %, zonder het uitrijden.
    expect(e.steady!.decoupling).toBe(3.1);
  });

  it("slaat de blokmeting over zonder hartslag of zonder lang blok", () => {
    const blocks = [block("Duurtest", 60, "75%", "endurance")];
    const watts = new Array(3600).fill(188);
    expect(analyseExecution({ time: watts.map((_, i) => i), watts }, blocks, FTP).steady).toBeNull();
    expect(analyseExecution(ride(FOUR_BY_FOUR, [280, 280, 280, 280]), FOUR_BY_FOUR, FTP).steady).toBeNull();
  });

  it("noemt alleen blokken vanaf sweetspot een herhaling", () => {
    const timeline = plannedTimeline(FOUR_BY_FOUR, FTP);
    expect(timeline.filter((p) => p.work)).toHaveLength(4);
    expect(plannedTimeline(FOUR_BY_FOUR, null).filter((p) => p.work)).toHaveLength(4);
  });
});

describe("trainingSuggestions", () => {
  const exec = (reps: number[]) => analyseExecution(ride(FOUR_BY_FOUR, reps), FOUR_BY_FOUR, FTP);

  it("ziet een eerste herhaling boven het doel en het wegzakken daarna", () => {
    const s = trainingSuggestions({ intensity: "threshold", execution: exec([300, 285, 270, 260]), athleteRpe: 8, verdict: "volgens_plan" });
    expect(s[0].finding).toBe("Herhaling 1 ging op 300 W (doel 275 W), de laatste op 260 W: 13% weggezakt.");
    expect(s[0].tip).toContain("9% erboven");
  });

  it("ziet wegzakken bij een eerste herhaling op doel", () => {
    const s = trainingSuggestions({ intensity: "threshold", execution: exec([275, 265, 255, 245]), athleteRpe: 7, verdict: "volgens_plan" });
    expect(s[0].finding).toContain("terwijl de eerste op doel lag");
  });

  it("zegt niets bij een gelijkmatige set op doel", () => {
    expect(trainingSuggestions({ intensity: "threshold", execution: exec([278, 276, 275, 272]), athleteRpe: 7, verdict: "volgens_plan" })).toEqual([]);
  });

  it("noemt alle herhalingen onder doel alleen als het ook zwaar voelde", () => {
    const under = exec([255, 252, 250, 250]);
    expect(trainingSuggestions({ intensity: "threshold", execution: under, athleteRpe: 9, verdict: "te_licht" })[0].tip).toContain("FTP-test");
    expect(trainingSuggestions({ intensity: "threshold", execution: under, athleteRpe: 6, verdict: "te_licht" })).toEqual([]);
  });

  it("ziet een duurrit die tempo werd", () => {
    const zoneTimes = { source: "intervals" as const, intervalsId: "i1", ftpWatts: FTP, seconds: [300, 2400, 900, 300, 0, 0] };
    const s = trainingSuggestions({ intensity: "endurance", zoneTimes, athleteRpe: null });
    expect(s[0].finding).toBe("31% van deze duurrit lag in zone 3 of hoger.");
    expect(trainingSuggestions({ intensity: "threshold", zoneTimes, athleteRpe: null })).toEqual([]);
  });

  it("ziet ontkoppeling vanaf 5% op een duurrit", () => {
    const execution = { version: 1 as const, offset: 0, reps: [], decoupling: 6.4, variability: 1.03 };
    expect(trainingSuggestions({ intensity: "endurance", execution, athleteRpe: null })[0].finding).toBe(
      "Vermogen en hartslag liepen 6,4% uit elkaar tussen de eerste en de tweede helft.",
    );
    expect(trainingSuggestions({ intensity: "endurance", execution: { ...execution, decoupling: 3.1 }, athleteRpe: null })).toEqual([]);
  });

  it("telt geplande openers niet als te hard, en negeert herhalingen die niet gereden zijn", () => {
    const openers = [block("Duur", 50, "65%", "endurance"), ...[1, 2, 3].map((n) => block(`Opener ${n}`, 1, "130%", "vo2max")), block("Duur", 7, "60%", "endurance")];
    // 3 van de 60 minuten gepland boven zone 3; gereden 8 minuten erboven.
    const zoneTimes = { source: "intervals" as const, intervalsId: "i1", ftpWatts: FTP, seconds: [300, 2820, 300, 0, 180, 0] };
    expect(trainingSuggestions({ intensity: "endurance", zoneTimes, athleteRpe: null, blocks: openers, ftp: FTP })).toEqual([]);
    const notRidden = { version: 1 as const, offset: 0, reps: [275, 274, 9, 272].map((w) => ({ label: "x", targetWatts: 275, avgWatts: w, seconds: 240 })), decoupling: null, variability: 1.1 };
    expect(trainingSuggestions({ intensity: "threshold", execution: notRidden, athleteRpe: 6, verdict: "volgens_plan" })).toEqual([]);
  });

  it("vraagt niet naar slaap en stress als een duurrit gewoon te hard gereden is", () => {
    const zoneTimes = { source: "intervals" as const, intervalsId: "i1", ftpWatts: FTP, seconds: [300, 1000, 2000, 300, 0, 0] };
    const s = trainingSuggestions({ intensity: "endurance", zoneTimes, athleteRpe: 8 });
    expect(s).toHaveLength(1);
    expect(s[0].finding).toContain("zone 3 of hoger");
  });

  it("leest de RPE tegen het soort training", () => {
    expect(trainingSuggestions({ intensity: "recovery", athleteRpe: 8 })[0].finding).toBe("Een herstelrit voelde zwaar: RPE 8.");
    expect(trainingSuggestions({ intensity: "vo2max", athleteRpe: 3, verdict: "volgens_plan" })[0].tip).toContain("ruimte om op te bouwen");
    expect(trainingSuggestions({ intensity: "vo2max", athleteRpe: 3, verdict: "te_licht" })).toEqual([]);
  });
});
