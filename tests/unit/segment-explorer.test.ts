import { describe, expect, it } from "vitest";
import { assessSegment, bearing, leaderboard, powerAt, targetTime, validTrack, windSpeed, type TrackPoint } from "@/lib/segments/explorer";
import { trackFromStreams } from "@/lib/segments/geometry-sync";

const flat: TrackPoint[] = [{ lat: 52, lon: 5, distance: 0, altitude: 10 }, { lat: 52.045, lon: 5, distance: 5000, altitude: 10 }];
const curve = [{ seconds: 15, watts: 700 }, { seconds: 60, watts: 450 }, { seconds: 300, watts: 330 }, { seconds: 1200, watts: 280 }, { seconds: 3600, watts: 240 }];
const input = { track: flat, curve, weight: 75, wind: { speedKmh: 0, directionFrom: 0 }, hazardous: false, targetSeconds: 600 };

describe("club leaderboard", () => {
  it("keeps one best elapsed time per rider and uses competition ranks for ties", () => {
    const result = leaderboard([{ profileId: "a", name: "A", seconds: 110 }, { profileId: "a", name: "A", seconds: 100 }, { profileId: "b", name: "B", seconds: 100 }, { profileId: "c", name: "C", seconds: 120 }, { profileId: "d", name: "D", seconds: NaN }]);
    expect(result.map((r) => [r.profileId, r.seconds, r.rank])).toEqual([["a",100,1],["b",100,1],["c",120,3]]);
    expect(targetTime(result,"a","record")).toBe(99);
    expect(targetTime(result,"a","podium")).toBeNull();
    expect(targetTime(result,"new","podium")).toBe(119);
  });
  it("does not use the current rider's own result as an opponent", () => {
    const board = leaderboard(["a","b","c","d"].map((profileId,i) => ({ profileId, name: profileId, seconds: 100+i*10 })));
    expect(targetTime(board,"a","record")).toBe(109);
    expect(targetTime(board,"c","podium")).toBe(129);
    expect(targetTime(board.slice(0,1),"a","record")).toBeNull();
  });
  it("does not truncate after 30 riders", () => {
    expect(leaderboard(Array.from({ length: 1005 }, (_, i) => ({ profileId: String(i), name:"Lid", seconds: 100+i }))).length).toBe(1005);
  });
});

describe("power and wind physics", () => {
  it("interpolates power in log time without extrapolation", () => {
    expect(powerAt([{ seconds: 10, watts: 400 }, { seconds: 1000, watts: 200 }],100)).toBeCloseTo(300);
    expect(powerAt(curve,1)).toBeNull(); expect(powerAt(curve,4000)).toBeNull();
  });
  it("headwind slows, tailwind speeds up and reversing direction reverses the effect", () => {
    const calm = windSpeed(300,0,84,0,{ speedKmh:0,directionFrom:0 })!;
    const head = windSpeed(300,0,84,0,{ speedKmh:20,directionFrom:0 })!;
    const tail = windSpeed(300,0,84,180,{ speedKmh:20,directionFrom:0 })!;
    expect(head).toBeLessThan(calm); expect(tail).toBeGreaterThan(calm);
    expect(windSpeed(300,0,84,90,{ speedKmh:20,directionFrom:0 })!).toBeLessThan(calm);
    expect(bearing(flat[0],flat[1])).toBeCloseTo(0);
  });
  it("a heavier rider is slower uphill at equal watts", () => {
    const wind = { speedKmh:0,directionFrom:0 };
    expect(windSpeed(300,0.06,95,0,wind)!).toBeLessThan(windSpeed(300,0.06,75,0,wind)!);
  });
  it("produces all three categories from the same sensitivity interval", () => {
    const result = assessSegment(input);
    expect(result.fastSeconds).toBeGreaterThan(0);
    expect(result.slowSeconds).toBeGreaterThan(result.fastSeconds!);
    expect(assessSegment({ ...input, targetSeconds: result.slowSeconds!+1 }).status).toBe("likely");
    expect(assessSegment({ ...input, targetSeconds: (result.fastSeconds!+result.slowSeconds!)/2 }).status).toBe("borderline");
    expect(assessSegment({ ...input, targetSeconds: result.fastSeconds!-1 }).status).toBe("unreachable");
  });
  it("never invents predictions for missing data, hazards or a short curve", () => {
    for (const change of [{ wind: null }, { weight: null }, { curve: [] }, { track: [] }, { hazardous: true }, { targetSeconds: null }, { curve: curve.slice(0,2) }]) {
      const result = assessSegment({ ...input, ...change });
      expect(result.status).toBe("unknown"); expect(result.fastSeconds).toBeNull();
    }
  });
  it("null altitude is not silently treated as sea level", () => {
    expect(trackFromStreams({ latlng:{data:[[52,5],[52.1,5]]}, distance:{data:[0,1000]}, altitude:{data:[null,null]} })).toEqual([]);
    expect(validTrack([{ ...flat[0] },{ ...flat[1],distance:0 }])).toBe(false);
  });
});
