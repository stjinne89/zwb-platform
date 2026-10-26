import { describe, expect, it } from "vitest";
import { composePlan, planText } from "@/lib/training/engine/compose";
import { daysBetween, minutesOn, mondayKey, periodOn, shiftDays, weekdayOf } from "@/lib/training/engine/calendar";
import {
  KEY_SESSION_FORMS,
  type BuildSession,
  type EngineReason,
  type SessionForm,
  type SessionRequest,
  type TrainingAiInput,
  type WeekPlan,
} from "@/lib/training/engine/types";
import type { WorkoutIntensity } from "@/lib/training/workouts";
import { baseInput } from "./fixtures";

// De catalogus wordt apart gebouwd; deze stub geeft elke vorm een sessie met de
// vorm als titel, zodat de tests kunnen zien wat er op welke dag staat.
const MIN_MINUTES: Partial<Record<SessionForm, number>> = {
  tempo: 40,
  sweetspot: 45,
  drempel: 45,
  vo2max: 45,
  anaeroob: 40,
  sprint: 50,
  openers: 30,
};

const INTENSITY: Record<SessionForm, WorkoutIntensity> = {
  herstel: "recovery",
  rustige_duur: "endurance",
  intensieve_duur: "endurance",
  lange_duur: "endurance",
  tempo: "tempo",
  sweetspot: "tempo",
  drempel: "threshold",
  vo2max: "vo2max",
  anaeroob: "anaerobic",
  sprint: "anaerobic",
  openers: "endurance",
};

function stubCatalog(requests: SessionRequest[] = [], intensityOf = (form: SessionForm) => INTENSITY[form]): BuildSession {
  return (request) => {
    requests.push(request);
    const min = MIN_MINUTES[request.form] ?? 20;
    if (request.maxMinutes < min) return null;
    const duration =
      request.form === "sprint" ? 50 : Math.max(min, Math.min(request.targetMinutes, request.maxMinutes));
    const intensity = intensityOf(request.form);
    return {
      form: request.form,
      title: request.form,
      description: `Stub ${request.form}.`,
      intensity,
      targetType: "power",
      blocks: [
        { label: "Inrijden", durationMinutes: 10, target: "55%", notes: "", intensity: "recovery" },
        { label: "Kern", durationMinutes: duration - 20, target: "", notes: "", intensity },
        { label: "Uitrijden", durationMinutes: 10, target: "55%", notes: "", intensity: "recovery" },
      ],
      durationMinutes: duration,
      methodLabel: request.form === "sprint" ? "veelbelovend" : "geen",
    };
  };
}

/** Handgemaakte weken over het venster: een gewone opbouwweek, tenzij anders gezegd. */
function weeksFor(input: TrainingAiInput, override: (weekStart: string, index: number) => Partial<WeekPlan> = () => ({})) {
  const window = input.planWindow!;
  const weeks: WeekPlan[] = [];
  for (let monday = mondayKey(window.from), index = 0; monday <= window.to; monday = shiftDays(monday, 7), index++) {
    const sunday = shiftDays(monday, 6);
    weeks.push({
      weekStart: monday,
      from: monday < window.from ? window.from : monday,
      to: sunday > window.to ? window.to : sunday,
      kind: "opbouw",
      targetMinutes: 300,
      capacityMinutes: 480,
      keySessions: 2,
      level: 0.5,
      longRideMinutes: 150,
      reasons: [],
      ...override(monday, index),
    });
  }
  return weeks;
}

function compose(input: TrainingAiInput, weeks = weeksFor(input), requests: SessionRequest[] = []) {
  return composePlan({ input, window: input.planWindow!, weeks, buildSession: stubCatalog(requests) });
}

const isKey = (title: string) => KEY_SESSION_FORMS.has(title as SessionForm);

