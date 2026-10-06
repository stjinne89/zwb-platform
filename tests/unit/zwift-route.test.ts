import { describe, expect, it } from "vitest";
import {
  accentsForRoute,
  eventForSubgroup,
  eventRouteTotals,
  mapZwiftEvent,
  parseZwiftEventUrl,
  pickOwnSubgroup,
  routeFromZwiftId,
  zrlCategoryFromTeamName,
  zwiftStartFor,
} from "@/lib/events/zwift-route";

/**
 * Ingekorte respons van GET /api/public/events/{id}, met de velden die het
 * eventformulier gebruikt. Route 2128890027 = Tempus Fugit (17,231 km vlak).
 */
const TEMPUS_FUGIT_ROUTE_ID = 2128890027;

const EVENT_JSON = {
  id: 5683801,
  name: "TEAM VTO POWERPUSH",
  eventStart: "2026-08-31T20:00:00.000+0000",
  distanceInMeters: 40000,
  durationInSeconds: 0,
  laps: 0,
  routeId: TEMPUS_FUGIT_ROUTE_ID,
  worldId: 1,
  eventSubgroups: [{ id: 7310320, subgroupLabel: "C", distanceInMeters: 40000 }],
};

describe("parseZwiftEventUrl", () => {
  it("leest de gewone eventlink", () => {
    expect(parseZwiftEventUrl("https://www.zwift.com/events/view/5683801")).toBe(
      5683801,
    );
  });

  it("leest een link met taalprefix, querystring of anker", () => {
    expect(parseZwiftEventUrl("https://www.zwift.com/nl/events/view/123")).toBe(123);
    expect(parseZwiftEventUrl("https://zwift.com/events/view/123?ref=mail")).toBe(123);
    expect(parseZwiftEventUrl("https://zwift.com/events/view/123#start")).toBe(123);
  });

  it("accepteert een kaal event-id", () => {
    expect(parseZwiftEventUrl("  5683801 ")).toBe(5683801);
  });

  it("leest ook de publieke API-vorm", () => {
    expect(
      parseZwiftEventUrl("https://us-or-rly101.zwift.com/api/public/events/999"),
    ).toBe(999);
  });

  it("weigert wat geen event is", () => {
    expect(parseZwiftEventUrl("")).toBeNull();
    expect(parseZwiftEventUrl("https://www.zwift.com/clubs/abc")).toBeNull();
    expect(parseZwiftEventUrl("https://www.strava.com/routes/123")).toBeNull();
    expect(parseZwiftEventUrl("0")).toBeNull();
  });
});

describe("routeFromZwiftId", () => {
  it("vertaalt een routeId uit de event-API naar een route", () => {
    const route = routeFromZwiftId(TEMPUS_FUGIT_ROUTE_ID);
    expect(route?.slug).toBe("tempus-fugit");
    expect(route?.world).toBe("watopia");
    expect(route?.distanceKm).toBeCloseTo(17.231, 3);
    expect(route?.leadInKm).toBeGreaterThan(0);
    expect(route?.stravaSegmentId).toBeTypeOf("number");
  });

  it("kent de ZRL 26/27-route Montmartre Mixer (zwift-data ≥ 1.50)", () => {
    const route = routeFromZwiftId(1247427185);
    expect(route?.name).toBe("Montmartre Mixer");
    expect(route?.world).toBe("paris");
  });

  it("geeft null voor een onbekend routeId", () => {
    expect(routeFromZwiftId(1)).toBeNull();
  });
});

describe("accentsForRoute", () => {
  it("levert de klimmen van een bergroute met kilometrering", () => {
    const accents = accentsForRoute("road-to-sky");
    expect(accents.length).toBeGreaterThan(0);
    const climb = accents.find((accent) => accent.kind === "climb");
    expect(climb).toBeDefined();
    expect(climb!.endKm).toBeGreaterThan(climb!.startKm);
    expect(climb!.name.length).toBeGreaterThan(0);
  });

  it("staat op oplopende kilometer", () => {
    const accents = accentsForRoute("the-mega-pretzel");
    const kms = accents.map((accent) => accent.startKm);
    expect([...kms].sort((a, b) => a - b)).toEqual(kms);
  });

  it("geeft een lege lijst voor een onbekende route", () => {
    expect(accentsForRoute("bestaat-niet")).toEqual([]);
  });
});

