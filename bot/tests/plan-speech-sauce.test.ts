import { describe, expect, it } from "vitest";
import { advicePhrase, clockPhrases, eventPhrase } from "../src/phrases.ts";
import { fetchPlan, parsePlan, planUrl } from "../src/plan.ts";
import { createRotation } from "../src/rotation.ts";
import { toSample } from "../src/sauce.ts";
import { Session } from "../src/session.ts";
import { SpeechQueue } from "../src/speech.ts";

const ORIGINS = ["https://zwb.example", "http://localhost:3000"];
const TOKEN = "aB3_-".repeat(6) + "xY";
const PLAN_JSON = {
  version: 1,
  name: "ZRL ronde 2",
  eventTitle: "ZRL TTT",
  startAt: null,
  estimatedSeconds: 2520,
  estimatedSpeedKmh: 44.1,
  riders: [
    { order: 1, name: "Stijn", zwiftId: "111", pullWatts: 320, pullSeconds: 60 },
    { order: 2, name: "Piet", zwiftId: "222", pullWatts: 310, pullSeconds: 45 },
    { order: 3, name: "Gast", zwiftId: null, pullWatts: null, pullSeconds: 0 },
  ],
};

describe("plan", () => {
  it("leest het plan van het platform", () => {
    const plan = parsePlan(PLAN_JSON);
    expect(plan.riders.map((r) => [r.name, r.zwiftId, r.pullWatts, r.pullSeconds])).toEqual([
      ["Stijn", "111", 320, 60],
      ["Piet", "222", 310, 45],
      ["Gast", null, null, 0],
    ]);
    expect(plan.estimatedSpeedKmh).toBe(44.1);
  });

  it("weigert een andere versie en een plan zonder kopbeurten", () => {
    expect(() => parsePlan({ ...PLAN_JSON, version: 2 })).toThrow(/versie/);
    expect(() =>
      parsePlan({ ...PLAN_JSON, riders: [{ name: "Stijn", pullSeconds: 0 }] }),
    ).toThrow(/kopbeurt/);
  });

  it("maakt van een token of botlink het adres op het platform", () => {
    expect(planUrl(TOKEN, ORIGINS)).toBe(`https://zwb.example/api/ttt/plan/${TOKEN}`);
    expect(planUrl(` http://localhost:3000/api/ttt/plan/${TOKEN} `, ORIGINS)).toBe(
      `http://localhost:3000/api/ttt/plan/${TOKEN}`,
    );
  });

  it("haalt geen ander adres op dan het platform", () => {
    expect(() => planUrl(`https://elders.example/api/ttt/plan/${TOKEN}`, ORIGINS)).toThrow();
    expect(() => planUrl("https://zwb.example/api/live/zrl/1/2", ORIGINS)).toThrow();
    expect(() => planUrl(`https://zwb.example/api/ttt/plan/${TOKEN}/../../x`, ORIGINS)).toThrow();
    expect(() => planUrl("zomaar tekst", ORIGINS)).toThrow();
  });

  it("meldt een ingetrokken link", async () => {
    const gone = (async () => new Response("{}", { status: 404 })) as typeof fetch;
    await expect(fetchPlan(TOKEN, ORIGINS, gone)).rejects.toThrow(/ingetrokken/);
  });
});

describe("zinnen", () => {
  const rotation = createRotation(parsePlan(PLAN_JSON).riders, 0);

  it("noemt bij een wissel renner, watt en duur", () => {
    expect(eventPhrase({ type: "change", rider: 1, previous: 0, synced: false }, rotation)).toBe(
      "Wissel. Piet, 310 watt, 45 seconden.",
    );
    expect(eventPhrase({ type: "change", rider: 0, previous: -1, synced: false }, rotation)).toBe(
      "Start. Stijn, 320 watt, 60 seconden.",
    );
    expect(eventPhrase({ type: "change", rider: 1, previous: 0, synced: true }, rotation)).toBe(
      "Piet, 310 watt.",
    );
  });

  it("zet voor elke renner met een kopbeurt de klokzinnen klaar", () => {
    const phrases = clockPhrases(rotation);
    expect(phrases).toContain("Nog 30 seconden. Daarna Piet.");
    expect(phrases).toContain("Stijn klaarmaken. Nog 10.");
    expect(phrases.some((phrase) => phrase.includes("Gast"))).toBe(false);
  });

  it("verwoordt advies van de coach", () => {
    const name = () => "Stijn";
    expect(advicePhrase({ kind: "power", zwiftId: "111", delta: 20 }, name)).toBe("Stijn, 20 watt eraf.");
    expect(advicePhrase({ kind: "power", zwiftId: "111", delta: -15 }, name)).toBe("Stijn, 15 watt erbij.");
    expect(advicePhrase({ kind: "pace", avgKmh: 43.2, planKmh: 44 }, name)).toBe(
      "Gemiddeld 43 komma 2. Het plan is 44.",
    );
    expect(advicePhrase({ kind: "leader", zwiftId: "111" }, name)).toBeNull();
  });
});

