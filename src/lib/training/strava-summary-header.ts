// De kopregel van het Strava-blok. Los van strava-summary.ts, zodat de hulppagina
// hem in de browser kan bouwen zonder de rest van het blok mee te nemen.

/**
 * Strava kent geen opmaak; vet kan alleen met de vette letters uit Unicode
 * (Mathematical Sans-Serif Bold). Alleen A-Z, a-z en 0-9; de rest blijft staan.
 */
export function unicodeBold(text: string): string {
  return Array.from(text, (char) => {
    const code = char.codePointAt(0)!;
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d5d4 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d5ee + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ec + code - 48);
    return char;
  }).join("");
}

/** De kopregel van het blok, met het beter-woord van de club (0319). */
export function summaryHeader(betterWord = "ZWBeter"): string {
  return unicodeBold(`${betterWord} workout-samenvatting`);
}

/** De kopregel van ZWB; blijft herkend als een club een ander woord kiest. */
export const ZWB_SUMMARY_HEADER = summaryHeader();
