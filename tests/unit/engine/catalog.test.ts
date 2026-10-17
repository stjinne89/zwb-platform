import { describe, expect, it } from "vitest";
import { buildSession, minSessionMinutes, transitionRide } from "@/lib/training/engine/catalog";
import { SESSION_FORMS, type CatalogSession, type SessionForm, type SessionRequest } from "@/lib/training/engine/types";
import {
  alignBlockIntensity,
  conciseWorkoutTitle,
  intensityFromPct,
  plannedWorkoutIntensity,
  powerRangePercentForBlock,
  type WorkoutBlock,
} from "@/lib/training/workouts";
import { baseInput } from "./fixtures";

const FTP = baseInput().profile.ftpWatts;

function request(form: SessionForm, overrides: Partial<SessionRequest> = {}): SessionRequest {
  return { form, targetMinutes: 90, maxMinutes: 120, ftpWatts: FTP, level: 0.5, variant: 0, ...overrides };
}

function range(block: WorkoutBlock): [number, number] {
  const found = powerRangePercentForBlock(block, FTP);
  if (!found) throw new Error(`geen doel in ${block.label}`);
  return found;
}

/** De RPE-banden uit de prompt, los van de catalogus nageschreven. */
function expectedRpe(low: number, high: number): string {
  const band = (pct: number): [number, number] => {
    if (pct <= 60) return [2, 3];
    if (pct <= 70) return [4, 4];
    if (pct <= 80) return [5, 5];
    if (pct <= 89) return [6, 6];
    if (pct <= 104) return [7, 7];
    if (pct <= 118) return [8, 8];
    if (pct <= 135) return [9, 9];
    return [10, 10];
  };
  const from = band(low)[0];
  const to = band(high)[1];
  return from === to ? `RPE ${from}` : `RPE ${from}-${to}`;
}

/** Alle regels die voor elke sessie gelden, ongeacht de vorm. */
function expectValidSession(session: CatalogSession, req: SessionRequest) {
  const total = session.blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  expect(session.durationMinutes).toBe(total);
  expect(total).toBeLessThanOrEqual(req.maxMinutes);
  expect(session.title.length).toBeLessThanOrEqual(30);
  expect(conciseWorkoutTitle(session.title)).toBe(session.title);
  expect(session.blocks[0].label).toBe("Warming-up");
  expect(session.blocks[session.blocks.length - 1].label).toBe("Cooling-down");
  expect(session.targetType).toBe(req.ftpWatts ? "power" : "rpe");

  const planned = plannedWorkoutIntensity({ intensity: "endurance", structure_json: session.blocks }, req.ftpWatts);
  expect(session.intensity).toBe(planned.intensity);

  for (const block of session.blocks) {
    expect(Number.isInteger(block.durationMinutes)).toBe(true);
    expect(block.durationMinutes).toBeGreaterThan(0);
    const [low, high] = range(block);
    // Intensiteit volgt de zone van het midden van het doel.
    expect(block.intensity).toBe(intensityFromPct((low + high) / 2));
    expect(alignBlockIntensity(block, FTP)).toEqual(block);
    // Duurblokken minstens 65 %.
    if (block.intensity === "endurance") expect(low).toBeGreaterThanOrEqual(65);
    // Drempelblokken: lang op 90-95 %, kort hooguit 100 %.
    if (block.intensity === "threshold" && !block.onOff) {
      if (block.durationMinutes >= 15) {
        expect(low).toBeGreaterThanOrEqual(90);
        expect(high).toBeLessThanOrEqual(95);
      } else {
        expect(high).toBeLessThanOrEqual(100);
      }
    }
    // Boven 100 % alleen in blokken tot 8 minuten (aan/uit-blokken uitgezonderd).
    if (high > 100 && !block.onOff) expect(block.durationMinutes).toBeLessThanOrEqual(8);
    // RPE en wattage op dezelfde band.
    expect(block.notes).toContain(expectedRpe(low, high));
    if (req.ftpWatts) {
      expect(block.notes).toContain(
        `${Math.round((req.ftpWatts * low) / 100)}-${Math.round((req.ftpWatts * high) / 100)}w`,
      );
    }
    // Lage cadans nooit zonder protocol, en nooit onder VO2max.
    if (/lage cadans/i.test(block.notes)) {
      expect(req.lowCadence).toBe(true);
      expect(["vo2max", "anaerobic"]).toContain(block.intensity);
    }
  }
}

