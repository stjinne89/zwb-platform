// Zoeken in NEVO voor het receptformulier. Puur: de query's zelf staan in de
// server-actie.
//
// NEVO zet het hoofdwoord voorop en de soort erachter: "Melk chocolade-
// halfvolle", "Brood volkoren-". Wie "chocolademelk" of "halfvolle melk" typt,
// vindt met één letterlijke zoekterm dus niets. Daarom: elk woord apart, en een
// samenstelling ook in twee stukken.

const MAX_TOKENS = 4;
const MIN_PART = 3;

/** De losse woorden van een zoekterm, zonder leestekens. */
export function foodSearchTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2)
    .slice(0, MAX_TOKENS);
}

/** Alle manieren om een samenstelling in twee stukken te knippen. */
export function compoundSplits(token: string): Array<[string, string]> {
  // Alleen letters: de stukken gaan in een filter waar komma's en haakjes iets betekenen.
  if (!/^\p{L}+$/u.test(token)) return [];
  const splits: Array<[string, string]> = [];
  for (let index = MIN_PART; index <= token.length - MIN_PART; index++) {
    splits.push([token.slice(0, index), token.slice(index)]);
  }
  return splits;
}

/**
 * Zet de treffers op volgorde: een naam die met het eerste woord begint eerst,
 * daarna de kortste naam. Zonder dit staat "Melk halfvolle" bij de zoekterm
 * "melk" achter tientallen koekjes en chocolade met melk in de naam.
 */
export function rankFoods<T extends { name_nl: string }>(rows: T[], tokens: string[], limit = 20): T[] {
  const first = tokens[0] ?? "";
  const score = (name: string) => {
    const lower = name.toLowerCase();
    if (first && lower.startsWith(first)) return 0;
    if (first && lower.split(/[^\p{L}\p{N}]+/u).includes(first)) return 1;
    return 2;
  };
  return [...rows]
    .sort(
      (a, b) =>
        score(a.name_nl) - score(b.name_nl) ||
        a.name_nl.length - b.name_nl.length ||
        a.name_nl.localeCompare(b.name_nl, "nl"),
    )
    .slice(0, limit);
}
