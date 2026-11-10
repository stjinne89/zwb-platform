import { describe, expect, it } from "vitest";
import {
  zrlFormatFromTitle,
  zrlFormatFromZwift,
  zrlTitleWithFormat,
} from "@/lib/events/zrl-format";
import { zrlTitleUpdate } from "@/lib/events/zrl-event-details";
import { zrlFormatOf } from "@/lib/zrl-live/snapshot";

// Tags zoals ze in ronde 1 van 2026/27 bij de ZWB-teamevents stonden, ingekort.
const WEEK = {
  rot: { description: null, eventType: "RACE", tags: ["wtrl", "zrl", "zrl20", "rot", "zrl_arch"] },
  scr: { description: null, eventType: "RACE", tags: ["wtrl", "zrl", "zrl20", "scr", "zrl_arch"] },
  pts: { description: null, eventType: "RACE", tags: ["wtrl", "zrl", "zrl20", "pts", "zrl_arch"] },
  ttt: { description: null, eventType: "TEAM_TIME_TRIAL", tags: ["wtrl", "zrl", "zrl20", "ttt", "zrl_ttt"] },
  zrlScr: { description: null, eventType: "RACE", tags: ["wtrl", "zrl", "zrl20", "zrl_scr", "no_braking"] },
  zrlPoints: { description: null, eventType: "RACE", tags: ["wtrl", "zrl", "zrl20", "zrl_points", "nobraking"] },
};

describe("zrlFormatFromZwift", () => {
  it("leest elke week van ronde 1", () => {
    expect(zrlFormatFromZwift(WEEK.rot)).toBe("rot");
    expect(zrlFormatFromZwift(WEEK.scr)).toBe("scratch");
    expect(zrlFormatFromZwift(WEEK.pts)).toBe("points");
    expect(zrlFormatFromZwift(WEEK.ttt)).toBe("ttt");
    expect(zrlFormatFromZwift(WEEK.zrlScr)).toBe("scratch");
    expect(zrlFormatFromZwift(WEEK.zrlPoints)).toBe("points");
  });

  it("valt terug op het eventtype en de beschrijving", () => {
    expect(zrlFormatFromZwift({ eventType: "TEAM_TIME_TRIAL", tags: [] })).toBe("ttt");
    expect(zrlFormatFromZwift({ description: "Round 1 - Race: 6 of 6 (POINTS RACE)" })).toBe("points");
    expect(zrlFormatFromZwift({ description: "Race: 1 of 6 (RACE OF TRUTH)" })).toBe("rot");
  });

  it("zegt niets als Zwift het niet zegt", () => {
    expect(zrlFormatFromZwift({ eventType: "RACE", tags: ["wtrl", "zrl"] })).toBeNull();
    expect(zrlFormatFromZwift(null)).toBeNull();
  });

  it("telt zrl_scr ook in de live-telling als scratch", () => {
    expect(zrlFormatOf(WEEK.zrlScr)).toBe("scratch");
    expect(zrlFormatOf(WEEK.rot)).toBe("points");
  });
});

describe("zrlTitleWithFormat", () => {
  it("zet het format achter een geïmporteerde titel", () => {
    expect(zrlTitleWithFormat("ZRL 2026/27 · R2 · W1 · B1", "ttt")).toBe(
      "ZRL 2026/27 · R2 · W1 · B1 — Team Time Trial",
    );
    expect(zrlTitleWithFormat("ZRL 2026/27 · R2 · W1", "ttt")).toBe(
      "ZRL 2026/27 · R2 · W1 — Team Time Trial",
    );
  });

  it("vervangt een verkeerd format (ronde 2, 2026/27)", () => {
    expect(zrlTitleWithFormat("ZRL 2026/27 · R2 · W1 · B1 — Race of Truth", "ttt")).toBe(
      "ZRL 2026/27 · R2 · W1 · B1 — Team Time Trial",
    );
  });

  it("laat een kloppende of hernoemde titel staan", () => {
    expect(zrlTitleWithFormat("ZRL 2026/27 · R2 · W1 · B1 — Team Time Trial", "ttt")).toBeNull();
    expect(zrlTitleWithFormat("Zwift Racing League 26/27: Fast & Fresh", "ttt")).toBeNull();
  });

  it("is terug te lezen", () => {
    expect(zrlFormatFromTitle("ZRL 2026/27 · R2 · W1 · B1 — Team Time Trial")).toBe("ttt");
    expect(zrlFormatFromTitle("ZRL 2026/27 · R1 · W1 — Race of Truth")).toBe("rot");
    expect(zrlFormatFromTitle("ZRL 2026/27 · R1 · W2 · B1")).toBeNull();
  });
});

describe("zrlTitleUpdate", () => {
  it("zet de titel recht uit het gekoppelde Zwift-event", () => {
    expect(zrlTitleUpdate("ZRL 2026/27 · R2 · W1 · B1 — Race of Truth", WEEK.ttt)).toEqual({
      title: "ZRL 2026/27 · R2 · W1 · B1 — Team Time Trial",
    });
    expect(zrlTitleUpdate("ZRL 2026/27 · R2 · W2 · B1", { description: null, eventType: "RACE", tags: [] })).toBeNull();
  });
});
