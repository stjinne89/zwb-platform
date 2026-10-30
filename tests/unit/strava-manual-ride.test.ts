import { describe, expect, it } from "vitest";
import { manualRideRow, MANUAL_IMPORT_SOURCE } from "@/lib/strava/import";
import { manualRideWindow } from "@/lib/training/completion";
import { rideMetricsFromStrava } from "@/lib/training/ride-metrics";

const profileId = "00000000-0000-0000-0000-000000000001";
const now = new Date("2026-10-30T12:00:00Z");

function row(input: Partial<Parameters<typeof manualRideRow>[0]> = {}) {
  const result = manualRideRow(
    { date: "2026-10-29", time: "18:30", duration: "1:30", ...input },
    profileId,
    undefined,
    now,
  );
  if (!result.ok) throw new Error(result.error);
  return result.row;
}

describe("manualRideRow", () => {
  it("zet de Amsterdamse starttijd om naar UTC", () => {
    const ride = row();
    expect(ride.start_date).toBe("2026-10-29T17:30:00.000Z");
    expect(ride.achievement_week).toBe("2026-10-26");
    expect(ride.moving_time_seconds).toBe(5400);
    expect(ride.raw.import_source).toBe(MANUAL_IMPORT_SOURCE);
  });

  it("geeft een negatief id dat alleen aan lid en starttijd hangt", () => {
    const first = row({ distanceKm: "40" });
    const again = row({ distanceKm: "42,5" });
    expect(Number(first.id)).toBeLessThan(0);
    expect(again.id).toBe(first.id);
    expect(again.distance_m).toBe(42500);
    expect(row({ time: "18:31" }).id).not.toBe(first.id);
  });

  it("stempelt efforts_fetched_at, anders verwijdert de segment-inhaalslag de rit", () => {
    expect(row().efforts_fetched_at).toBe(now.toISOString());
  });

  it("leest duur als uu:mm of als minuten", () => {
    expect(row({ duration: "90" }).moving_time_seconds).toBe(5400);
    expect(row({ duration: "0:45" }).moving_time_seconds).toBe(2700);
    expect(row({ duration: "2u05" }).moving_time_seconds).toBe(7500);
  });

  it("telt ingevuld vermogen als gemeten, met NP voor de TSS", () => {
    const ride = row({ averageWatts: "200", normalizedWatts: "220" });
    expect(ride.raw).toMatchObject({
      average_watts: 200,
      weighted_average_watts: 220,
      device_watts: true,
      kilojoules: 1080,
    });
    const metrics = rideMetricsFromStrava(ride.raw, ride.moving_time_seconds, 250);
    expect(metrics.tssSource).toBe("power");
    expect(metrics.tss).toBe(116);
  });

  it("rekent zonder NP met het gemiddelde vermogen", () => {
    expect(row({ averageWatts: "180" }).raw.weighted_average_watts).toBe(180);
  });

  it("zet hartslag zonder vermogen niet op gemeten vermogen", () => {
    const ride = row({ averageHr: "142" });
    expect(ride.raw.average_heartrate).toBe(142);
    expect(ride.raw.device_watts).toBeUndefined();
  });

  it("markeert een binnenrit als trainer", () => {
    const ride = row({ indoor: true });
    expect(ride.trainer).toBe(true);
    expect(ride.name).toBe("Binnenrit");
  });

  it.each([
    [{ time: "25:00" }, "Vul datum en starttijd in."],
    [{ date: "29-10-2026" }, "Vul datum en starttijd in."],
    [{ duration: "" }, "Vul de duur in als uu:mm, bijvoorbeeld 1:30."],
    [{ duration: "1:75" }, "Vul de duur in als uu:mm, bijvoorbeeld 1:30."],
    [{ date: "2026-10-30", time: "12:00" }, "Deze rit is nog niet afgelopen."],
    [{ distanceKm: "-3" }, "Afstand klopt niet."],
    [{ distanceKm: "veel" }, "Afstand klopt niet."],
    [{ averageWatts: "5000" }, "Vermogen klopt niet."],
    [{ normalizedWatts: "200" }, "Vul ook het gemiddelde vermogen in."],
    [{ averageWatts: "200", normalizedWatts: "190" }, "NP kan niet lager zijn dan het gemiddelde vermogen."],
    [{ averageHr: "20" }, "Hartslag klopt niet."],
  ])("weigert %o", (input, error) => {
    const result = manualRideRow(
      { date: "2026-10-29", time: "18:30", duration: "1:30", ...input },
      profileId,
      undefined,
      now,
    );
    expect(result).toEqual({ ok: false, error });
  });
});

describe("manualRideWindow", () => {
  const workout = {
    scheduled_at: "2026-10-27T16:00:00Z",
    status: "planned",
    intensity: "endurance",
    origin: "plan",
  };

  it("loopt van de trainingsdag tot en met vandaag", () => {
    expect(manualRideWindow(workout, false, "2026-10-30")).toEqual({ maxDateKey: "2026-10-30" });
    expect(manualRideWindow(workout, false, "2026-10-27")).toEqual({ maxDateKey: "2026-10-27" });
  });

  it("houdt op na de week die reassignCandidates toestaat", () => {
    expect(manualRideWindow(workout, false, "2026-11-20")).toEqual({ maxDateKey: "2026-11-02" });
  });

  it.each([
    ["al gereden", { ...workout }, true, "2026-10-30"],
    ["nog niet aan de beurt", { ...workout }, false, "2026-10-26"],
    ["afgerond", { ...workout, status: "completed" }, false, "2026-10-30"],
    ["rustdag", { ...workout, intensity: "rest" }, false, "2026-10-30"],
    ["clubevent", { ...workout, origin: "event" }, false, "2026-10-30"],
  ])("niet bij een training die %s is", (_label, input, paired, today) => {
    expect(manualRideWindow(input, paired, today)).toBeNull();
  });
});
