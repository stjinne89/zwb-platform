// Vermogen tonen in watt of in watt per kilo.
//
// Een wattage zegt pas iets naast een gewicht: 250 W is voor een renner van 60
// kilo iets anders dan voor een van 90. Leden vroegen daarom om W/kg, en in Zwift
// denkt iedereen al zo. De keuze is per apparaat (cookie), de omrekening gebeurt
// hier, zonder React of Supabase, zodat hij in een unit-test vastligt.
//
// Alleen wattages worden omgerekend. Een doel in %FTP blijft een percentage: dat
// is geen wattage, en het naar W/kg vertalen zou een tweede, stille omrekening
// via de FTP zijn.

export type PowerUnit = "w" | "wkg";

export const POWER_UNIT_COOKIE = "zwb-power-unit";

export function parsePowerUnit(value: string | null | undefined): PowerUnit {
  return value === "wkg" ? "wkg" : "w";
}

function usableWeight(weightKg: number | null | undefined): number | null {
  return weightKg != null && Number.isFinite(weightKg) && weightKg >= 30 && weightKg <= 250
    ? weightKg
    : null;
}

function nl(value: number, digits: number) {
  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * "265 W" of "3,19 W/kg". Zonder bruikbaar gewicht blijft het watt: een W/kg
 * verzinnen kan niet, en een streepje zou verbergen dat het getal er wel is.
 */
export function formatPower(
  watts: number | null | undefined,
  unit: PowerUnit,
  weightKg: number | null | undefined,
): string {
  if (watts == null || !Number.isFinite(watts)) return "-";
  const weight = usableWeight(weightKg);
  if (unit === "wkg" && weight) return `${nl(watts / weight, 2)} W/kg`;
  return `${Math.round(watts)} W`;
}

/**
 * Wattages in een doeltekst omrekenen: "225-240w" wordt "2,7-2,9 W/kg", "250 W"
 * wordt "3,0 W/kg". Een bereik krijgt één decimaal, anders wordt een blokchip
 * onleesbaar lang. Percentages, RPE en de rest van de tekst blijven staan.
 */
export function convertPowerText(
  text: string,
  unit: PowerUnit,
  weightKg: number | null | undefined,
): string {
  const weight = usableWeight(weightKg);
  if (unit !== "wkg" || !weight || !text) return text;
  const perKg = (watts: string) => nl(Number(watts) / weight, 1);
  return text
    .replace(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*w\b/gi, (_, low: string, high: string) =>
      `${perKg(low.replace(",", "."))}-${perKg(high.replace(",", "."))} W/kg`,
    )
    .replace(/(^|[^\d.,/-])(\d+(?:[.,]\d+)?)\s*w\b(?!\/)/gi, (_, before: string, watts: string) =>
      `${before}${perKg(watts.replace(",", "."))} W/kg`,
    );
}
