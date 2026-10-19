// Tekst van OpenAI die minder als AI klinkt. Twee lagen: schrijfregels die mee
// gaan in de opdracht, en een vaste nabewerking op wat terugkomt. De regels
// sturen de toon; de nabewerking vangt de tekens die een model ondanks de regels
// blijft gebruiken (gedachtestreepjes, puntkomma's, emoji, opvulovergangen).
//
// De regels volgen de Claude-skill avoid-ai-writing van Conor Bronsdon (MIT,
// github.com/conorbronsdon/avoid-ai-writing, references/patterns.md), vertaald
// naar het Nederlands. Alleen wat in een paar zinnen Nederlands kan voorkomen:
// de Engelse woordenlijst (delve, tapestry) is vervangen door de Nederlandse
// tegenhangers, en kopjes, hashtags en opsommingen vallen weg omdat ze hier niet
// voorkomen. Aangevuld met wat in de eerste echte weekoverzichten stond
// (2026-10-19): "mooi meegenomen", "sleuteldag", "als topper", "TSB -47,5; dus".
//
// Puur.

export const HUMAN_WRITING_RULES = `Schrijfstijl: zoals een trainer een clubgenoot appt die hij kent. Kort, droog, concreet.

Tekens
- Geen gedachtestreepjes, geen puntkomma's, geen uitroeptekens, geen emoji.
- Hooguit één stuk vet.

Woorden
- Geen AI-woorden: cruciaal, essentieel, optimaal, naadloos, robuust, krachtig, waardevol,
  holistisch, benutten, optimaliseren, faciliteren, versterken, navigeren, landschap, reis,
  ecosysteem, hoeksteen, fundament, mijlpaal, momentum, focus, balans, sleutel- (sleuteldag, sleutelmoment).
- Geen stoplappen: topper, sterk werk, knap, mooi meegenomen, goed bezig, belangrijkste moment,
  trainingsvenster, rustmoment, solide, een mooie basis.
- Geen versterkers zonder inhoud: echt, oprecht, absoluut, zeker, eigenlijk, enorm, super.
- Gewone werkwoorden: "is" en "heeft", niet "fungeert als", "beschikt over" of "zorgt voor".
- Geen opvulovergangen: bovendien, daarnaast, verder, tevens, kortom, al met al.
- Geen afkortingen als CTL, ATL of TSB. Zeg wat het betekent: fitter, moe, fris.
- Rond getallen af zoals je ze zegt: 262 km, niet 262,4 km.
- Noem een event zoals een renner het zegt: "de ZRL-race van dinsdag", niet "ZRL R1 W5" of een tijd tot op de minuut.

Zinnen
- Geen "het is niet X, het is Y" en geen "niet alleen X, maar ook Y", tenzij je echt iets rechtzet.
- Geen rijtjes van drie (drie bijvoeglijke naamwoorden, drie gelijke zinsdelen) omdat drie mooi klinkt.
- Geen reeks korte gelijkvormige zinnetjes. Wissel lange en korte zinnen af.
- Geen twee zinnen achter elkaar met hetzelfde begin.
- Geen retorische vragen.
- Eén voorbehoud is genoeg, en alleen als het echt onzeker is: niet "zou mogelijk kunnen", niet
  "lijkt" of "waarschijnlijk" als het gewoon zo is.

Inhoud
- Maak een gewone week niet groter dan hij is: geen keerpunt, geen nieuw hoofdstuk, geen mijlpaal.
- Geen aankondiging van wat komt ("het opvallende is", "en dan:", "let op:"). Zeg het gewoon.
- Geen algemene afsluiter ("zo bouw je verder", "op naar volgende week", "de vorm komt eraan").
- Geen chatbotzinnen ("goed gedaan!", "ik hoop", "laten we", "succes!").
- Geen vage bronnen ("experts zeggen", "uit onderzoek blijkt") en verzin geen details.
- Begin niet met "Mooie week", "Wat een week" of "Je reed". Elke week mag anders beginnen.
- Liever een feit dan een oordeel. Een compliment alleen als het iets zegt.`;

/**
 * Opvulwoorden aan het begin van een zin, alleen met komma erachter: "Kortom, je
 * bent moe" kan zonder. Zonder komma niet: "Daarnaast heb je" zonder
 * "Daarnaast" wordt een vraag.
 */
const FILLER_OPENERS = /(^|[.?]\s+)(?:Bovendien|Daarnaast|Tevens|Kortom|Al met al),\s+(\p{L})/gu;

/**
 * Haalt de vaste AI-tekens weg. Geen herschrijving: alleen tekens, witruimte en
 * een opvulwoord aan het begin van een zin, zodat de zin zelf van het model blijft.
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
      .replace(FILLER_OPENERS, (_, before: string, letter: string) => `${before}${letter.toUpperCase()}`)
      .replace(/,\s*,/g, ",")
      .replace(/\s+([,.?])/g, "$1")
      .replace(/\.{2,}/g, ".")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}
