import { describe, expect, it } from "vitest";
import type { GeneratedWorkout, TrainingAiInput } from "@/lib/training/ai";
import { checkTrainingPlan, countFindingsByRule, hasFatigueSignal, type SchemaRule } from "@/lib/training/schema-check";

// 2026-10-05 is een maandag.
const MONDAY = "2026-10-05";

function day(offset: number, from = MONDAY) {
  const date = new Date(`${from}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function input(overrides: Partial<TrainingAiInput> = {}): TrainingAiInput {
  return {
    athleteName: "Test",
    goal: {
      title: "Basis",
      type: "base_fitness",
      targetDate: null,
      availableDays: [],
      maxHoursPerWeek: 6,
      preferredMode: "indoor",
      experienceLevel: "intermediate",
      desiredIntensity: "balanced",
      riskNotes: null,
    },
    profile: { ftpWatts: 200, ftpTestedOn: null, weightKg: 70, zrlCategory: null, sex: null },
    recentLoad: {
      days: 28,
      activities: 12,
      distanceKm: 600,
      elevationM: 2000,
      hours: 20,
      hoursPerWeek: 5,
      ridesPerWeek: 3,
      avgDurationMinutes: 100,
      longestRideMinutes: 150,
    },
    ...overrides,
  };
}

type Block = GeneratedWorkout["structure"][number];

function block(durationMinutes: number, target: string, intensity: Block["intensity"]): Block {
  return { label: "Blok", durationMinutes, target, notes: "", intensity };
}

function endurance(date: string, minutes: number): GeneratedWorkout {
  return {
    date,
    title: "Rustige duur",
    description: "",
    durationMinutes: minutes,
    intensity: "endurance",
    targetType: "power",
    structure: [block(minutes, "65-70%", "endurance")],
    methodLabel: "geen",
  };
}

function workout(date: string, intensity: GeneratedWorkout["intensity"], structure: Block[], title = "Training"): GeneratedWorkout {
  return {
    date,
    title,
    description: "",
    durationMinutes: structure.reduce((sum, item) => sum + item.durationMinutes, 0),
    intensity,
    targetType: "power",
    structure,
    methodLabel: "geen",
  };
}

function sweetSpot(date: string): GeneratedWorkout {
  return workout(date, "threshold", [
    block(15, "55-65%", "recovery"),
    block(20, "90-95%", "threshold"),
    block(5, "55%", "recovery"),
    block(20, "90-95%", "threshold"),
    block(30, "55%", "recovery"),
  ]);
}

/** Een week van drie ritten met deze minuten, vanaf de maandag `monday`. */
function week(monday: string, minutes: [number, number, number]): GeneratedWorkout[] {
  return [endurance(day(1, monday), minutes[0]), endurance(day(3, monday), minutes[1]), endurance(day(5, monday), minutes[2])];
}

function rules(findings: ReturnType<typeof checkTrainingPlan>): SchemaRule[] {
  return findings.map((finding) => finding.regel);
}

function window(weeks: number) {
  return { from: MONDAY, to: day(weeks * 7 - 1), goalBeyond: false };
}

describe("checkTrainingPlan: dagen", () => {
  it("vindt niets in een schema dat alle regels volgt", () => {
    const findings = checkTrainingPlan(input({ planWindow: window(1) }), week(MONDAY, [100, 120, 130]));
    expect(findings).toEqual([]);
  });

  it("leest de eigen week vóór de standaard, en 0 als geen training", () => {
    const plan = input({
      planWindow: window(2),
      availability: {
        default: { ma: 60, di: 120, wo: 120, do: 120, vr: 0, za: 180, zo: 180 },
        weeks: [{ weekStart: MONDAY, minutesByDay: { ma: 60, di: 0, wo: 120, do: 60, vr: 0, za: 180, zo: 180 } }],
      },
    });
    const findings = checkTrainingPlan(plan, [
      endurance(day(1), 90), // dinsdag week 1: 0 in de eigen week
      endurance(day(3), 90), // donderdag week 1: 60 in de eigen week
      endurance(day(8), 90), // dinsdag week 2: 120 uit de standaard
      endurance(day(11), 90), // vrijdag week 2: 0 uit de standaard
    ]);
    const availability = findings.filter((finding) => finding.regel === "beschikbaarheid");
    expect(availability.map((finding) => finding.datum)).toEqual([day(1), day(3), day(11)]);
    expect(availability[1].toelichting).toBe("90 min, beschikbaar 60 min.");
  });

  it("valt zonder minuten terug op goal.availableDays", () => {
    const plan = input({ planWindow: window(1), goal: { ...input().goal, availableDays: ["di", "do", "za"] } });
    const findings = checkTrainingPlan(plan, [endurance(day(1), 100), endurance(day(2), 100)]);
    expect(findings.filter((finding) => finding.regel === "beschikbaarheid").map((finding) => finding.datum)).toEqual([day(2)]);
  });

  it("mag de tijd van vandaag overschrijden niet, ook bij een dag-aanpassing", () => {
    const plan = input({
      today: { availableMinutes: 60, feeling: "normal", note: null },
      currentPlan: { title: "Schema", fromDate: day(1), toDate: day(6), workouts: [] },
    });
    expect(rules(checkTrainingPlan(plan, [endurance(day(1), 75)]))).toContain("beschikbaarheid");
  });

  it("plant niets op een dag met een vaste afspraak", () => {
    const plan = input({
      planWindow: window(1),
      fixedWorkouts: [{ date: day(5), title: "Clubrit", durationMinutes: 120, intensity: "endurance", kind: "clubevent" }],
    });
    // 3 x 80 min plus de clubrit is precies het plafond.
    const findings = checkTrainingPlan(plan, week(MONDAY, [80, 80, 80]));
    expect(findings.map((finding) => [finding.regel, finding.datum])).toEqual([["vaste-afspraak", day(5)]]);
  });

  it("ziet een korte herstelrit, maar niet de rit die het lid vandaag zelf vraagt", () => {
    const recovery = workout(day(1), "recovery", [block(45, "50-55%", "recovery")]);
    expect(rules(checkTrainingPlan(input({ planWindow: window(1) }), [recovery]))).toContain("korte-herstelrit");

    const asked = input({
      today: { availableMinutes: 45, feeling: "tired", note: null },
      currentPlan: { title: "Schema", fromDate: day(1), toDate: day(6), workouts: [] },
    });
    expect(rules(checkTrainingPlan(asked, [recovery]))).not.toContain("korte-herstelrit");
  });

  it("telt openers vóór een race niet als herstelrit", () => {
    const openers = workout(day(4), "endurance", [
      block(20, "50-58%", "recovery"),
      block(1, "110%", "vo2max"),
      block(3, "50%", "recovery"),
      block(1, "110%", "vo2max"),
      block(5, "50%", "recovery"),
    ]);
    const plan = input({
      planWindow: window(1),
      fixedWorkouts: [{ date: day(5), title: "ZRL", durationMinutes: 60, intensity: "race", kind: "clubevent" }],
    });
    expect(rules(checkTrainingPlan(plan, [openers]))).not.toContain("korte-herstelrit");
    expect(rules(checkTrainingPlan(input({ planWindow: window(1) }), [openers]))).toContain("korte-herstelrit");
  });

  it("meldt een rustdag die als workout terugkomt", () => {
    const rest = { ...endurance(day(2), 0), intensity: "rest" as const, structure: [] };
    const findings = checkTrainingPlan(input({ planWindow: window(1) }), [rest, ...week(MONDAY, [100, 120, 130])]);
    expect(findings.map((finding) => [finding.regel, finding.datum])).toEqual([["rustdag-als-workout", day(2)]]);
  });
});

describe("checkTrainingPlan: blokken", () => {
  it("toetst de intensity van blok en workout aan de zonebanden", () => {
    const wrong = workout(day(1), "tempo", [
      block(15, "55%", "recovery"),
      block(30, "70-80%", "tempo"), // midden 75%: endurance
      block(15, "55%", "recovery"),
    ]);
    const findings = checkTrainingPlan(input({ planWindow: window(1) }), [wrong]);
    expect(rules(findings)).toEqual(expect.arrayContaining(["blokintensiteit", "workoutintensiteit"]));
    expect(findings.find((finding) => finding.regel === "workoutintensiteit")?.toelichting).toBe(
      "Opgegeven tempo, kernwerk is endurance.",
    );
  });

  it("rekent wattdoelen om met de FTP, en oordeelt niet over een blok zonder doel", () => {
    const watts = workout(day(1), "endurance", [block(100, "RPE 4, 130-140w", "endurance")]);
    const findings = rules(checkTrainingPlan(input({ planWindow: window(1) }), [watts]));
    expect(findings).not.toContain("blokintensiteit");
    expect(findings).not.toContain("workoutintensiteit");
    const rpeOnly = workout(day(1), "threshold", [block(20, "RPE 7", "threshold"), block(80, "RPE 3", "endurance")]);
    expect(rules(checkTrainingPlan(input({ planWindow: window(1) }), [rpeOnly]))).not.toContain("drempelblok-lang");
  });

  it("houdt drempelblokken van 15 minuten of langer op hooguit 95%", () => {
    const tooHigh = workout(day(1), "threshold", [block(20, "55%", "recovery"), block(20, "95-100%", "threshold"), block(60, "60-65%", "endurance")]);
    const fine = workout(day(1), "threshold", [block(20, "55%", "recovery"), block(12, "95-100%", "threshold"), block(60, "60-65%", "endurance")]);
    expect(rules(checkTrainingPlan(input({ planWindow: window(1) }), [tooHigh]))).toContain("drempelblok-lang");
    expect(rules(checkTrainingPlan(input({ planWindow: window(1) }), [fine]))).not.toContain("drempelblok-lang");
  });

  it("staat boven 100% alleen toe in blokken van hooguit 8 minuten, of met onSeconds", () => {
    const long = workout(day(1), "vo2max", [block(20, "55%", "recovery"), block(10, "105-110%", "vo2max"), block(60, "60-65%", "endurance")]);
    const short = workout(day(1), "vo2max", [block(20, "55%", "recovery"), block(8, "105-110%", "vo2max"), block(62, "60-65%", "endurance")]);
    const onOff = workout(day(1), "vo2max", [
      block(20, "55%", "recovery"),
      { ...block(12, "110-120%", "vo2max"), onSeconds: 30, offSeconds: 15, offTarget: "50%" },
      block(60, "60-65%", "endurance"),
    ]);
    const check = (item: GeneratedWorkout) => rules(checkTrainingPlan(input({ planWindow: window(1) }), [item]));
    expect(check(long)).toContain("boven-ftp-lang");
    expect(check(short)).not.toContain("boven-ftp-lang");
    expect(check(onOff)).not.toContain("boven-ftp-lang");
  });
});

describe("checkTrainingPlan: sleutelsessies", () => {
  it("ziet twee sleutelsessies op opeenvolgende dagen, niet in een kamp", () => {
    const pair = [sweetSpot(day(1)), sweetSpot(day(2))];
    expect(rules(checkTrainingPlan(input({ planWindow: window(1) }), pair))).toContain("sleutelsessies-aaneen");

    const camp = input({
      planWindow: window(1),
      seasonPlan: { targets: [], periods: [{ title: "Kamp", from: MONDAY, to: day(6), kind: "kamp" }], nextTargetAfterPlan: null },
    });
    expect(rules(checkTrainingPlan(camp, pair))).not.toContain("sleutelsessies-aaneen");
  });

  it("telt een vaste zware rit mee als buur", () => {
    const plan = input({
      planWindow: window(1),
      fixedWorkouts: [{ date: day(2), title: "Eigen rit", durationMinutes: 60, intensity: "threshold", kind: "eigen_rit" }],
    });
    expect(rules(checkTrainingPlan(plan, [sweetSpot(day(1))]))).toContain("sleutelsessies-aaneen");
  });

  it("verbiedt een sleutelsessie op de dag vóór een race, test of A/B-mikpunt", () => {
    const test = input({
      planWindow: window(1),
      fixedWorkouts: [{ date: day(3), title: "FTP-test", durationMinutes: 60, intensity: "threshold", kind: "ftp_test" }],
    });
    expect(rules(checkTrainingPlan(test, [sweetSpot(day(2))]))).toContain("sleutelsessie-voor-race");

    const target = input({
      planWindow: window(1),
      seasonPlan: { targets: [{ title: "Koers", date: day(6), priority: "b" }], periods: [], nextTargetAfterPlan: null },
    });
    expect(checkTrainingPlan(target, [sweetSpot(day(5))]).find((finding) => finding.regel === "sleutelsessie-voor-race")?.toelichting).toBe(
      "threshold op de dag vóór een B-mikpunt.",
    );
  });
});

describe("checkTrainingPlan: weken", () => {
  it("houdt het weekvolume onder het plafond, behalve in een kamp", () => {
    const heavy = week(MONDAY, [150, 150, 150]); // 7,5 uur
    expect(rules(checkTrainingPlan(input({ planWindow: window(1) }), heavy))).toContain("weekplafond");
    const camp = input({
      planWindow: window(1),
      seasonPlan: { targets: [], periods: [{ title: "Kamp", from: day(2), to: day(5), kind: "kamp" }], nextTargetAfterPlan: null },
    });
    expect(rules(checkTrainingPlan(camp, heavy))).not.toContain("weekplafond");
  });

  it("telt vaste afspraken mee in het weekvolume", () => {
    const plan = input({
      planWindow: window(1),
      fixedWorkouts: [{ date: day(6), title: "Gran fondo", durationMinutes: 240, intensity: "endurance", kind: "clubevent" }],
    });
    expect(rules(checkTrainingPlan(plan, week(MONDAY, [60, 60, 60])))).toContain("weekplafond");
  });

  it("vraagt een piekweek van minstens 85% van het plafond, tenzij er vermoeidheid is", () => {
    // 5 / 5,3 / 5,0 uur en dan herstel: de piek is 88%, net genoeg.
    const enough = [...week(MONDAY, [100, 100, 100]), ...week(day(7), [100, 110, 108]), ...week(day(14), [70, 70, 70])];
    expect(rules(checkTrainingPlan(input({ planWindow: window(3) }), enough))).not.toContain("piekweek");

    const low = [...week(MONDAY, [90, 90, 100]), ...week(day(7), [100, 100, 100]), ...week(day(14), [65, 65, 65])];
    const plan = input({ planWindow: window(3) });
    expect(rules(checkTrainingPlan(plan, low))).toContain("piekweek");
    expect(rules(checkTrainingPlan({ ...plan, wellness: { ...wellness(), state: "fatigued" } }, low))).not.toContain("piekweek");
  });

  it("rekent de piek ten opzichte van de beschikbaarheid als die krapper is", () => {
    const availability = { default: { ma: 0, di: 100, wo: 0, do: 100, vr: 0, za: 100, zo: 0 }, weeks: [] };
    const plan = input({ planWindow: window(1), availability, recentLoad: { ...input().recentLoad, hoursPerWeek: 4 } });
    expect(rules(checkTrainingPlan(plan, week(MONDAY, [90, 90, 90])))).toEqual([]);
  });

  it("laat opbouwweken niet meer dan 25% groeien, maar na een herstelweek terug naar het oude niveau mag", () => {
    const plan = input({ planWindow: window(4), goal: { ...input().goal, maxHoursPerWeek: 10 }, recentLoad: { ...input().recentLoad, hoursPerWeek: 4 } });
    const jump = [...week(MONDAY, [80, 80, 80]), ...week(day(7), [110, 110, 110])];
    expect(rules(checkTrainingPlan({ ...plan, planWindow: window(2) }, jump))).toContain("opbouwgroei");

    const back = [
      ...week(MONDAY, [150, 150, 160]),
      ...week(day(7), [170, 170, 170]),
      ...week(day(14), [110, 110, 110]),
      ...week(day(21), [170, 170, 180]),
    ];
    expect(rules(checkTrainingPlan(plan, back))).not.toContain("opbouwgroei");
  });

  it("zet een herstelweek op grofweg 60-70% van de week ervoor", () => {
    const plan = input({ planWindow: window(2) });
    const tooDeep = [...week(MONDAY, [110, 110, 110]), ...week(day(7), [50, 50, 50])];
    expect(checkTrainingPlan(plan, tooDeep).find((finding) => finding.regel === "herstelweek")?.toelichting).toBe(
      "Herstelweek op 45% van de week ervoor.",
    );
    const fine = [...week(MONDAY, [110, 110, 110]), ...week(day(7), [75, 75, 75])];
    expect(rules(checkTrainingPlan(plan, fine))).not.toContain("herstelweek");
  });

  it("plant een opbouwweek niet onder wat het lid nu rijdt", () => {
    const plan = input({ planWindow: window(1), recentLoad: { ...input().recentLoad, hoursPerWeek: 5.5 } });
    const findings = checkTrainingPlan(plan, week(MONDAY, [100, 100, 100]));
    expect(rules(findings)).toContain("onder-recente-belasting");
    expect(rules(checkTrainingPlan({ ...plan, intervalsLoad: { ctl: 50, atl: 80, tsb: -30, eftp: null, rampRate: null } }, week(MONDAY, [100, 100, 100])))).not.toContain(
      "onder-recente-belasting",
    );
  });

  it("toetst geen weekvorm in een week die maar deels in de periode valt", () => {
    // Bijwerking vanaf woensdag: de eerste week is niet compleet.
    const plan = input({
      planUpdate: {
        reason: "Minder tijd",
        fromDate: day(2),
        toDate: day(6),
        previousTitle: "Oud",
        previousSummary: null,
        changed: {},
        remainingWorkouts: [],
      },
    });
    expect(checkTrainingPlan(plan, [endurance(day(3), 100)])).toEqual([]);
  });

  it("toetst bij een dag-aanpassing het plafond over de rest van het lopende plan", () => {
    const plan = input({
      currentPlan: {
        title: "Schema",
        fromDate: day(1),
        toDate: day(6),
        workouts: [
          { date: day(1), title: "Oud", durationMinutes: 60, intensity: "endurance" },
          { date: day(3), title: "Duur", durationMinutes: 150, intensity: "endurance" },
          { date: day(5), title: "Lang", durationMinutes: 180, intensity: "endurance" },
        ],
      },
    });
    // Vandaag 60 vervangen door 90: samen 7 uur.
    expect(rules(checkTrainingPlan(plan, [endurance(day(1), 90)]))).toEqual(["weekplafond"]);
  });
});

describe("checkTrainingPlan: taper", () => {
  const taperWeeks = [
    ...week(MONDAY, [110, 110, 120]),
    ...week(day(7), [90, 90, 100]),
    ...week(day(14), [60, 60, 70]),
  ];

  it("ziet twee weken afbouw bij een doel zonder piekmoment", () => {
    const plan = input({ planWindow: window(3), goal: { ...input().goal, type: "ftp" }, recentLoad: { ...input().recentLoad, hoursPerWeek: 4 } });
    expect(rules(checkTrainingPlan(plan, taperWeeks))).toContain("taper-zonder-piek");
  });

  it("staat een taper toe naar een gran fondo of een A-mikpunt", () => {
    const fondo = input({
      planWindow: window(3),
      goal: { ...input().goal, type: "gran_fondo", targetDate: day(20) },
      recentLoad: { ...input().recentLoad, hoursPerWeek: 4 },
    });
    expect(rules(checkTrainingPlan(fondo, taperWeeks))).not.toContain("taper-zonder-piek");

    const aTarget = input({
      planWindow: window(3),
      goal: { ...input().goal, type: "ftp" },
      recentLoad: { ...input().recentLoad, hoursPerWeek: 4 },
      seasonPlan: { targets: [{ title: "Piek", date: day(20), priority: "a" }], periods: [], nextTargetAfterPlan: null },
    });
    expect(rules(checkTrainingPlan(aTarget, taperWeeks))).not.toContain("taper-zonder-piek");
  });

  it("herkent een taper ook aan de titel", () => {
    const plan = input({ planWindow: window(1), goal: { ...input().goal, type: "zrl" } });
    const titled = { ...endurance(day(5), 100), title: "Taper duur 100 min" };
    expect(rules(checkTrainingPlan(plan, [endurance(day(1), 100), endurance(day(3), 100), titled]))).toContain("taper-zonder-piek");
  });

  it("ziet in een gran fondo zonder taper-tekst ook geen taper bij een gewone herstelweek", () => {
    const plan = input({ planWindow: window(3), recentLoad: { ...input().recentLoad, hoursPerWeek: 4 } });
    const recovery = [...week(MONDAY, [100, 100, 110]), ...week(day(7), [110, 110, 110]), ...week(day(14), [70, 70, 75])];
    expect(rules(checkTrainingPlan(plan, recovery))).not.toContain("taper-zonder-piek");
  });
});

describe("hasFatigueSignal en countFindingsByRule", () => {
  it("herkent de signalen uit de prompt", () => {
    expect(hasFatigueSignal(input())).toBe(false);
    expect(hasFatigueSignal(input({ symptoms: { score: 0.7, label: "veel", daysLogged: 5 } }))).toBe(true);
    expect(hasFatigueSignal(input({ intervalsLoad: { ctl: 50, atl: 60, tsb: -10, eftp: null, rampRate: 9 } }))).toBe(true);
  });

  it("telt per regel, met nul voor regels zonder bevinding", () => {
    const counts = countFindingsByRule(checkTrainingPlan(input({ planWindow: window(1) }), [sweetSpot(day(1)), sweetSpot(day(2))]));
    expect(counts["sleutelsessies-aaneen"]).toBe(1);
    expect(counts.weekplafond).toBe(0);
  });
});

function wellness(): NonNullable<TrainingAiInput["wellness"]> {
  return {
    days: 14,
    state: "normal",
    restingHr: 50,
    hrv: 60,
    sleepHours: 7,
    readiness: null,
    readinessSource: null,
    readinessDate: null,
    readinessCurrent: false,
    note: "",
  };
}

describe("checkTrainingPlan: ongeldige datum", () => {
  it("meldt een datum die geen dag is en toetst de rest gewoon", () => {
    const broken = { ...endurance(day(4), 100), date: "2026-10-09},{" };
    const findings = checkTrainingPlan(input({ planWindow: window(1) }), [...week(MONDAY, [100, 120, 130]), broken]);
    expect(findings.map((finding) => finding.regel)).toEqual(["ongeldige-datum"]);
  });
});

describe("checkTrainingPlan: piek bij een bijwerking", () => {
  it("oordeelt niet over een blok dat al vóór de bijwerking begon", () => {
    const update = (fromDate: string) =>
      input({
        planUpdate: { reason: "Doel", fromDate, toDate: day(20), previousTitle: "Oud", previousSummary: null, changed: {}, remainingWorkouts: [] },
        recentLoad: { ...input().recentLoad, hoursPerWeek: 4 },
      });
    const low = [...week(MONDAY, [90, 90, 90]), ...week(day(7), [90, 90, 100]), ...week(day(14), [60, 60, 65])];
    expect(rules(checkTrainingPlan(update(MONDAY), low))).not.toContain("piekweek");
    // Week 1 hoort bij het lopende blok; na de herstelweek begint een nieuw blok
    // dat binnen de bijwerking valt, en daarvan is de piek wel te zien.
    const later = [
      ...week(MONDAY, [100, 100, 100]),
      ...week(day(7), [60, 65, 65]),
      ...week(day(14), [90, 90, 90]),
      ...week(day(21), [90, 90, 100]),
      ...week(day(28), [60, 60, 65]),
    ];
    const plan = { ...update(MONDAY), planUpdate: { ...update(MONDAY).planUpdate!, toDate: day(34) } };
    expect(rules(checkTrainingPlan(plan, later))).toContain("piekweek");
  });
});

describe("checkTrainingPlan: eerste week van een bijwerking", () => {
  const update = (fromDate: string, toDate: string) =>
    input({
      planUpdate: { reason: "Doel", fromDate, toDate, previousTitle: "Oud", previousSummary: null, changed: {}, remainingWorkouts: [] },
      recentLoad: { ...input().recentLoad, hoursPerWeek: 5 },
    });

  it("leest een week na een deels zichtbare drukke week als herstelweek", () => {
    // Vanaf dinsdag: 6 uur in de rest van week 1, dan 4 uur.
    const plan = update(day(1), day(13));
    const workouts = [...week(MONDAY, [120, 120, 120]), ...week(day(7), [80, 80, 80])];
    const found = rules(checkTrainingPlan(plan, workouts));
    expect(found).not.toContain("onder-recente-belasting");
    expect(found).not.toContain("herstelweek");
  });

  it("toetst de eerste week niet aan recentLoad als er niets vóór te zien is", () => {
    const plan = update(MONDAY, day(13));
    const workouts = [...week(MONDAY, [80, 80, 80]), ...week(day(7), [100, 100, 100])];
    const findings = checkTrainingPlan(plan, workouts);
    expect(findings.filter((finding) => finding.regel === "onder-recente-belasting").map((finding) => finding.datum)).toEqual([]);
    // Wel de tweede: 5 uur gepland, lid rijdt 5 uur. Net genoeg.
    expect(rules(checkTrainingPlan(plan, [...week(MONDAY, [80, 80, 80]), ...week(day(7), [90, 90, 90])]))).toContain("onder-recente-belasting");
  });
});
