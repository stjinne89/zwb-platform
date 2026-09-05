import { describe, expect, it } from "vitest";
import {
  evaluateSubscriptionChallenge,
  isDeauthorizationEvent,
  parseWebhookEvent,
  timingSafeEqual,
} from "@/lib/strava/webhook-events";

const ACTIVITY_EVENT = {
  aspect_type: "create",
  event_time: 1516126040,
  object_id: 1360128428,
  object_type: "activity",
  owner_id: 134815,
  subscription_id: 120475,
  updates: {},
};

describe("parseWebhookEvent", () => {
  it("neemt een gewoon activity-event over", () => {
    const event = parseWebhookEvent(ACTIVITY_EVENT);
    expect(event).not.toBeNull();
    expect(event!.objectType).toBe("activity");
    expect(event!.objectId).toBe(1360128428);
    expect(event!.ownerId).toBe(134815);
    expect(event!.subscriptionId).toBe(120475);
    // Strava stuurt unix-seconden; de kolom is timestamptz.
    expect(event!.eventTime).toBe("2018-01-16T18:07:20.000Z");
  });

  it("accepteert numerieke velden die als string binnenkomen", () => {
    const event = parseWebhookEvent({
      ...ACTIVITY_EVENT,
      object_id: "1360128428",
      owner_id: "134815",
    });
    expect(event!.objectId).toBe(1360128428);
    expect(event!.ownerId).toBe(134815);
  });

  it("weigert onbekende object- en aspect-types", () => {
    expect(parseWebhookEvent({ ...ACTIVITY_EVENT, object_type: "segment" })).toBeNull();
    expect(parseWebhookEvent({ ...ACTIVITY_EVENT, aspect_type: "merge" })).toBeNull();
  });

  it("weigert een payload zonder bruikbare ids", () => {
    expect(parseWebhookEvent({ ...ACTIVITY_EVENT, object_id: "geen getal" })).toBeNull();
    expect(parseWebhookEvent({ ...ACTIVITY_EVENT, event_time: null })).toBeNull();
    expect(parseWebhookEvent(null)).toBeNull();
    expect(parseWebhookEvent("kapot")).toBeNull();
  });

  it("valt terug op een leeg updates-object", () => {
    expect(parseWebhookEvent({ ...ACTIVITY_EVENT, updates: undefined })!.updates).toEqual({});
    expect(parseWebhookEvent({ ...ACTIVITY_EVENT, updates: ["x"] })!.updates).toEqual({});
  });
});

describe("isDeauthorizationEvent", () => {
  // Dit is het signaal waar de afwijzing van Strava om draaide: hierop moet de
  // koppeling meteen dood.
  it("herkent de intrekking op strava.com", () => {
    const event = parseWebhookEvent({
      aspect_type: "update",
      event_time: 1516126040,
      object_id: 134815,
      object_type: "athlete",
      owner_id: 134815,
      subscription_id: 120475,
      updates: { authorized: "false" },
    })!;
    expect(isDeauthorizationEvent(event)).toBe(true);
  });

  it("accepteert ook de boolean-variant", () => {
    const event = parseWebhookEvent({
      aspect_type: "update",
      event_time: 1516126040,
      object_id: 134815,
      object_type: "athlete",
      owner_id: 134815,
      updates: { authorized: false },
    })!;
    expect(isDeauthorizationEvent(event)).toBe(true);
  });

  it("laat een titelwijziging met rust", () => {
    const event = parseWebhookEvent({
      ...ACTIVITY_EVENT,
      aspect_type: "update",
      updates: { title: "Messy" },
    })!;
    expect(isDeauthorizationEvent(event)).toBe(false);
  });

  it("ziet een athlete-event zonder authorized-vlag niet als intrekking", () => {
    const event = parseWebhookEvent({
      aspect_type: "update",
      event_time: 1516126040,
      object_id: 134815,
      object_type: "athlete",
      owner_id: 134815,
      updates: { authorized: "true" },
    })!;
    expect(isDeauthorizationEvent(event)).toBe(false);
  });
});

describe("evaluateSubscriptionChallenge", () => {
  const params = (values: Record<string, string>) => new URLSearchParams(values);

  it("geeft de challenge terug bij een kloppend token", () => {
    const result = evaluateSubscriptionChallenge(
      params({
        "hub.mode": "subscribe",
        "hub.verify_token": "geheim",
        "hub.challenge": "15f7d1a91c1f40f8a748fd134752feb3",
      }),
      "geheim",
    );
    expect(result).toEqual({ ok: true, challenge: "15f7d1a91c1f40f8a748fd134752feb3" });
  });

  it("weigert een verkeerd verify token met 403", () => {
    const result = evaluateSubscriptionChallenge(
      params({
        "hub.mode": "subscribe",
        "hub.verify_token": "fout",
        "hub.challenge": "abc",
      }),
      "geheim",
    );
    expect(result).toEqual({ ok: false, status: 403, error: "Verify token klopt niet." });
  });

  it("weigert een onbekende hub.mode", () => {
    const result = evaluateSubscriptionChallenge(
      params({ "hub.mode": "unsubscribe", "hub.verify_token": "geheim" }),
      "geheim",
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.status).toBe(400);
  });

  it("meldt een ontbrekend servertoken als serverfout, niet als 403", () => {
    const result = evaluateSubscriptionChallenge(
      params({ "hub.mode": "subscribe", "hub.challenge": "abc" }),
      undefined,
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.status).toBe(500);
  });
});

describe("timingSafeEqual", () => {
  it("vergelijkt gelijk en ongelijk correct", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("", "")).toBe(true);
  });
});
