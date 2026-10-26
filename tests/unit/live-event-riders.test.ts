import { describe, expect, it } from "vitest";
import { isEventRunning, splitLiveRiders } from "@/lib/live/event-riders";

const now = new Date("2026-10-18T10:40:00Z").getTime();
const gravel = {
  id: "gravel",
  title: "Legacy Gravel",
  startAt: "2026-10-18T07:50:00Z",
  endAt: "2026-10-18T12:50:00Z",
};
const rider = (profileId: string, sessionStartedAt = "2026-10-18T07:58:00Z") => ({
  profileId,
  name: profileId,
  sessionStartedAt,
});

describe("isEventRunning", () => {
  it("loopt vanaf een half uur voor de start tot een uur na het einde", () => {
    expect(isEventRunning(gravel, now)).toBe(true);
    expect(isEventRunning({ ...gravel, startAt: "2026-10-18T11:20:00Z" }, now)).toBe(false);
    expect(isEventRunning({ ...gravel, startAt: "2026-10-18T11:05:00Z" }, now)).toBe(true);
    expect(isEventRunning({ ...gravel, endAt: "2026-10-18T09:30:00Z" }, now)).toBe(false);
    expect(isEventRunning({ ...gravel, endAt: "2026-10-18T09:45:00Z" }, now)).toBe(true);
    expect(isEventRunning({ ...gravel, endAt: null }, now)).toBe(true);
  });
});

describe("splitLiveRiders", () => {
  it("zet een aangemelde renner bij het event en de rest bij Samen fietsen", () => {
    const split = splitLiveRiders(
      [rider("anna"), rider("bert")],
      [gravel],
      [
        { eventId: "gravel", profileId: "anna", status: "yes" },
        { eventId: "gravel", profileId: "bert", status: "no" },
      ],
      now,
    );
    expect(split.together.map((r) => r.profileId)).toEqual(["bert"]);
    expect(split.byEvent).toEqual([{ event: gravel, riders: [rider("anna")] }]);
  });

  it("telt misschien mee, maar geen sessie die ruim voor de start begon", () => {
    const split = splitLiveRiders(
      [rider("anna"), rider("bert", "2026-10-18T06:30:00Z")],
      [gravel],
      [
        { eventId: "gravel", profileId: "anna", status: "maybe" },
        { eventId: "gravel", profileId: "bert", status: "yes" },
      ],
      now,
    );
    expect(split.byEvent[0].riders.map((r) => r.profileId)).toEqual(["anna"]);
    expect(split.together.map((r) => r.profileId)).toEqual(["bert"]);
  });

  it("kiest bij twee events het event dat het laatst begon", () => {
    const later = { id: "later", title: "Middagrit", startAt: "2026-10-18T10:00:00Z", endAt: null };
    const split = splitLiveRiders(
      [rider("anna", "2026-10-18T09:55:00Z")],
      [gravel, later],
      [
        { eventId: "gravel", profileId: "anna", status: "yes" },
        { eventId: "later", profileId: "anna", status: "yes" },
      ],
      now,
    );
    expect(split.byEvent.map((group) => group.event.id)).toEqual(["later"]);
    expect(split.together).toEqual([]);
  });
});
