import { describe, expect, it } from "vitest";
import {
  extractExternalLink,
  garminPointsAfter,
  garminSessionState,
  normalizeGarminPoint,
  parseGarminLink,
  parseWahooPage,
  wahooIsRiding,
} from "@/lib/live/external-livetrack";
import { gzipSync } from "node:zlib";
import { decodeWahooFitChunk, parseFitRecords, wahooPagePoints } from "@/lib/live/fit-records";
import { thinPoints } from "@/lib/live/external-refresh";
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

  it("Wahoo: status uit de data-attributen van de live-pagina", () => {
    const riding = parseWahooPage(
      '<div class="livetrack" data-live="true" data-seconds-since-update="42.5" data-workout-state="live">',
    );
    expect(riding).toEqual({ found: true, workoutState: "live", secondsSinceUpdate: 42.5 });
    expect(wahooIsRiding(riding)).toBe(true);

    const done = parseWahooPage(
      '<div class="livetrack" data-seconds-since-update="81861.7" data-workout-state="completed">',
    );
    expect(wahooIsRiding(done)).toBe(false);

    const stale = parseWahooPage('<div data-seconds-since-update="1200" data-workout-state="paused">');
    expect(wahooIsRiding(stale)).toBe(false);

    const gone = parseWahooPage('<div class="name">User Not Found</div>');
    expect(gone.found).toBe(false);
    expect(wahooIsRiding(gone)).toBe(false);
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

// Een minimale FIT-file: definitie van record (20) met tijd, positie, hoogte en
// snelheid, één volledig record en één met een gecomprimeerde tijd.
function fitFile(): Uint8Array {
  const FIT_EPOCH_S = 631065600;
  const t0 = Date.parse("2026-09-28T10:00:00Z") / 1000 - FIT_EPOCH_S;
  const semi = (deg: number) => Math.round(deg * (2 ** 31 / 180));
  const body: number[] = [];
  const u16 = (v: number) => body.push(v & 0xff, (v >> 8) & 0xff);
  const u32 = (v: number) => body.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);

  // Definitie, lokaal type 0.
  body.push(0x40, 0, 0);
  u16(20);
  body.push(5, 253, 4, 0x86, 0, 4, 0x85, 1, 4, 0x85, 2, 2, 0x84, 6, 2, 0x84);
  // Record 1.
  body.push(0x00);
  u32(t0);
  u32(semi(52.1));
  u32(semi(5.1));
  u16((12 + 500) * 5);
  u16(8333);
  // Record 2 met gecomprimeerde tijd: t0 + 3 s (tijdveld ongeldig).
  body.push(0x80 | ((t0 + 3) & 0x1f));
  u32(0xffffffff);
  u32(semi(52.1001));
  u32(semi(5.1001));
  u16(0xffff);
  u16(0xffff);

  const header = [14, 0x10, 0xeb, 0x07, 0, 0, 0, 0, 0x2e, 0x46, 0x49, 0x54, 0, 0];
  header[4] = body.length & 0xff;
  header[5] = (body.length >> 8) & 0xff;
  return new Uint8Array([...header, ...body, 0, 0]);
}

describe("Wahoo FIT-data", () => {
  it("leest records met tijd, positie, hoogte en snelheid", () => {
    const points = parseFitRecords(fitFile());
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({
      lat: 52.1,
      lng: 5.1,
      altitude: 12,
      speedKmh: 30,
      recordedAt: "2026-09-28T10:00:00.000Z",
    });
    expect(points[1]).toMatchObject({ altitude: null, speedKmh: null, recordedAt: "2026-09-28T10:00:03.000Z" });
  });

  it("pakt een livetrack_fit-chunk uit (4 bytes lengte + gzip) en leest de pagina", () => {
    const fit = fitFile();
    const length = Buffer.alloc(4);
    length.writeUInt32LE(fit.length);
    const chunk = Buffer.concat([length, gzipSync(fit)]).toString("base64");
    expect(decodeWahooFitChunk(chunk)).toHaveLength(2);
    const html = `<script>window.livetrack_fit = ["${chunk}","${chunk}"];</script>`;
    expect(wahooPagePoints(html).map((p) => p.recordedAt)).toEqual([
      "2026-09-28T10:00:00.000Z",
      "2026-09-28T10:00:03.000Z",
    ]);
    expect(decodeWahooFitChunk("geen-fit")).toEqual([]);
  });
});

describe("thinPoints", () => {
  const at = (s: number) => ({
    lat: 52,
    lng: 5,
    altitude: null,
    speedKmh: null,
    recordedAt: new Date(Date.parse("2026-09-28T10:00:00Z") + s * 1000).toISOString(),
  });

  it("houdt één punt per 10 s, gerekend vanaf het laatst opgeslagen punt", () => {
    const points = [0, 1, 2, 9, 10, 11, 25].map(at);
    expect(thinPoints(points, null).map((p) => p.recordedAt)).toEqual(
      [0, 10, 25].map((s) => at(s).recordedAt),
    );
    expect(thinPoints(points, at(5).recordedAt).map((p) => p.recordedAt)).toEqual(
      [25].map((s) => at(s).recordedAt),
    );
  });
});
