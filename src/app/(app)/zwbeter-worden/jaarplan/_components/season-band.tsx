// De seizoensbalk: twaalf maanden in één beeld.
//
// Geen chartbibliotheek en geen SVG — vier banen met absoluut gepositioneerde
// blokjes op procenten volstaat, en dat schaalt mee met de containerbreedte.
// Op een telefoon van 375px is een jaar nooit leesbaar te krijgen; daarom
// scrollt de balk horizontaal en staat de werkelijke inhoud in de lijst
// eronder. Dit is het overzicht, niet het leesbeeld.

import {
  dayOffsetPct,
  spanPct,
  monthsInWindow,
  SEASON_PRIORITY_LABELS,
  type SeasonEvent,
  type SeasonPeriod,
  type SeasonPlanBar,
  type SeasonTarget,
} from "@/lib/training/season";

const LANE = "relative h-7 rounded-md bg-muted/40";
const LABEL = "w-20 shrink-0 text-xs text-muted-foreground";

export function SeasonBand({
  from,
  to,
  today,
  plans,
  periods,
  targets,
  events,
}: {
  from: string;
  to: string;
  today: string;
  plans: SeasonPlanBar[];
  periods: SeasonPeriod[];
  targets: SeasonTarget[];
  events: SeasonEvent[];
}) {
  const months = monthsInWindow(from, to);
  const todayPct = dayOffsetPct(today, from, to);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[44rem] space-y-1.5 pb-1">
        <div className="flex items-end gap-2">
          <div className={LABEL} />
          <div className="relative h-4 flex-1">
            {months.map((month) => (
              <span
                key={month.key}
                className="absolute top-0 text-[10px] uppercase tracking-wide text-muted-foreground"
                style={{ left: `${month.leftPct}%` }}
              >
                {month.label}
              </span>
            ))}
          </div>
        </div>

        <Lane label="Schema">
          <Today pct={todayPct} />
          {plans.map((plan) => (
            <span
              key={plan.rootId}
              title={plan.title}
              className="absolute inset-y-1 rounded bg-primary/70"
              style={{
                left: `${dayOffsetPct(plan.startDate, from, to)}%`,
                width: `${spanPct(plan.startDate, plan.endDate, from, to)}%`,
              }}
            />
          ))}
        </Lane>

        <Lane label="Rust">
          <Today pct={todayPct} />
          {periods.map((period) => (
            <span
              key={period.id}
              title={period.title}
              className={`absolute inset-y-1 rounded border ${
                period.kind === "rust"
                  ? "border-destructive/40 bg-destructive/25"
                  : "border-amber-500/40 bg-amber-500/20"
              }`}
              style={{
                left: `${dayOffsetPct(period.startDate, from, to)}%`,
                width: `${spanPct(period.startDate, period.endDate, from, to)}%`,
              }}
            />
          ))}
        </Lane>

        <Lane label="Mikpunten">
          <Today pct={todayPct} />
          {targets.map((target) => (
            <span
              key={target.id}
              title={`${target.title} — ${SEASON_PRIORITY_LABELS[target.priority]}`}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                target.priority === "a"
                  ? "size-3.5 bg-[--color-zwb-gold] ring-2 ring-background"
                  : target.priority === "b"
                    ? "size-2.5 bg-foreground/70"
                    : "size-2 bg-muted-foreground/60"
              }`}
              style={{ left: `${dayOffsetPct(target.targetDate, from, to)}%` }}
            />
          ))}
        </Lane>

        <Lane label="Events">
          <Today pct={todayPct} />
          {events.map((event) => (
            <span
              key={event.id}
              title={`${event.title} — ${event.rsvp === "yes" ? "ja" : "misschien"}`}
              className={`absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                event.rsvp === "yes" ? "bg-primary" : "border border-primary bg-background"
              }`}
              style={{ left: `${dayOffsetPct(event.date, from, to)}%` }}
            />
          ))}
        </Lane>
      </div>
    </div>
  );
}

function Lane({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className={LABEL}>{label}</span>
      <div className={`${LANE} flex-1`}>{children}</div>
    </div>
  );
}

/** De streep van vandaag, zodat "nog te gaan" van "geweest" te scheiden is. */
function Today({ pct }: { pct: number }) {
  return (
    <span
      aria-hidden
      className="absolute inset-y-0 w-px bg-foreground/40"
      style={{ left: `${pct}%` }}
    />
  );
}
