import { describe, expect, it } from "vitest";
import { isoWeekNumber, reviewPeriod } from "@/lib/weekly-review/period";
import {
  buildForm,
  buildFuel,
  buildNextWeek,
  buildPlan,
  buildPower,
  buildRides,
  eventMinutes,
  hasContent,
  keepRiddenTeams,
  mergeEvents,
  type NextEvent,
  type WeekSummary,
} from "@/lib/weekly-review/summary";
import { coachInput, emphasisParts, fallbackCoachText, finishCoachText, spokenEvent } from "@/lib/weekly-review/coach-text";
import { cleanAiText } from "@/lib/ai-writing";
import type { PersonalRide } from "@/lib/stats/personal";

const ride = (day: string, km: number, minutes: number, name = "Rit"): PersonalRide => ({
  id: Math.round(km * 100),
  name,
  sportType: "Ride",
  day,
  distanceKm: km,
  movingSeconds: minutes * 60,
  elevationM: 100,
  averageWatts: null,
  normalizedWatts: null,
  maxWatts: null,
  kilojoules: null,
  averageHr: null,
  maxHr: null,
  hasPowerMeter: false,
  tss: null,
  intensityFactor: null,
});

describe("reviewPeriod", () => {
  it("telt de lopende week vanaf zondag 18:00 als afgesloten", () => {
    // Zondag 18 oktober 2026, 19:00 in Nederland (17:00 UTC, zomertijd).
    const period = reviewPeriod(new Date("2026-10-18T17:00:00Z"));
    expect(period.weekStart).toBe("2026-10-12");
    expect(period.weekEnd).toBe("2026-10-18");
    expect(period.nextWeekStart).toBe("2026-10-19");
    expect(period.inPopupWindow).toBe(true);
  });

  it("kijkt zondagmiddag nog naar de vorige week, zonder pop-up", () => {
    const period = reviewPeriod(new Date("2026-10-18T12:00:00Z"));
    expect(period.weekStart).toBe("2026-10-05");
    expect(period.inPopupWindow).toBe(false);
  });

  it("houdt de pop-up open tot en met woensdag", () => {
    expect(reviewPeriod(new Date("2026-10-21T20:00:00Z")).inPopupWindow).toBe(true);
    const thursday = reviewPeriod(new Date("2026-10-22T08:00:00Z"));
    expect(thursday.inPopupWindow).toBe(false);
    expect(thursday.weekStart).toBe("2026-10-12");
  });

  it("geeft het ISO-weeknummer", () => {
    expect(isoWeekNumber("2026-10-12")).toBe(42);
    expect(isoWeekNumber("2027-01-01")).toBe(53);
  });
});

describe("buildRides", () => {
  it("telt alleen de ritten van de week en kiest de langste", () => {
    const section = buildRides(
      [ride("2026-10-11", 50, 100), ride("2026-10-13", 38, 75), ride("2026-10-17", 92, 200, "Heuvelrug")],
      "2026-10-12",
    );
    expect(section?.count).toBe(2);
    expect(section?.km).toBe(130);
    expect(section?.longest).toEqual({ day: "2026-10-17", km: 92, name: "Heuvelrug" });
    expect(section?.perDay.map((day) => day.km)).toEqual([0, 38, 0, 0, 0, 92, 0]);
  });

  it("is leeg zonder ritten", () => {
    expect(buildRides([], "2026-10-12")).toBeNull();
  });
});

describe("buildPlan", () => {
  it("scheidt gedaan, gemist en overgeslagen", () => {
    const section = buildPlan(
      [
        { day: "2026-10-13", title: "Sweet spot", durationMinutes: 75, status: "completed" },
        { day: "2026-10-14", title: "Duur", durationMinutes: 60, status: "planned" },
        { day: "2026-10-16", title: "Core", durationMinutes: 20, status: "skipped" },
        { day: "2026-10-18", title: "Rust", durationMinutes: 30, status: "planned", intensity: "rest" },
      ],
      "2026-10-12",
      "2026-10-18",
    );
    expect(section?.planned).toBe(2);
    expect(section?.done).toBe(1);
    expect(section?.perDay[2].status).toBe("gemist");
    expect(section?.perDay[4].status).toBe("overgeslagen");
    expect(section?.perDay[6].status).toBeNull();
  });
});

