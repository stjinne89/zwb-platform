import { Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const PODIUM = {
  1: { icon: Trophy, label: "Gewonnen", class: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  2: { icon: Medal, label: "Tweede", class: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300" },
  3: { icon: Medal, label: "Derde", class: "bg-orange-700/15 text-orange-700 dark:text-orange-400" },
} as const;

/** De plaats van het team in zijn divisie: een beker of medaille, anders het getal. */
export function ZrlTeamRank({
  rank,
  teams,
  className,
}: {
  rank: number;
  teams: number;
  className?: string;
}) {
  const podium = PODIUM[rank as 1 | 2 | 3];
  const title = `${rank}e van ${teams} teams`;
  if (podium) {
    const Icon = podium.icon;
    return (
      <span
        title={title}
        aria-label={`${podium.label}: ${title}`}
        className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full", podium.class, className)}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span
      title={title}
      aria-label={title}
      className={cn("text-sm font-semibold tabular-nums text-muted-foreground", className)}
    >
      {rank}e
    </span>
  );
}
