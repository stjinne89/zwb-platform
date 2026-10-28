import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  DEFAULT_DESIGN,
  GRAVURE_MAX,
  METALEN,
  OREN,
  SILHOUETTEN,
  SOKKEL_HEIGHT,
  VOETEN,
  VORMEN,
  bodyProfile,
  describeDesign,
  gravureLines,
  handleCurves,
  handlesPath,
  parseDesign,
  readDesign,
  silhouettePath,
  spins,
  trophyBounds,
  type BekerDesign,
} from "@/lib/zwbekers/design";
import {
  NominationError,
  canEdit,
  cleanResultUrl,
  isPhotoPathFor,
  namesLabel,
  parseNomination,
  photoPath,
  zrlRoundLabel,
  zrlRoundOf,
} from "@/lib/zwbekers/nomination";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const TEAM = "44444444-4444-4444-8444-444444444444";
const TODAY = "2026-10-28";

/** Elk ontwerp dat de keuzelijsten toelaten. */
function allDesigns(): BekerDesign[] {
  const designs: BekerDesign[] = [];
  for (const vorm of VORMEN)
    for (const silhouet of SILHOUETTEN)
      for (const voet of VOETEN)
        for (const oren of OREN)
          for (const metaal of METALEN) designs.push({ ...DEFAULT_DESIGN, vorm, silhouet, voet, oren, metaal });
  return designs;
}

