// Een verzonnen lid als vertrekpunt voor de tests van de regelmotor. Geen echte
// ledendata: tests die op opgeslagen generaties draaien horen niet in de repo.

import type { TrainingAiInput } from "@/lib/training/engine/types";

/** Een ZRL-renner met FTP 250, 6 uur per week en een vast weekritme. */
export function baseInput(overrides: Partial<TrainingAiInput> = {}): TrainingAiInput {
  return {
    athleteName: "Testlid",
    goal: {
      title: "ZRL-seizoen",
      type: "zrl",
      targetDate: null,
      availableDays: ["di", "do", "za", "zo"],
      maxHoursPerWeek: 6,
      preferredMode: "indoor",
      experienceLevel: "intermediate",
      desiredIntensity: "normal",
      riskNotes: null,
    },
    profile: { ftpWatts: 250, ftpTestedOn: "2026-09-01", weightKg: 75, zrlCategory: "B", sex: null },
    symptoms: null,
    recentLoad: {
      days: 28,
      activities: 16,
      distanceKm: 600,
      elevationM: 4000,
      hours: 20,
      hoursPerWeek: 5,
      ridesPerWeek: 4,
      avgDurationMinutes: 75,
      longestRideMinutes: 150,
    },
    wellness: null,
    intervalsLoad: { ctl: 55, atl: 60, tsb: -5, eftp: 250, rampRate: 3 },
    upcomingEvents: [],
    compliance: null,
    availability: {
      default: { ma: 0, di: 90, wo: 0, do: 90, vr: 0, za: 180, zo: 120 },
      weeks: [],
    },
    seasonPlan: { targets: [], periods: [], nextTargetAfterPlan: null },
    fixedWorkouts: [],
    preferences: [],
    protocols: [],
    // Maandag 2026-10-19 tot en met zondag 2027-01-10: twaalf weken.
    planWindow: { from: "2026-10-19", to: "2027-01-10", goalBeyond: false },
    ...overrides,
  };
}
