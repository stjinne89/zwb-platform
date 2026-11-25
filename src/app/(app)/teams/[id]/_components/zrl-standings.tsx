import Link from "next/link";
import type { TeamStandings } from "@/lib/teams/zrl-standings";
import { cn } from "@/lib/utils";

function heading(standings: TeamStandings) {
  return [standings.division, `na race ${standings.race}${standings.final ? "" : " (voorlopig)"}`]
    .filter(Boolean)
    .join(" · ");
}

/** De hele divisie, met het eigen team gemarkeerd: bovenaan de pagina van een subteam. */
export function ZrlStandingsTable({ standings }: { standings: TeamStandings }) {
  const races = Math.max(1, ...standings.rows.map((row) => row.perRace.length));
  return (
    <section className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Competitiestand</h2>
        <span className="text-xs text-muted-foreground">{heading(standings)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums sm:text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-2 text-right font-medium">#</th>
              <th className="py-1 pr-2 text-left font-medium">Team</th>
              {Array.from({ length: races }, (_, i) => (
                <th key={i} className="px-1 py-1 text-right font-medium sm:px-2">
                  R{i + 1}
                </th>
              ))}
              <th className="py-1 pl-2 text-right font-medium">Punten</th>
            </tr>
          </thead>
          <tbody>
            {standings.rows.map((row) => {
              const own = row.teamId === standings.ownTeamId;
              return (
                <tr key={row.teamId} className={cn("border-t", own && "bg-primary/10 font-semibold")}>
                  <td className="py-1 pr-2 text-right">{row.rank}</td>
                  <td className="w-full max-w-0 truncate py-1 pr-2">{row.name}</td>
                  {Array.from({ length: races }, (_, i) => (
                    <td key={i} className="px-1 py-1 text-right text-muted-foreground sm:px-2">
                      {i < row.perRace.length ? row.perRace[i] : ""}
                    </td>
                  ))}
                  <td className="py-1 pl-2 text-right">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Per subteam de plaats in zijn divisie: bovenaan de pagina van het hoofdteam. */
export function ZrlStandingsSummary({
  teams,
}: {
  teams: Array<{ id: string; name: string; standings: TeamStandings }>;
}) {
  return (
    <section className="space-y-2 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Competitiestand</h2>
      <ul className="divide-y text-sm">
        {teams.map(({ id, name, standings }) => {
          const own = standings.rows.find((row) => row.teamId === standings.ownTeamId);
          if (!own) return null;
          return (
            <li key={id}>
              <Link
                href={`/teams/${id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 hover:text-primary"
              >
                <span className="font-medium">{name}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {own.rank}e van {standings.rows.length}
                  </span>
                  {` · ${own.points} punten · ${heading(standings)}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
