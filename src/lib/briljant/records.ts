// ZWBriljant: de recordsteen, de grootste steen in de zaal (eigenaar, 2026-10-21).
// Elk onderdeel op de recordwaarde, dus de ijkwaarde van Diamant: precies 900
// punten. Bij een record met een bekende houder staat diens naam erbij. Profs
// publiceren zelden, dus de recordwaarden zijn onderbouwde berekeningen; de
// bronnen staan in docs/zwbriljant-onderzoek.md ("Recordwaarden achter Diamant").

import { CTL_ANCHORS, DURABILITY_ANCHORS, ZRS_ANCHORS, powerAnchors, type Sex } from "./norms";
import type { BriljantInput, Facet } from "./score";
import { briljantView, type BriljantView } from "./view";

/** De houder bij een record, alleen waar die bekend is; de normen voor mannen. */
export const RECORD_HOLDERS: Partial<Record<Facet, string>> = {
  // Plateau de Beille, Tour 2024: 6,85 tot 7,0 W/kg over 38 minuten (Berg 2025).
  drempel: "Tadej Pogačar",
  // Tour 2020: 7,2 W/kg over 5 minuten in een rit van vier uur (Stages).
  vo2max: "Tadej Pogačar",
};

const top = (levels: readonly number[]) => levels[levels.length - 1];

/** De recordsteen voor het geslacht van de kijker; houders alleen bij de mannen. */
export function recordView(sex: Sex | null): { view: BriljantView; holders: Partial<Record<Facet, string>> } {
  const decline = top(DURABILITY_ANCHORS.levels);
  const input: BriljantInput = {
    sex,
    // Durability is verval per 10 kJ/kg: met 1 kg na 10 kJ is het verlies in
    // procenten precies die waarde.
    weightKg: 1,
    power: {
      s15: top(powerAnchors("s15", sex).levels),
      m1: top(powerAnchors("m1", sex).levels),
      m5: top(powerAnchors("m5", sex).levels),
      m20: top(powerAnchors("m20", sex).levels),
    },
    fatigue: [{ afterKj: 10, freshWatts: 100, fatiguedWatts: 100 - decline }],
    ctl: top(CTL_ANCHORS.levels),
    zrs: top(ZRS_ANCHORS.levels),
  };
  return {
    view: briljantView({ seed: "records", input, consistency: null }),
    holders: sex === "vrouw" ? {} : RECORD_HOLDERS,
  };
}
