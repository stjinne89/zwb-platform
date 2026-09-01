import { describe, expect, it } from "vitest";
import {
  eventFitsMember,
  fitIsInformative,
  resolveMemberFit,
  type MemberFit,
} from "@/lib/events/fit";

const OPEN: MemberFit = {
  interests: [],
  teamIds: [],
  declinedEventIds: new Set<string>(),
  maxDistanceKm: null,
  maxElevationM: null,
  ceilingSource: "onbekend",
};

describe("eventFitsMember", () => {
  it("laat alles door voor een lid zonder voorkeuren of geschiedenis", () => {
    const event = { type: "gran_fondo", distance_km: 220, elevation_m: 3800 };
    expect(eventFitsMember(event, OPEN)).toEqual({ fits: true });
  });

  it("verbergt een event waar het lid nee op heeft gezegd", () => {
    const member = { ...OPEN, declinedEventIds: new Set(["event-1"]) };
    expect(eventFitsMember({ id: "event-1", type: "social" }, member)).toEqual({
      fits: false,
      reason: "declined",
    });
    expect(eventFitsMember({ id: "event-2", type: "social" }, member).fits).toBe(true);
  });

  it("weegt een nee zwaarder dan elke andere reden", () => {
    // Een event dat óók van een ander team is: het lid heeft er zelf al iets
    // over gezegd, dus dat is de reden die het te zien krijgt.
    const member = {
      ...OPEN,
      declinedEventIds: new Set(["event-1"]),
      teamIds: ["team-a"],
      interests: ["training"],
    };
    expect(
      eventFitsMember({ id: "event-1", type: "social", team_id: "team-b" }, member),
    ).toEqual({ fits: false, reason: "declined" });
  });

  it("filtert op interesse zodra het lid iets heeft aangevinkt", () => {
    const member = { ...OPEN, interests: ["zrl", "training"] };
    expect(eventFitsMember({ type: "zrl" }, member).fits).toBe(true);
    expect(eventFitsMember({ type: "gran_fondo" }, member)).toEqual({
      fits: false,
      reason: "interest",
    });
  });

  it("houdt events van een ander team weg", () => {
    const member = { ...OPEN, teamIds: ["team-a"] };
    expect(eventFitsMember({ type: "zrl", team_id: "team-a" }, member).fits).toBe(
      true,
    );
    expect(eventFitsMember({ type: "zrl", team_id: "team-b" }, member)).toEqual({
      fits: false,
      reason: "team",
    });
    // Een event zonder team is van de hele club.
    expect(eventFitsMember({ type: "zrl", team_id: null }, member).fits).toBe(true);
  });

  it("weegt team zwaarder dan interesse", () => {
    const member = { ...OPEN, interests: ["social"], teamIds: [] };
    expect(eventFitsMember({ type: "zrl", team_id: "team-b" }, member)).toEqual({
      fits: false,
      reason: "team",
    });
  });

  it("filtert op afstand en hoogtemeters", () => {
    const member = { ...OPEN, maxDistanceKm: 120, maxElevationM: 1500 };
    expect(eventFitsMember({ type: "toertocht", distance_km: 120 }, member).fits).toBe(
      true,
    );
    expect(
      eventFitsMember({ type: "toertocht", distance_km: 121 }, member),
    ).toEqual({ fits: false, reason: "distance" });
    expect(
      eventFitsMember({ type: "toertocht", distance_km: 80, elevation_m: 2200 }, member),
    ).toEqual({ fits: false, reason: "elevation" });
  });

  it("verbergt niets als het event zelf geen afstand kent", () => {
    const member = { ...OPEN, maxDistanceKm: 60 };
    expect(eventFitsMember({ type: "outdoor", distance_km: null }, member).fits).toBe(
      true,
    );
  });

  it("leest afstand ook als numeric-string uit Postgres", () => {
    const member = { ...OPEN, maxDistanceKm: 100 };
    expect(eventFitsMember({ type: "outdoor", distance_km: "150.00" }, member)).toEqual({
      fits: false,
      reason: "distance",
    });
  });
});

describe("resolveMemberFit", () => {
  it("leidt een plafond af uit de langste rit, met marge", () => {
    const member = resolveMemberFit({
      interests: null,
      teamIds: [],
      declinedEventIds: [],
      maxDistanceKm: null,
      maxElevationM: null,
      history: { rideCount: 40, longestKm: 100, biggestClimbM: 1000 },
    });
    expect(member.maxDistanceKm).toBe(120);
    expect(member.maxElevationM).toBe(1200);
    expect(member.ceilingSource).toBe("ritten");
  });

  it("negeert een te dunne geschiedenis", () => {
    const member = resolveMemberFit({
      interests: null,
      teamIds: [],
      declinedEventIds: [],
      maxDistanceKm: null,
      maxElevationM: null,
      history: { rideCount: 3, longestKm: 40, biggestClimbM: 200 },
    });
    expect(member.maxDistanceKm).toBeNull();
    expect(member.ceilingSource).toBe("onbekend");
  });

  it("laat het profiel winnen van de afleiding", () => {
    const member = resolveMemberFit({
      interests: ["social"],
      teamIds: ["team-a"],
      declinedEventIds: [],
      maxDistanceKm: 80,
      maxElevationM: null,
      history: { rideCount: 40, longestKm: 200, biggestClimbM: 3000 },
    });
    expect(member.maxDistanceKm).toBe(80);
    // De as die het lid leeg liet blijft wel afgeleid.
    expect(member.maxElevationM).toBe(3600);
    expect(member.ceilingSource).toBe("profiel");
  });

  it("maakt het filter betekenisvol zodra er een nee ligt", () => {
    const member = resolveMemberFit({
      interests: [],
      teamIds: [],
      declinedEventIds: ["event-1"],
      maxDistanceKm: null,
      maxElevationM: null,
      history: null,
    });
    expect(member.declinedEventIds.has("event-1")).toBe(true);
    expect(fitIsInformative(member)).toBe(true);
  });

  it("valt zonder geschiedenis terug op geen enkel plafond", () => {
    const member = resolveMemberFit({
      interests: [],
      teamIds: [],
      declinedEventIds: [],
      maxDistanceKm: null,
      maxElevationM: null,
      history: null,
    });
    expect(member.maxDistanceKm).toBeNull();
    expect(member.maxElevationM).toBeNull();
    expect(fitIsInformative(member)).toBe(false);
  });
});