describe("buildForm", () => {
  it("neemt de laatste waarde per week", () => {
    const points = Array.from({ length: 50 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 8, 1 + index, 12)).toISOString().slice(0, 10);
      return { date, ctl: 40 + index * 0.5, atl: 45 + index * 0.5 };
    });
    const section = buildForm(points, "2026-10-18", "intervals");
    // 18 oktober is dag 47 vanaf 1 september, 11 oktober dag 40.
    expect(section?.ctlEnd).toBe(63.5);
    expect(section?.ctlStart).toBe(60);
    expect(section?.tsbEnd).toBe(-5);
    expect(section?.weeks).toHaveLength(6);
  });

  it("is leeg als de laatste meting ouder is dan de week", () => {
    expect(buildForm([{ date: "2026-09-01", ctl: 50, atl: 50 }], "2026-10-18", "zwb")).toBeNull();
  });
});

describe("buildPower", () => {
  const curve = (watts: number[]) =>
    [5, 60, 300, 1200, 3600].map((seconds, index) => ({ seconds, watts: watts[index], wattsPerKg: null }));

  it("meldt de langste duur die het jaarrecord verbetert", () => {
    const section = buildPower(curve([900, 450, 312, 270, 230]), curve([980, 470, 300, 262, 238]), 72);
    expect(section?.record).toEqual({ seconds: 1200, label: "20m", watts: 270, wattsPerKg: 3.8 });
  });

  it("noemt geen record zonder geschiedenis", () => {
    const section = buildPower(curve([900, 450, 312, 270, 230]), [], 72);
    expect(section?.record).toBeNull();
    expect(section?.focus).toEqual({ seconds: 1200, label: "20m", watts: 270, percentOfBest: null });
  });

  it("toont zonder record de duur die het dichtst bij het jaarbeste kwam", () => {
    // De week van Jeroen, 12–18 oktober: de 20 minuten kwamen het dichtst bij.
    const section = buildPower(curve([751, 467, 346, 310, 237]), curve([1250, 565, 396, 352, 316]), 80);
    expect(section?.record).toBeNull();
    expect(section?.focus).toEqual({ seconds: 1200, label: "20m", watts: 310, percentOfBest: 88 });
  });
});

describe("keepRiddenTeams", () => {
  const results = [
    { teamId: "zrl-c", day: "2026-10-13" },
    { teamId: "bdev", day: "2026-10-13" },
    { teamId: "zrl-c", day: "2026-10-20" },
  ];

  it("houdt bij twee teams alleen het team waarin het lid reed", () => {
    expect(keepRiddenTeams(results, [{ teamId: "bdev", day: "2026-10-13" }])).toEqual([
      { teamId: "bdev", day: "2026-10-13" },
      { teamId: "zrl-c", day: "2026-10-20" },
    ]);
  });

  it("laat alle teams staan als niet bekend is waarin het lid reed", () => {
    expect(keepRiddenTeams(results, [])).toEqual(results);
  });
});

describe("buildFuel", () => {
  it("laat de dagen weg als er niets gelogd is, maar telt core wel", () => {
    const section = buildFuel([], [{ day: "2026-10-16", minutes: 20 }], "2026-10-12");
    expect(section).toEqual({ loggedDays: null, mobilitySessions: 1, mobilityMinutes: 20 });
  });

  it("is leeg zonder voeding en core", () => {
    expect(buildFuel(null, [], "2026-10-12")).toBeNull();
  });
});

describe("vooruitblik", () => {
  const event = (status: NextEvent["status"]): NextEvent => ({
    id: "e1",
    day: "2026-10-22",
    time: "19:30",
    title: "ZRL ronde 4",
    status,
    durationMinutes: 60,
  });

  it("houdt per event de sterkste status", () => {
    expect(mergeEvents([event("beschikbaar"), event("opgesteld"), event("misschien")])).toEqual([event("opgesteld")]);
  });

  it("zet minuten, trainingen en events per dag", () => {
    const next = buildNextWeek(
      "2026-10-19",
      (day) => (day === "2026-10-22" ? 60 : 0),
      [{ day: "2026-10-20", title: "VO2max", durationMinutes: 60, status: "planned" }],
      [event("aangemeld")],
      "week",
    );
    expect(next.days[1].plan).toBe("VO2max");
    expect(next.days[3]).toMatchObject({ minutes: 60, events: [event("aangemeld")] });
  });

  it("schat de duur van een event", () => {
    expect(eventMinutes("2026-10-22T17:30:00Z", "2026-10-22T18:30:00Z", null)).toBe(60);
    expect(eventMinutes("2026-10-24T07:00:00Z", null, 95)).toBe(210);
    expect(eventMinutes("2026-10-24T07:00:00Z", null, null)).toBe(60);
  });
});

