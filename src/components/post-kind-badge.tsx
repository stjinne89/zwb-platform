import {
  CircleHelp,
  Search,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";
import {
  POST_KIND_META,
  POST_STATUS_LABELS,
  type PostKind,
} from "@/lib/categories";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  search: Search,
  question: CircleHelp,
  sparkles: Sparkles,
};

const TONES: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  sage: "bg-emerald-100 text-emerald-950 dark:bg-emerald-400/20 dark:text-emerald-100",
  steel: "bg-secondary text-secondary-foreground",
};

export function PostKindBadge({
  kind,
  className,
}: {
  kind: string | null | undefined;
  className?: string;
}) {
  const meta = POST_KIND_META[(kind ?? "aanbod") as PostKind] ?? POST_KIND_META.aanbod;
  const Icon = ICONS[meta.icon] ?? Tag;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
        TONES[meta.tone] ?? TONES.primary,
        className,
      )}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

export function PostStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const value = status ?? "open";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground",
        value === "afgerond" && "border-emerald-400/50 text-emerald-700 dark:text-emerald-300",
        value === "gereserveerd" && "border-amber-400/50 text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      {POST_STATUS_LABELS[value] ?? value}
    </span>
  );
}
