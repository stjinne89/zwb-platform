import { afterEach, describe, expect, it, vi } from "vitest";
import {
  broadcastDescription,
  broadcastTitle,
  eventTakesStreams,
  inPrepareWindow,
  isVideoId,
  scheduledStartFor,
  streamEmbedUrl,
  streamsAreLive,
} from "@/lib/youtube-live/broadcast";
import {
  exchangeYouTubeCode,
  hasYouTubeScope,
  refreshYouTubeToken,
  safeReturnPath,
  youtubeAuthorizeUrl,
  YouTubeGrantRevokedError,
  YOUTUBE_SCOPE,
} from "@/lib/youtube-live/oauth";
import {
  createBoundBroadcast,
  ensureReusableStream,
  STREAM_TITLE,
  YouTubeApiError,
  youtubeErrorMessage,
} from "@/lib/youtube-live/api";

// Livestreams via YouTube, fase 1 (0338): de pure regels en de aanroepen naar
// Google, met een nagebootste fetch. Tegen de echte API is dit niet getest.

const CONFIG = { clientId: "client-id", clientSecret: "client-secret" };
const RACE = { type: "zrl", team_id: "team", parent_event_id: "week", start_at: "2026-12-22T19:00:00Z" };

afterEach(() => {
  vi.unstubAllGlobals();
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("welke race een stream kan krijgen", () => {
  it("neemt online races, geen buitenrit", () => {
    expect(eventTakesStreams(RACE, false)).toBe(true);
    expect(eventTakesStreams({ ...RACE, type: "zwift", team_id: null, parent_event_id: null }, false)).toBe(true);
    expect(eventTakesStreams({ ...RACE, type: "outdoor" }, false)).toBe(false);
  });

  it("slaat een raceweek en een hoofdevent over", () => {
    expect(eventTakesStreams({ ...RACE, team_id: null, parent_event_id: null }, false)).toBe(false);
    expect(eventTakesStreams({ ...RACE, type: "zwift" }, true)).toBe(false);
  });

  it("zet klaar van twee weken voor tot twee uur na de start", () => {
    expect(inPrepareWindow(RACE.start_at, new Date("2026-12-08T18:59:00Z"))).toBe(false);
    expect(inPrepareWindow(RACE.start_at, new Date("2026-12-08T19:01:00Z"))).toBe(true);
    expect(inPrepareWindow(RACE.start_at, new Date("2026-12-22T20:59:00Z"))).toBe(true);
    expect(inPrepareWindow(RACE.start_at, new Date("2026-12-22T21:01:00Z"))).toBe(false);
    expect(inPrepareWindow("geen datum", new Date())).toBe(false);
  });

  it("plant tien minuten voor de start, maar nooit in het verleden", () => {
    expect(scheduledStartFor(RACE.start_at, new Date("2026-12-20T12:00:00Z")).toISOString()).toBe(
      "2026-12-22T18:50:00.000Z",
    );
    expect(scheduledStartFor(RACE.start_at, new Date("2026-12-22T18:55:00Z")).toISOString()).toBe(
      "2026-12-22T18:57:00.000Z",
    );
  });

  it("heet live tot drie uur na de start, daarna terugkijken", () => {
    expect(streamsAreLive(RACE.start_at, new Date("2026-12-22T21:59:00Z"))).toBe(true);
    expect(streamsAreLive(RACE.start_at, new Date("2026-12-22T22:01:00Z"))).toBe(false);
  });
});

describe("titel en beschrijving", () => {
  it("zet de club en de route achter de racenaam", () => {
    expect(
      broadcastTitle({ eventTitle: "ZRL 2026/27 · R2 · W6 · B3", clubShortName: "ZWB", routeName: "Douce France" }),
    ).toBe("ZRL 2026/27 · R2 · W6 · B3 · ZWB · Douce France");
  });

  it("herhaalt de club niet en laat < en > weg, die weigert YouTube", () => {
    expect(broadcastTitle({ eventTitle: "ZWB <Sprint> Cup", clubShortName: "ZWB" })).toBe("ZWB Sprint Cup");
  });

  it("blijft binnen honderd tekens", () => {
    const title = broadcastTitle({ eventTitle: "x".repeat(150), clubShortName: "ZWB" });
    expect(title.length).toBe(100);
    expect(title.endsWith("…")).toBe(true);
  });

  it("noemt start in Nederlandse tijd, route met rondes en de live stand", () => {
    const text = broadcastDescription({
      eventTitle: "ZRL 2026/27 · R2 · W6 · B3",
      startAt: RACE.start_at,
      routeName: "Douce France",
      laps: 3,
      clubName: "ZWB Cycling",
      liveStandUrl: "https://example.org/live/zrl/abc",
    });
    expect(text).toContain("Start: dinsdag 22 december om 20:00");
    expect(text).toContain("Route: Douce France (3 rondes)");
    expect(text).toContain("Live stand: https://example.org/live/zrl/abc");
    expect(text.endsWith("ZWB Cycling")).toBe(true);
  });

  it("bouwt de speler op youtube-nocookie en accepteert alleen echte video-ID's", () => {
    expect(streamEmbedUrl("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?playsinline=1&rel=0",
    );
    expect(isVideoId("dQw4w9WgXcQ")).toBe(true);
    expect(isVideoId('x"><script>')).toBe(false);
  });
});

describe("OAuth", () => {
  it("vraagt offline toegang met de youtube-scope", () => {
    const url = new URL(youtubeAuthorizeUrl(CONFIG, "https://app.example/api/youtube/callback", "staat"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("scope")).toBe(YOUTUBE_SCOPE);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("staat");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example/api/youtube/callback");
  });

  it("rekent de vervaltijd met een minuut marge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(200, { access_token: "a", refresh_token: "r", expires_in: 3600, scope: YOUTUBE_SCOPE })),
    );
    const tokens = await exchangeYouTubeCode(CONFIG, "code", "https://x/cb", new Date("2026-11-18T12:00:00Z"));
    expect(tokens.refreshToken).toBe("r");
    expect(tokens.expiresAt.toISOString()).toBe("2026-11-18T12:59:00.000Z");
    expect(hasYouTubeScope(tokens.scope)).toBe(true);
  });

  it("herkent een ingetrokken of verlopen koppeling", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(400, { error: "invalid_grant" })));
    await expect(refreshYouTubeToken(CONFIG, "r")).rejects.toBeInstanceOf(YouTubeGrantRevokedError);
  });

  it("stuurt alleen terug naar een pad in de app", () => {
    expect(safeReturnPath("/events/abc", "/profiel")).toBe("/events/abc");
    expect(safeReturnPath("https://evil.example", "/profiel")).toBe("/profiel");
    expect(safeReturnPath("//evil.example", "/profiel")).toBe("/profiel");
    expect(safeReturnPath("/\\evil.example", "/profiel")).toBe("/profiel");
    expect(safeReturnPath(null, "/profiel")).toBe("/profiel");
  });
});

