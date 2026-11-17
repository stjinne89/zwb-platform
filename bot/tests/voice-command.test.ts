import { describe, expect, it } from "vitest";
import type { PlanRider } from "../src/plan.ts";
import { Session } from "../src/session.ts";
import { confirmation, parseVoiceCommand, spokenName, voicePrompt } from "../src/voice-command.ts";

describe("Coach, start", () => {
  const riders: PlanRider[] = [
    { order: 1, name: "Koen", zwiftId: "1", pullWatts: 315, pullSeconds: 30 },
    { order: 2, name: "Jeroen", zwiftId: "2", pullWatts: 350, pullSeconds: 30 },
  ];
  function setup() {
    const clock = { now: 0 };
    const said: string[] = [];
    const session = new Session(
      { name: "TTT", eventTitle: null, estimatedSpeedKmh: null, riders },
      { say: (text) => said.push(text), changed: () => undefined, finished: () => undefined, log: () => undefined },
      () => clock.now,
    );
    return { session, said, clock };
  }

  it("laat de rest van de vertraging vallen en zet de eerste renner op kop", () => {
    const { session, said, clock } = setup();
    session.start(600);
    clock.now = 42_000;
    expect(session.startNow()).toBe(true);
    expect(session.rotation.current).toBe(0);
    expect(session.rotation.startedAt).toBe(42_000);
    expect(session.rotation.endsAt).toBe(72_000);
    expect(said.at(-1)).toContain("Koen");
    session.stop();
  });

  it("doet niets als de rotatie al loopt", () => {
    const { session, clock } = setup();
    session.start(0);
    session.skip();
    clock.now = 10_000;
    expect(session.startNow()).toBe(false);
    expect(session.rotation.current).toBe(0);
    session.stop();
  });
});

const NAMES = ["Koen", "Jeroen", "Marc", "Wouter"];
const parse = (text: string) => parseVoiceCommand(text, NAMES);

describe("spraakcommando's", () => {
  // Wat whisper base met de hint teruggaf in de meting van 2026-11-17.
  it("herkent de commando's uit de meting", () => {
    expect(parse("Coach, klim.")).toEqual({ kind: "klim" });
    expect(parse("Coach, hervat.")).toEqual({ kind: "hervat" });
    expect(parse("Coach, volgende.")).toEqual({ kind: "volgende" });
    expect(parse("Coach, plus tien.")).toEqual({ kind: "plus", seconds: 10 });
    expect(parse("Coach, deel twee.")).toEqual({ kind: "deel", number: 2 });
    expect(parse("Coach, Jeroen gelost.")).toEqual({ kind: "gelost", rider: 1 });
  });

  it("herkent de start", () => {
    expect(parse("Coach, start.")).toEqual({ kind: "start" });
    expect(parse("Coach, starten!")).toEqual({ kind: "start" });
    expect(voicePrompt(NAMES)).toContain("Coach, start.");
  });

  it("negeert praat zonder wekwoord, ook met een commandowoord erin", () => {
    expect(parse("Ja hoor, daar komt de klim rustig aan jongens.")).toBeNull();
    expect(parse("volgende")).toBeNull();
    expect(parse("")).toBeNull();
  });

  // En wat hij zonder hint verstond.
  it("verdraagt hoe whisper het wekwoord soms schrijft", () => {
    expect(parse("Kootje, hervat.")).toEqual({ kind: "hervat" });
    expect(parse("Koch, deel twee.")).toEqual({ kind: "deel", number: 2 });
  });

  it("leest getallen in woorden en cijfers", () => {
    expect(parse("Coach +20")).toEqual({ kind: "plus", seconds: 20 });
    expect(parse("Coach, dertig seconden erbij")).toEqual({ kind: "plus", seconds: 30 });
    expect(parse("Coach plus")).toEqual({ kind: "plus", seconds: 10 });
    expect(parse("Coach, plus 900")).toEqual({ kind: "plus", seconds: 120 });
    expect(parse("Coach, deel 1")).toEqual({ kind: "deel", number: 1 });
  });

  it("vindt de renner, ook als whisper de naam net anders schrijft", () => {
    expect(parse("Coach, Marc terug.")).toEqual({ kind: "terug", rider: 2 });
    expect(parse("Coach, Mark is terug")).toEqual({ kind: "terug", rider: 2 });
    expect(parse("Coach, Wouters lost")).toEqual({ kind: "gelost", rider: 3 });
  });

  it("zegt 'niet verstaan' bij het wekwoord zonder bekend commando", () => {
    expect(parse("Coach, stop.")).toEqual({ kind: "onbekend" });
    expect(parse("Coach, Pieter gelost.")).toEqual({ kind: "onbekend" });
    expect(confirmation({ kind: "onbekend" }, NAMES)).toBe("Niet verstaan.");
    expect(confirmation({ kind: "gelost", rider: 1 }, NAMES)).toBe("Jeroen gelost.");
  });

  it("zet de namen uit het plan in de hint", () => {
    const prompt = voicePrompt(NAMES);
    for (const name of NAMES) expect(prompt).toContain(name);
    expect(prompt).toContain("Coach, klim.");
  });
});

