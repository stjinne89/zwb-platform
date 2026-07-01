import { describe, expect, it } from "vitest";
import { summarizeTrainingReadiness, summarizeWellness } from "@/lib/training/wellness";

type Row = {
  date: string;
  resting_hr: number | null;
  hrv: number | null;
  sleep_secs: number | null;
  sleep_score: number | null;
  readiness: number | null;
  fatigue: number | null;
  stress: number | null;
  soreness: number | null;
  mood: number | null;
};

function row(date: string, readiness: number | null): Row {
  return {
    date,
    resting_hr: null,
    hrv: null,
    sleep_secs: null,
    sleep_score: null,
    readiness,
    fatigue: null,
    stress: null,
    soreness: null,
    mood: null,
  };
}

describe("summarizeWellness — readiness per apparaat", () => {
  it("laat een 0-100 readiness (Garmin/Oura) ongemoeid", () => {
    const rows = [row("2026-06-28", 82), row("2026-06-27", 79)];
    expect(summarizeWellness(rows, "garmin")!.readiness).toBe(82);
    expect(summarizeWellness(rows, "oura")!.readiness).toBe(82);
    // Zonder apparaat = huidig gedrag: 0-100.
    expect(summarizeWellness(rows)!.readiness).toBe(82);
  });

  it("rekent een Polar 'OK' (4) om naar de 0-100 range i.p.v. als 4/100 te lezen", () => {
    // Officiële schaal: 4 = OK. Mag niet als 4/100 (zwaar overtraind) lezen.
    const rows = [row("2026-06-28", 4), row("2026-06-27", 5)];
    const summary = summarizeWellness(rows, "polar")!;
    expect(summary.readiness).toBeGreaterThan(50);
    expect(summary.state).not.toBe("fatigued");
    expect(summary.note).toContain("Polar");
  });

  it("een lage Polar-waarde (1 = very poor) telt wel als vermoeid", () => {
    const summary = summarizeWellness([row("2026-06-28", 1)], "polar")!;
    expect(summary.state).toBe("fatigued");
  });

  it("een topscore op de Polar-schaal (6 = very good) telt als goed hersteld", () => {
    const rows = [row("2026-06-28", 6), row("2026-06-27", 5)];
    expect(summarizeWellness(rows, "polar")!.readiness).toBeGreaterThanOrEqual(75);
  });

  it("laat de ZWBeterWorden-readiness niet in recovery vallen door een Polar-'OK'", () => {
    const polarOk = summarizeWellness([row("2026-06-28", 4)], "polar");
    const readiness = summarizeTrainingReadiness({ tsb: 0, wellness: polarOk });
    // Vóór de fix zorgde de rauwe "4" voor een recovery-advies.
    expect(readiness.state).not.toBe("recovery");
  });

  it("zonder apparaat leest een rauwe Polar-'4' nog als laag (de oorspronkelijke bug)", () => {
    // Bevestigt waarom expliciete apparaatkeuze nodig is: zonder device kan de
    // app een integer-schaal niet onderscheiden van een echte 0-100 score.
    const summary = summarizeWellness([row("2026-06-28", 4)])!;
    expect(summary.state).toBe("fatigued");
  });
});
