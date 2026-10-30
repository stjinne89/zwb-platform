// De rondes uit PLAN.md die in een week vallen, als invoer voor de automatische
// app-update (0294).
//
// PLAN.md kent twee vormen voor een ronde:
//   ### Gebouwd — Titel            met de datum in de eerste alinea eronder
//   > **Titel, 2026-10-18 — ...**  met de datum in de kop
// Een ronde loopt tot de volgende ronde of de volgende kop. Onderzoek,
// voorstellen en metingen zijn niets voor leden en vallen af; de rest beoordeelt
// Claude.
//
// Puur, zonder bestandstoegang.

export type PlanRound = { date: string; title: string; text: string };

const HEADING = /^###\s+(.+)$/;
const QUOTED = /^>\s*\*\*(.+?),\s*(\d{4}-\d{2}-\d{2})\s+—/;
const SECTION = /^##\s/;
const DATE = /\d{4}-\d{2}-\d{2}/;
/** Statussen die niet over iets in de app gaan. */
const NOT_SHIPPED = /^(Onderzocht|Voorstel|Gemeten|In uitvoering|Geparkeerd|Besluit)\b/i;

/** Zoveel tekens per ronde gaan mee; het waarom en wat staan bovenaan. */
export const ROUND_MAX = 3_000;

export function planRounds(plan: string): PlanRound[] {
  const lines = plan.split(/\r?\n/);
  const rounds: PlanRound[] = [];
  let current: { date: string | null; title: string; lines: string[] } | null = null;

  const close = () => {
    if (current?.date && !NOT_SHIPPED.test(current.title)) {
      rounds.push({ date: current.date, title: current.title, text: current.lines.join("\n").trim().slice(0, ROUND_MAX) });
    }
    current = null;
  };

  for (const line of lines) {
    const heading = HEADING.exec(line);
    const quoted = QUOTED.exec(line);
    if (heading) {
      close();
      current = { date: null, title: heading[1].trim(), lines: [line] };
      continue;
    }
    if (quoted) {
      close();
      current = { date: quoted[2], title: quoted[1].trim(), lines: [line] };
      continue;
    }
    if (SECTION.test(line)) {
      close();
      continue;
    }
    if (!current) continue;
    current.lines.push(line);
    // Bij een ###-kop staat de datum in de eerste regel met tekst.
    if (current.date === null && line.trim()) current.date = DATE.exec(line)?.[0] ?? "";
  }
  close();
  return rounds;
}

/** De rondes met een datum van `from` tot en met `to`, oudste eerst. */
export function roundsBetween(plan: string, from: string, to: string): PlanRound[] {
  return planRounds(plan)
    .filter((round) => round.date >= from && round.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
}
