/**
 * Volgorde van Club Ladder-teams: op ladderpositie (1 eerst), teams zonder
 * positie daarna, archiefteams altijd achteraan; bij gelijke stand op naam.
 */
export function compareLadderTeams(
  a: { name: string; archived?: boolean | null; position?: number | null },
  b: { name: string; archived?: boolean | null; position?: number | null },
) {
  return (
    Number(Boolean(a.archived)) - Number(Boolean(b.archived)) ||
    (a.position ?? Infinity) - (b.position ?? Infinity) ||
    a.name.localeCompare(b.name, "nl")
  );
}
