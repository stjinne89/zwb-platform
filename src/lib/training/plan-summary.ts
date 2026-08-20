// De samenvatting van een schema is één tekstveld met twee soorten alinea's: de
// omschrijving die de AI schrijft, en daarachter zijn cautions, elk voorafgegaan
// door "Let op: ". Dat wordt zo samengevoegd in createPlanFromAiGeneration().
//
// Die cautions dragen de redenering die het lid nergens anders ziet — waarom een
// week op negen uur uitkomt, waarom de eerste dagen rustiger zijn, waarom een dag
// leeg blijft. Vandaar dit setje functies om ze er weer uit te halen.

export const CAUTION_PREFIX = "Let op: ";

/** Alinea's splitsen zoals ze zijn samengevoegd: op een lege regel. */
function paragraphs(summary: string | null | undefined): string[] {
  return String(summary ?? "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** De cautions uit een samenvatting, zonder het "Let op: "-voorvoegsel. */
export function cautionsFromSummary(summary: string | null | undefined): string[] {
  return paragraphs(summary)
    .filter((part) => part.startsWith(CAUTION_PREFIX))
    .map((part) => part.slice(CAUTION_PREFIX.length).trim())
    .filter(Boolean);
}

/** Wat er overblijft als je de cautions eraf haalt: de omschrijving zelf. */
export function summaryWithoutCautions(summary: string | null | undefined): string {
  return paragraphs(summary)
    .filter((part) => !part.startsWith(CAUTION_PREFIX))
    .join("\n\n");
}

/**
 * Regels die over de herplanning zelf gaan in plaats van over de training:
 * welk bereik is herpland, dat het een concept ter review is. Waar voor de
 * trainer bruikbaar, maar een lid dat wil weten waarom er vandaag negentig
 * minuten staat heeft er niets aan — en ze staan meestal bovenaan, dus zonder
 * deze filter duwen ze het echte antwoord uit beeld.
 */
const PLANNING_META = [
  /^(dit is )?alleen (de |het )?(herplanning|periode|\d{4})/i,
  /^herplanning is beperkt/i,
  /^concept/i,
  /ter review door de trainer/i,
];

/** Hoeveel regels een lid er hoogstens bij krijgt; de rest staat bij het schema. */
export const MEMBER_CAUTION_LIMIT = 4;

/**
 * De cautions zoals een lid ze bij zijn eerstvolgende workout te zien krijgt:
 * zonder de planning-administratie en niet meer dan een handvol.
 */
export function memberCautions(cautions: string[]): string[] {
  return cautions
    .filter((caution) => !PLANNING_META.some((pattern) => pattern.test(caution)))
    .slice(0, MEMBER_CAUTION_LIMIT);
}
