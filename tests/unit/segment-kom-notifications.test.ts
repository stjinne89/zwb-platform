import { describe, expect, it, vi } from "vitest";
import { komPushMessages, notifySegmentKomEvents, type KomEvent } from "@/lib/segments/kom-notifications";

const now = Date.parse("2026-09-15T10:00:00Z");
const event = (patch: Partial<KomEvent>): KomEvent => ({
  id: 1, segment_id: 99, title: "kom", profile_id: "a", kind: "won", seconds: 95, holder_id: "a", created_at: "2026-09-15T09:55:00Z", ...patch,
});
const names = { segments: new Map([["99", "Posbank"]]), profiles: new Map([["a", "Anna"]]) };

describe("komPushMessages", () => {
  it("combines KOM and QOM won on the same ride into one message", () => {
    const messages = komPushMessages([event({}), event({ id: 2, title: "qom" })], names);
    expect(messages).toEqual([{ profileId: "a", payload: expect.objectContaining({ title: "ZWB KOM en ZWB QOM gewonnen", body: "Je bent de snelste op Posbank (1:35).", url: "/profiel" }) }]);
  });
  it("names the faster member for a lost title", () => {
    const [message] = komPushMessages([event({ profile_id: "b", kind: "lost", title: "qom" })], names);
    expect(message).toEqual({ profileId: "b", payload: expect.objectContaining({ title: "ZWB QOM kwijt", body: "Anna was sneller op Posbank (1:35)." }) });
  });
});

function fakeAdmin(events: KomEvent[], claimedIds = events.map((e) => e.id)) {
  const updates: unknown[] = [];
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    const result = () => {
      if (table === "zwb_segment_maps") return { data: [{ id: 99, name: "Posbank" }], error: null };
      if (table === "profiles") return { data: [{ id: "a", display_name: "Anna" }], error: null };
      return updates.length ? { data: claimedIds.map((id) => ({ id })), error: null } : { data: events, error: null };
    };
    for (const name of ["select", "is", "order", "in"]) chain[name] = () => chain;
    chain.update = (value: unknown) => { updates.push(value); return chain; };
    chain.limit = () => Promise.resolve(result());
    chain.then = (resolve: (v: unknown) => void) => resolve(result());
    return chain;
  });
  return { admin: { from }, updates };
}

describe("notifySegmentKomEvents", () => {
  it("claims events before sending and skips stale ones", async () => {
    const { admin, updates } = fakeAdmin([event({}), event({ id: 2, profile_id: "b", kind: "lost", created_at: "2026-09-13T09:00:00Z" })]);
    const send = vi.fn(async () => null);
    expect(await notifySegmentKomEvents(admin, { deadline: now + 5000, deps: { now: () => now, send } })).toEqual({ sent: 1, expired: 1 });
    expect(updates).toHaveLength(1);
    expect(send).toHaveBeenCalledWith("a", expect.objectContaining({ title: "ZWB KOM gewonnen" }));
  });
  it("only sends what this run claimed", async () => {
    const { admin } = fakeAdmin([event({}), event({ id: 2, profile_id: "b" })], [2]);
    const send = vi.fn(async () => null);
    await notifySegmentKomEvents(admin, { deadline: now + 5000, deps: { now: () => now, send } });
    expect(send.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["b"]);
  });
  it("skips without time left", async () => {
    const { admin } = fakeAdmin([event({})]);
    expect(await notifySegmentKomEvents(admin, { deadline: now + 100, deps: { now: () => now } })).toEqual({ skipped: true });
    expect(admin.from).not.toHaveBeenCalled();
  });
});
