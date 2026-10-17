import { describe, expect, it } from "vitest";
import { workoutSupport, workoutSupportSlug } from "@/lib/training/workout-support";

const standard = (form: string, title: string, duration_minutes = 60) => ({
  form,
  title,
  duration_minutes,
  is_standard: true,
});

describe("onderbouwing van bibliotheekworkouts", () => {
  it("koppelt de nieuwe trainingsmethodes aan hun eigen artikel", () => {
    expect(workoutSupportSlug(standard("sweetspot", "Sweet spot 5x10 blokweek"))).toBe("blokweek");
    expect(workoutSupportSlug(standard("vo2max", "VO2max 30/15 blokweek"))).toBe("blokweek");
    expect(workoutSupportSlug(standard("vo2max", "VO2max 4x4 aflopend"))).toBe("vo2max-wisselend");
    expect(workoutSupportSlug(standard("vo2max", "VO2max 5x5 snelle start"))).toBe("vo2max-wisselend");
    expect(workoutSupportSlug(standard("sprint", "Sprint 6x30s onderhoud"))).toBe("sprints-als-onderhoud");
    expect(workoutSupportSlug(standard("duur", "Duur 90 met 3x3 sprints", 90))).toBe("sprints-als-onderhoud");
    expect(workoutSupportSlug(standard("sprint", "Kracht 6x2 laag toerental"))).toBe("lage-cadans");
  });

  it("splitst duurritten in rustige en lange ritten", () => {
    expect(workoutSupportSlug(standard("duur", "Duur 120", 120))).toBe("rustige-ritten");
    expect(workoutSupportSlug(standard("duur", "Duur 150 tempo aan het eind", 150))).toBe("lange-ritten");
    expect(workoutSupportSlug(standard("herstel", "Herstelrit 45", 45))).toBe("rustige-ritten");
  });

  it("hangt de gewone intervallen aan het artikel Intervallen", () => {
    for (const [form, title] of [
      ["tempo", "Tempo 2x15"],
      ["sweetspot", "Sweet spot 3x10"],
      ["drempel", "Drempel 2x20"],
      ["vo2max", "VO2max 4x5"],
      ["anaeroob", "Anaeroob 8x1"],
      ["sprint", "Sprint 8x1"],
    ] as const) {
      expect(workoutSupportSlug(standard(form, title)), title).toBe("intervallen");
    }
  });

  it("geeft eigen workouts geen niveau", () => {
    expect(workoutSupportSlug({ ...standard("test", "Eigen test"), is_standard: false })).toBeNull();
  });

  it("verwijst alleen naar artikelen die bestaan", () => {
    for (const [form, title, minutes] of [
      ["test", "FTP-test (ramp)", 40],
      ["warmup", "Warming-up tijdrit", 25],
      ["duur", "Duur 240", 240],
      ["sweetspot", "Sweet spot 7x14 blokweek", 141],
      ["vo2max", "VO2max 5x5 wisselend", 62],
      ["sprint", "Kracht 6x2 laag toerental", 57],
      ["sprint", "Sprint 6x30s onderhoud", 51],
      ["herstel", "Herstelrit 30", 30],
      ["drempel", "Drempel 2x20", 75],
    ] as const) {
      expect(workoutSupport(standard(form, title, minutes)), title).not.toBeNull();
    }
  });
});