// Wat whisper verstond in de race van 2026-11-17, uit het logboek van de captain.
describe("spraak uit de race", () => {
  const RIDERS = ["Sven Hund", "Harmen Reinders", "Terrence", "E sli", "Stijn Martens"];
  const heard = (text: string) => parseVoiceCommand(text, RIDERS);

  it("vindt namen die whisper schreef zoals hij ze hoorde", () => {
    expect(heard("Coach, terrens gelost.")).toEqual({ kind: "gelost", rider: 2 });
    expect(heard("Coach, terenst terug.")).toEqual({ kind: "terug", rider: 2 });
    expect(heard("Coach, tein terug.")).toEqual({ kind: "terug", rider: 4 });
    expect(heard("Coach, Harmen is gelost.")).toEqual({ kind: "gelost", rider: 1 });
  });

  it("leest 'koelost' als gelost en vindt een deel van de naam", () => {
    expect(heard("Coach, sli is koelost.")).toEqual({ kind: "gelost", rider: 3 });
    expect(heard("Coach, Esli gelost.")).toEqual({ kind: "gelost", rider: 3 });
  });

  it("ziet een getal of 'deel' niet aan voor een naam", () => {
    expect(heard("Coach, tien Martens gelost.")).toEqual({ kind: "gelost", rider: 4 });
    expect(heard("Niet verstaan. Coach, deel Martens terug.")).toEqual({ kind: "terug", rider: 4 });
  });

  it("negeert de eigen stem van de bot voor het wekwoord", () => {
    expect(heard("Noch 30 seconden. Darna, Harmen Reinders. Coach, volgende.")).toEqual({ kind: "volgende" });
  });

  it("gokt niet bij een naam die op niemand lijkt", () => {
    expect(heard("Coach, Dennis gelost.")).toEqual({ kind: "onbekend" });
    expect(heard("Coach, als diestroos gelost.")).toEqual({ kind: "onbekend" });
  });

  it("wacht na een losse 'Coach' op het commando", () => {
    expect(heard("Coach.")).toEqual({ kind: "wake" });
    expect(confirmation({ kind: "wake" }, RIDERS)).toBeNull();
  });

  // B3 en TTT A, ook 2026-11-17.
  it("negeert een commando dat whisper herhaalt: dat is de hint, niet de captain", () => {
    expect(heard("Coach, deel twee. Coach, deel twee. Coach, deel twee. Coach, deel twee.")).toEqual({ kind: "echo" });
    expect(heard("Coach, deel twee. Coach, deel twee.")).toEqual({ kind: "echo" });
    expect(heard("Coach, plus tien.")).toEqual({ kind: "plus", seconds: 10 });
  });

  it("ziet wat whisper tussen haken zet niet als commando", () => {
    expect(heard("Coach, [muziek]")).toEqual({ kind: "wake" });
  });

  it("leest 'los' als gelost", () => {
    expect(parseVoiceCommand("Coach, remco los.", ["Bart", "Pim", "Casper", "Remco", "Mathijs"])).toEqual({
      kind: "gelost",
      rider: 3,
    });
  });

  it("zet 'deel' alleen in de hint voor een deel dat klaarstaat", () => {
    expect(voicePrompt(RIDERS)).not.toContain("deel");
    expect(voicePrompt(RIDERS, [2])).toContain("Coach, deel twee.");
    expect(voicePrompt(RIDERS, [3])).toContain("Coach, deel drie.");
    expect(heard("Coach, deel drie.")).toEqual({ kind: "deel", number: 3 });
  });

  it("zet elke renner in de hint zoals de captain hem noemt", () => {
    const prompt = voicePrompt(RIDERS);
    for (const name of ["Sven", "Harmen", "Terrence", "Esli", "Stijn"]) expect(prompt).toContain(`Coach, ${name} `);
    expect(spokenName("E sli")).toBe("Esli");
    expect(spokenName("Stijn Martens")).toBe("Stijn");
  });
});
