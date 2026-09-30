import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

const db = fakeDb({ intervals_connections: [], strava_connections: [] });
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db }));

const { POST } = await import("@/app/api/intervals/rides/sync/route");

function request(secret?: string) {
  return new NextRequest("https://zwb.test/api/intervals/rides/sync?limit=3", {
    method: "POST",
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

afterEach(() => {
  delete process.env.INTERVALS_RIDES_SYNC_SECRET;
});

describe("POST /api/intervals/rides/sync", () => {
  it("weigert zonder of met een verkeerd secret", async () => {
    expect((await POST(request("x"))).status).toBe(403);
    process.env.INTERVALS_RIDES_SYNC_SECRET = "geheim";
    expect((await POST(request())).status).toBe(403);
    expect((await POST(request("fout"))).status).toBe(403);
  });

  it("geeft een lege run zonder leden", async () => {
    process.env.INTERVALS_RIDES_SYNC_SECRET = "geheim";
    const response = await POST(request("geheim"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, members: 0, processed: 0 });
  });
});
