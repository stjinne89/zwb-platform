import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PROTOCOLS,
  calendarMarkers,
  formatDose,
  protocolBySlug,
  protocolsByGroup,
  protocolsForAi,
  runDates,
  runEndDate,
  startBlocker,
  tasksForDay,
  type ProtocolRun,
} from "@/lib/protocols";
import { PROTOCOL_CONSENT_VERSION, PROTOCOL_CONSENT_VERSIONS } from "@/lib/protocols/consent";

function run(slug: string, dates: { startDate?: string; raceDate?: string }): ProtocolRun {
  const protocol = protocolBySlug(slug)!;
  const resolved = runDates(protocol, dates)!;
  return { id: `run-${slug}`, protocolSlug: slug, status: "actief", ...resolved };
}

describe("protocoldefinities", () => {
  it("geeft elk protocol bronnen, fases, taken en een samenvatting", () => {
    for (const protocol of PROTOCOLS) {
      expect(protocol.sources.length, protocol.slug).toBeGreaterThan(0);
      expect(protocol.phases.length, protocol.slug).toBeGreaterThan(0);
      expect(protocol.limits.length, protocol.slug).toBeGreaterThan(0);
      expect(protocol.summary.length, protocol.slug).toBeGreaterThan(20);
      for (const phase of protocol.phases) {
        expect(phase.tasks.length, `${protocol.slug}/${phase.key}`).toBeGreaterThan(0);
        expect(phase.toDay, `${protocol.slug}/${phase.key}`).toBeGreaterThanOrEqual(phase.fromDay);
      }
    }
  });

  it("heeft unieke slugs die de database accepteert", () => {
    const slugs = PROTOCOLS.map((protocol) => protocol.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]{2,60}$/);
    for (const protocol of PROTOCOLS) {
      for (const phase of protocol.phases) {
        for (const task of phase.tasks) expect(task.key).toMatch(/^[a-z0-9-]{1,60}$/);
      }
    }
  });

  it("laat darmtraining 150 verdergaan waar darmtraining ophoudt, met beperkt bewijs", () => {
    const base = protocolBySlug("darmtraining")!;
    const next = protocolBySlug("darmtraining-150")!;
    expect(base.phases.at(-1)!.tasks[0].label).toBe("Rit met 110-120 g per uur");
    expect(next.phases.map((phase) => phase.tasks[0].label)).toEqual([
      "Rit met 130 g per uur",
      "Rit met 140 g per uur",
      "Rit met 150 g per uur",
    ]);
    expect(next.evidence).toBe("beperkt");
    expect(base.evidence).toBe("matig");
  });

  it("laat fases niet overlappen", () => {
    for (const protocol of PROTOCOLS) {
      const sorted = [...protocol.phases].sort((a, b) => a.fromDay - b.fromDay);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].fromDay, protocol.slug).toBeGreaterThan(sorted[i - 1].toDay);
      }
    }
  });

  it("laat een wedstrijdprotocol de wedstrijddag bevatten en kort erna stoppen", () => {
    for (const protocol of PROTOCOLS.filter((item) => item.anchor === "wedstrijd")) {
      expect(Math.min(...protocol.phases.map((phase) => phase.fromDay)), protocol.slug).toBeLessThanOrEqual(0);
      const end = Math.max(...protocol.phases.map((phase) => phase.toDay));
      expect(end, protocol.slug).toBeGreaterThanOrEqual(0);
      expect(end, protocol.slug).toBeLessThanOrEqual(3);
    }
  });

  it("verwijst elke bron naar een https-adres met jaartal", () => {
    for (const protocol of PROTOCOLS) {
      for (const source of protocol.sources) {
        expect(source.url, protocol.slug).toMatch(/^https:\/\//);
        expect(source.year).toBeGreaterThan(2000);
        expect(source.year).toBeLessThanOrEqual(2026);
      }
    }
  });

  it("geeft alleen trainingsprotocollen een aanwijzing voor de AI", () => {
    for (const protocol of PROTOCOLS.filter((item) => item.aiHint)) {
      expect(protocol.pillar, protocol.slug).toBe("trainen");
    }
  });

  it("geeft elk supplement een leeftijdsgrens en een plafond", () => {
    for (const slug of [
      "cafeine",
      "bicarbonaat",
      "nitraat",
      "glycerol",
      "beta-alanine",
      "creatine",
      "kersensap",
      "collageen",
    ]) {
      expect(protocolBySlug(slug)?.minAge, slug).toBe(18);
    }
    // Gewoon eten na de finish en de dosis van de Gezondheidsraad: geen grens.
    for (const slug of ["herstel-na-wedstrijd", "vitamine-d"]) {
      expect(protocolBySlug(slug)?.minAge, slug).toBeUndefined();
    }
    for (const protocol of PROTOCOLS) {
      for (const phase of protocol.phases) {
        for (const task of phase.tasks) {
          if (!task.dose) continue;
          expect(task.dose.max, `${protocol.slug}/${task.key}`).toBeGreaterThan(0);
          expect(task.dose.perKg.max).toBeGreaterThanOrEqual(task.dose.perKg.min);
        }
      }
    }
  });

  it("deelt de pijlers in groepen in", () => {
    expect(protocolsByGroup("trainen").map((entry) => entry.group)).toEqual([
      "Hitte",
      "Intensiteit",
      "Naast de fiets",
      "Testen",
      "Kracht",
      "Blokweek",
    ]);
    expect(protocolsByGroup("voeden").map((entry) => entry.group)).toEqual([
      "Op de wedstrijddag",
      "Opbouw",
      "Herstel",
      "Gezondheid",
    ]);
  });

  it("houdt de toestemmingsversies gelijk aan de migratie", () => {
    // 0238 vervangt de check-constraint uit 0237; de nieuwste tekst staat erin
    // naast de oude, want lopende runs houden hun versie.
    const sql = readFileSync("supabase/migrations/0238_member_protocol_core_sessions.sql", "utf8");
    const list = PROTOCOL_CONSENT_VERSIONS.map((version) => `'${version}'`).join(", ");
    expect(sql).toContain(`consent_version in (${list})`);
    expect(PROTOCOL_CONSENT_VERSIONS.at(-1)).toBe(PROTOCOL_CONSENT_VERSION);
  });
});

