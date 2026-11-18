import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// De speler en het YouTube-blok op het profiel (livestreams, 0338), als HTML
// op de server. Niet in een browser bekeken.

vi.mock("@/app/(app)/_actions/livestream", () => ({
  removeStream: vi.fn(),
  revealStreamKey: vi.fn(),
  disconnectYouTube: vi.fn(),
  prepareStream: vi.fn(),
  pairStreamHelper: vi.fn(),
  unpairStreamHelper: vi.fn(),
  streamHelperCommand: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));

const { StreamPlayer } = await import("@/components/livestream/stream-player");
const { YouTubeSection } = await import("@/app/(app)/profiel/_components/youtube-section");

const STREAMS = [
  { id: "s1", name: "Anna", embedUrl: "https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?playsinline=1&rel=0", watchUrl: "https://www.youtube.com/watch?v=aaaaaaaaaaa" },
  { id: "s2", name: "Bram", embedUrl: "https://www.youtube-nocookie.com/embed/bbbbbbbbbbb?playsinline=1&rel=0", watchUrl: "https://www.youtube.com/watch?v=bbbbbbbbbbb" },
];

describe("StreamPlayer", () => {
  it("speelt de eerste stream af, zonder knoppen bij één stream", () => {
    const html = renderToStaticMarkup(createElement(StreamPlayer, { streams: [STREAMS[0]] }));
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/aaaaaaaaaaa?playsinline=1&amp;rel=0"');
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain("Anna");
    expect(html).not.toContain("Weghalen");
  });

  it("geeft bij meer streams een knop per lid, de eerste gekozen", () => {
    const html = renderToStaticMarkup(createElement(StreamPlayer, { streams: STREAMS, removableIds: ["s1"] }));
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/aria-selected="true"[^>]*>Anna/);
    expect(html).toContain("Bram");
    expect(html).toContain("Weghalen");
  });

  it("toont niets zonder streams", () => {
    expect(renderToStaticMarkup(createElement(StreamPlayer, { streams: [] }))).toBe("");
  });
});

describe("YouTubeSection", () => {
  it("biedt koppelen aan zonder koppeling", () => {
    const html = renderToStaticMarkup(createElement(YouTubeSection, { connection: null, notice: null }));
    expect(html).toContain('href="/api/youtube/connect"');
    expect(html).toContain("YouTube koppelen");
  });

  it("toont het kanaal en de sleutelknop, maar niet de sleutel zelf", () => {
    const html = renderToStaticMarkup(
      createElement(YouTubeSection, {
        connection: { channel_title: "Mijn kanaal", needs_reconnect: false },
        notice: { ok: true, text: "YouTube is gekoppeld." },
      }),
    );
    expect(html).toContain("Mijn kanaal");
    expect(html).toContain("Streamsleutel tonen");
    expect(html).toContain("Ontkoppelen");
    expect(html).not.toContain("Server");
  });

  it("biedt de hulp-app aan, en toont de stand als die gekoppeld is", () => {
    const zonder = renderToStaticMarkup(
      createElement(YouTubeSection, { connection: { channel_title: "K", needs_reconnect: false }, notice: null }),
    );
    expect(zonder).toContain("Hulp-app koppelen");
    expect(zonder).toContain('href="/downloads/ZWB-stream-hulp-installeren.bat"');
    const met = renderToStaticMarkup(
      createElement(YouTubeSection, {
        connection: { channel_title: "K", needs_reconnect: false },
        notice: null,
        helper: { online: true, obsState: "streaming" },
      }),
    );
    expect(met).toContain("OBS streamt");
    expect(met).toContain("Nieuwe koppelcode");
    expect(met).toContain("Hulp-app ontkoppelen");
  });

  it("vraagt opnieuw koppelen als Google de koppeling liet vervallen", () => {
    const html = renderToStaticMarkup(
      createElement(YouTubeSection, { connection: { channel_title: "Mijn kanaal", needs_reconnect: true }, notice: null }),
    );
    expect(html).toContain("YouTube opnieuw koppelen");
  });
});

describe("HelperControls", () => {
  it("biedt starten aan, en stoppen zodra OBS streamt", async () => {
    const { HelperControls } = await import("@/components/livestream/helper-controls");
    const klaar = renderToStaticMarkup(createElement(HelperControls, { state: { online: true, obsState: "idle" } }));
    expect(klaar).toContain("OBS starten");
    expect(klaar).toContain("OBS klaar");
    const loopt = renderToStaticMarkup(createElement(HelperControls, { state: { online: true, obsState: "streaming" } }));
    expect(loopt).toContain("OBS stoppen");
    const uit = renderToStaticMarkup(createElement(HelperControls, { state: { online: false, obsState: "streaming" } }));
    expect(uit).toContain("Hulp-app staat niet aan");
    expect(uit).toContain("OBS starten");
  });
});
