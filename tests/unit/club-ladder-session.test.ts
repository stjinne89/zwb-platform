import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Eén rij club_ladder_session in het geheugen.
const db = vi.hoisted(() => ({ row: null as Record<string, unknown> | null }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.row, error: null }) }) }),
      upsert: async (values: Record<string, unknown>) => {
        db.row = { ...(db.row ?? {}), ...values };
        return { error: null };
      },
    }),
  }),
}));
vi.mock("@/lib/club", () => ({
  getClub: async () => ({ texts: { shortName: "ZWB" }, settings: { websiteUrl: null } }),
}));

import { LadderLoginError } from "@/lib/ladder";
import {
  checkLadderSession,
  ladderSessionStatus,
  resetLadderSessionCache,
  saveLadderCookie,
  storedLadderCookie,
  withLadderSession,
} from "@/lib/club-ladder/session";

const VALID = "connect.sid=s%3Ageldig";

/** /dashboard: 200 met de geldige cookie, anders een doorverwijzing naar /signin. */
function fakeLadder() {
  const calls: Array<{ url: string; cookie: string | undefined }> = [];
  const impl = async (url: string, init: RequestInit = {}) => {
    const cookie = (init.headers as Record<string, string> | undefined)?.Cookie;
    calls.push({ url, cookie });
    if (cookie === VALID) return new Response("<html>Logout</html>", { status: 200 });
    return new Response(null, { status: 302, headers: { location: "/signin" } });
  };
  return { calls, impl };
}

describe("ladder-sessie", () => {
  let ladder: ReturnType<typeof fakeLadder>;

  beforeEach(() => {
    resetLadderSessionCache();
    db.row = null;
    ladder = fakeLadder();
    vi.stubGlobal("fetch", vi.fn(ladder.impl));
    vi.stubEnv("LADDER_COOKIE", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("bewaart een geplakte cookie alleen als de ladder ermee inlogt", async () => {
    expect(await saveLadderCookie("s%3Afout")).toEqual({ ok: false, error: expect.stringMatching(/niet als ingelogd/) });
    expect(db.row).toBeNull();
    expect(await saveLadderCookie("iets anders=1")).toEqual({ ok: false, error: "Geen connect.sid-cookie." });

    // Alleen de waarde, zoals DevTools hem toont, is ook goed.
    expect(await saveLadderCookie(" s%3Ageldig ")).toEqual({ ok: true });
    expect(db.row).toMatchObject({ cookie: VALID, login_error: null, login_error_at: null });
    expect(await storedLadderCookie()).toBe(VALID);
    expect(await ladderSessionStatus()).toMatchObject({ source: "beheer", expiredAt: null });
    expect(ladder.calls.every((call) => call.url.endsWith("/dashboard"))).toBe(true);
  });

  it("neemt een cookie die intussen in beheer is geplakt", async () => {
    db.row = { cookie: "connect.sid=s%3Aoud", renewed_at: null, login_error: null, login_error_at: null };
    const used: string[] = [];
    const run = (cookie: string) => {
      used.push(cookie);
      if (cookie !== VALID) throw new LadderLoginError("Ladder-sessie verlopen.");
      return Promise.resolve("kerkhof");
    };
    await expect(withLadderSession(run)).rejects.toThrow(/plak een nieuwe cookie/);
    expect(db.row).toMatchObject({ login_error: "verlopen" });
    expect((await ladderSessionStatus()).expiredAt).not.toBeNull();

    db.row = { cookie: VALID, renewed_at: null, login_error: null, login_error_at: null };
    expect(await withLadderSession(run)).toBe("kerkhof");
    expect(used).toEqual(["connect.sid=s%3Aoud", VALID]);

    // Een instance met de oude nog in het geheugen leest na de weigering de tabel.
    db.row = { cookie: "connect.sid=s%3Aoud", renewed_at: null, login_error: null, login_error_at: null };
    resetLadderSessionCache();
    await storedLadderCookie();
    db.row = { cookie: VALID, renewed_at: null, login_error: null, login_error_at: null };
    used.length = 0;
    expect(await withLadderSession(run)).toBe("kerkhof");
    expect(used).toEqual(["connect.sid=s%3Aoud", VALID]);
  });

  it("valt terug op LADDER_COOKIE", async () => {
    await expect(withLadderSession(async () => "x")).rejects.toThrow(/Geen ladder-sessie/);
    expect((await ladderSessionStatus()).source).toBeNull();

    vi.stubEnv("LADDER_COOKIE", "s%3Ageldig");
    resetLadderSessionCache();
    expect(await withLadderSession(async (cookie) => cookie)).toBe(VALID);
    expect((await ladderSessionStatus()).source).toBe("env");
  });

  it("healthcheck: bezoekt de ladder, meldt verlopen en herstelt", async () => {
    expect(await checkLadderSession()).toEqual({ configured: false, ok: true, detail: "geen sessie" });

    db.row = { cookie: "connect.sid=s%3Aoud", renewed_at: null, login_error: null, login_error_at: null };
    expect(await checkLadderSession()).toMatchObject({ configured: true, ok: false, detail: "sessie verlopen" });
    expect(db.row).toMatchObject({ login_error: "verlopen" });

    db.row = { ...db.row, cookie: VALID };
    expect(await checkLadderSession()).toMatchObject({ ok: true, detail: "sessie geldig" });
    expect(db.row).toMatchObject({ login_error: null, login_error_at: null });
    expect(ladder.calls.at(-1)).toEqual({ url: "https://ladder.cycleracing.club/dashboard", cookie: VALID });
  });
});