describe("dosis", () => {
  const caffeine = protocolBySlug("cafeine")!.phases[1].tasks[0].dose!;
  const bicarb = protocolBySlug("bicarbonaat")!.phases[1].tasks[0].dose!;

  it("rekent om met het gewicht", () => {
    expect(formatDose(caffeine, 60)).toBe("180–360 mg");
    expect(formatDose(bicarb, 70)).toBe("14–21 g");
  });

  it("blijft onder het plafond", () => {
    expect(formatDose(caffeine, 90)).toBe("270–400 mg");
    expect(formatDose(bicarb, 120)).toBe("24–30 g");
  });

  it("rekent ook milliliters om, met een plafond", () => {
    const water = protocolBySlug("glycerol")!.phases[1].tasks[1].dose!;
    expect(formatDose(water, 70)).toBe("1.800 ml");
    expect(formatDose(water, 100)).toBe("2.500 ml");
    expect(formatDose(water, null)).toBe("26 ml per kg");
  });

  it("toont per kg zonder gewicht", () => {
    expect(formatDose(caffeine, null)).toBe("3–6 mg per kg");
    expect(formatDose(protocolBySlug("ijsslush")!.phases[1].tasks[0].dose!, null)).toBe("7,5 g per kg");
  });
});

describe("dagplanning", () => {
  it("rekent een wedstrijdprotocol terug vanaf de wedstrijd", () => {
    const heat = run("hitte-kort", { raceDate: "2027-06-20" });
    expect(heat.startDate).toBe("2027-06-06");
    expect(runEndDate(protocolBySlug("hitte-kort")!, heat)).toBe("2027-06-20");
  });

  it("geeft de taak van de fase en de dosis van de wedstrijddag", () => {
    const protocol = protocolBySlug("bicarbonaat")!;
    const bicarb = run("bicarbonaat", { raceDate: "2027-06-20" });
    expect(tasksForDay(protocol, bicarb, "2027-06-19", 70, [])).toBeNull();
    const raceDay = tasksForDay(protocol, bicarb, "2027-06-20", 70, [])!;
    expect(raceDay.day).toBe(0);
    expect(raceDay.tasks.map((task) => [task.key, task.amount])).toEqual([["dosis", "14–21 g"]]);
  });

  it("loopt bij kersensap van vier dagen voor tot twee dagen na de wedstrijd", () => {
    const protocol = protocolBySlug("kersensap")!;
    const cherry = run("kersensap", { raceDate: "2027-06-20" });
    expect(cherry.startDate).toBe("2027-06-16");
    expect(runEndDate(protocol, cherry)).toBe("2027-06-22");
    expect(tasksForDay(protocol, cherry, "2027-06-15", 70, [])).toBeNull();
    expect(tasksForDay(protocol, cherry, "2027-06-22", 70, [])!.day).toBe(2);
    expect(tasksForDay(protocol, cherry, "2027-06-23", 70, [])).toBeNull();
    expect(calendarMarkers([cherry], "2027-06-01", "2027-06-30").map((marker) => marker.date)).toEqual([
      "2027-06-16",
      "2027-06-17",
      "2027-06-18",
      "2027-06-19",
      "2027-06-20",
      "2027-06-21",
      "2027-06-22",
    ]);
  });

  it("geeft na de wedstrijd eiwit en koolhydraten naar gewicht", () => {
    const protocol = protocolBySlug("herstel-na-wedstrijd")!;
    const recovery = run("herstel-na-wedstrijd", { raceDate: "2027-06-20" });
    const day = tasksForDay(protocol, recovery, "2027-06-20", 70, [])!;
    expect(day.tasks.map((task) => [task.key, task.amount])).toEqual([
      ["eiwit", "20 g"],
      ["koolhydraten", "70–80 g"],
      ["drinken", null],
      ["eiwit-nacht", null],
    ]);
    expect(formatDose(day.tasks[0].dose!, 150)).toBe("40 g");
  });

  it("laat een eenmalige taak verdwijnen na het afvinken op een andere dag", () => {
    const protocol = protocolBySlug("cafeine")!;
    const caffeine = run("cafeine", { raceDate: "2027-06-20" });
    const checks = [{ protocolId: caffeine.id, day: "2027-06-10", taskKey: "proef" }];
    expect(tasksForDay(protocol, caffeine, "2027-06-10", 70, checks)!.tasks[0].done).toBe(true);
    expect(tasksForDay(protocol, caffeine, "2027-06-12", 70, checks)!.tasks).toEqual([]);
  });

  it("telt een taak per week en verbergt hem als het aantal is gehaald", () => {
    const protocol = protocolBySlug("hitte-lang")!;
    const heat = run("hitte-lang", { startDate: "2027-05-03" });
    const checks = ["2027-05-03", "2027-05-04", "2027-05-05", "2027-05-06", "2027-05-07"].map((day) => ({
      protocolId: heat.id,
      day,
      taskKey: "hittesessie",
    }));
    expect(tasksForDay(protocol, heat, "2027-05-07", null, checks)!.tasks[0].weekCount).toBe(5);
    expect(tasksForDay(protocol, heat, "2027-05-08", null, checks)!.tasks).toEqual([]);
    // Nieuwe protocolweek: weer vijf.
    const nextWeek = tasksForDay(protocol, heat, "2027-05-10", null, checks)!;
    expect(nextWeek.tasks[0].weekCount).toBe(0);
    // Onderhoud: drie per week.
    expect(tasksForDay(protocol, heat, "2027-06-07", null, checks)!.phase.key).toBe("onderhoud");
  });

  it("negeert het afvinken van een ander protocol", () => {
    const protocol = protocolBySlug("hitte-lang")!;
    const heat = run("hitte-lang", { startDate: "2027-05-03" });
    const other = [{ protocolId: "ander", day: "2027-05-03", taskKey: "hittesessie" }];
    expect(tasksForDay(protocol, heat, "2027-05-03", null, other)!.tasks[0].done).toBe(false);
  });

  it("weigert een supplement onder de 18 en laat de rest door", () => {
    expect(startBlocker(protocolBySlug("creatine")!, 17)).toBe("Vanaf 18 jaar.");
    expect(startBlocker(protocolBySlug("creatine")!, 18)).toBeNull();
    expect(startBlocker(protocolBySlug("creatine")!, null)).toBeNull();
    expect(startBlocker(protocolBySlug("darmtraining")!, 16)).toBeNull();
  });
});

