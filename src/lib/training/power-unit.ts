// Vermogen tonen in watt, in watt per kilo of als percentage van de FTP.
//
// Een wattage zegt pas iets naast een gewicht: 250 W is voor een renner van 60
// kilo iets anders dan voor een van 90. Leden vroegen daarom om W/kg, en in Zwift
// denkt iedereen al zo. De keuze is per apparaat (cookie), de omrekening gebeurt
// hier, zonder React of Supabase, zodat hij in een unit-test vastligt.
//
// Een bloksdoel is vrije tekst van de AI: de ene keer "162-178w", de andere keer
// "65-70% FTP". Tot 11 oktober 2026 bleef een percentage altijd een percentage,
// en zag je dus wat de AI toevallig schreef in plaats van wat je gekozen had.
// Nu rekent de doeltekst via de FTP in beide richtingen om. Een los vermogen
// (FTP, NP, een testuitslag) heeft geen zinnig percentage en blijft dan watt.

export type PowerUnit = "w" | "wkg" | "pct";

export const POWER_UNIT_COOKIE = "zwb-power-unit";

export function parsePowerUnit(value: string | null | undefined): PowerUnit {
  return value === "wkg" || value === "pct" ? value : "w";
}

function usableWeight(weightKg: number | null | undefined): number | null {
  return weightKg != null && Number.isFinite(weightKg) && weightKg >= 30 && weightKg <= 250
    ? weightKg
    : null;
}

function usableFtp(ftpWatts: number | null | undefined): number | null {
  return ftpWatts != null && Number.isFinite(ftpWatts) && ftpWatts >= 50 && ftpWatts <= 600
    ? ftpWatts
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

const WATT_RANGE = /(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*w(?:att)?\b(?!\/)/gi;
const WATT_SINGLE = /(^|[^\d.,/-])(\d+(?:[.,]\d+)?)\s*w(?:att)?\b(?!\/)/gi;
// Een percentage met of zonder "FTP" erachter; "% HFmax" is geen vermogen.
const PCT_TAIL = String.raw`\s*%(?!\s*(?:hf|hr|hartslag|max))(?:\s*(?:van\s+(?:je\s+)?)?ftp\b)?`;
const PCT_RANGE = new RegExp(String.raw`(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)${PCT_TAIL}`, "gi");
const PCT_SINGLE = new RegExp(String.raw`(^|[^\d.,/-])(\d+(?:[.,]\d+)?)${PCT_TAIL}`, "gi");

function hasMatch(pattern: RegExp, text: string) {
  pattern.lastIndex = 0;
  const found = pattern.test(text);
  pattern.lastIndex = 0;
  return found;
}

function num(value: string) {
  return Number(value.replace(",", "."));
}

/**
 * Het vermogen in een doeltekst in de gekozen eenheid: "225-240w" wordt
 * "2,8-3,0 W/kg" of "90-96% FTP", "65-70% FTP" wordt "163-175 W". Een bereik in
 * W/kg krijgt één decimaal, anders wordt een blokchip onleesbaar lang. RPE en de
 * rest van de tekst blijven staan.
 *
 * Staat het doel er al in de gevraagde vorm ("RPE 6, 162-178w, 81-89%"), dan
 * blijft de andere vorm zoals hij is: omrekenen zou hetzelfde getal twee keer
 * tonen. Zonder bruikbare FTP of gewicht blijft de tekst wat hij was.
 */
export function convertPowerText(
  text: string,
  unit: PowerUnit,
  weightKg: number | null | undefined,
  ftpWatts?: number | null,
): string {
  if (!text) return text;
  const weight = usableWeight(weightKg);
  const ftp = usableFtp(ftpWatts);
  const hasWatts = hasMatch(WATT_RANGE, text) || hasMatch(WATT_SINGLE, text);

  if (unit === "pct") {
    if (!ftp || hasMatch(PCT_RANGE, text) || hasMatch(PCT_SINGLE, text)) return text;
    const pct = (watts: string) => Math.round((num(watts) / ftp) * 100);
    return text
      .replace(WATT_RANGE, (_, low: string, high: string) => `${pct(low)}-${pct(high)}% FTP`)
      .replace(WATT_SINGLE, (_, before: string, watts: string) => `${before}${pct(watts)}% FTP`);
  }

  if (unit === "wkg" && !weight) return text;
  const show =
    unit === "wkg" && weight
      ? { value: (watts: number) => nl(watts / weight, 1), suffix: " W/kg" }
      : { value: (watts: number) => String(Math.round(watts)), suffix: " W" };

  let result = text;
  if (!hasWatts && ftp) {
    const fromPct = (pct: string) => show.value((num(pct) / 100) * ftp);
    result = result
      .replace(PCT_RANGE, (_, low: string, high: string) => `${fromPct(low)}-${fromPct(high)}${show.suffix}`)
      .replace(PCT_SINGLE, (_, before: string, pct: string) => `${before}${fromPct(pct)}${show.suffix}`);
  } else if (unit === "wkg") {
    result = result
      .replace(WATT_RANGE, (_, low: string, high: string) => `${show.value(num(low))}-${show.value(num(high))} W/kg`)
      .replace(WATT_SINGLE, (_, before: string, watts: string) => `${before}${show.value(num(watts))} W/kg`);
  }
  return result;
}
