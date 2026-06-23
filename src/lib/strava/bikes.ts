// Gedeelde helpers voor het tonen van Strava-fietsen op profielen.

export type StravaBikeRow = {
  id: string;
  name: string | null;
  brand_model: string | null;
  distance_m: number | string;
  retired: boolean;
  image_url: string | null;
  show_on_profile: boolean | null;
  source: "strava" | "manual";
};

export function hasBikeDistance(distanceM: number | string): boolean {
  return (Number(distanceM) || 0) > 0;
}

/** Effectieve zichtbaarheid: expliciete keuze, anders tonen tenzij gearchiveerd. */
export function bikeShownOnProfile(b: {
  show_on_profile: boolean | null;
  retired: boolean;
}): boolean {
  return b.show_on_profile ?? !b.retired;
}

export function bikeName(b: {
  name: string | null;
  brand_model: string | null;
}): string {
  return b.name?.trim() || b.brand_model?.trim() || "Fiets";
}

export function formatBikeDistance(distanceM: number | string): string {
  const km = (Number(distanceM) || 0) / 1000;
  return `${km.toLocaleString("nl-NL", { maximumFractionDigits: 0 })} km`;
}