describe("agenda en AI", () => {
  it("markeert alleen dagen met een vaste taak", () => {
    const caffeine = run("cafeine", { raceDate: "2027-06-20" });
    const markers = calendarMarkers([caffeine], "2027-06-01", "2027-06-30");
    expect(markers).toEqual([{ date: "2027-06-20", label: "Cafeïne", slug: "cafeine" }]);
  });

  it("markeert geen routines en geen gestopte runs", () => {
    const creatine = run("creatine", { startDate: "2027-06-01" });
    const stopped = { ...run("hitte-kort", { raceDate: "2027-06-20" }), status: "gestopt" as const };
    expect(calendarMarkers([creatine, stopped], "2027-06-01", "2027-06-30")).toEqual([]);
  });

  it("geeft de AI alleen lopende trainingsprotocollen in het venster", () => {
    const cadence = run("lage-cadans-vo2max", { startDate: "2027-03-01" });
    const caffeine = run("cafeine", { raceDate: "2027-03-20" });
    const ai = protocolsForAi([cadence, caffeine], { from: "2027-03-15", to: "2027-04-15" });
    expect(ai.map((entry) => entry.slug)).toEqual(["lage-cadans-vo2max"]);
    expect(ai[0].to).toBe("2027-04-25");
    expect(protocolsForAi([cadence], { from: "2027-05-01", to: "2027-06-01" })).toEqual([]);
  });
});