describe("mapZwiftEvent", () => {
  it("leest event-id, route, afstand en link uit de API-respons", () => {
    const event = mapZwiftEvent(EVENT_JSON)!;
    expect(event.eventId).toBe(5683801);
    expect(event.routeId).toBe(TEMPUS_FUGIT_ROUTE_ID);
    expect(event.route?.slug).toBe("tempus-fugit");
    expect(event.distanceKm).toBe(40);
    expect(event.externalUrl).toBe("https://www.zwift.com/events/view/5683801");
  });

  it("behandelt laps 0 en duration 0 als afwezig", () => {
    const event = mapZwiftEvent(EVENT_JSON)!;
    expect(event.laps).toBeNull();
    expect(event.durationMinutes).toBeNull();
  });

  it("overleeft een event zonder route", () => {
    const event = mapZwiftEvent({ id: 42, name: "Zonder route" })!;
    expect(event.routeId).toBeNull();
    expect(event.route).toBeNull();
  });

  it("geeft null zonder bruikbaar id", () => {
    expect(mapZwiftEvent({ name: "Naamloos" })).toBeNull();
  });
});

describe("eventRouteTotals", () => {
  it("leidt het rondental af uit de afstand als het event er geen geeft", () => {
    const event = mapZwiftEvent(EVENT_JSON)!;
    const totals = eventRouteTotals(event)!;
    // 40 km event, lead-in 2,356 km, ronde 17,231 km → twee ronden.
    expect(totals.laps).toBe(2);
    expect(totals.distanceKm).toBeCloseTo(2.356 + 2 * 17.231, 2);
    expect(totals.elevationM).toBe(Math.round(6 + 2 * 26));
  });

  it("gebruikt het opgegeven rondental als dat er is", () => {
    const event = mapZwiftEvent({ ...EVENT_JSON, laps: 3 })!;
    const totals = eventRouteTotals(event)!;
    expect(totals.laps).toBe(3);
    expect(totals.distanceKm).toBeCloseTo(2.356 + 3 * 17.231, 2);
  });

  it("valt terug op één ronde zonder afstand en zonder rondental", () => {
    const event = mapZwiftEvent({
      id: 1,
      name: "Kaal",
      routeId: TEMPUS_FUGIT_ROUTE_ID,
    })!;
    expect(eventRouteTotals(event)!.laps).toBe(1);
  });

  it("geeft null zonder route", () => {
    expect(eventRouteTotals(mapZwiftEvent({ id: 1, name: "x" })!)).toBeNull();
  });
});

/**
 * Ingekort uit GET /api/public/events/5718424 (opgehaald 2026-09-28): ZRL Open
 * Aqua Division 1, race 1. Elke groep start een minuut later, en A en B rijden
 * een ronde meer dan het event zelf opgeeft.
 */
const ZRL_EVENT_JSON = {
  id: 5718424,
  name: "Zwift Racing League 26/27: Fast & Fresh : Open Aqua League Division 1 - Race 1",
  eventStart: "2026-09-29T18:00:00.000+0000",
  laps: 3,
  routeId: 2592027600,
  eventSubgroups: [
    { id: 7365549, subgroupLabel: "A", eventSubgroupStart: "2026-09-29T18:00:00.000+0000", laps: 4 },
    { id: 7365548, subgroupLabel: "B", eventSubgroupStart: "2026-09-29T18:01:00.000+0000", laps: 4 },
    { id: 7365550, subgroupLabel: "C", eventSubgroupStart: "2026-09-29T18:02:00.000+0000", laps: 3 },
    { id: 7365551, subgroupLabel: "D", eventSubgroupStart: "2026-09-29T18:03:00.000+0000", laps: 3 },
  ],
};

describe("zrlCategoryFromTeamName", () => {
  it("leest de letter uit de ZWB-teamnamen", () => {
    expect(zrlCategoryFromTeamName("ZRL A")).toBe("A");
    expect(zrlCategoryFromTeamName("B1")).toBe("B");
    expect(zrlCategoryFromTeamName("Bdev")).toBe("B");
    expect(zrlCategoryFromTeamName("ZRL Zwiftladies C")).toBe("C");
  });

  it("maakt geen letter van een gewoon woord", () => {
    expect(zrlCategoryFromTeamName("ZRL Zwiftladies")).toBeNull();
    expect(zrlCategoryFromTeamName("Development")).toBeNull();
    expect(zrlCategoryFromTeamName(null)).toBeNull();
  });
});

