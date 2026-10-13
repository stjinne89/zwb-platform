// Waar je staat: hoe ver het schema is uitgewerkt en hoe ver de piek nog is.
// Twee getallen in weken, omdat een trainingsjaar in weken wordt gedacht.

import { seasonStand, type SeasonPlanBar, type SeasonTarget } from "@/lib/training/season";

function dagMaand(dayKey: string) {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function SeasonStand({
  today,
  targets,
  plans,
}: {
  today: string;
  targets: SeasonTarget[];
  plans: SeasonPlanBar[];
}) {
  const { plan, weeksPlanned, peak, weeksToPeak } = seasonStand({
    today,
    targets,
    plans,
  });
  if (!plan && !peak) return null;

  return (
    <dl className="jp-stand">
      {plan ? (
        <div className="tg-stat rounded-md bg-muted/50 p-3">
          <dd className="text-lg font-semibold tabular-nums">{weeksPlanned}</dd>
          <dt className="text-xs text-muted-foreground">
            {weeksPlanned === 1 ? "week" : "weken"} schema, t/m {dagMaand(plan.endDate)}
          </dt>
        </div>
      ) : null}
      {peak ? (
        <div className="tg-stat rounded-md bg-muted/50 p-3">
          <dd className="text-lg font-semibold tabular-nums">{weeksToPeak}</dd>
          <dt className="text-xs text-muted-foreground">
            {weeksToPeak === 1 ? "week" : "weken"} tot {peak.title}
          </dt>
        </div>
      ) : null}
    </dl>
  );
}
