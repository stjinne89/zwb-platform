import { ChevronRight } from "lucide-react";
import { MemberLink } from "@/components/member-link";
import type { WtrlResultTableTeam } from "@/lib/wtrl/import";
import { cn } from "@/lib/utils";

export type ZrlResultRace = {
  race: number;
  final: boolean;
  /** De race in de kalender van dit team, als die er is. */
  title: string | null;
  startAt: string | null;
  teams: WtrlResultTableTeam[];
};

const POINT_COLUMNS = ["FAL", "FTS", "FIN", "PBP"] as const;

function points(row: { fal: number; fts: number; fin: number; pbp: number }) {
  return [row.fal, row.fts, row.fin, row.pbp];
}

function dateLabel(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
}

function Chevron() {
  return (
    <ChevronRight
      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
      aria-hidden
    />
  );
}

/**
 * De WTRL-uitslagen van een subteam, zoals op WTRL: per race ingeklapt met
 * plaats en punten; open een race voor alle teams, open een team voor de
 * punten van zijn renners.
 */
export function ZrlResults({
  races,
  ownName,
  profileByZwiftId,
}: {
  races: ZrlResultRace[];
  ownName: string;
  profileByZwiftId: Record<string, string>;
}) {
  return (
    <section className="space-y-2 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Uitslagen</h2>
      <ul className="divide-y">
        {races.map((race) => {
          const own = race.teams.find((team) => team.name === ownName);
          return (
            <li key={race.race}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-sm [&::-webkit-details-marker]:hidden">
                  <Chevron />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{race.title ?? `Race ${race.race}`}</span>
                    <span className="text-xs text-muted-foreground">
                      {[dateLabel(race.startAt), race.final ? null : "voorlopig"].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {own && (
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="font-semibold">
                        {own.rank != null ? `${own.rank}e van ${race.teams.length}` : "DQ"}
                      </span>
                      <span className="block text-xs text-muted-foreground">{own.points} punten</span>
                    </span>
                  )}
                </summary>
                <RaceTable teams={race.teams} ownName={ownName} profileByZwiftId={profileByZwiftId} />
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RaceTable({
  teams,
  ownName,
  profileByZwiftId,
}: {
  teams: WtrlResultTableTeam[];
  ownName: string;
  profileByZwiftId: Record<string, string>;
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[30rem] text-xs tabular-nums sm:text-sm">
        <div className="grid grid-cols-[2rem_1fr_repeat(4,2.5rem)_3rem_2.5rem] gap-x-1 border-b py-1 text-muted-foreground">
          <span className="text-right">#</span>
          <span className="pl-5">Team</span>
          {POINT_COLUMNS.map((label) => (
            <span key={label} className="text-right">
              {label}
            </span>
          ))}
          <span className="text-right">Tot.</span>
          <span className="text-right" title="League points">
            LP
          </span>
        </div>
        {teams.map((team) => (
          <details key={team.name} className="group/team border-b last:border-b-0">
            <summary
              className={cn(
                "grid cursor-pointer list-none grid-cols-[2rem_1fr_repeat(4,2.5rem)_3rem_2.5rem] items-center gap-x-1 py-1 [&::-webkit-details-marker]:hidden",
                team.name === ownName && "bg-primary/10 font-semibold",
              )}
            >
              <span className="text-right">{team.rank ?? "DQ"}</span>
              <span className="flex min-w-0 items-center gap-1">
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/team:rotate-90"
                  aria-hidden
                />
                <span className="truncate">{team.name}</span>
              </span>
              {points(team).map((value, i) => (
                <span key={POINT_COLUMNS[i]} className="text-right text-muted-foreground">
                  {value}
                </span>
              ))}
              <span className="text-right">{team.points}</span>
              <span className="text-right">{team.leaguePoints}</span>
            </summary>
            <div className="bg-muted/40 py-1">
              {team.riders.map((rider, index) => (
                <div
                  key={`${rider.name}-${index}`}
                  className="grid grid-cols-[2rem_1fr_repeat(4,2.5rem)_3rem_2.5rem] gap-x-1 py-0.5 text-muted-foreground"
                >
                  <span className="text-right">{rider.dq ? "DQ" : (rider.rank ?? "")}</span>
                  <span className="truncate pl-5 text-foreground">
                    <MemberLink id={rider.zwiftId != null ? profileByZwiftId[String(rider.zwiftId)] : null}>
                      {rider.name}
                    </MemberLink>
                  </span>
                  {points(rider).map((value, i) => (
                    <span key={POINT_COLUMNS[i]} className="text-right">
                      {value}
                    </span>
                  ))}
                  <span className="text-right text-foreground">{rider.points}</span>
                  <span />
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