describe("ZWBekers: ontwerp", () => {
  it("neemt alleen bekende keuzes aan", () => {
    expect(parseDesign({ ...DEFAULT_DESIGN, gravure: "  Koning  van   de Muur " }).gravure).toBe("Koning van de Muur");
    expect(() => parseDesign({ ...DEFAULT_DESIGN, vorm: "kelk" })).toThrow(ZodError);
    expect(() => parseDesign({ ...DEFAULT_DESIGN, metaal: "platina" })).toThrow(ZodError);
    expect(() => parseDesign({ ...DEFAULT_DESIGN, gravure: "x".repeat(GRAVURE_MAX + 1) })).toThrow(ZodError);
    expect(() => parseDesign({ ...DEFAULT_DESIGN, gravure: "<script>" })).toThrow(ZodError);
    expect(parseDesign({ ...DEFAULT_DESIGN, gravure: "Één & 2e - top!" }).gravure).toBe("Één & 2e - top!");
  });

  it("maakt van een oud of kapot ontwerp toch een beker", () => {
    expect(readDesign(null)).toEqual(DEFAULT_DESIGN);
    expect(readDesign({ vorm: "medaille", metaal: "platina", gravure: 7 })).toEqual({ ...DEFAULT_DESIGN, vorm: "medaille" });
    expect(readDesign({ gravure: "<b>hoi</b>" }).gravure).toBe("");
    expect(readDesign({ gravure: "y".repeat(40) }).gravure).toHaveLength(GRAVURE_MAX);
  });

  it("geeft elke vorm een gesloten, staand profiel", () => {
    for (const design of allDesigns()) {
      const profile = bodyProfile(design);
      if (design.vorm === "medaille" || design.vorm === "een") {
        expect(profile).toBeNull();
        continue;
      }
      expect(profile).not.toBeNull();
      const { outline, lathe, rim } = profile!;
      // Van de grond omhoog: geen punt onder de vorige, en nergens een negatieve straal.
      for (let i = 1; i < outline.length; i++) expect(outline[i][1]).toBeGreaterThanOrEqual(outline[i - 1][1]);
      for (const [x, y] of lathe) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
      }
      // De binnenkant eindigt op de as, zodat de kom een bodem heeft.
      expect(lathe[lathe.length - 1][0]).toBe(0);
      expect(rim[0]).toBeGreaterThan(0.2);
    }
  });

  it("maakt een hoge voet echt hoger, en een bokaal hoger dan een beker", () => {
    const low = trophyBounds({ ...DEFAULT_DESIGN, voet: "laag" }).height;
    const high = trophyBounds({ ...DEFAULT_DESIGN, voet: "hoog" }).height;
    expect(high).toBeGreaterThan(low + 0.2);
    expect(trophyBounds({ ...DEFAULT_DESIGN, vorm: "bokaal" }).height).toBeGreaterThan(low);
    // Een schaal is breder dan een beker en lager.
    const schaal = trophyBounds({ ...DEFAULT_DESIGN, vorm: "schaal", oren: "geen" });
    expect(schaal.radius).toBeGreaterThan(trophyBounds({ ...DEFAULT_DESIGN, oren: "geen" }).radius);
    expect(schaal.height).toBeLessThan(low);
    for (const design of allDesigns()) expect(trophyBounds(design).height).toBeGreaterThan(SOKKEL_HEIGHT);
  });

  it("zet oren alleen aan een beker of bokaal", () => {
    expect(handleCurves({ ...DEFAULT_DESIGN, oren: "rond" })).toHaveLength(1);
    expect(handleCurves({ ...DEFAULT_DESIGN, oren: "geen" })).toHaveLength(0);
    expect(handleCurves({ ...DEFAULT_DESIGN, vorm: "schaal", oren: "rond" })).toHaveLength(0);
    expect(handleCurves({ ...DEFAULT_DESIGN, vorm: "medaille", oren: "vleugel" })).toHaveLength(0);
    // Vleugels steken boven de rand uit, ronde oren niet.
    const rim = bodyProfile(DEFAULT_DESIGN)!.rim[1];
    const top = (oren: "rond" | "vleugel") => Math.max(...handleCurves({ ...DEFAULT_DESIGN, oren }).flat().map((point) => point[1]));
    expect(top("vleugel")).toBeGreaterThan(rim);
    expect(top("rond")).toBeLessThan(rim + 0.05);
  });

  it("tekent een geldig SVG-pad zonder NaN", () => {
    for (const design of allDesigns()) {
      const path = silhouettePath(design) + handlesPath(design);
      expect(path).not.toMatch(/NaN|undefined|Infinity/);
      if (design.vorm !== "medaille") expect(path.startsWith("M ")).toBe(true);
    }
    // Een bokaal heeft een tweede vorm: de deksel.
    expect(silhouettePath({ ...DEFAULT_DESIGN, vorm: "bokaal" }).match(/M /g)).toHaveLength(2);
  });

  it("beschrijft het ontwerp in een zin", () => {
    expect(describeDesign({ ...DEFAULT_DESIGN, vorm: "bokaal", oren: "vleugel", sokkel: "marmer" })).toBe(
      "Gouden bokaal met vleugels, klassiek, op een marmeren sokkel",
    );
    expect(describeDesign({ ...DEFAULT_DESIGN, vorm: "schaal", metaal: "zilver", oren: "rond" })).toBe(
      "Zilveren schaal, klassiek, op een zwarte sokkel",
    );
    expect(describeDesign({ ...DEFAULT_DESIGN, vorm: "medaille", metaal: "brons", lint: "oranje" })).toBe(
      "Bronzen medaille aan een oranje lint, op een zwarte sokkel",
    );
  });
});