describe("composePlan", () => {
  it("blijft binnen de minuten van elke dag", () => {
    const input = baseInput({
      availability: {
        default: { ma: 0, di: 90, wo: 0, do: 90, vr: 0, za: 180, zo: 120 },
        weeks: [{ weekStart: "2026-10-26", minutesByDay: { ma: 0, di: 45, wo: 60, do: 0, vr: 0, za: 120, zo: 120 } }],
      },
    });
    const { workouts } = compose(input);
    expect(workouts.length).toBeGreaterThan(0);
    for (const workout of workouts) {
      const minutes = minutesOn(input, workout.date);
      expect(minutes).not.toBe(0);
      if (minutes != null) expect(workout.durationMinutes).toBeLessThanOrEqual(minutes);
    }
  });

  it("plant niets op een vaste afspraak, in een rustperiode of in een rustweek", () => {
    const input = baseInput({
      fixedWorkouts: [
        { date: "2026-10-22", title: "Eigen rit", durationMinutes: 60, intensity: "endurance", kind: "eigen_rit" },
      ],
      seasonPlan: {
        targets: [],
        periods: [{ title: "Vakantie", from: "2026-11-02", to: "2026-11-08", kind: "rust" }],
        nextTargetAfterPlan: null,
      },
    });
    const weeks = weeksFor(input, (_monday, index) => (index === 4 ? { kind: "rust", targetMinutes: 0 } : {}));
    const { workouts, reasons } = compose(input, weeks);
    expect(workouts.some((workout) => workout.date === "2026-10-22")).toBe(false);
    expect(workouts.some((workout) => periodOn(input, workout.date) === "rust")).toBe(false);
    expect(workouts.some((workout) => mondayKey(workout.date) === weeks[4].weekStart)).toBe(false);
    expect(reasons.some((reason) => reason.rule === "dag.rust")).toBe(true);
  });

  it("zet nooit twee sleutelsessies op opeenvolgende dagen", () => {
    const every = { ma: 90, di: 90, wo: 90, do: 90, vr: 90, za: 180, zo: 120 };
    const input = baseInput({
      availability: { default: every, weeks: [] },
      recentLoad: { ...baseInput().recentLoad, ridesPerWeek: 6, avgDurationMinutes: 75 },
    });
    const weeks = weeksFor(input, () => ({ keySessions: 3, targetMinutes: 480 }));
    const { workouts } = compose(input, weeks);
    const keyDays = workouts.filter((workout) => isKey(workout.title)).map((workout) => workout.date);
    expect(keyDays.length).toBeGreaterThan(weeks.length * 2);
    for (const day of keyDays) expect(keyDays).not.toContain(shiftDays(day, 1));
  });

  it("houdt de dag vóór een race of test licht en neemt een los event op", () => {
    const input = baseInput({
      upcomingEvents: [
        { title: "Clubrace", type: "race", date: "2026-10-25", durationMinutes: 75, distanceKm: 40, elevationM: 300 },
      ],
      fixedWorkouts: [
        { date: "2026-11-06", title: "FTP-test", durationMinutes: 60, intensity: "threshold", kind: "ftp_test" },
      ],
    });
    const { workouts, reasons } = compose(input);
    const on = (date: string) => workouts.find((workout) => workout.date === date);

    expect(on("2026-10-25")).toMatchObject({ intensity: "race", durationMinutes: 75, title: "Clubrace" });
    for (const before of ["2026-10-24", "2026-11-05"]) {
      expect(["openers", "rustige_duur"]).toContain(on(before)?.title);
    }
    for (const after of ["2026-10-26", "2026-11-07"]) {
      expect(isKey(on(after)?.title ?? "")).toBe(false);
    }
    expect(reasons.filter((reason) => reason.rule === "dag.voor_race").map((reason) => reason.date)).toEqual(
      expect.arrayContaining(["2026-10-24", "2026-11-05"]),
    );
  });

  it("volgt het aantal ritten per week van het lid", () => {
    const every = { ma: 120, di: 120, wo: 120, do: 120, vr: 120, za: 120, zo: 120 };
    for (const [ridesPerWeek, avgDurationMinutes] of [
      [5, 60],
      [3, 100],
    ]) {
      const input = baseInput({
        availability: { default: every, weeks: [] },
        recentLoad: { ...baseInput().recentLoad, ridesPerWeek, avgDurationMinutes },
      });
      const weeks = weeksFor(input, () => ({ longRideMinutes: null }));
      const { workouts, reasons } = compose(input, weeks);
      // De motor kiest evenveel rijdagen als het lid gewend is. Een korte rustige
      // rit wordt daarbij een rustdag, en die telt als rijdag: het lid mag er tot
      // 90 minuten rustig fietsen. Er staan dus hooguit zoveel workouts.
      const picked = reasons
        .filter((reason) => reason.rule === "dag.ritten")
        .map((reason) => Number(/: (\d+) ritten/.exec(reason.text)?.[1]));
      expect(picked).toEqual(weeks.map(() => ridesPerWeek));
      for (const week of weeks) {
        expect(workouts.filter((workout) => mondayKey(workout.date) === week.weekStart).length).toBeLessThanOrEqual(
          ridesPerWeek,
        );
      }
    }
  });

  it("zet de lange rit op de ruimste dag", () => {
    const input = baseInput({
      availability: {
        default: { ma: 0, di: 90, wo: 0, do: 90, vr: 0, za: 180, zo: 120 },
        weeks: [{ weekStart: "2026-11-02", minutesByDay: { ma: 0, di: 90, wo: 0, do: 90, vr: 0, za: 60, zo: 240 } }],
      },
    });
    const { workouts, reasons } = compose(input);
    const longRides = workouts.filter((workout) => workout.title === "lange_duur");
    expect(longRides).toHaveLength(12);
    for (const ride of longRides) {
      expect(weekdayOf(ride.date)).toBe(mondayKey(ride.date) === "2026-11-02" ? "zo" : "za");
      expect(ride.durationMinutes).toBeLessThanOrEqual(minutesOn(input, ride.date)!);
    }
    expect(reasons.filter((reason) => reason.rule === "dag.lange_rit")).toHaveLength(12);
  });

  it("plant geen rustige duur onder de 90 minuten: dat wordt een rustdag", () => {
    const { workouts } = compose(baseInput());
    expect(workouts.some((workout) => workout.title.startsWith("Rustige duur") && workout.durationMinutes < 90)).toBe(false);
  });

  it("plant geen hersteltraining onder de 90 minuten: dat wordt een rustdag", () => {
    const input = baseInput();
    const buildSession = stubCatalog([], (form) => (form === "rustige_duur" ? "recovery" : INTENSITY[form]));
    const weeks = weeksFor(input, () => ({ level: 0 }));
    const { workouts, reasons } = composePlan({ input, window: input.planWindow!, weeks, buildSession });
    expect(workouts.some((workout) => workout.intensity === "recovery" && workout.durationMinutes < 90)).toBe(false);
    expect(reasons.some((reason) => reason.rule === "dag.rustdag")).toBe(true);
  });

  it("kiest de sleutelvormen bij het doeltype en wisselt per week", () => {
    const allowed: Record<string, SessionForm[]> = {
      zrl: ["vo2max", "anaeroob", "drempel", "sweetspot"],
      ftp: ["drempel", "vo2max"],
      base_fitness: ["sweetspot", "tempo"],
      gran_fondo: ["sweetspot", "drempel"],
      outdoor_event: ["sweetspot", "drempel"],
      rebuild: ["tempo", "sweetspot"],
    };
    const keyish = new Set<string>([...KEY_SESSION_FORMS, "tempo"]);
    for (const [type, forms] of Object.entries(allowed)) {
      const input = baseInput({ goal: { ...baseInput().goal, type } });
      const { workouts } = compose(input);
      const keyForms = workouts.filter((workout) => keyish.has(workout.title)).map((workout) => workout.title);
      expect(keyForms.length).toBe(24);
      for (const form of keyForms) expect(forms).toContain(form);
    }

    const zrl = compose(baseInput()).workouts;
    const week = (monday: string) =>
      zrl.filter((workout) => mondayKey(workout.date) === monday && isKey(workout.title)).map((w) => w.title);
    expect(week("2026-10-19")).toContain("vo2max");
    expect(week("2026-10-26")).toContain("anaeroob");
    expect(compose(baseInput({ goal: { ...baseInput().goal, type: "ftp" } })).workouts.map((w) => w.title)).toEqual(
      expect.arrayContaining(["drempel", "vo2max"]),
    );
  });

  it("laat een toegezegde race de VO2max-prikkel van een ZRL-week zijn", () => {
    const input = baseInput({
      fixedWorkouts: [
        { date: "2026-10-22", title: "ZRL-race", durationMinutes: 60, intensity: "race", kind: "clubevent" },
      ],
    });
    const { workouts } = compose(input);
    const keyThisWeek = workouts
      .filter((workout) => mondayKey(workout.date) === "2026-10-19" && isKey(workout.title))
      .map((workout) => workout.title);
    expect(keyThisWeek).toHaveLength(1);
    expect(["drempel", "sweetspot"]).toContain(keyThisWeek[0]);
  });

  it("plant bij een bijwerking alleen het venster van de bijwerking", () => {
    const input = baseInput({
      planUpdate: {
        reason: "Minder tijd",
        fromDate: "2026-11-04",
        toDate: "2026-11-29",
        previousTitle: "Oud",
        previousSummary: null,
        changed: {},
        remainingWorkouts: [],
      },
      upcomingEvents: [
        { title: "Toertocht", type: "tour", date: "2026-11-15", durationMinutes: 240, distanceKm: 110, elevationM: 900 },
        { title: "Later", type: "race", date: "2026-12-06", durationMinutes: 60, distanceKm: null, elevationM: null },
      ],
    });
    const { workouts } = compose(input);
    expect(workouts.length).toBeGreaterThan(0);
    for (const workout of workouts) {
      expect(workout.date >= "2026-11-04" && workout.date <= "2026-11-29").toBe(true);
    }
    expect(workouts.find((workout) => workout.date === "2026-11-15")).toMatchObject({
      intensity: "race",
      durationMinutes: 240,
    });
  });

  it("plant weinig tijd als sprintsessies, en één bij vermoeidheid", () => {
    const input = baseInput({
      availability: {
        default: { ma: 0, di: 90, wo: 0, do: 90, vr: 0, za: 180, zo: 120 },
        weeks: [{ weekStart: "2026-10-26", minutesByDay: { ma: 0, di: 60, wo: 0, do: 60, vr: 0, za: 90, zo: 0 } }],
      },
    });
    const weeks = weeksFor(input, (monday) =>
      monday === "2026-10-26" ? { targetMinutes: 150, longRideMinutes: null } : {},
    );
    const keyIn = (result: ReturnType<typeof compose>) =>
      result.workouts.filter((w) => mondayKey(w.date) === "2026-10-26" && isKey(w.title)).map((w) => w.title);

    const fresh = compose(input, weeks);
    expect(keyIn(fresh)).toEqual(["sprint", "sprint"]);
    expect(fresh.reasons.some((reason) => reason.rule === "dag.weinig_tijd")).toBe(true);

    const tired = compose({ ...input, intervalsLoad: { ctl: 55, atl: 95, tsb: -40, eftp: 250, rampRate: 3 } }, weeks);
    expect(keyIn(tired)).toEqual(["sprint"]);

    const rustig = compose(input, weeksFor(input, () => ({ kind: "rustig", targetMinutes: 150, keySessions: 0 })));
    for (const workout of rustig.workouts) expect(["sprint", "rustige_duur", "lange_duur"]).toContain(workout.title);
  });

  it("zet in de overgangsperiode één rustige duurrit met sprints per week", () => {
    const input = baseInput({
      seasonPlan: { targets: [{ title: "Finale", date: "2026-10-17", priority: "a" }], periods: [], nextTargetAfterPlan: null },
    });
    const { workouts, reasons } = compose(input);
    const weeks = weeksFor(input);
    weeks.forEach((week) => {
      const inWeek = workouts.filter((workout) => mondayKey(workout.date) === week.weekStart);
      const transition = daysBetween("2026-10-17", week.weekStart) <= 28;
      expect(inWeek.some((workout) => isKey(workout.title))).toBe(!transition);
      expect(inWeek.filter((workout) => workout.methodLabel === "veelbelovend")).toHaveLength(transition ? 1 : 0);
    });
    expect(reasons.filter((reason) => reason.rule === "dag.overgang")).toHaveLength(4);

    const nextSoon = baseInput({
      seasonPlan: {
        targets: [
          { title: "Finale", date: "2026-10-17", priority: "a" },
          { title: "Volgende", date: "2026-11-20", priority: "b" },
        ],
        periods: [],
        nextTargetAfterPlan: null,
      },
    });
    // Geen overgang na de finale; wel na het B-mikpunt van 20 november.
    const transitionDays = compose(nextSoon)
      .reasons.filter((reason) => reason.rule === "dag.overgang")
      .map((reason) => reason.date!);
    expect(transitionDays.length).toBeGreaterThan(0);
    for (const day of transitionDays) expect(day > "2026-11-20").toBe(true);
  });

  it("verwerkt lage cadans en hitte uit de protocollen", () => {
    const protocol = (slug: string, from: string, to: string) => ({
      slug,
      title: slug,
      from,
      to,
      raceDate: null,
      phases: [],
      instructions: "",
    });
    const requests: SessionRequest[] = [];
    const input = baseInput({
      protocols: [
        protocol("lage-cadans-vo2max", "2026-10-19", "2026-11-01"),
        protocol("hitte-kort", "2026-10-19", "2027-01-10"),
      ],
    });
    const { workouts } = compose(input, weeksFor(input), requests);

    const vo2 = requests.filter((request) => request.form === "vo2max" || request.form === "anaeroob");
    expect(vo2.length).toBeGreaterThan(2);
    expect(vo2.slice(0, 2).every((request) => request.lowCadence === true)).toBe(true);
    expect(vo2.slice(2).every((request) => request.lowCadence === undefined)).toBe(true);

    for (const week of weeksFor(input)) {
      const heat = workouts.filter(
        (workout) => mondayKey(workout.date) === week.weekStart && workout.description.includes("Hittesessie"),
      );
      expect(heat).toHaveLength(1);
      expect(["rustige_duur", "intensieve_duur", "lange_duur"]).toContain(heat[0].title);
    }
  });

  it("schrijft elk blok volledig uit en houdt de reeks op datum", () => {
    const { workouts } = compose(baseInput());
    const dates = workouts.map((workout) => workout.date);
    expect(dates).toEqual([...dates].sort());
    for (const block of workouts.flatMap((workout) => workout.structure)) {
      expect(block).toMatchObject({ burstSeconds: 0, onSeconds: 0, offSeconds: 0, offTarget: "" });
    }
  });

  it("is deterministisch", () => {
    const input = baseInput({
      upcomingEvents: [
        { title: "Clubrace", type: "race", date: "2026-11-22", durationMinutes: 75, distanceKm: 40, elevationM: 300 },
      ],
    });
    expect(compose(input)).toEqual(compose(input));
  });
});