describe("start per subgroep", () => {
  const event = mapZwiftEvent(ZRL_EVENT_JSON)!;

  it("leest start en ronden per groep", () => {
    expect(event.subgroups.map((group) => [group.label, group.startAt, group.laps])).toEqual([
      ["A", "2026-09-29T18:00:00.000Z", 4],
      ["B", "2026-09-29T18:01:00.000Z", 4],
      ["C", "2026-09-29T18:02:00.000Z", 3],
      ["D", "2026-09-29T18:03:00.000Z", 3],
    ]);
  });

  it("geeft het team de start van zijn eigen groep", () => {
    const own = pickOwnSubgroup(event.subgroups, "C");
    expect(own?.id).toBe("7365550");
    expect(zwiftStartFor(event, own)).toBe("2026-09-29T18:02:00.000Z");
  });

  it("valt zonder eigen groep terug op de vroegste groepstart", () => {
    expect(pickOwnSubgroup(event.subgroups, null)).toBeNull();
    expect(pickOwnSubgroup(event.subgroups, "E")).toBeNull();
    expect(zwiftStartFor(event, null)).toBe("2026-09-29T18:00:00.000Z");
  });

  it("gebruikt eventStart als er geen groepen zijn", () => {
    const bare = mapZwiftEvent({ id: 1, name: "x", eventStart: "2026-09-29T18:00:00.000+0000" })!;
    expect(zwiftStartFor(bare, null)).toBe("2026-09-29T18:00:00.000Z");
  });
});

/**
 * Ingekort uit GET /api/public/events/upcoming (opgehaald 2026-10-06): ZRL Open
 * Emerald Division 1, race 2. Het event geeft Urumaze op, A en B rijden Makuri 40.
 */
const ZRL_TWO_ROUTES_JSON = {
  id: 5728394,
  name: "Zwift Racing League 26/27: Fast & Fresh : Open Emerald League Division 1 - Race 2",
  eventStart: "2026-10-06T16:30:00.000+0000",
  laps: 1,
  routeId: 4092230492,
  eventSubgroups: [
    { id: 1, subgroupLabel: "A", eventSubgroupStart: "2026-10-06T16:30:00.000+0000", laps: 1, routeId: 890800649 },
    { id: 2, subgroupLabel: "B", eventSubgroupStart: "2026-10-06T16:31:00.000+0000", laps: 1, routeId: 890800649 },
    { id: 3, subgroupLabel: "C", eventSubgroupStart: "2026-10-06T16:32:00.000+0000", laps: 1, routeId: 4092230492 },
    { id: 4, subgroupLabel: "D", eventSubgroupStart: "2026-10-06T16:33:00.000+0000", laps: 1, routeId: 4092230492 },
  ],
};

describe("route per subgroep", () => {
  const event = mapZwiftEvent(ZRL_TWO_ROUTES_JSON)!;

  it("geeft A en B hun eigen route", () => {
    expect(event.route?.name).toBe("Urumaze");
    const own = eventForSubgroup(event, pickOwnSubgroup(event.subgroups, "B"));
    expect(own.route?.name).toBe("Makuri 40");
    expect(own.routeId).toBe(890800649);
    expect(eventRouteTotals(own)!.distanceKm).toBeCloseTo(40.25, 1);
  });

  it("laat C en D op de route van het event", () => {
    const own = eventForSubgroup(event, pickOwnSubgroup(event.subgroups, "C"));
    expect(own.route?.name).toBe("Urumaze");
  });

  it("houdt zonder eigen groep of route per groep de route van het event", () => {
    expect(eventForSubgroup(event, null)).toBe(event);
    const old = mapZwiftEvent(ZRL_EVENT_JSON)!;
    const own = eventForSubgroup(old, pickOwnSubgroup(old.subgroups, "A"));
    expect(own.routeId).toBe(2592027600);
    expect(own.laps).toBe(4);
  });
});
