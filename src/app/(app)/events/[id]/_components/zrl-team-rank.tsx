import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const PODIUM = {
  1: {
    icon: Trophy,
    label: "Gewonnen",
    block: "bg-amber-500/10",
    ink: "text-amber-600 dark:text-amber-400",
  },
  2: {
    icon: Medal,
    label: "Tweede",
    block: "bg-zinc-500/10",
    ink: "text-zinc-600 dark:text-zinc-300",
  },
  3: {
    icon: Medal,
    label: "Derde",
    block: "bg-orange-700/10",
    ink: "text-orange-700 dark:text-orange-400",
  },
} as const;

/**
 * De plaats van het team in zijn divisie, zo hoog als het teamblok: een beker of
 * medaille op het podium, anders het getal. Met `href` een link (de live stand).
 */
export function ZrlTeamRank({
  rank,
  teams,
  href,
  className,
}: {
  rank: number;
  teams: number;
  href?: string;
  className?: string;
}) {
  const podium = PODIUM[rank as 1 | 2 | 3];
  const title = `${rank}e van ${teams} teams`;
  const props = {
    title,
    "aria-label": podium ? `${podium.label}: ${title}` : title,
    className: cn(
      "flex shrink-0 items-center justify-center self-stretch px-4 py-3",
      podium?.block,
      href && "transition-opacity hover:opacity-75",
      className,
    ),
  };
  const content = podium ? (
    <podium.icon
      className={cn("h-full max-h-16 min-h-10 w-auto sm:max-h-24", podium.ink)}
      strokeWidth={1.5}
      aria-hidden
    />
  ) : (
    <span className="font-mono text-3xl font-semibold tabular-nums text-muted-foreground sm:text-4xl">
      {rank}e
    </span>
  );
  return href ? (
    <Link href={href} {...props}>
      {content}
    </Link>
  ) : (
    <span {...props}>{content}</span>
  );
}
