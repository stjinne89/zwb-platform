// ZWBriljant: de recordsteen, de grootste steen in de galerij (eigenaar, 2026-10-21).
// Elk onderdeel op de hoogste gepubliceerde waarde. Diamant (900) is haalbaar, de
// records liggen ver daarboven: de schaal loopt na Diamant met dezelfde stap door.
// Bij een record met een bekende houder staat diens naam erbij. Profs publiceren
// zelden, dus de records zijn onderbouwde berekeningen; de bronnen staan in
// docs/zwbriljant-onderzoek.md ("De records").

import type { PowerDuration, Sex } from "./norms";
import type { BriljantInput, Facet } from "./score";
import { briljantView, type BriljantView } from "./view";

/**
 * De records in W/kg; voor vrouwen naar het aandeel van de vrouwelijke profs. De
 * minuut en 5 minuten liggen sinds 2026-10-27 boven de beste 10% van 144 profs
 * (Valenzuela 2022: 11,3 en 7,7); eerst 11,2 en 7,6, en dat kon geen record zijn.
 */
const POWER_RECORDS: Record<"man" | "vrouw", Record<PowerDuration, number>> = {
  man: { s15: 19.5, m1: 11.5, m5: 7.8, m20: 7.1 },
  vrouw: { s15: 15.6, m1: 9.45, m5: 6.55, m20: 6.05 },
};
/**
 * CTL van de WorldTour in het seizoen en het maximum van ZRS. Durability: het
 * 20-minutenrecord na 10 kJ/kg met het verval van de beste profs (0,7% per
 * 10 kJ/kg, Mateo-March 2022), als test zodat het voor het hele punt telt.
 */
const CTL_RECORD = 150;
const ZRS_RECORD = 1000;
const DURABILITY_RECORD_LOSS = 0.007;

/** De houder bij een record, alleen waar die bekend is; de records voor mannen. */
export const RECORD_HOLDERS: Partial<Record<Facet, string>> = {
  // Plateau de Beille, Tour 2024: 6,85 tot 7,0 W/kg over 38 minuten (Berg 2025).
  drempel: "Tadej Pogačar",
  // Tour 2020: 7,2 W/kg over 5 minuten in een rit van vier uur (Stages).
  vo2max: "Tadej Pogačar",
};

/** De recordsteen voor het geslacht van de kijker; houders alleen bij de mannen. */
export function recordView(sex: Sex | null): { view: BriljantView; holders: Partial<Record<Facet, string>> } {
  const power = POWER_RECORDS[sex === "vrouw" ? "vrouw" : "man"];
  const input: BriljantInput = {
    sex,
    // Met 1 kg zijn watts W/kg en 10 kJ precies 10 kJ/kg.
    weightKg: 1,
    power: { ...power },
    fatigue: [],
    durabilityTest: { day: "", afterKj: 10, freshWatts: power.m20, fatiguedWatts: power.m20 * (1 - DURABILITY_RECORD_LOSS) },
    ctl: CTL_RECORD,
    zrs: ZRS_RECORD,
  };
  return {
    view: briljantView({ seed: "records", input, consistency: null }),
    holders: sex === "vrouw" ? {} : RECORD_HOLDERS,
  };
}