describe("planText", () => {
  it("geeft een korte titel, een samenvatting van 2-4 zinnen en ontdubbelde cautions", () => {
    const input = baseInput({
      preferences: [{ by: "lid", date: "2026-10-01", text: "Liever buiten" }],
      planUpdate: {
        reason: "Nieuwe baan",
        fromDate: "2026-10-19",
        toDate: "2027-01-10",
        previousTitle: "Oud",
        previousSummary: null,
        changed: {},
        remainingWorkouts: [],
      },
    });
    const weeks = weeksFor(input, (_monday, index) => (index % 4 === 3 ? { kind: "herstel" } : {}));
    weeks[0].reasons.push({ rule: "signaal.tsb", text: "Vorm is laag: herstel ingebouwd.", caution: true });
    const reasons: EngineReason[] = [
      { rule: "dag.sleutel_vervalt", text: "Een sessie past niet.", caution: true },
      { rule: "dag.sleutel_vervalt", text: "Een sessie past niet.", caution: true },
      { rule: "dag.ritten", text: "4 ritten.", caution: false },
      { rule: "test", text: "Knieklacht deze week.", caution: true },
    ];
    const text = planText(input, weeks, reasons);

    expect(text.title.length).toBeLessThanOrEqual(40);
    expect(text.title).toBe("ZRL-opbouw, 12 weken");
    const sentences = text.summary.split(/(?<=\.)\s+/);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(sentences.length).toBeLessThanOrEqual(4);
    expect(text.summary).toContain("9 opbouwweken en 3 herstelweken");
    expect(text.summary.match(/90 minuten/g)).toHaveLength(1);

    expect(text.cautions.filter((caution) => caution === "Een sessie past niet.")).toHaveLength(1);
    expect(text.cautions).toContain("Vorm is laag: herstel ingebouwd.");
    expect(text.cautions.some((caution) => /klacht/i.test(caution))).toBe(false);
    expect(text.cautions.some((caution) => caution.includes("voorkeuren"))).toBe(true);
    expect(text.cautions.some((caution) => caution.includes("bijwerking"))).toBe(true);
    expect(text.cautions).not.toContain("4 ritten.");
  });
});
