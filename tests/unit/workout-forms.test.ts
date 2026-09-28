import { describe, expect, it } from "vitest";
import {
  alignBlockIntensity,
  alignWorkoutIntensities,
  conciseWorkoutTitle,
  INTENSITY_FTP_RANGE,
  intensityFromPct,
  intervalsWorkoutName,
  keyWorkPct,
  plannedWorkoutIntensity,
  trainingFormForPct,
  WORKOUT_INTENSITIES,
  type WorkoutBlock,
  type WorkoutIntensity,
} from "@/lib/training/workouts";

function block(
  durationMinutes: number,
  target: string,
  intensity: WorkoutIntensity,
  label = "Blok",
): WorkoutBlock {
  return { label, durationMinutes, target, notes: "", intensity };
}

const warmup = block(10, "50-60%", "endurance", "Warming-up");
const cooldown = block(10, "45-55%", "recovery", "Cooling-down");

describe("trainingFormForPct", () => {
  it("volgt de trainingsvormen van de eigenaar", () => {
    const forms = [59, 61, 70, 71, 80, 81, 86, 87, 89, 90, 104, 105, 118, 119].map(
      trainingFormForPct,
    );
    expect(forms).toEqual([
      "Herstel",
      "Rustige duur",
      "Rustige duur",
      "Intensieve duur",
      "Intensieve duur",
      "Tempo",
      "Tempo",
      "Sweet spot",
      "Sweet spot",
      "Drempel",
      "Drempel",
      "VO2max",
      "VO2max",
      "Anaeroob",
    ]);
  });

  it("noemt een blok op 70-80% intensieve duur, niet tempo", () => {
    expect(trainingFormForPct(75)).toBe("Intensieve duur");
    // Net zone 3 in: de kleur is groen, de naam blijft intensieve duur.
    expect(intensityFromPct(78)).toBe("tempo");
    expect(trainingFormForPct(78)).toBe("Intensieve duur");
  });
});

describe("INTENSITY_FTP_RANGE", () => {
  it("valt met zijn midden in de zone van zijn eigen intensiteit", () => {
    for (const intensity of WORKOUT_INTENSITIES) {
      if (intensity === "rest" || intensity === "race") continue;
      const [low, high] = INTENSITY_FTP_RANGE[intensity];
      expect(intensityFromPct((low + high) / 2)).toBe(intensity);
    }
  });
});

describe("alignBlockIntensity", () => {
  it("geeft een blok de intensiteit van de zone van zijn doel", () => {
    expect(alignBlockIntensity(block(20, "70-80%", "tempo"), 250).intensity).toBe("endurance");
    expect(alignBlockIntensity(block(20, "88-94%", "tempo"), 250).intensity).toBe("threshold");
    // Wattdoel: 200-225w op FTP 250 is 80-90%, midden 85%.
    expect(alignBlockIntensity(block(20, "RPE 6, 200-225w", "threshold"), 250).intensity).toBe(
      "tempo",
    );
  });

  it("laat een blok zonder leesbaar doel, rust en race met rust", () => {
    const watts = block(20, "200-225w", "tempo");
    expect(alignBlockIntensity(watts, null)).toBe(watts);
    const vague = block(20, "RPE 5", "tempo");
    expect(alignBlockIntensity(vague, 250)).toBe(vague);
    const rest = block(20, "", "rest");
    expect(alignBlockIntensity(rest, 250)).toBe(rest);
    const race = block(60, "", "race");
    expect(alignBlockIntensity(race, 250)).toBe(race);
  });
});

describe("keyWorkPct", () => {
  it("negeert warming-up en cooling-down", () => {
    const blocks = [warmup, block(15, "81-86%", "tempo"), block(15, "81-86%", "tempo"), cooldown];
    expect(keyWorkPct(blocks, 250)).toBe(83.5);
  });

  it("laat een paar korte openers een duurrit niet typeren", () => {
    const blocks = [
      block(50, "65-70%", "endurance"),
      block(1, "115-125%", "anaerobic"),
      block(1, "115-125%", "anaerobic"),
      block(1, "115-125%", "anaerobic"),
      cooldown,
    ];
    expect(keyWorkPct(blocks, 250)).toBe(67.5);
  });

  it("laat zes sprints van een minuut wel meetellen", () => {
    const sprints = Array.from({ length: 6 }, () => block(1, "150-175%", "anaerobic"));
    expect(intensityFromPct(keyWorkPct([warmup, ...sprints, cooldown], 250))).toBe("anaerobic");
  });

  it("geeft null zonder blokken", () => {
    expect(keyWorkPct([], 250)).toBeNull();
  });
});

