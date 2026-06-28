// Gedeelde definities voor geneutraliseerde zones (kaart, profiel, editor).
// Een zone is een afstand-bereik op de route (start_km..end_km), geen punt.

export type EventZone = {
  startKm: number;
  endKm: number;
  label: string | null;
};

// Cyaan — onderscheidt zich van de klim-banden (groen/geel/rood/paars) en de
// grijze route-lijn.
export const ZONE_COLOR = "#0891b2";
export const ZONE_LABEL = "Neutralisatie";
