import { describe, expect, it } from "vitest";
import { articleBySlug, EVIDENCE_KINDS, NUTRITION_ARTICLES } from "@/lib/nutrition/library";
import { nutritionDay, nutritionTipForToday, type NutritionDayInput } from "@/lib/nutrition/tips";

const base: NutritionDayInput = {
  today: "2026-09-17",
  weightKg: 70,
  plannedToday: [],
  ridesToday: [],
  plannedTomorrow: [],
};

describe("nutritionTipForToday", () => {
  it("geeft eten onderweg voor een lange rit die nog komt", () => {
    const tip = nutritionTipForToday({ ...base, plannedToday: [{ minutes: 180, intensity: "endurance" }] });
    expect(tip.kind).toBe("tijdens_rit");
    expect(tip.body).toContain("60–90 g");
  });

  it("wijst bij een korte race op de maaltijd vooraf", () => {
    const tip = nutritionTipForToday({ ...base, plannedToday: [{ minutes: 40, intensity: "race" }] });
    expect(tip.kind).toBe("voor_rit");
  });

  it("vraagt om snel aanvullen als er vandaag nog een sessie komt", () => {
    const tip = nutritionTipForToday({
      ...base,
      plannedToday: [
        { minutes: 50, intensity: "endurance" },
        { minutes: 50, intensity: "threshold" },
      ],
      ridesToday: [{ minutes: 55, intensity: null, startHour: 7 }],
    });
    expect(tip.kind).toBe("snel_herstel");
    expect(tip.body).toContain("70–84 g");
  });

  it("zet morgen zwaar vóór eiwit voor het slapen", () => {
    const tip = nutritionTipForToday({
      ...base,
      ridesToday: [{ minutes: 60, intensity: null, startHour: 19 }],
      plannedTomorrow: [{ minutes: 150, intensity: "endurance" }],
    });
    expect(tip.kind).toBe("morgen_zwaar");
    expect(tip.mealMoment).toBe("diner");
  });

  it("raadt na een avondrit eiwit voor het slapen aan", () => {
    const tip = nutritionTipForToday({ ...base, ridesToday: [{ minutes: 60, intensity: null, startHour: 19 }] });
    expect(tip.kind).toBe("voor_slapen");
  });

  it("zegt bij vermoeidheid juist: eet genoeg", () => {
    const tip = nutritionTipForToday({ ...base, readinessState: "recovery" });
    expect(tip.kind).toBe("genoeg_eten");
    expect(tip.articleSlug).toBe("genoeg-eten-reds");
  });

  it("valt terug op de rustdag en een gewone dag", () => {
    expect(nutritionTipForToday(base).kind).toBe("rustdag");
    expect(
      nutritionTipForToday({ ...base, ridesToday: [{ minutes: 40, intensity: null, startHour: 8 }] }).kind,
    ).toBe("basis");
  });

  it("werkt zonder gewicht met de g/kg-regel", () => {
    const tip = nutritionTipForToday({ ...base, weightKg: null });
    expect(tip.body).toContain("per kg");
    expect(nutritionDay({ ...base, weightKg: null }).carbs).toBeNull();
  });

  it("vraagt in geen enkele variant om minder te eten", () => {
    const scenarios: NutritionDayInput[] = [
      base,
      { ...base, weightKg: null },
      { ...base, readinessState: "recovery" },
      { ...base, wellnessState: "fatigued" },
      { ...base, plannedToday: [{ minutes: 240, intensity: "race" }] },
      { ...base, plannedToday: [{ minutes: 40, intensity: "race" }] },
      { ...base, ridesToday: [{ minutes: 90, intensity: null, startHour: 10 }] },
      { ...base, ridesToday: [{ minutes: 60, intensity: null, startHour: 20 }] },
      { ...base, plannedTomorrow: [{ minutes: 200, intensity: "endurance" }] },
      {
        ...base,
        plannedToday: [
          { minutes: 60, intensity: "endurance" },
          { minutes: 60, intensity: "endurance" },
        ],
        ridesToday: [{ minutes: 60, intensity: null, startHour: 7 }],
      },
    ];
    const banned = /afval|calorie|kcal|tekort|minder eten|lijnen|gewicht verliezen|dieet/i;
    for (let day = 1; day <= 28; day += 1) {
      const today = `2026-02-${String(day).padStart(2, "0")}`;
      for (const scenario of scenarios) {
        const tip = nutritionTipForToday({ ...scenario, today });
        expect(`${tip.title} ${tip.body}`).not.toMatch(banned);
      }
    }
  });

  it("verwijst alleen naar artikelen die bestaan", () => {
    const kinds = new Set<string>();
    const inputs: NutritionDayInput[] = [
      base,
      { ...base, readinessState: "recovery" },
      { ...base, plannedToday: [{ minutes: 240, intensity: "race" }] },
      { ...base, plannedToday: [{ minutes: 40, intensity: "race" }] },
      { ...base, ridesToday: [{ minutes: 90, intensity: null, startHour: 10 }] },
      { ...base, ridesToday: [{ minutes: 60, intensity: null, startHour: 20 }] },
      { ...base, ridesToday: [{ minutes: 30, intensity: null, startHour: 10 }] },
      { ...base, plannedTomorrow: [{ minutes: 200, intensity: "endurance" }] },
      {
        ...base,
        plannedToday: [
          { minutes: 60, intensity: "endurance" },
          { minutes: 60, intensity: "endurance" },
        ],
        ridesToday: [{ minutes: 60, intensity: null, startHour: 7 }],
      },
    ];
    for (const input of inputs) {
      const tip = nutritionTipForToday(input);
      kinds.add(tip.kind);
      expect(articleBySlug(tip.articleSlug), tip.articleSlug).not.toBeNull();
    }
    expect(kinds.size).toBe(9);
  });
});

describe("kennisbibliotheek", () => {
  it("heeft unieke slugs en bij elk artikel een navolgbare bron", () => {
    const slugs = NUTRITION_ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const article of NUTRITION_ARTICLES) {
      expect(article.sources.length, article.slug).toBeGreaterThan(0);
      expect(article.points.length, article.slug).toBeGreaterThan(0);
      for (const source of article.sources) {
        expect(source.url, article.slug).toMatch(/^https:\/\//);
        expect(EVIDENCE_KINDS).toContain(source.kind);
        expect(source.year).toBeGreaterThan(2000);
      }
    }
  });

  it("geeft nergens afvaladvies", () => {
    const text = NUTRITION_ARTICLES.flatMap((article) => [article.summary, ...article.points]).join(" ");
    expect(text).not.toMatch(/calorietekort|om af te vallen|minder eten om/i);
  });
});
