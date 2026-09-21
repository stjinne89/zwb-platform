// Hoe lang doet dit lid over deze rit?
//
// Eén model, twee richtingen. De Zwift-matcher vraagt "hoe lang duurt dit
// event?" (afstand en hoogtemeters bekend, tijd gezocht); het routevoorstel voor
// buiten vraagt het omgekeerde (tijd bekend, afstand gezocht). Dat hoort dezelfde
// rekensom te zijn, anders stelt ZWB een buitenrit van twee uur voor die hij
// daarna zelf op anderhalf uur schat.
//
// Grof, en met opzet. Het is er om afstanden en duren op de goede orde van
// grootte te krijgen, niet om een plan mee te maken -- net als estimateSeconds in
// segment-suggestions.ts. Voor een écht doorgerekende rijtijd over een bekend
// hoogteprofiel bestaat src/lib/pacing.

/** Fiets plus uitrusting, voor het klimdeel van de schatting. */
export const BIKE_KG = 8;

/**
 * Luchtweerstandsconstante voor de vlakke snelheid, geijkt op Zwift: 200 W komt
 * hiermee op ongeveer 34 km/u uit. Zwift rijdt sneller dan de weg, dus buiten
 * valt dit aan de optimistische kant uit; zie OUTDOOR_SPEED_PENALTY.
 */
export const FLAT_DRAG_K = 0.24;

/**
 * Welk deel van het vermogen op een klim daadwerkelijk tegen de zwaartekracht
 * gaat; de rest verdwijnt in rol- en luchtweerstand.
 */
export const CLIMB_POWER_SHARE = 0.85;

/**
 * Buiten ben je bij hetzelfde vermogen langzamer dan in Zwift: kruisingen,
 * verkeerslichten, bochten, wind en slechter wegdek. Deze factor houdt het
 * voorstel eerlijk -- zonder hem stelt ZWB structureel te lange rondjes voor.
 */
export const OUTDOOR_SPEED_PENALTY = 0.88;

/** Vlakke snelheid in km/u bij een gegeven vermogen. */
export function flatSpeedKmh(watts: number, outdoor = false): number | null {
  if (!watts || watts <= 0) return null;
  const speed = Math.cbrt(watts / FLAT_DRAG_K) * 3.6;
  if (!Number.isFinite(speed) || speed <= 0) return null;
  return outdoor ? speed * OUTDOOR_SPEED_PENALTY : speed;
}

/** Seconden die het klimwerk kost, bovenop de vlakke tijd. */
export function climbSeconds(elevationM: number, watts: number, weightKg: number): number {
  if (!watts || watts <= 0 || elevationM <= 0) return 0;
  return ((weightKg + BIKE_KG) * 9.81 * elevationM) / (watts * CLIMB_POWER_SHARE);
}

/** Geschatte rijtijd in seconden over een afstand met hoogtemeters. */
export function rideSeconds(
  distanceKm: number,
  elevationM: number,
  watts: number | null,
  weightKg: number | null,
  outdoor = false,
): number | null {
  if (!watts || watts <= 0 || !weightKg || weightKg <= 0 || distanceKm <= 0) return null;
  const speed = flatSpeedKmh(watts, outdoor);
  if (speed === null) return null;
  return (distanceKm / speed) * 3600 + climbSeconds(elevationM, watts, weightKg);
}

/**
 * De omkering: welke afstand past in deze tijd, als de route gemiddeld
 * `elevationPerKm` hoogtemeters per kilometer heeft?
 *
 * t = d/v·3600 + (m·g·h·d) / (P·share)   met h = hoogtemeters per km
 * dus d = t / (3600/v + m·g·h / (P·share))
 */
export function distanceForSeconds(
  seconds: number,
  elevationPerKm: number,
  watts: number | null,
  weightKg: number | null,
  outdoor = false,
): number | null {
  if (!watts || watts <= 0 || !weightKg || weightKg <= 0 || seconds <= 0) return null;
  const speed = flatSpeedKmh(watts, outdoor);
  if (speed === null) return null;

  const flatCostPerKm = 3600 / speed;
  const climbCostPerKm =
    ((weightKg + BIKE_KG) * 9.81 * Math.max(0, elevationPerKm)) / (watts * CLIMB_POWER_SHARE);

  const costPerKm = flatCostPerKm + climbCostPerKm;
  if (costPerKm <= 0) return null;
  return seconds / costPerKm;
}
