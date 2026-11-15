import { describe, expect, it } from "vitest";
import {
  intervalsFtpChangedSince,
  intervalsFtpSetting,
  pickFtp,
  type FtpRide,
  type IntervalsFtpSetting,
} from "@/lib/training/ftp-source";

const ride = (date: string, ftpWatts: number, type = "VirtualRide"): FtpRide => ({
  date,
  type,
  ftpWatts,
});

const setting = (ftpWatts: number, rides: IntervalsFtpSetting["rides"] = "all"): IntervalsFtpSetting => ({
  ftpWatts,
  rides,
  types: [],
});

describe("intervalsFtpSetting", () => {
  it("neemt de buiten-FTP en telt alle fietsritten als er geen aparte binnen-FTP is", () => {
    expect(
      intervalsFtpSetting({ id: "i1", sportSettings: [{ types: ["Ride", "VirtualRide"], ftp: 280 }] }),
    ).toEqual({ ftpWatts: 280, rides: "all", types: ["Ride", "VirtualRide"] });
  });

  it("telt alleen buitenritten als de binnen-FTP afwijkt", () => {
    expect(
      intervalsFtpSetting({ id: "i1", sportSettings: [{ types: ["Ride"], ftp: 125, indoor_ftp: 222 }] }),
    ).toMatchObject({ ftpWatts: 125, rides: "outdoor" });
  });

  it("valt terug op de binnen-FTP en dan op de athlete-FTP", () => {
    expect(
      intervalsFtpSetting({ id: "i1", sportSettings: [{ types: ["Ride"], indoor_ftp: 222 }] }),
    ).toMatchObject({ ftpWatts: 222, rides: "indoor" });
    expect(intervalsFtpSetting({ id: "i1", ftp: 250 })).toMatchObject({ ftpWatts: 250, rides: "all" });
    expect(intervalsFtpSetting(null)).toBeNull();
  });
});

describe("intervalsFtpChangedSince", () => {
  it("ziet een wijziging als een rit vanaf de testdag nog met het oude getal rekende", () => {
    // Test op 27 oktober, de testrit nog op 250, daarna 258 ingesteld.
    const rides = [ride("2026-10-27", 250), ride("2026-11-01", 258)];
    expect(intervalsFtpChangedSince(rides, setting(258), "2026-10-27")).toBe(true);
  });

  it("ziet geen wijziging als alle ritten sinds de test met de huidige FTP rekenden", () => {
    // Test 189, intervals.icu stond voor en na de test op 222.
    const rides = [ride("2026-11-04", 222), ride("2026-11-12", 222)];
    expect(intervalsFtpChangedSince(rides, setting(222), "2026-11-04")).toBe(false);
  });

  it("negeert ritten van vóór de test", () => {
    expect(intervalsFtpChangedSince([ride("2026-10-01", 240)], setting(250), "2026-10-16")).toBe(false);
  });

  it("telt een afwijkend getal zonder rit op de huidige FTP niet als wijziging", () => {
    // Zwift-ritten op 222 terwijl de buiten-FTP 125 is: geen bewijs van een wijziging.
    const zwift = [ride("2026-11-04", 222), ride("2026-11-12", 222)];
    expect(intervalsFtpChangedSince(zwift, setting(125), "2026-11-04")).toBe(false);
    // Ook een wijziging na de laatste rit telt pas vanaf de eerste rit met het nieuwe getal.
    expect(intervalsFtpChangedSince([ride("2026-11-10", 300)], setting(310), "2026-11-05")).toBe(false);
    expect(
      intervalsFtpChangedSince([ride("2026-11-10", 300), ride("2026-11-11", 310)], setting(310), "2026-11-05"),
    ).toBe(true);
  });

  it("kijkt naar de volgorde: eerst het oude getal, dan het nieuwe", () => {
    // Op de huidige FTP, daarna een afwijkende rit: geen overgang naar de instelling.
    const rides = [ride("2026-11-06", 300), ride("2026-11-08", 280)];
    expect(intervalsFtpChangedSince(rides, setting(300), "2026-11-05")).toBe(false);
  });

  it("laat hardloopritten en hun eigen FTP buiten beschouwing", () => {
    const rides = [ride("2026-10-20", 350, "Run"), ride("2026-10-21", 355, "Ride")];
    expect(intervalsFtpChangedSince(rides, setting(355), "2026-10-09")).toBe(false);
  });

  it("negeert Zwift-ritten als die met een aparte binnen-FTP rekenen", () => {
    const rides = [ride("2026-11-07", 222, "VirtualRide")];
    expect(intervalsFtpChangedSince(rides, setting(125, "outdoor"), "2026-11-04")).toBe(false);
    const outdoor = [...rides, ride("2026-11-08", 120, "Ride"), ride("2026-11-09", 125, "Ride")];
    expect(intervalsFtpChangedSince(outdoor, setting(125, "outdoor"), "2026-11-04")).toBe(true);
  });

  it("volgt de ritsoorten van de instelling als die bekend zijn", () => {
    const only = { ftpWatts: 300, rides: "all" as const, types: ["Ride"] };
    expect(intervalsFtpChangedSince([ride("2026-11-08", 280, "VirtualRide")], only, "2026-11-01")).toBe(false);
  });
});

describe("pickFtp", () => {
  const base = { rides: [] as FtpRide[], eftpWatts: 260, profileFtpWatts: 240 };

  it("houdt de test vast zolang intervals.icu daarna niet is bijgesteld", () => {
    expect(
      pickFtp({
        ...base,
        test: { ftpWatts: 189, testedOn: "2026-11-04" },
        intervals: setting(222),
        rides: [ride("2026-11-04", 222)],
      }),
    ).toEqual({ ftpWatts: 189, source: "test", testedOn: "2026-11-04" });
  });

  it("neemt intervals.icu als de FTP daar na de test is bijgesteld", () => {
    expect(
      pickFtp({
        ...base,
        test: { ftpWatts: 218, testedOn: "2026-11-05" },
        intervals: setting(215),
        rides: [ride("2026-11-05", 192), ride("2026-11-07", 215)],
      }),
    ).toEqual({ ftpWatts: 215, source: "intervals", testedOn: "2026-11-05" });
  });

  it("valt zonder test terug op intervals.icu, dan de eFTP, dan het profiel", () => {
    expect(pickFtp({ ...base, test: null, intervals: setting(270) })).toMatchObject({
      ftpWatts: 270,
      source: "intervals",
      testedOn: null,
    });
    expect(pickFtp({ ...base, test: null, intervals: null })).toMatchObject({ ftpWatts: 260, source: "eftp" });
    expect(pickFtp({ ...base, test: null, intervals: null, eftpWatts: null })).toMatchObject({
      ftpWatts: 240,
      source: "profile",
    });
    expect(
      pickFtp({ ...base, test: null, intervals: null, eftpWatts: null, profileFtpWatts: null }),
    ).toEqual({ ftpWatts: null, source: null, testedOn: null });
  });

  it("laat een hogere eFTP een test nooit verdringen", () => {
    expect(
      pickFtp({ ...base, eftpWatts: 400, test: { ftpWatts: 300, testedOn: "2026-10-01" }, intervals: null }),
    ).toMatchObject({ ftpWatts: 300, source: "test" });
  });
});