const TARGETS = [20, 30, 45, 60, 75, 90, 120, 150, 180, 240];

describe("buildSession", () => {
  for (const form of SESSION_FORMS) {
    describe(form, () => {
      it("houdt zich aan de regels bij elke duur, elk niveau en elke variant", () => {
        for (const target of TARGETS) {
          for (const slack of [0, 15]) {
            for (const level of [0, 0.5, 1]) {
              for (let variant = 0; variant < 5; variant++) {
                const req = request(form, { targetMinutes: target, maxMinutes: target + slack, level, variant });
                const session = buildSession(req);
                if (req.maxMinutes < minSessionMinutes(form)) {
                  expect(session).toBeNull();
                  continue;
                }
                expect(session).not.toBeNull();
                expectValidSession(session!, req);
                expect(session!.form).toBe(form);
                if (target >= minSessionMinutes(form)) expect(session!.durationMinutes).toBe(target);
                else expect(session!.durationMinutes).toBeGreaterThan(target);
              }
            }
          }
        }
      });

      it("is deterministisch", () => {
        const req = request(form, { targetMinutes: 100, maxMinutes: 110, level: 0.7, variant: 3 });
        expect(buildSession(req)).toEqual(buildSession({ ...req }));
      });

      it("werkt zonder FTP met RPE en gevoelstaal", () => {
        const req = request(form, { ftpWatts: null });
        const session = buildSession(req)!;
        expectValidSession(session, req);
        expect(session.targetType).toBe("rpe");
        expect(session.blocks.every((block) => !/\d+w\b/.test(block.notes))).toBe(true);
      });

      it("geeft null als de kern niet past", () => {
        const min = minSessionMinutes(form);
        expect(buildSession(request(form, { targetMinutes: min - 1, maxMinutes: min - 1 }))).toBeNull();
        expect(buildSession(request(form, { targetMinutes: min, maxMinutes: min }))?.durationMinutes).toBe(min);
      });
    });
  }

  it("schaalt de kern met het niveau", () => {
    const work = (level: number) =>
      buildSession(request("drempel", { targetMinutes: 150, maxMinutes: 150, level }))!.blocks.filter(
        (block) => block.intensity === "threshold",
      ).length;
    expect(work(0)).toBe(3);
    expect(work(1)).toBe(5);
  });

  it("kiest per variant een andere opbouw", () => {
    const titles = [0, 1, 2].map(
      (variant) => buildSession(request("drempel", { level: 0, variant, maxMinutes: 120 }))!.title,
    );
    expect(titles).toEqual(["Drempel 3x8", "Drempel 2x12", "Drempel 2x20"]);
  });

  it("schrapt herhalingen voordat de sessie te lang wordt", () => {
    const session = buildSession(request("drempel", { level: 1, variant: 0, targetMinutes: 60, maxMinutes: 60 }))!;
    expect(session.title).toBe("Drempel 3x8");
    expect(session.durationMinutes).toBe(60);
  });

  it("valt terug op een kortere variant als de gekozen niet past", () => {
    const session = buildSession(request("drempel", { variant: 2, level: 0, targetMinutes: 50, maxMinutes: 50 }))!;
    expect(session.title).toBe("Drempel 2x15");
    expect(session.durationMinutes).toBe(50);
  });

  it("schrijft herhalingen onder een minuut als één blok met onOff", () => {
    const session = buildSession(request("vo2max", { variant: 3, level: 0 }))!;
    const series = session.blocks.filter((block) => block.onOff);
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({
      durationMinutes: 9,
      target: "110-118%",
      onOff: { onSeconds: 30, offSeconds: 15, offTarget: "50%" },
    });
    expect(session.title).toBe("VO2max 2x12 30/15");
  });

  it("zet lage cadans alleen bij vo2max-, anaerobe en sprintblokken", () => {
    for (const form of SESSION_FORMS) {
      const req = request(form, { lowCadence: true });
      const session = buildSession(req)!;
      expectValidSession(session, req);
      const marked = session.blocks.filter((block) => /lage cadans 50-70/i.test(block.notes));
      if (form === "vo2max" || form === "anaeroob" || form === "sprint") expect(marked.length).toBeGreaterThan(0);
      else expect(marked).toHaveLength(0);
    }
  });

  it("bouwt de sprintsessie uit de prompt, als veelbelovend", () => {
    const session = buildSession(request("sprint", { targetMinutes: 51, maxMinutes: 60 }))!;
    expect(session.methodLabel).toBe("veelbelovend");
    expect(session.title).toBe("Sprint 6x30s");
    expect(session.blocks.map((block) => block.durationMinutes)).toEqual([15, 1, 4, 1, 4, 1, 4, 1, 4, 1, 4, 1, 10]);
    const sprints = session.blocks.filter((block) => block.label.startsWith("Sprint"));
    expect(sprints.every((block) => block.target === "150-180%")).toBe(true);
    expect(sprints[0].notes).toContain("30 sec voluit, daarna uitrollen.");
    expect(session.intensity).toBe("anaerobic");
  });

  it("geeft alle andere vormen methodLabel geen", () => {
    for (const form of SESSION_FORMS.filter((name) => name !== "sprint")) {
      expect(buildSession(request(form))!.methodLabel).toBe("geen");
    }
  });

  it("houdt openers een duurrit", () => {
    const session = buildSession(request("openers", { targetMinutes: 45, maxMinutes: 45 }))!;
    expect(session.intensity).toBe("endurance");
    expect(session.title).toBe("Openers 45 min");
  });

  it("houdt elke lange rit een duurrit", () => {
    for (let variant = 0; variant < 4; variant++) {
      const session = buildSession(request("lange_duur", { targetMinutes: 180, maxMinutes: 180, variant }))!;
      expect(session.intensity).toBe("endurance");
      expect(session.durationMinutes).toBe(180);
    }
  });

  it("geeft de vormen herkenbare titels", () => {
    const title = (form: SessionForm, overrides: Partial<SessionRequest> = {}) =>
      buildSession(request(form, overrides))!.title;
    expect(title("rustige_duur")).toBe("Rustige duur 90 min");
    expect(title("sweetspot", { variant: 2, level: 0 })).toBe("Sweet spot 2x20");
    expect(title("vo2max", { variant: 0, level: 0.5 })).toBe("VO2max 5x4");
    expect(title("herstel")).toBe("Herstel 90 min");
  });
});