describe("coachtekst", () => {
  const summary: WeekSummary = {
    version: 1,
    weekStart: "2026-10-12",
    weekEnd: "2026-10-18",
    firstName: "Sanne",
    rides: buildRides([ride("2026-10-13", 38, 75)], "2026-10-12"),
    plan: { planned: 2, done: 1, perDay: [{ day: "2026-10-14", plannedMinutes: 60, doneMinutes: 0, status: "gemist", title: "Duur" }] },
    form: null,
    power: null,
    teams: null,
    fuel: null,
    club: null,
  };

  it("stuurt geen naam mee naar de AI", () => {
    expect(coachInput(summary, null)).not.toContain("Sanne");
  });

  it("maakt een tekst uit regels met één kernzin", () => {
    const text = fallbackCoachText(summary, null);
    expect(text).toContain("**1 rit, 38 km.**");
    expect(text).toContain("Je deed 1 van de 2 trainingen uit je schema. Eén bleef liggen.");
    expect(emphasisParts(text).filter((part) => part.strong)).toHaveLength(1);
  });

  it("geeft de vorm in woorden en events zoals een renner ze zegt", () => {
    const input = coachInput(
      {
        ...summary,
        form: { source: "intervals", ctlStart: 60, ctlEnd: 64, atlEnd: 111.6, tsbEnd: -47.5, weeks: [] },
        teams: { results: [{ team: "Bdev", event: "ZRL 2026/27 · R1 · W4 · Bdev", day: "2026-10-13", rank: 1, teams: 8, riderPosition: null, riderCategory: null }], src: [] },
      },
      null,
    );
    expect(input).not.toMatch(/tsb|atl|ctl|-47/i);
    expect(input).toContain("erg moe");
    expect(input).toContain("fitter geworden");
    expect(input).toContain('"event": "ZRL-race"');
    expect(spokenEvent("ZRL 2026/27 · R1 · W5")).toBe("ZRL-race");
    expect(spokenEvent("Clubrit Amerongen · B")).toBe("Clubrit Amerongen");
  });

  it("haalt de vaste AI-tekens uit de coachtekst", () => {
    // Een echte tekst van 2026-10-19, met er een streep en een tweede vet bij.
    const raw =
      "De belasting schoot omhoog; dus de frisheid was niet top. **Bdev pakt winst** — mooi! Rijd **rustig** in 3–4 dagen 💪";
    expect(finishCoachText(raw)).toBe(
      "De belasting schoot omhoog. Dus de frisheid was niet top. **Bdev pakt winst**, mooi. Rijd rustig in 3-4 dagen",
    );
    expect(cleanAiText("Klaar!!")).toBe("Klaar.");
    expect(cleanAiText("Je bent moe. Kortom, rust dinsdag.")).toBe("Je bent moe. Rust dinsdag.");
    // Zonder komma blijft het staan: zonder "Daarnaast" wordt het een vraag.
    expect(cleanAiText("Daarnaast heb je twee keer gereden.")).toBe("Daarnaast heb je twee keer gereden.");
  });

  it("vindt inhoud zodra er één onderdeel is", () => {
    expect(hasContent(summary)).toBe(true);
    expect(hasContent({ ...summary, rides: null, plan: null })).toBe(false);
  });
});

describe("durationWords", () => {
  it("schrijft duren uit zoals in een zin", async () => {
    const { durationWords } = await import("@/lib/weekly-review/summary");
    expect(durationWords(5)).toBe("5 seconden");
    expect(durationWords(60)).toBe("1 minuut");
    expect(durationWords(1200)).toBe("20 minuten");
  });
});
