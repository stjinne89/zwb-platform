import { describe, expect, it } from "vitest";
import {
  externalProviderForUrl,
  extractExternalLink,
  garminPointsAfter,
  garminSessionState,
  normalizeGarminPoint,
  parseGarminLink,
  wahooPageState,
} from "@/lib/live/external-livetrack";
import {
  inboundDomain,
  mailAddressForCode,
  mailCodeFromRecipients,
  newMailCode,
  verifySvixSignature,
} from "@/lib/live/inbound-mail";

const GARMIN_URL =
  "https://livetrack.garmin.com/session/0f2c9b1e-1234-4bcd-9876-abcdef012345/token/9A8B7C6D5E";

describe("LiveTrack-links", () => {
  it("haalt de Garmin-link uit de HTML van de mail, niet de supportlinks", () => {
    const html = `<a href="https://support.garmin.com/nl-NL/">Help</a>
      <a href="${GARMIN_URL}">Bekijk LiveTrack</a>
      <a href="https://www.garmin.com/unsubscribe?x=1&amp;y=2">Afmelden</a>`;
    expect(extractExternalLink(html)).toEqual({ provider: "garmin", url: GARMIN_URL });
  });

  it("herkent een Wahoo-livelink en laat een afsluitende punt weg", () => {
    const text =
      "Follow my ride: https://www.wahooligan.com/users/live/abc123DEF. Cheers";
    expect(extractExternalLink(text)).toEqual({
      provider: "wahoo",
      url: "https://www.wahooligan.com/users/live/abc123DEF",
    });
  });

  it("negeert een mail zonder LiveTrack-link", () => {
    expect(
      extractExternalLink('<a href="https://www.wahoofitness.com/support">Support</a>'),
    ).toBeNull();
  });

  it("splitst een Garmin-link in sessie en token", () => {
    expect(parseGarminLink(GARMIN_URL)).toEqual({
      sessionId: "0f2c9b1e-1234-4bcd-9876-abcdef012345",
      token: "9A8B7C6D5E",
    });
    expect(parseGarminLink("https://livetrack.garmin.com/")).toBeNull();
  });

  it("bepaalt de bron van een geplakte link", () => {
    expect(externalProviderForUrl(GARMIN_URL)).toBe("garmin");
    expect(externalProviderForUrl("https://www.wahooligan.com/users/live/x1")).toBe("wahoo");
    expect(externalProviderForUrl("https://www.strava.com/beacon/1")).toBeNull();
  });
});

describe("Garmin-trackpoints", () => {
  it("leest het huidige formaat met position en dateTime", () => {
    expect(
      normalizeGarminPoint({
        dateTime: "2026-09-28T08:00:04.000Z",
        position: { lat: 51.5, lon: 5.05 },
        speedMetersPerSec: 8.333,
        altitude: 12.345,
      }),
    ).toEqual({
      lat: 51.5,
      lng: 5.05,
      altitude: 12.35,
      speedKmh: 30,
      recordedAt: "2026-09-28T08:00:04.000Z",
    });
  });

  it("leest het oude formaat met metaData en een tijd in milliseconden", () => {
    const point = normalizeGarminPoint({
      latitude: 51.6,
      longitude: 5.1,
      timestamp: Date.parse("2026-09-28T08:01:00Z"),
      metaData: { SPEED: "5", ELEVATION: "20" },
    });
    expect(point).toMatchObject({ lat: 51.6, lng: 5.1, speedKmh: 18, altitude: 20 });
    expect(point?.recordedAt).toBe("2026-09-28T08:01:00.000Z");
  });

  it("slaat punten zonder positie of op 0,0 over", () => {
    expect(normalizeGarminPoint({ dateTime: "2026-09-28T08:00:00Z" })).toBeNull();
    expect(
      normalizeGarminPoint({ dateTime: "2026-09-28T08:00:00Z", position: { lat: 0, lon: 0 } }),
    ).toBeNull();
  });

  it("geeft alleen punten na het laatst opgeslagen punt, oplopend", () => {
    const points = garminPointsAfter(
      {
        trackPoints: [
          { dateTime: "2026-09-28T08:00:08Z", position: { lat: 51.3, lon: 5 } },
          { dateTime: "2026-09-28T08:00:00Z", position: { lat: 51.1, lon: 5 } },
          { dateTime: "2026-09-28T08:00:04Z", position: { lat: 51.2, lon: 5 } },
        ],
      },
      "2026-09-28T08:00:00.000Z",
    );
    expect(points.map((p) => p.lat)).toEqual([51.2, 51.3]);
  });
});

describe("rit-status", () => {
  const now = Date.parse("2026-09-28T10:00:00Z");

  it("Garmin: live zolang zichtbaar en het einde niet voorbij", () => {
    expect(garminSessionState({ viewable: true, start: "2026-09-28T08:00:00Z" }, now).live).toBe(true);
    expect(garminSessionState({ viewable: true, end: "2026-09-28T09:00:00Z" }, now).live).toBe(false);
    expect(garminSessionState({ viewable: false }, now).live).toBe(false);
  });

  it("Wahoo: seconden sinds de laatste update, verlopen link of onbekend", () => {
    expect(wahooPageState('<div class="livetrack" data-seconds-since-update="42">')).toEqual({
      state: "live",
      secondsSinceUpdate: 42,
    });
    expect(wahooPageState('<div class="name">User Not Found</div>')).toEqual({ state: "ended" });
    expect(wahooPageState("<html></html>")).toEqual({ state: "unknown" });
  });
});

describe("persoonlijk clubadres", () => {
  it("maakt een code die in het adres past en er weer uit komt", () => {
    const code = newMailCode();
    expect(code).toMatch(/^[a-z2-7]{20}$/);
    const address = mailAddressForCode(code, "live.example.nl");
    expect(mailCodeFromRecipients([`Renner <${address.toUpperCase()}>`], "live.example.nl")).toBe(code);
  });

  it("haalt het domein uit een geplakt Resend-voorbeeldadres", () => {
    expect(inboundDomain("<anything>@abc123.resend.app")).toBe("abc123.resend.app");
    expect(inboundDomain(" Live.Example.nl ")).toBe("live.example.nl");
    expect(inboundDomain("<anything>")).toBeNull();
    expect(inboundDomain("")).toBeNull();
  });

  it("negeert adressen op een ander domein of zonder geldige code", () => {
    expect(mailCodeFromRecipients(["live-abcdefghijklmnopqrst@elders.nl"], "live.example.nl")).toBeNull();
    expect(mailCodeFromRecipients(["info@live.example.nl"], "live.example.nl")).toBeNull();
    expect(mailCodeFromRecipients(["live-kort@live.example.nl"], "live.example.nl")).toBeNull();
  });
});

describe("Svix-handtekening", () => {
  // Voorbeeld uit de Svix-documentatie.
  const secret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
  const headers = {
    id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
    timestamp: "1614265330",
    signature: "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
  };
  const body = '{"test": 2432232314}';

  it("accepteert een geldige handtekening", () => {
    expect(verifySvixSignature(secret, headers, body, 1614265330)).toBe(true);
  });

  it("weigert een gewijzigde body, een oude tijd of een ontbrekende header", () => {
    expect(verifySvixSignature(secret, headers, '{"test": 1}', 1614265330)).toBe(false);
    expect(verifySvixSignature(secret, headers, body, 1614265330 + 3600)).toBe(false);
    expect(verifySvixSignature(secret, { ...headers, signature: null }, body, 1614265330)).toBe(false);
  });
});