describe("ZWBekers: de 1", () => {
  const een: BekerDesign = { ...DEFAULT_DESIGN, vorm: "een", gravure: "ZWB", regio: "Wereld", periode: "Oktober 2026" };

  it("graveert regio en periode in plaats van de vrije regel", () => {
    expect(gravureLines(een)).toEqual(["Wereld", "Oktober 2026"]);
    expect(gravureLines({ ...een, regio: "" })).toEqual(["Oktober 2026"]);
    expect(gravureLines({ ...een, vorm: "beker" })).toEqual(["ZWB"]);
    expect(gravureLines(DEFAULT_DESIGN)).toEqual([]);
  });

  it("staat stil met de voorkant naar voren, en heeft een eigen omtrek", () => {
    expect(spins("een")).toBe(false);
    expect(spins("medaille")).toBe(false);
    expect(spins("bokaal")).toBe(true);
    expect(bodyProfile(een)).toBeNull();
    expect(handleCurves({ ...een, oren: "vleugel" })).toEqual([]);
    expect(silhouettePath(een)).toMatch(/^M .* Z$/);
    expect(trophyBounds(een).height).toBeGreaterThan(SOKKEL_HEIGHT + 1);
    expect(describeDesign(een)).toBe("Gouden nummer 1 op een zwarte sokkel");
  });

  it("leest regio en periode, ook uit een ontwerp van daarvoor", () => {
    const older: Partial<BekerDesign> = { ...DEFAULT_DESIGN };
    delete older.regio;
    delete older.periode;
    expect(parseDesign(older)).toEqual(DEFAULT_DESIGN);
    expect(readDesign(older)).toEqual(DEFAULT_DESIGN);
    expect(parseDesign({ ...een, regio: "  UTC+1  " }).regio).toBe("UTC+1");
    expect(() => parseDesign({ ...een, periode: "x".repeat(GRAVURE_MAX + 1) })).toThrow(ZodError);
    expect(readDesign({ ...een, regio: "<b>" }).regio).toBe("");
  });
});

describe("ZWBekers: ZRL-ronde", () => {
  it("haalt de ronde uit de titel van een raceweek", () => {
    expect(zrlRoundOf("ZRL 2026/27 · R1 · W1 — Race of Truth")).toBe("2026/27 R1");
    expect(zrlRoundOf("ZRL 2026/27 · R3 · W4 · ZRL B1")).toBe("2026/27 R3");
    expect(zrlRoundOf("Zwift ritje")).toBeNull();
    expect(zrlRoundLabel("2026/27 R2")).toBe("ZRL 2026/27 · ronde 2");
  });
});