describe("YouTube-aanroepen", () => {
  it("maakt een openbare uitzending met auto-start en insluiten, en koppelt hem aan de stream", async () => {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL | string, init?: RequestInit) => {
        calls.push({
          url: String(url),
          method: init?.method ?? "GET",
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        });
        return String(url).includes("/bind") ? json(200, { id: "vid12345678" }) : json(200, { id: "vid12345678" });
      }),
    );
    const id = await createBoundBroadcast("token", "stream-1", {
      title: "Titel",
      description: "Tekst",
      scheduledStart: new Date("2026-12-22T18:50:00Z"),
      privacy: "public",
    });
    expect(id).toBe("vid12345678");
    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toMatchObject({
      snippet: { title: "Titel", scheduledStartTime: "2026-12-22T18:50:00.000Z" },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      contentDetails: { enableAutoStart: true, enableAutoStop: true, enableEmbed: true },
    });
    const bind = new URL(calls[1].url);
    expect(bind.pathname).toBe("/youtube/v3/liveBroadcasts/bind");
    expect(bind.searchParams.get("id")).toBe("vid12345678");
    expect(bind.searchParams.get("streamId")).toBe("stream-1");
  });

  it("ruimt de uitzending op als koppelen aan de stream mislukt", async () => {
    const methods: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL | string, init?: RequestInit) => {
        methods.push(`${init?.method} ${new URL(String(url)).pathname}`);
        if (String(url).includes("/bind")) return json(403, { error: { errors: [{ reason: "forbidden" }] } });
        if (init?.method === "DELETE") return new Response(null, { status: 204 });
        return json(200, { id: "vid12345678" });
      }),
    );
    await expect(
      createBoundBroadcast("token", "stream-1", {
        title: "T",
        description: "",
        scheduledStart: new Date(),
        privacy: "public",
      }),
    ).rejects.toBeInstanceOf(YouTubeApiError);
    expect(methods).toEqual([
      "POST /youtube/v3/liveBroadcasts",
      "POST /youtube/v3/liveBroadcasts/bind",
      "DELETE /youtube/v3/liveBroadcasts",
    ]);
  });

  it("hergebruikt een eerder aangemaakte stream, zodat de sleutel gelijk blijft", async () => {
    const fetchMock = vi.fn(async (url: URL | string) => {
      const u = new URL(String(url));
      if (u.searchParams.get("id") === "weg") return json(200, { items: [] });
      if (u.searchParams.get("mine") === "true") {
        return json(200, { items: [{ id: "oud", snippet: { title: STREAM_TITLE } }] });
      }
      return json(200, { id: "nieuw" });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await ensureReusableStream("token", "weg")).toBe("oud");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maakt een herbruikbare stream als er nog geen is", async () => {
    let body: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL | string, init?: RequestInit) => {
        if (init?.method === "POST") {
          body = JSON.parse(String(init.body));
          return json(200, { id: "nieuw" });
        }
        return json(200, { items: [] });
      }),
    );
    expect(await ensureReusableStream("token", null)).toBe("nieuw");
    expect(body).toMatchObject({ snippet: { title: STREAM_TITLE }, contentDetails: { isReusable: true } });
  });

  it("legt bekende YouTube-fouten in gewone woorden uit", () => {
    expect(youtubeErrorMessage(new YouTubeApiError("x", 403, "liveStreamingNotEnabled"))).toBe(
      "Livestreamen staat nog niet aan op je YouTube-kanaal.",
    );
    expect(youtubeErrorMessage(new YouTubeApiError("x", 403, "quotaExceeded"))).toContain("morgen");
    expect(youtubeErrorMessage(new Error("netwerk"))).toBe("YouTube is nu niet bereikbaar.");
  });
});

describe("meldingen na het koppelen", () => {
  it("toont alleen vaste teksten, nooit tekst uit de link", async () => {
    const { youtubeConnectErrorText } = await import("@/lib/youtube-live/oauth");
    expect(youtubeConnectErrorText("geen-kanaal")).toBe("Dit Google-account heeft geen YouTube-kanaal.");
    expect(youtubeConnectErrorText("Bel dit nummer")).toBeNull();
    expect(youtubeConnectErrorText("toString")).toBeNull();
    expect(youtubeConnectErrorText(null)).toBeNull();
  });
});
