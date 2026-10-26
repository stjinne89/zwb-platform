import { describe, expect, it } from "vitest";
import { athletePhysique } from "@/lib/intervals/client";

// De ingestelde FTP en de eFTP uit het vermogensmodel zijn twee getallen. Tot
// 2026-10-22 ging het model voor en kwam de eFTP als "ingestelde FTP" in het
// profiel terecht.
describe("athletePhysique", () => {
  it("geeft de ingestelde FTP en houdt de eFTP apart", () => {
    const physique = athletePhysique({
      id: "i1",
      ftp: 250,
      sportSettings: [
        { types: ["Ride", "VirtualRide"], ftp: 280, mmp_model: { ftp: 265 }, weight: 72 },
      ],
    });
    expect(physique).toEqual({ ftpWatts: 280, eftpWatts: 265, weightKg: 72 });
  });

  it("valt terug op indoor-FTP en de athlete-FTP, nooit op het model", () => {
    expect(
      athletePhysique({
        id: "i1",
        sportSettings: [{ types: ["Ride"], indoor_ftp: 270, mmp_model: { ftp: 300 } }],
      }).ftpWatts,
    ).toBe(270);
    expect(
      athletePhysique({
        id: "i1",
        ftp: 255,
        sportSettings: [{ types: ["Ride"], mmp_model: { ftp: 300 } }],
      }).ftpWatts,
    ).toBe(255);
    expect(
      athletePhysique({ id: "i1", sportSettings: [{ types: ["Ride"], mmp_model: { ftp: 300 } }] }),
    ).toMatchObject({ ftpWatts: null, eftpWatts: 300 });
    expect(athletePhysique(null)).toEqual({ ftpWatts: null, eftpWatts: null, weightKg: null });
  });
});
