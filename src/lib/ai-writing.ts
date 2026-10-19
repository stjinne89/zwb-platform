// Tekst van OpenAI die minder als AI klinkt. Twee lagen: schrijfregels die mee
// gaan in de opdracht, en een vaste nabewerking op wat terugkomt. De regels
// sturen de toon; de nabewerking vangt de tekens die een model ondanks de regels
// blijft gebruiken (gedachtestreepjes, puntkomma's, emoji).
//
// Afgeleid van de eerste echte weekoverzichten (2026-10-19): "mooi meegenomen",
// "sleuteldag", "als topper", "TSB -47,5; dus", steeds hetzelfde sjabloon.
//
// Puur.

export const HUMAN_WRITING_RULES = `Schrijfstijl: zoals een trainer een clubgenoot appt die hij kent. Kort, droog, concreet.
- Geen gedachtestreepjes, geen puntkomma's, geen uitroeptekens.
- Geen stoplappen of reclametaal: niet "topper", "sterk werk", "knap", "mooi meegenomen", "goed bezig",
  "sleuteldag", "belangrijkste moment", "trainingsvenster", "rustmoment", "cruciaal", "essentieel",
  "optimaal", "solide", "waardevol", "mooie balans", "een mooie basis", "momentum", "focus", "reis".
- Geen rijtjes van drie bijvoeglijke naamwoorden of drie gelijke zinsdelen.
- Niet indekken met "lijkt", "waarschijnlijk" of "misschien" als het gewoon zo is.
- Geen afkortingen als CTL, ATL of TSB. Zeg wat het betekent: fitter, moe, fris.
- Rond getallen af zoals je ze zegt: 262 km, niet 262,4 km.
- Noem een event zoals een renner het zegt: "de ZRL-race van dinsdag", niet "ZRL R1 W5" of een tijd tot op de minuut.
- Begin niet met "Mooie week", "Wat een week" of "Je reed". Elke week mag anders beginnen.
- Een compliment alleen als het iets zegt; liever een feit dan een oordeel.`;

/**
 * Haalt de vaste AI-tekens weg. Geen herschrijving: alleen tekens en witruimte,
 * zodat de zin zelf van het model blijft.
 */
export function cleanAiText(text: string): string {
  return (
    text
      .replace(/\p{Extended_Pictographic}️?/gu, "")
      // 3–4 blijft een bereik; een streep tussen woorden wordt een komma.
      .replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2")
      .replace(/\s*[—–]\s*/g, ", ")
      .replace(/;\s*(\p{L})/gu, (_, letter: string) => `. ${letter.toUpperCase()}`)
      .replace(/;/g, ".")
      .replace(/!+/g, ".")
      .replace(/,\s*,/g, ",")
      .replace(/\s+([,.?])/g, "$1")
      .replace(/\.{2,}/g, ".")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}
