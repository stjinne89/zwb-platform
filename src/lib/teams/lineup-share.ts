// Deelbericht van de teamindeling van één raceweek (2026-11-17). Namen zonder @:
// een echte tag maakt WhatsApp alleen als de captain in de groep zelf iemand
// uit het @-lijstje kiest, en ZWB heeft geen telefoonnummers (besluit 2026-10-15).

export type LineupShareTeam = {
  name: string;
  riders: string[];
  racepass: string | null;
};

/** WhatsApp maakt van *tekst* vet; een sterretje in een naam zou dat breken. */
function plain(value: string) {
  return value.replace(/[*_~`]/g, "").trim();
}

export function lineupShareText({ title, teams }: { title: string; teams: LineupShareTeam[] }): string {
  const blocks = teams
    .filter((team) => team.riders.length > 0)
    .map((team) =>
      [
        `*${plain(team.name)}*`,
        ...team.riders.map(plain),
        ...(team.racepass ? [`Racepass: ${team.racepass}`] : []),
      ].join("\n"),
    );
  return [`Teamindeling ${plain(title)}`, ...blocks].join("\n\n");
}
