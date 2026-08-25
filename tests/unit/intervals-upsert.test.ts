import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { upsertIntervalsWorkoutEvent } from "@/lib/intervals/client";

// Een opgeslagen intervals_event_id kan verlopen: wist een lid zijn kalender in
// intervals.icu leeg, dan wijst ZWB naar een event dat daar niet meer bestaat.
// In augustus 2026 stonden zo 31 workouts van één lid op 'published' terwijl er
// bij intervals.icu niets stond, en liep élke nieuwe publicatie stuk op een 404.
// Sindsdien laat de client het id los en maakt hij het event opnieuw aan.

const calls: Array<{ url: string; method: string }> = [];

function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function respondWith(...replies: Array<() => Response>) {
  const queue = [...replies];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), method: String(init?.method ?? "GET") });
    const next = queue.shift();
    if (!next) throw new Error(`Onverwachte extra call naar ${url}`);
    return next();
  });
}

const workout = {
  startDateLocal: "2026-08-25T09:00",
  name: "Herstelweek – rustige duur",
  externalId: "zwb-plan-2026-08-25-herstelweek-rustige-duur",
};

beforeEach(() => {
  calls.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("upsertIntervalsWorkoutEvent en een verlopen event-id", () => {
  it("maakt het event opnieuw aan als de PUT 404 geeft", async () => {
    respondWith(
      () => reply(404, { error: "Event not found" }),
      () => reply(200, [{ id: 555, start_date_local: "2026-08-25T09:00", name: workout.name }]),
    );

    const event = await upsertIntervalsWorkoutEvent("key", "i1", { ...workout, id: "131463148" });

    expect(event.id).toBe(555);
    expect(calls[0]).toMatchObject({ method: "PUT" });
    expect(calls[0].url).toContain("/events/131463148");
    // Zonder id valt hij terug op de aanmaakroute op external_id.
    expect(calls[1]).toMatchObject({ method: "POST" });
    expect(calls[1].url).toContain("/events/bulk?upsert=true");
  });

  it("maakt hem met een POST aan als er geen external_id is", async () => {
    respondWith(
      () => reply(404, { error: "Event not found" }),
      () => reply(200, { id: 556, start_date_local: "2026-08-25T09:00", name: workout.name }),
    );

    const event = await upsertIntervalsWorkoutEvent("key", "i1", {
      ...workout,
      externalId: null,
      id: "131463148",
    });

    expect(event.id).toBe(556);
    expect(calls[1]).toMatchObject({ method: "POST" });
    expect(calls[1].url).toMatch(/\/events$/);
  });

  it("laat een geldig id gewoon met rust", async () => {
    respondWith(() => reply(200, { id: 131463148, name: workout.name }));

    const event = await upsertIntervalsWorkoutEvent("key", "i1", { ...workout, id: "131463148" });

    expect(event.id).toBe(131463148);
    expect(calls).toHaveLength(1);
  });

  it("gaat niet in herhaling als de aanmaakroute zelf 404 geeft", async () => {
    respondWith(() => reply(404, { error: "Athlete not found" }));

    await expect(upsertIntervalsWorkoutEvent("key", "i1", workout)).rejects.toThrow(
      /intervals\.icu 404/,
    );
    expect(calls).toHaveLength(1);
  });
});