describe("transitionRide", () => {
  it("is rustige duur met drie series van drie sprints", () => {
    const session = transitionRide(120, FTP)!;
    expectValidSession(session, request("rustige_duur", { targetMinutes: 120, maxMinutes: 120 }));
    expect(session.durationMinutes).toBe(120);
    expect(session.methodLabel).toBe("veelbelovend");
    expect(session.intensity).toBe("endurance");
    const sprints = session.blocks.filter((block) => block.burstSeconds);
    expect(sprints).toHaveLength(9);
    expect(sprints.every((block) => block.burstSeconds === 30 && block.durationMinutes === 5)).toBe(true);
    expect(sprints.every((block) => block.target === "50-58%")).toBe(true);
    const between = session.blocks.filter((block, index) => {
      const previous = session.blocks[index - 1];
      const next = session.blocks[index + 1];
      return !block.burstSeconds && previous?.burstSeconds && next?.burstSeconds;
    });
    expect(between.map((block) => block.durationMinutes)).toEqual([10, 10]);
  });

  it("is null als de tijd te kort is en deterministisch", () => {
    expect(transitionRide(79, FTP)).toBeNull();
    expect(transitionRide(80, FTP)?.durationMinutes).toBe(80);
    expect(transitionRide(95, null)).toEqual(transitionRide(95, null));
    expect(transitionRide(95, null)!.targetType).toBe("rpe");
  });
});
