// Het label van een trainingsmethode die nog niet als bewezen geldt, bij een
// workout, protocol of kennisartikel. Uitleg staat op /hulp, niet hier.

import { FlaskConical, Sparkles } from "lucide-react";
import { METHOD_LABEL_TEXT, methodLabelOf } from "@/lib/training/method-label";
import { cn } from "@/lib/utils";

export function MethodLabelBadge({ label, className }: { label: unknown; className?: string }) {
  const value = methodLabelOf(label);
  if (!value) return null;
  const Icon = value === "experimenteel" ? FlaskConical : Sparkles;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        value === "experimenteel"
          ? "bg-amber-100 text-amber-950 dark:bg-amber-400/20 dark:text-amber-100"
          : "bg-emerald-100 text-emerald-950 dark:bg-emerald-400/20 dark:text-emerald-100",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {METHOD_LABEL_TEXT[value]}
    </span>
  );
}