describe("plannedWorkoutIntensity", () => {
  it("zet de naam en kleur van de workout gelijk met zijn blokken", () => {
    // Het geval dat de eigenaar zag: "Tempo" in groen, met blauwe blokken.
    const workout = {
      intensity: "tempo",
      structure_json: [warmup, block(20, "70-80%", "tempo"), block(20, "70-80%", "tempo"), cooldown],
    };
    expect(plannedWorkoutIntensity(workout, 250)).toEqual({
      intensity: "endurance",
      label: "Intensieve duur",
    });
  });

  it("noemt sweet spot en tempo bij hun trainingsvorm", () => {
    const sweetSpot = { intensity: "tempo", structure_json: [warmup, block(20, "87-89%", "tempo")] };
    expect(plannedWorkoutIntensity(sweetSpot, null)).toEqual({
      intensity: "tempo",
      label: "Sweet spot",
    });
  });

  it("houdt race, rust en FTP-tests zoals ze zijn", () => {
    const hard = [block(20, "120-140%", "anaerobic")];
    expect(plannedWorkoutIntensity({ intensity: "race", structure_json: hard }, 250)).toEqual({
      intensity: "race",
      label: "Race",
    });
    expect(
      plannedWorkoutIntensity(
        { intensity: "threshold", structure_json: hard, test_type: "ramp" },
        250,
      ),
    ).toEqual({ intensity: "threshold", label: "Drempel" });
  });

  it("valt zonder blokken terug op de opgeslagen intensiteit", () => {
    expect(plannedWorkoutIntensity({ intensity: "vo2max", structure_json: [] }, 250)).toEqual({
      intensity: "vo2max",
      label: "VO2max",
    });
  });
});

describe("alignWorkoutIntensities", () => {
  it("zet blokken en workout recht voordat ze worden opgeslagen", () => {
    const result = alignWorkoutIntensities(
      "tempo",
      [warmup, block(30, "RPE 5, 178-200w", "tempo"), cooldown],
      250,
    );
    expect(result.intensity).toBe("endurance");
    expect(result.blocks.map((row) => row.intensity)).toEqual([
      "recovery",
      "endurance",
      "recovery",
    ]);
  });

  it("laat een race een race", () => {
    expect(alignWorkoutIntensities("race", [block(60, "85-115%", "race")], 250).intensity).toBe(
      "race",
    );
  });
});

describe("conciseWorkoutTitle", () => {
  it("haalt uitleg uit de titel", () => {
    expect(conciseWorkoutTitle("Duur 60 min (ingekort)")).toBe("Duur 60 min");
    expect(conciseWorkoutTitle("Tempo 3x10 – rustiger na zaterdag")).toBe("Tempo 3x10");
    expect(conciseWorkoutTitle("Rustige duur ingekort wegens tijd")).toBe("Rustige duur");
    expect(conciseWorkoutTitle("Sweet spot 2x20: lichter dan gepland")).toBe("Sweet spot 2x20");
    expect(conciseWorkoutTitle("Herstelrit na de race")).toBe("Herstelrit");
  });

  it("laat een korte titel staan", () => {
    expect(conciseWorkoutTitle("Intensieve duur 3x15")).toBe("Intensieve duur 3x15");
    expect(conciseWorkoutTitle("Rustige duur 90 min")).toBe("Rustige duur 90 min");
  });

  it("zet de merknaam er niet zelf in", () => {
    expect(conciseWorkoutTitle("ZWBeter Worden - VO2max 5x4")).toBe("VO2max 5x4");
  });

  it("kapt een te lange titel af op een woordgrens", () => {
    const title = conciseWorkoutTitle(
      "Intensieve duur met lange blokken en een stevige afsluiting heuvelop",
    );
    expect(title.length).toBeLessThanOrEqual(40);
    expect(title).toBe("Intensieve duur met lange blokken en een");
  });

  it("houdt iets over als alles uitleg lijkt", () => {
    expect(conciseWorkoutTitle("(ingekort)")).toBe("(ingekort)");
    expect(conciseWorkoutTitle("ZWBeter Worden")).toBe("Training");
  });
});

describe("intervalsWorkoutName", () => {
  it("zet ZWBeter Worden vooraan", () => {
    expect(intervalsWorkoutName("Sweet spot 2x20")).toBe("ZWBeter Worden - Sweet spot 2x20");
  });

  it("zet de merknaam er niet twee keer in", () => {
    expect(intervalsWorkoutName("ZWBeter Worden - Sweet spot 2x20")).toBe(
      "ZWBeter Worden - Sweet spot 2x20",
    );
    expect(intervalsWorkoutName("Tempo 3x15 · ZWBeter Worden")).toBe("ZWBeter Worden - Tempo 3x15");
  });
});
