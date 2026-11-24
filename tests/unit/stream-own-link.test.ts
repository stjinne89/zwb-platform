import { describe, expect, it } from "vitest";
import { checkOwnVideo, parseYouTubeVideoId } from "@/lib/youtube-live/own-stream";

// Een eigen YouTube-stream aan een race koppelen (2026-11-24, 0360).

describe("parseYouTubeVideoId", () => {
  it("haalt het video-ID uit de gangbare links", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/live/dQw4w9WgXcQ?feature=share",
      "www.youtube.com/live/dQw4w9WgXcQ",
      "  https://www.youtube.com/embed/dQw4w9WgXcQ  ",
    ]) {
      expect(parseYouTubeVideoId(link), link).toBe("dQw4w9WgXcQ");
    }
  });

  it("weigert kanaallinks, andere sites en onzin", () => {
    for (const link of [
      "https://www.youtube.com/@ZWBCycling/live",
      "https://www.youtube.com/channel/UC123",
      "https://www.twitch.tv/videos/123456789",
      "https://evil.example/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=<script>",
      "",
      "geen link",
    ]) {
      expect(parseYouTubeVideoId(link), link).toBeNull();
    }
  });
});

describe("checkOwnVideo", () => {
  const live = {
    id: "dQw4w9WgXcQ",
    snippet: { liveBroadcastContent: "upcoming", channelTitle: "Mijn kanaal" },
    status: { privacyStatus: "public", embeddable: true },
    liveStreamingDetails: { scheduledStartTime: "2026-11-24T19:30:00Z" },
  };

  it("neemt een openbare geplande, live of afgelopen livestream", () => {
    expect(checkOwnVideo(live)).toEqual({ ok: true, channelTitle: "Mijn kanaal", status: "gepland" });
    expect(checkOwnVideo({ ...live, snippet: { ...live.snippet, liveBroadcastContent: "live" } })).toMatchObject({
      ok: true,
      status: "live",
    });
    expect(
      checkOwnVideo({
        ...live,
        snippet: { ...live.snippet, liveBroadcastContent: "none" },
        liveStreamingDetails: { actualStartTime: "2026-11-24T19:30:00Z", actualEndTime: "2026-11-24T20:30:00Z" },
      }),
    ).toMatchObject({ ok: true, status: "afgelopen" });
  });

  it("weigert wat niet kan", () => {
    expect(checkOwnVideo(undefined).ok).toBe(false);
    expect(checkOwnVideo({ ...live, status: { privacyStatus: "unlisted", embeddable: true } }).ok).toBe(false);
    expect(checkOwnVideo({ ...live, status: { privacyStatus: "public", embeddable: false } }).ok).toBe(false);
    const { liveStreamingDetails: _gone, ...video } = live;
    void _gone;
    expect(checkOwnVideo({ ...video, snippet: { ...live.snippet, liveBroadcastContent: "none" } })).toEqual({
      ok: false,
      error: "Dit is geen livestream.",
    });
  });
});
