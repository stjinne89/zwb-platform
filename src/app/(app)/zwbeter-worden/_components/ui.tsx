// Kleine presentatiecomponenten die op meerdere ZWBeter Worden-pagina's staan.

import { Activity, ChevronDown } from "lucide-react";
import type { WellnessSummary } from "@/lib/training/wellness";

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className="size-5 text-primary" />
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function RecoveryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  /** Bijschrift onder het label, bv. dat een waarde berekend is en niet gemeten. */
  hint?: string;
}) {
  return (
    <div className="rounded-md bg-muted/50 p-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      {hint ? <div className="mt-0.5 text-[0.65rem] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function PlanBadge({ status }: { status: string }) {
  const label =
    status === "published"
      ? "Gepubliceerd"
      : status === "approved"
        ? "Goedgekeurd"
        : status === "review"
          ? "Review"
          : status === "archived"
            ? "Archief"
            : "Concept";
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {label}
    </span>
  );
}

// Inklapbaar blok (native <details>): standaard dicht, klik op de kop opent het.
export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border bg-card" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t">{children}</div>
    </details>
  );
}

export function recoveryStateLabel(state?: WellnessSummary["state"]) {
  if (state === "fresh") return "Fris";
  if (state === "fatigued") return "Vermoeid";
  if (state === "normal") return "Normaal";
  return "-";
}

export function recoveryPillClass(state?: WellnessSummary["state"]) {
  if (state === "fatigued") return "bg-destructive/15 text-destructive";
  if (state === "fresh") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (state === "normal") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}
