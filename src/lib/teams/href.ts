/** Een ladderteam heeft zijn pagina onder Club Ladder; de losse teampagina stuurt door. */
export function teamHref(team: { id: string; type?: string | null }) {
  return team.type === "ladder" ? `/teams/club-ladder/${team.id}` : `/teams/${team.id}`;
}
