import { HeartHandshake, Mountain, RefreshCw, Route } from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeIcon = "mountain" | "route" | "heart" | "refresh" | string | null;
type BadgeColor = "gold" | "petrol" | "sage" | "steel" | string | null;

const iconMap = {
  mountain: Mountain,
  route: Route,
  heart: HeartHandshake,
  refresh: RefreshCw,
};

const colorMap = {
  gold: "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-400/50 dark:bg-amber-400/20 dark:text-amber-100",
  petrol:
    "border-cyan-800/20 bg-cyan-950 text-white dark:border-cyan-300/30 dark:bg-cyan-300/15 dark:text-cyan-100",
  sage: "border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-100",
  steel:
    "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-400/30 dark:bg-slate-300/15 dark:text-slate-100",
};

export function AchievementBadge({
  title,
  icon,
  color,
  compact = false,
}: {
  title: string;
  icon?: BadgeIcon;
  color?: BadgeColor;
  compact?: boolean;
}) {
  const Icon = iconMap[(icon ?? "refresh") as keyof typeof iconMap] ?? RefreshCw;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium",
        colorMap[(color ?? "steel") as keyof typeof colorMap] ?? colorMap.steel,
        compact ? "px-1.5 py-0.5 text-[0.7rem]" : "px-2 py-1 text-xs",
      )}
      title={title}
    >
      <Icon className={compact ? "size-3" : "size-3.5"} />
      <span className="truncate">{title}</span>
    </span>
  );
}
