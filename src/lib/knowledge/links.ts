// Links naar kennisbankartikelen in een coach-antwoord.
//
// De coach schrijft een verwijzing als [titel](pad). Alleen paden onder de drie
// kennisbanken worden een link: het antwoord is modeltekst, en daarin komt ook
// tekst van gebruikers terug (voorkeuren, opmerkingen bij trainingen). Een link
// naar buiten of naar een andere pagina in de app laten we daarom als tekst staan.
//
// Los van lib/knowledge/coach.ts, zodat de chat in de browser dit kan gebruiken
// zonder de kennisbanken zelf mee te laden.

const KNOWLEDGE_LINK = /\[([^\]\n]{1,160})\]\((\/zwbeter-worden\/(?:voeding\/|core\/)?kennis\/[a-z0-9-]+)\)/g;

export type BodySegment = { text: string; href?: string };

/** Knipt een antwoord in tekst en links naar kennisbankartikelen. */
export function splitKnowledgeLinks(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let last = 0;
  for (const match of body.matchAll(KNOWLEDGE_LINK)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ text: body.slice(last, start) });
    segments.push({ text: match[1], href: match[2] });
    last = start + match[0].length;
  }
  if (last < body.length) segments.push({ text: body.slice(last) });
  return segments;
}

/**
 * Haalt links naar artikelen die niet bestaan uit een antwoord, vóór het wordt
 * opgeslagen: de titel blijft staan, het pad gaat eruit. Zo leidt een verkeerd
 * overgenomen pad niet naar een lege pagina.
 */
export function dropUnknownKnowledgeLinks(body: string, knownPaths: Set<string>): string {
  return body.replace(KNOWLEDGE_LINK, (whole, title: string, path: string) =>
    knownPaths.has(path) ? whole : title,
  );
}
