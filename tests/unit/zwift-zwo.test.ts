import { describe, expect, it } from "vitest";
import { isZwiftWorkoutUrl, summarizeZwo } from "@/lib/zwift/zwo";

function zwo(steps: string, sport = "bike") {
  return `<workout_file>
  <author>ZWB</author>
  <name>Test &amp; warming-up</name>
  <sportType>${sport}</sportType>
  <workout>
${steps}
  </workout>
</workout_file>`;
}

describe("summarizeZwo", () => {
  it("telt vaste stappen kwadratisch gemiddeld", () => {
    const summary = summarizeZwo(
      zwo(`<SteadyState Duration="600" Power="0.8"><textevent timeoffset="0" message="Go"/></SteadyState>
<SteadyState Duration="600" Power=".60"></SteadyState>`),
    );
    // √((0,64 + 0,36) / 2) = 0,707
    expect(summary).toEqual({ name: "Test & warming-up", seconds: 1200, pct: 71 });
  });

  it("rekent een oplopende stap en herhalingen mee", () => {
    const summary = summarizeZwo(
      zwo(`<Warmup Duration="300" PowerLow="0.5" PowerHigh="0.7"/>
<IntervalsT Repeat="3" OnDuration="60" OffDuration="60" OnPower="1.2" OffPower="0.5"/>`),
    );
    // (300·0,3633 + 180·1,44 + 180·0,25) / 660 = 0,626; √ = 0,791
    expect(summary).toMatchObject({ seconds: 660, pct: 79 });
  });

  it("telt vrij rijden als het midden van de duurband", () => {
    const summary = summarizeZwo(
      zwo(`<FreeRide Duration="600" FlatRoad="0"/>
<SteadyState Duration="600" Power="0.6"/>`),
    );
    // √((0,675² + 0,6²) / 2) = 0,639
    expect(summary).toMatchObject({ seconds: 1200, pct: 64 });
  });

  it("negeert hardloopworkouts en bestanden zonder stappen", () => {
    expect(summarizeZwo(zwo(`<SteadyState Duration="600" Power="0.8"/>`, "run"))).toBeNull();
    expect(summarizeZwo(zwo(""))).toBeNull();
    expect(summarizeZwo("<html>niet gevonden</html>")).toBeNull();
  });

  it("slaat een vermogen over dat geen fractie van FTP is", () => {
    const summary = summarizeZwo(zwo(`<SteadyState Duration="600" Power="250"/>`));
    // Valt terug op vrij rijden: 0,675.
    expect(summary?.pct).toBe(Math.round(Math.sqrt(0.675 * 0.675) * 100));
  });
});

describe("isZwiftWorkoutUrl", () => {
  it("haalt alleen bestanden van cdn.zwift.com op", () => {
    expect(isZwiftWorkoutUrl("https://cdn.zwift.com/events/upload/workouts/TwentyTorch.xml")).toBe(true);
    expect(isZwiftWorkoutUrl("http://cdn.zwift.com/x.zwo")).toBe(false);
    expect(isZwiftWorkoutUrl("https://example.com/x.zwo")).toBe(false);
    expect(isZwiftWorkoutUrl("")).toBe(false);
  });
});
