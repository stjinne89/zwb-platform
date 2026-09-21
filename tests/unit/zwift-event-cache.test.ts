import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapZwiftEventToRow } from "@/lib/zwift/event-cache";
import { zwiftSignupCount, type ZwiftEventApiRow } from "@/lib/events/external-scan";

// De fixture is met de hand geschreven, niet opgenomen: zwift.com is vanuit een
// ontwikkelomgeving niet altijd bereikbaar, en een echte opname zou bovendien
// morgen al verlopen zijn. De veldnamen komen uit ZwiftEventApiRow, dat al in
// productie op de echte API draait via scanZwiftEvents(). Wijkt de echte
// payload hiervan af, dan blijkt dat uit de knop "Test eventvenster" op
// /beheer/event-scan -- die rapporteert per veld hoe vaak hij aanwezig was.
const ROWS = JSON.parse(
  readFileSync(new URL("../fixtures/zwift/upcoming-events.json", import.meta.url), "utf8"),
) as ZwiftEventApiRow[];

describe("mapZwiftEventToRow", () => {
  it("mapt een groepsrit met pacegroepen", () => {
    const row = mapZwiftEventToRow(ROWS[0]);
    expect(row).not.toBeNull();
    expect(row).toMatchObject({
      event_id: 4812001,
      name: "ZHR Endurance Ride",
      event_type: "GROUP_RIDE",
      sport: "CYCLING",
      route_id: 2474227587,
      duration_seconds: 5400,
      series_name: "ZHR Endurance Series",
      total_signups: 184,
      external_url: "https://www.zwift.com/events/view/4812001",
    });
    expect(row!.event_start).toBe("2026-09-21T18:00:00.000Z");
  });

  it("leest de W/kg-band van elke subgroep uit", () => {
    const row = mapZwiftEventToRow(ROWS[0])!;
    expect(row.subgroups).toEqual([
      expect.objectContaining({ label: "C", minWkg: 2.5, maxWkg: 3.1, signups: 61 }),
      expect.objectContaining({ label: "D", minWkg: null, maxWkg: 2.5, signups: 123 }),
    ]);
  });

  it("neemt afstand en rondental van een race over", () => {
    const row = mapZwiftEventToRow(ROWS[1])!;
    expect(row.distance_m).toBe(24000);
    expect(row.laps).toBe(8);
    // Een duur van 0 is geen duur: dan moet de matcher hem uit de route afleiden.
    expect(row.duration_seconds).toBeNull();
  });

  it("weigert een besloten event", () => {
    expect(mapZwiftEventToRow(ROWS[2])).toBeNull();
  });

  it("weigert een hardloopevent", () => {
    // Op de eerste echte sync bleek ruim 40% van de kalender hardlopen. Die
    // kunnen nooit voorgesteld worden -- de trainingsmodule plant alleen
    // op-de-fiets werk -- en ze vervuilden de populariteitsverdeling per uurslot.
    expect(mapZwiftEventToRow(ROWS[3])).toBeNull();
  });

  it("bewaart een event zonder sportveld wél", () => {
    // Onbekend telt nooit als nee; dezelfde regel als in fit.ts.
    const { sport, ...zonderSport } = ROWS[0];
    void sport;
    expect(mapZwiftEventToRow(zonderSport)).not.toBeNull();
  });

  it("weigert een rij zonder id", () => {
    expect(mapZwiftEventToRow(ROWS[4])).toBeNull();
  });

  it("laat een ontbrekend inschrijvingsveld null, niet nul", () => {
    // Nul en onbekend mogen niet samenvallen: anders scoort elk event zonder dit
    // veld als het slechtst bezochte van zijn tijdslot.
    expect(mapZwiftEventToRow(ROWS[1])!.total_signups).toBeNull();
  });

  it("vult zwb_signups pas in de sync, niet in de mapper", () => {
    expect(mapZwiftEventToRow(ROWS[0])!.zwb_signups).toBeNull();
  });

  it("kort een lange omschrijving in", () => {
    const row = mapZwiftEventToRow({ ...ROWS[0], description: "x".repeat(2000) })!;
    expect(row.description).toHaveLength(600);
  });

  it("maakt van een lege omschrijving null", () => {
    expect(mapZwiftEventToRow({ ...ROWS[0], description: "   " })!.description).toBeNull();
  });
});

describe("zwiftSignupCount", () => {
  it("leest beide namen die Zwift gebruikt", () => {
    expect(zwiftSignupCount({ totalSignedUpCount: 12 })).toBe(12);
    expect(zwiftSignupCount({ totalEntrantCount: 7 })).toBe(7);
  });

  it("geeft null als geen enkele variant aanwezig is", () => {
    expect(zwiftSignupCount({})).toBeNull();
    expect(zwiftSignupCount({ totalSignedUpCount: null })).toBeNull();
  });

  it("houdt nul als nul", () => {
    expect(zwiftSignupCount({ totalSignedUpCount: 0 })).toBe(0);
  });
});
