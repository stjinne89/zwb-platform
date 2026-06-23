// Gedeelde POI-definities (point of interest) voor kaart, profiel en formulier.

export type PoiType = "water" | "food" | "danger" | "view" | "info";

export const POI_TYPES: Record<
  PoiType,
  { label: string; emoji: string; color: string }
> = {
  water: { label: "Water", emoji: "💧", color: "#2563eb" },
  food: { label: "Eten", emoji: "🍌", color: "#16a34a" },
  danger: { label: "Gevaar", emoji: "⚠️", color: "#dc2626" },
  view: { label: "Uitzicht", emoji: "📷", color: "#7c3aed" },
  info: { label: "Info", emoji: "ℹ️", color: "#64748b" },
};

export const POI_TYPE_LIST: PoiType[] = [
  "water",
  "food",
  "danger",
  "view",
  "info",
];

export function isPoiType(value: unknown): value is PoiType {
  return typeof value === "string" && value in POI_TYPES;
}

// Een opgeslagen POI (zoals geladen + getoond op kaart).
export type EventPoi = {
  id: string;
  type: PoiType;
  label: string | null;
  lat: number;
  lng: number;
  createdBy: string | null;
};

// Een POI geprojecteerd op de route, voor plaatsing op het hoogteprofiel.
export type ProfilePoi = {
  id: string;
  type: PoiType;
  label: string | null;
  km: number;
};
