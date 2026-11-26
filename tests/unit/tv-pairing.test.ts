import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  codeFromBytes,
  deviceExpired,
  formatCode,
  normalizeCode,
  shouldTouch,
  tvNight,
} from "@/lib/tv/pairing";

describe("codeFromBytes", () => {
  it("geeft zes tekens uit het alfabet", () => {
    const code = codeFromBytes(new Uint8Array([0, 30, 31, 255, 128, 7]));
    expect(code).toHaveLength(6);
    for (const char of code) expect(CODE_ALPHABET).toContain(char);
    // 31 tekens: 31 en 0 vallen samen.
    expect(code[0]).toBe(code[2]);
  });

  it("kent geen tekens die op elkaar lijken", () => {
    for (const char of "01ILO") expect(CODE_ALPHABET).not.toContain(char);
  });

  it("weigert te weinig bytes", () => {
    expect(() => codeFromBytes(new Uint8Array(5))).toThrow();
  });

  it("past op de check van de tabel", () => {
    const code = codeFromBytes(crypto.getRandomValues(new Uint8Array(6)));
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
  });
});

describe("normalizeCode", () => {
  it("haalt spaties en streepjes weg en maakt hoofdletters", () => {
    expect(normalizeCode(" k7m 4qx ")).toBe("K7M4QX");
    expect(normalizeCode("K7M-4QX")).toBe("K7M4QX");
  });

  it("weigert een verkeerde lengte of een vreemd teken", () => {
    expect(normalizeCode("K7M4Q")).toBeNull();
    expect(normalizeCode("K7M4QXA")).toBeNull();
    expect(normalizeCode("K7M4Q0")).toBeNull();
    expect(normalizeCode("")).toBeNull();
    expect(normalizeCode(null)).toBeNull();
  });
});

describe("formatCode", () => {
  it("zet een spatie in het midden", () => {
    expect(formatCode("K7M4QX")).toBe("K7M 4QX");
  });
});

describe("deviceExpired en shouldTouch", () => {
  const now = new Date("2026-11-26T20:00:00Z");

  it("vervalt na negentig dagen niet kijken", () => {
    expect(deviceExpired("2026-08-27T19:00:00Z", now)).toBe(true);
    expect(deviceExpired("2026-09-01T20:00:00Z", now)).toBe(false);
  });

  it("werkt laatst gekeken hooguit elk uur bij", () => {
    expect(shouldTouch("2026-11-26T19:30:00Z", now)).toBe(false);
    expect(shouldTouch("2026-11-26T18:30:00Z", now)).toBe(true);
  });
});

describe("tvNight", () => {
  it("is overdag en 's avonds de dag zelf, in Amsterdam", () => {
    expect(tvNight(new Date("2026-11-26T18:32:00Z"))).toBe("2026-11-26");
    // 23:30 UTC is al 00:30 de volgende dag in Amsterdam: nog de avond ervoor.
    expect(tvNight(new Date("2026-11-26T23:30:00Z"))).toBe("2026-11-26");
  });

  it("hoort tot 04:00 bij de avond ervoor", () => {
    expect(tvNight(new Date("2026-11-27T02:59:00Z"))).toBe("2026-11-26");
    expect(tvNight(new Date("2026-11-27T03:00:00Z"))).toBe("2026-11-27");
  });

  it("klopt in de zomertijd", () => {
    // 01:30 UTC is 03:30 in Amsterdam (zomer): nog de avond ervoor.
    expect(tvNight(new Date("2026-07-10T01:30:00Z"))).toBe("2026-07-09");
    expect(tvNight(new Date("2026-07-10T02:30:00Z"))).toBe("2026-07-10");
  });
});
