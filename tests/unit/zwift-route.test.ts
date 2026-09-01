import { describe, expect, it } from "vitest";
import {
  accentsForRoute,
  eventRouteTotals,
  mapZwiftEvent,
  parseZwiftEventUrl,
  routeFromZwiftId,
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
