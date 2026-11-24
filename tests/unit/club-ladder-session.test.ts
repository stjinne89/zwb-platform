import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Eén rij club_ladder_session in het geheugen.
const db = vi.hoisted(() => ({ row: null as Record<string, unknown> | null, writes: [] as Record<string, unknown>[] }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.row, error: null }) }) }),
      upsert: async (values: Record<string, unknown>) => {
        db.writes.push(values);
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
  ladderSessionConfigured,
  loginLadder,
  renewLadderSession,
  resetLadderSessionCache,
  sessionCookieFrom,
  storedLadderCookie,
  withLadderSession,
} from "@/lib/club-ladder/session";

type Call = { url: string; init: RequestInit };

function response(status: number, cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.append("set-cookie", `connect.sid=${cookie}; Path=/; HttpOnly; Secure; SameSite=Lax`);
  if (status >= 300 && status < 400) headers.set("location", "/signin");
  return new Response(status === 302 ? null : "<html></html>", { status, headers });
}

/** De ladder: /signin geeft een sessie, POST een nieuwe, /dashboard 200 bij het juiste wachtwoord. */
function fakeLadder(options: { password?: string } = {}) {
  const calls: Call[] = [];
  let accepted = false;
  const impl = async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    if (url.endsWith("/signin") && (init.method ?? "GET") === "GET") return response(200, "s%3Avoor");
    if (url.endsWith("/signin")) {
      accepted = new URLSearchParams(String(init.body)).get("password") === (options.password ?? "geheim");
      return response(302, accepted ? "s%3Ana" : undefined);
    }
    if (url.endsWith("/dashboard")) {
      const cookie = (init.headers as Record<string, string>).Cookie;
      return response(accepted && cookie === "connect.sid=s%3Ana" ? 200 : 302);
    }
    return response(404);
  };
  return { calls, impl };
}

describe("sessionCookieFrom", () => {
  it("leest connect.sid uit de Set-Cookie-headers", () => {
    const headers = new Headers();
    headers.append("set-cookie", "andere=1; Path=/");
    headers.append("set-cookie", "connect.sid=s%3Aabc.def; Path=/; HttpOnly");
    expect(sessionCookieFrom(new Response(null, { headers }))).toBe("connect.sid=s%3Aabc.def");
    expect(sessionCookieFrom(new Response(null))).toBeNull();
  });
});

describe("loginLadder", () => {
  it("post het formulier met de sessie van de inlogpagina en geeft de nieuwe cookie", async () => {
    const ladder = fakeLadder();
    const cookie = await loginLadder({ email: "captain@example.test", password: "geheim" }, { userAgent: "test", fetchImpl: ladder.impl });
    expect(cookie).toBe("connect.sid=s%3Ana");

    const post = ladder.calls[1];
    expect(post.init.method).toBe("POST");
    expect((post.init.headers as Record<string, string>).Cookie).toBe("connect.sid=s%3Avoor");
    expect(Object.fromEntries(new URLSearchParams(String(post.init.body)))).toEqual({
      email: "captain@example.test",
      password: "geheim",
      returnTo: "",
      service: "clubladder",
    });
    expect(ladder.calls.map((call) => call.init.redirect)).toEqual(["manual", "manual", "manual"]);
  });

  it("meldt een fout wachtwoord als /dashboard naar /signin doorstuurt", async () => {
    const ladder = fakeLadder({ password: "anders" });
    await expect(
      loginLadder({ email: "captain@example.test", password: "geheim" }, { userAgent: "test", fetchImpl: ladder.impl }),
    ).rejects.toThrow(/wachtwoord klopt niet/);
  });
});

describe("ladder-sessie", () => {
  let ladder: ReturnType<typeof fakeLadder>;

  beforeEach(() => {
    resetLadderSessionCache();
    db.row = null;
    db.writes = [];
    ladder = fakeLadder();
    vi.stubGlobal("fetch", vi.fn(ladder.impl));
    vi.stubEnv("LADDER_EMAIL", "captain@example.test");
    vi.stubEnv("LADDER_PASSWORD", "geheim");
    vi.stubEnv("LADDER_COOKIE", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("logt in na een verlopen sessie en bewaart de nieuwe cookie", async () => {
    db.row = { cookie: "connect.sid=s%3Aoud", login_error: null, login_error_at: null };
    expect(await storedLadderCookie()).toBe("connect.sid=s%3Aoud");

    // Twee gelijktijdige verzoeken delen één login.
    const [a, b] = await Promise.all([renewLadderSession("connect.sid=s%3Aoud"), renewLadderSession("connect.sid=s%3Aoud")]);
    expect(a).toBe("connect.sid=s%3Ana");
    expect(b).toBe("connect.sid=s%3Ana");
    expect(ladder.calls.filter((call) => call.init.method === "POST")).toHaveLength(1);
    expect(db.row).toMatchObject({ cookie: "connect.sid=s%3Ana", login_error: null });
    expect(await storedLadderCookie()).toBe("connect.sid=s%3Ana");
  });

  it("neemt een cookie over die een andere instance al ververste", async () => {
    db.row = { cookie: "connect.sid=s%3Aelders", login_error: null, login_error_at: null };
    expect(await renewLadderSession("connect.sid=s%3Aoud")).toBe("connect.sid=s%3Aelders");
    expect(ladder.calls).toHaveLength(0);
  });

  it("probeert een mislukte login een kwartier niet opnieuw", async () => {
    vi.stubEnv("LADDER_PASSWORD", "fout");
    await expect(renewLadderSession(null)).rejects.toThrow(/wachtwoord klopt niet/);
    expect(db.row).toMatchObject({ login_error: expect.stringMatching(/wachtwoord/) });
    const before = ladder.calls.length;

    // Ook een nieuwe instance leest de fout uit de tabel.
    resetLadderSessionCache();
    await expect(renewLadderSession(null)).rejects.toBeInstanceOf(LadderLoginError);
    expect(ladder.calls.length).toBe(before);
  });

  it("probeert met een verse sessie opnieuw als de pagina naar /signin stuurt", async () => {
    db.row = { cookie: "connect.sid=s%3Aoud", login_error: null, login_error_at: null };
    const used: string[] = [];
    const result = await withLadderSession(async (cookie) => {
      used.push(cookie);
      if (cookie !== "connect.sid=s%3Ana") throw new LadderLoginError("Ladder-sessie verlopen.");
      return "kerkhof";
    });
    expect(result).toBe("kerkhof");
    expect(used).toEqual(["connect.sid=s%3Aoud", "connect.sid=s%3Ana"]);
  });

  it("werkt zonder inloggegevens alleen met LADDER_COOKIE", async () => {
    vi.stubEnv("LADDER_EMAIL", "");
    vi.stubEnv("LADDER_PASSWORD", "");
    expect(ladderSessionConfigured()).toBe(false);
    await expect(withLadderSession(async () => "x")).rejects.toThrow(/LADDER_EMAIL/);

    vi.stubEnv("LADDER_COOKIE", "s%3Ageplakt");
    expect(ladderSessionConfigured()).toBe(true);
    expect(await withLadderSession(async (cookie) => cookie)).toBe("connect.sid=s%3Ageplakt");
    await expect(renewLadderSession("connect.sid=s%3Ageplakt")).rejects.toThrow(/verlopen/);
    expect(ladder.calls).toHaveLength(0);
  });
});
