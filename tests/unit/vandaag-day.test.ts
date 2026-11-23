import { describe, expect, it } from "vitest";
import {
  hasRideToday,
  hasTrainingAhead,
  showsTirePressure,
  vandaagDay,
  vandaagSections,
} from "@/lib/training/vandaag-day";

const TODAY = "2026-11-23";

function workout(
  id: string,
  day: string,
  overrides: Partial<{ status: string; intensity: string; intervals_external_id: string }> = {},
) {
  return {
    id,
    scheduled_at: `${day}T17:00:00+00:00`,
    status: "planned",
    intensity: "endurance",
    ...overrides,
  };
}

describe("vandaagDay", () => {
  it("een open training vandaag", () => {
    const day = vandaagDay([workout("a", TODAY), workout("b", "2026-11-25")], TODAY, null);
    expect(day.state).toBe("training");
    expect(day.open?.id).toBe("a");
    expect(day.next?.id).toBe("b");
  });

  it("een race vandaag", () => {
    expect(vandaagDay([workout("a", TODAY, { intensity: "race" })], TODAY, null).state).toBe("race");
  });

  it("een gereden training is niet meer de eerstvolgende", () => {
    const day = vandaagDay(
      [workout("a", TODAY, { status: "completed" }), workout("b", "2026-11-25")],
      TODAY,
      null,
    );
    expect(day.state).toBe("gereden");
    expect(day.closed?.id).toBe("a");
    expect(day.open).toBeNull();
    expect(day.next?.id).toBe("b");
  });

  it("wie 's ochtends reed en 's avonds nog moet, is nog niet klaar", () => {
    const day = vandaagDay(
      [workout("ochtend", TODAY, { status: "completed" }), workout("avond", TODAY)],
      TODAY,
      null,
    );
    expect(day.state).toBe("training");
    expect(day.open?.id).toBe("avond");
  });

  it("een afgeschreven training en een geplande rustdag zijn allebei rust", () => {
    expect(vandaagDay([workout("a", TODAY, { status: "skipped" })], TODAY, null).state).toBe("rust");
    expect(vandaagDay([workout("a", TODAY, { intensity: "rest" })], TODAY, null).state).toBe("rust");
  });

  it("een geplande rustdag telt niet als volgende training", () => {
    const day = vandaagDay(
      [workout("rust", "2026-11-24", { intensity: "rest" }), workout("b", "2026-11-25")],
      TODAY,
      null,
    );
    expect(day.state).toBe("later");
    expect(day.next?.id).toBe("b");
  });

  it("een warming-up is geen training van zichzelf", () => {
    const warmup = workout("w", TODAY, { intervals_external_id: "zwb-warmup-r" });
    expect(vandaagDay([warmup], TODAY, null).state).toBe("leeg");
  });

  it("een eigen intervals-event telt mee", () => {
    expect(vandaagDay([], TODAY, TODAY).state).toBe("training");
    expect(vandaagDay([], TODAY, "2026-11-26").state).toBe("later");
  });

  it("een gereden training gaat voor een eigen event van dezelfde dag", () => {
    const day = vandaagDay([workout("a", TODAY, { status: "completed" })], TODAY, TODAY);
    expect(day.state).toBe("gereden");
  });

  it("niets gepland", () => {
    expect(vandaagDay([workout("oud", "2026-11-20")], TODAY, null).state).toBe("leeg");
  });
});

describe("indeling per dagstaat", () => {
  it("met een rit vandaag komt de voorbereiding eerst", () => {
    expect(vandaagSections("training")).toEqual(["rit", "ook", "stand"]);
    expect(vandaagSections("race")).toEqual(["rit", "ook", "stand"]);
  });

  it("als de dag klaar is komt hoe je ervoor staat eerst", () => {
    expect(vandaagSections("gereden")).toEqual(["stand", "ook"]);
    expect(vandaagSections("rust")).toEqual(["stand", "ook"]);
  });

  it("alleen met een rit vandaag is er ritvoorbereiding", () => {
    expect(hasRideToday("training")).toBe(true);
    expect(hasRideToday("race")).toBe(true);
    expect(hasRideToday("later")).toBe(false);
    expect(hasRideToday("gereden")).toBe(false);
  });

  it("een komende training krijgt de volle kaart", () => {
    expect(hasTrainingAhead("later")).toBe(true);
    expect(hasTrainingAhead("rust")).toBe(false);
    expect(hasTrainingAhead("leeg")).toBe(false);
  });

  it("bandendruk valt weg als er vandaag niet meer gereden wordt", () => {
    expect(showsTirePressure("gereden")).toBe(false);
    expect(showsTirePressure("rust")).toBe(false);
    expect(showsTirePressure("later")).toBe(true);
    expect(showsTirePressure("leeg")).toBe(true);
  });
});