describe("ZWBekers: voordracht", () => {
  const base = {
    kind: "individueel",
    title: "  Koning van\nde Muur ",
    story: "Drie keer op rij als eerste boven op de Muur van Geraardsbergen.",
    achievedOn: "2026-10-12",
    winners: [A],
    teamId: null,
    eventId: null,
    resultUrl: "",
    design: DEFAULT_DESIGN,
  };

  it("leest een individuele voordracht", () => {
    const nomination = parseNomination(base, TODAY);
    expect(nomination.title).toBe("Koning van de Muur");
    expect(nomination.winners).toEqual([A]);
    expect(nomination.resultUrl).toBeNull();
    expect(nomination.design).toEqual(DEFAULT_DESIGN);
  });

  it("vraagt bij een team om het team en minstens twee renners", () => {
    expect(() => parseNomination({ ...base, kind: "team", winners: [A, B] }, TODAY)).toThrow("Kies het team.");
    expect(() => parseNomination({ ...base, kind: "team", teamId: TEAM, winners: [A, A] }, TODAY)).toThrow(
      "minstens twee",
    );
    const team = parseNomination({ ...base, kind: "team", teamId: TEAM, winners: [A, B, C, B] }, TODAY);
    expect(team.winners).toEqual([A, B, C]);
    expect(team.teamId).toBe(TEAM);
  });

  it("houdt een individuele beker los van teams en bij één winnaar", () => {
    expect(() => parseNomination({ ...base, winners: [A, B] }, TODAY)).toThrow(NominationError);
    expect(() => parseNomination({ ...base, winners: [] }, TODAY)).toThrow(NominationError);
    expect(() => parseNomination({ ...base, teamId: TEAM }, TODAY)).toThrow(NominationError);
  });

  it("weigert een datum in de toekomst of te ver terug", () => {
    expect(() => parseNomination({ ...base, achievedOn: "2026-10-29" }, TODAY)).toThrow("nog geleverd");
    expect(() => parseNomination({ ...base, achievedOn: "1999-12-31" }, TODAY)).toThrow(NominationError);
    expect(() => parseNomination({ ...base, achievedOn: "12-10-2026" }, TODAY)).toThrow(NominationError);
    expect(parseNomination({ ...base, achievedOn: TODAY }, TODAY).achievedOn).toBe(TODAY);
  });

  it("vraagt een titel en een verhaal van redelijke lengte", () => {
    expect(() => parseNomination({ ...base, title: " a " }, TODAY)).toThrow("titel");
    expect(() => parseNomination({ ...base, title: "x".repeat(61) }, TODAY)).toThrow("60");
    expect(() => parseNomination({ ...base, story: "Mooi!" }, TODAY)).toThrow(NominationError);
    expect(parseNomination({ ...base, story: "Eerste alinea.\n\n\n\nTweede   alinea." }, TODAY).story).toBe(
      "Eerste alinea.\n\nTweede alinea.",
    );
  });

  it("neemt alleen een nette https-link naar de uitslag", () => {
    expect(cleanResultUrl(" https://www.wtrl.racing/zrl/results ")).toBe("https://www.wtrl.racing/zrl/results");
    expect(() => cleanResultUrl("http://zwiftpower.com/events.php?zid=1")).toThrow("https://");
    expect(() => cleanResultUrl("javascript:alert(1)")).toThrow(NominationError);
    expect(() => cleanResultUrl("https://user:pw@example.com")).toThrow(NominationError);
    expect(() => cleanResultUrl("geen link")).toThrow(NominationError);
    expect(cleanResultUrl("   ")).toBeNull();
  });

  it("laat alleen de voordrager een niet-toegekende beker aanpassen", () => {
    expect(canEdit({ status: "voorgedragen", profileId: A }, A)).toBe(true);
    expect(canEdit({ status: "afgewezen", profileId: A }, A)).toBe(true);
    expect(canEdit({ status: "toegekend", profileId: A }, A)).toBe(false);
    expect(canEdit({ status: "voorgedragen", profileId: A }, B)).toBe(false);
    expect(canEdit({ status: "voorgedragen", profileId: null }, A)).toBe(false);
  });

  it("hangt aan een event of aan een hele ZRL-ronde", () => {
    expect(parseNomination({ ...base, zrlRound: "2026/27 R1" }, TODAY).zrlRound).toBe("2026/27 R1");
    expect(parseNomination(base, TODAY).zrlRound).toBeNull();
    expect(() => parseNomination({ ...base, zrlRound: "R1" }, TODAY)).toThrow(NominationError);
    expect(() => parseNomination({ ...base, zrlRound: "2026/27 R5" }, TODAY)).toThrow(NominationError);
    expect(() => parseNomination({ ...base, zrlRound: "2026/27 R1", eventId: TEAM }, TODAY)).toThrow("niet allebei");
  });

  it("controleert het pad van een foto", () => {
    const path = photoPath(TEAM, A, 1761638400000);
    expect(isPhotoPathFor(path, TEAM, A)).toBe(true);
    expect(isPhotoPathFor(path, TEAM, B)).toBe(false);
    expect(isPhotoPathFor(`${TEAM}/${A}/../x.jpg`, TEAM, A)).toBe(false);
    expect(isPhotoPathFor(`${TEAM}/${A}/1761638400000.jpg/extra`, TEAM, A)).toBe(false);
  });

  it("noemt namen zoals je ze zegt", () => {
    expect(namesLabel([])).toBe("");
    expect(namesLabel(["Anna"])).toBe("Anna");
    expect(namesLabel(["Anna", "Bram", "Cees"])).toBe("Anna, Bram en Cees");
    expect(namesLabel(["Anna", "Bram", "Cees"], 3)).toBe("Anna, Bram en Cees");
    expect(namesLabel(["Anna", "Bram", "Cees", "Dirk"], 3)).toBe("Anna, Bram, Cees en 1 ander");
    expect(namesLabel(["A", "B", "C", "D", "E", "F"], 4)).toBe("A, B, C, D en 2 anderen");
  });
});
