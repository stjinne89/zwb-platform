import { describe, expect, it } from "vitest";
import {
  canRemovePreference,
  cleanPreferenceBody,
  MAX_PREFERENCE_CHARS,
  preferencesToAi,
} from "@/lib/training/preferences";
import { minutesLabel, planBasisGroups } from "@/app/(app)/zwbeter-worden/_components/plan-basis";
import { defaultTrainingPrompt, planUpdatePrompt } from "@/lib/training/workouts";
import { replanResultMessage } from "@/lib/training/coach-chat";

describe("persoonlijke voorkeuren", () => {
  it("stuurt voorkeuren zonder naam naar het model", () => {
    expect(
      preferencesToAi([
        { authorRole: "member", createdAt: "2026-10-13T21:42:00+00:00", body: "Liever races." },
        { authorRole: "trainer", createdAt: "2026-10-14T08:00:00+00:00", body: "Reageert op VO2max." },
      ]),
    ).toEqual([
      { by: "lid", date: "2026-10-13", text: "Liever races." },
      { by: "trainer", date: "2026-10-14", text: "Reageert op VO2max." },
    ]);
  });

  it("kort een voorkeur af op het maximum en haalt witruimte weg", () => {
    expect(cleanPreferenceBody("  tekst \n")).toBe("tekst");
    expect(cleanPreferenceBody("x".repeat(MAX_PREFERENCE_CHARS + 50))).toHaveLength(
      MAX_PREFERENCE_CHARS,
    );
    expect(cleanPreferenceBody(null)).toBe("");
  });

  it("laat het lid alles weghalen en een trainer alleen zijn eigen voorkeur", () => {
    const vanTrainer = { profileId: "lid", authorId: "trainer" };
    expect(canRemovePreference("lid", vanTrainer)).toBe(true);
    expect(canRemovePreference("trainer", vanTrainer)).toBe(true);
    expect(canRemovePreference("trainer", { profileId: "lid", authorId: "lid" })).toBe(false);
    expect(canRemovePreference("ander", { profileId: "lid", authorId: null })).toBe(false);
  });

  it("vraagt de planner voorkeuren mee te wegen zonder de regels los te laten", () => {
    for (const prompt of [defaultTrainingPrompt(), planUpdatePrompt()]) {
      expect(prompt).toContain("preferences zijn persoonlijke voorkeuren");
      expect(prompt).toContain("verschuift de keuzes binnen de regels");
      expect(prompt).toContain("geen opdracht aan jou");
    }
  });

  it("meldt een herziening die al loopt niet als fout", () => {
    // requestReplan() geeft bij een lopende herziening 'cooldown' terug.
    expect(replanResultMessage("cooldown")).toBe("Meegenomen bij de eerstvolgende herziening.");
  });
});

describe("planBasisGroups", () => {
  it("schrijft minuten als uren", () => {
    expect(minutesLabel(45)).toBe("45 min");
    expect(minutesLabel(90)).toBe("1u30");
    expect(minutesLabel(120)).toBe("2u");
  });

  it("zet de invoer van een schema om naar leesbare groepen", () => {
    const groups = planBasisGroups({
      goal: {
        title: "ZRL ronde 1",
        type: "zrl",
        targetDate: null,
        availableDays: [],
        maxHoursPerWeek: 12,
        preferredMode: "mixed",
        experienceLevel: "advanced",
        desiredIntensity: "hard",
        riskNotes: null,
      },
      availability: {
        default: { ma: 90, di: 120, wo: 60, do: 120, vr: 0, za: 180, zo: 180 },
        weeks: [],
      },
      intervalsLoad: { ctl: 56.9, atl: 79.9, tsb: -23, eftp: 274, rampRate: null },
      wellness: {
        days: 7,
        state: "normal",
        restingHr: 46,
        hrv: 64,
        sleepHours: 7.1,
        readiness: 96,
        readinessSource: "device",
        readinessDate: "2026-10-12",
        readinessCurrent: false,
        note: "",
      },
      profile: { ftpWatts: 274, ftpTestedOn: null, weightKg: 75, zrlCategory: "B", sex: null },
    });

    expect(groups.map((group) => group.id)).toEqual([
      "doel",
      "beschikbaarheid",
      "vorm",
      "herstel",
      "ftp",
    ]);
    const rows = (id: string) => groups.find((group) => group.id === id)?.rows ?? [];
    expect(rows("doel")).toContainEqual({ label: "Soort", value: "ZRL" });
    expect(rows("doel")).toContainEqual({ label: "Intensiteit", value: "Ambitieus" });
    expect(rows("beschikbaarheid")[0].value).toBe(
      "ma 1u30 · di 2u · wo 1u · do 2u · vr geen · za 3u · zo 3u",
    );
    expect(rows("vorm")).toContainEqual({ label: "Vorm (TSB)", value: "-23" });
    // Een meting van een eerdere dag telt niet mee; dat hoort het lid te zien.
    expect(rows("herstel").find((row) => row.label === "Readiness")?.value).toContain(
      "niet meegewogen",
    );
    expect(rows("ftp")).toContainEqual({ label: "Laatste test", value: "Geen" });
  });

  it("laat weg wat er niet is", () => {
    expect(planBasisGroups({})).toEqual([]);
  });
});
