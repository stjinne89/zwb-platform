import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CLUB_ID = "00000000-0000-4000-8000-000000000001";

const safeFetch = vi.fn();
vi.mock("@/lib/net/safe-fetch", () => ({ safeFetch: (...args: unknown[]) => safeFetch(...args) }));

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

function clubEvent(id: number, resourceId: string) {
  return {
    id,
    name: `Event ${id}`,
    eventStart: "2026-10-05T17:35:00.000+0000",
    microserviceName: "clubs",
    microserviceExternalResourceId: resourceId,
    eventSubgroups: [{ id: id * 10, subgroupLabel: "B" }],
  };
}

describe("fetchClubCalendarEvents", () => {
  beforeEach(() => {
    vi.resetModules();
    safeFetch.mockReset();
    vi.stubEnv("ZWIFT_USERNAME", "service@example.test");
    vi.stubEnv("ZWIFT_PASSWORD", "test");
    vi.stubEnv("ZWIFT_CLUB_ID", CLUB_ID);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(200, { access_token: "token", expires_in: 3600 })),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("gebruikt de clubfeed en houdt alleen events van de eigen club over", async () => {
    safeFetch.mockResolvedValueOnce(
      json(200, [clubEvent(1, CLUB_ID), clubEvent(2, "andere-club")]),
    );
    const { fetchClubCalendarEvents } = await import("@/lib/events/zwift-club");

    const { events, route } = await fetchClubCalendarEvents();

    expect(route).toBe("club");
    expect(events.map((event) => event.candidate.externalId)).toEqual(["1"]);
    expect(events[0].subgroupIds).toEqual(["10"]);
    const url = new URL(String(safeFetch.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/event-feed");
    expect(url.searchParams.get("microservice")).toBe("clubs");
    expect(url.searchParams.get("microserviceResourceId")).toBe(CLUB_ID);
  });

  it("valt terug op de beheerroute en daarna op de member-feed", async () => {
    safeFetch
      .mockResolvedValueOnce(json(403, {}))
      .mockResolvedValueOnce(json(403, {}))
      .mockResolvedValueOnce(json(200, [{ event: clubEvent(3, CLUB_ID) }]));
    const { fetchClubCalendarEvents } = await import("@/lib/events/zwift-club");

    const { events, route } = await fetchClubCalendarEvents();

    expect(route).toBe("feed");
    expect(events.map((event) => event.candidate.externalId)).toEqual(["3"]);
    expect(String(safeFetch.mock.calls[1][0])).toContain(
      `/event-feed/microservice/clubs/resource/${CLUB_ID}/privileged`,
    );
  });
});