describe("spraakwachtrij", () => {
  function queue() {
    const spoken: string[] = [];
    const clock = { now: 0 };
    let release: () => void = () => undefined;
    const speech = new SpeechQueue(
      (text) =>
        new Promise<void>((resolve) => {
          spoken.push(text);
          release = resolve;
        }),
      () => clock.now,
    );
    const next = async () => {
      release();
      await new Promise((resolve) => setImmediate(resolve));
    };
    return { speech, spoken, clock, next };
  }

  it("laat een wissel voorgaan op coaching", async () => {
    const { speech, spoken, next } = queue();
    speech.say("eerste", "coach");
    speech.say("coach", "coach");
    speech.say("wissel", "clock");
    await next();
    await next();
    expect(spoken).toEqual(["eerste", "wissel", "coach"]);
  });

  it("laat vervallen wat te lang wacht en zegt niets dubbel", async () => {
    const { speech, spoken, clock, next } = queue();
    speech.say("eerste", "coach");
    speech.say("nog 5", "clock");
    speech.say("nog 5", "clock");
    speech.say("advies", "coach");
    clock.now = 5_000;
    await next();
    await next();
    expect(spoken).toEqual(["eerste", "advies"]);
  });
});

describe("Sauce", () => {
  it("leest renner, vermogen, snelheid en gat uit een nearby-bericht", () => {
    const sample = toSample(
      [
        { athleteId: 111, gap: 0, state: { power: 318, speed: 44.2 } },
        { athleteId: 222, gap: 0.4, state: { power: 240, speed: 44.1 } },
        { athleteId: 333, state: { power: 200 } },
        null,
      ],
      1000,
    );
    expect(sample).toEqual({
      at: 1000,
      riders: [
        { zwiftId: "111", power: 318, speedKmh: 44.2, gap: 0 },
        { zwiftId: "222", power: 240, speedKmh: 44.1, gap: 0.4 },
      ],
    });
  });

  it("geeft niets bij een bericht zonder renners", () => {
    expect(toSample({ fout: true }, 0)).toBeNull();
    expect(toSample([], 0)).toBeNull();
  });
});

describe("sessie", () => {
  function session() {
    const said: string[] = [];
    const clock = { now: 0 };
    const created = new Session(
      parsePlan(PLAN_JSON),
      { say: (text) => said.push(text), changed: () => undefined, log: () => undefined },
      () => clock.now,
    );
    return { created, said, clock };
  }
  const sample = (at: number, front: string, power = 320) => ({
    at,
    riders: [
      { zwiftId: "111", power, speedKmh: 44, gap: front === "111" ? 0 : 0.4 },
      { zwiftId: "222", power: 310, speedKmh: 44, gap: front === "222" ? 0 : 0.4 },
    ],
  });

  it("volgt een vroege wissel van de ploeg en coacht daarna de nieuwe koprijder", () => {
    const { created, said, clock } = session();
    created.start(0);
    created.skip();
    expect(created.rotation.current).toBe(0);

    for (let second = 0; second <= 26; second += 1) {
      clock.now = second * 1000;
      created.onSample(sample(clock.now, second < 16 ? "111" : "222", 360));
    }
    expect(created.rotation.current).toBe(1);
    expect(said).toContain("Piet, 310 watt.");
    expect(said).toContain("Stijn, 40 watt eraf.");
    expect(created.status()).toContain("Op kop: **Piet · 310 W**");
    expect(created.status()).toContain("Sauce: 2 van 2 renners in beeld");
    created.stop();
  });
});
