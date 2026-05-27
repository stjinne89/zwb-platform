// Rider-stats widget op /leden/[id]: aggregeert dit lid's strava_activities
// voor een jaar-overzicht, persoonlijke records en discipline-verdeling.
//
// Privacy-respecterend: alleen geladen als profile_visibility.badges aan
// staat — consistent met de badge-sectie. Geen migratie nodig, leest uit
// bestaande strava_activities.

import { Bike, Mountain, Clock, Trophy, Calendar, PieChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const CYCLING_SPORTS = [
  "Ride",
  "VirtualRide",
  "MountainBikeRide",
  "EBikeRide",
  "GravelRide",
  "EMountainBikeRide",
  "Velomobile",
  "Handcycle",
];

type ActivityRow = {
  id: number;
  sport_type: string | null;
  start_date: string;
  distance_m: number | string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | string | null;
  kudos_count: number | null;
  name: string | null;
};

type Totals = { km: number; hm: number; uren: number; count: number };

function emptyTotals(): Totals {
  return { km: 0, hm: 0, uren: 0, count: 0 };
}

function disciplineOf(sport: string | null): string {
  switch (sport) {
    case "VirtualRide":
      return "Indoor/Zwift";
    case "MountainBikeRide":
    case "EMountainBikeRide":
      return "MTB";
    case "GravelRide":
      return "Gravel";
    case "Ride":
    case "EBikeRide":
      return "Outdoor";
    default:
      return "Overig";
  }
}

const DISCIPLINE_COLORS: Record<string, string> = {
  Outdoor: "bg-primary",
  "Indoor/Zwift": "bg-zwb-petrol",
  MTB: "bg-amber-600",
  Gravel: "bg-emerald-600",
  Overig: "bg-muted-foreground",
};

function formatDelta(delta: number | null): { label: string; positive: boolean } {
  if (delta === null || !isFinite(delta)) {
    return { label: "—", positive: true };
  }
  const sign = delta >= 0 ? "+" : "";
  return { label: `${sign}${Math.round(delta)}%`, positive: delta >= 0 };
}

function monthLabel(monthOffset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + monthOffset);
  return d.toLocaleDateString("nl-NL", { month: "short", timeZone: "Europe/Amsterdam" });
}

function MonthHeatmap({ values }: { values: number[] }) {
  // values: 12 maanden, oudste eerst. Cell-kleur op basis van max in de
  // reeks zodat ook lage-volume riders een gevarieerde grid zien.
  const max = Math.max(...values, 1);
  return (
    <div className="grid grid-cols-12 gap-0.5">
      {values.map((v, i) => {
        const intensity = max > 0 ? v / max : 0;
        // Tailwind doet geen dynamic opacity in JIT op willekeurige waarden;
        // gebruik 5 stappen voor consistente klasse-uitvoer.
        const step =
          intensity === 0
            ? 0
            : intensity < 0.25
              ? 1
              : intensity < 0.5
                ? 2
                : intensity < 0.75
                  ? 3
                  : 4;
        const cls =
          step === 0
            ? "bg-muted"
            : step === 1
              ? "bg-primary/20"
              : step === 2
                ? "bg-primary/40"
                : step === 3
                  ? "bg-primary/65"
                  : "bg-primary";
        return (
          <div key={i} className="text-center">
            <div
              className={`h-6 w-full rounded-sm ${cls}`}
              title={`${monthLabel(i - 11)}: ${Math.round(v)} km`}
              aria-label={`${monthLabel(i - 11)}: ${Math.round(v)} km`}
            />
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {monthLabel(i - 11).slice(0, 3)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export async function RiderStats({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("strava_activities")
    .select(
      "id, sport_type, start_date, distance_m, total_elevation_gain_m, moving_time_seconds, kudos_count, name",
    )
    .eq("profile_id", profileId)
    .in("sport_type", CYCLING_SPORTS)
    .order("start_date", { ascending: false });

  const activities = (rows ?? []) as ActivityRow[];
  if (activities.length === 0) return null;

  // ── Jaar-totalen: huidige jaar vs vorige jaar tot zelfde dag-van-jaar
  const now = new Date();
  const yearStart = new Date(now.getUTCFullYear(), 0, 1);
  const prevYearStart = new Date(now.getUTCFullYear() - 1, 0, 1);
  const prevYearSamePeriodEnd = new Date(
    now.getUTCFullYear() - 1,
    now.getUTCMonth(),
    now.getUTCDate(),
    23,
    59,
    59,
  );

  const currentYear = emptyTotals();
  const previousYearSamePeriod = emptyTotals();

  // ── Maand-grid: laatste 12 maanden, oudste eerst
  const monthsBack = 12;
  const monthsKm = new Array<number>(monthsBack).fill(0);
  const firstMonthStart = new Date(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1);

  // ── Best-ever
  let bestDistance: ActivityRow | null = null;
  let bestElevation: ActivityRow | null = null;
  let bestKudos: ActivityRow | null = null;

  // ── Discipline-breakdown over laatste 12 maanden
  const disciplineKm = new Map<string, number>();

  for (const a of activities) {
    const date = new Date(a.start_date);
    if (Number.isNaN(date.getTime())) continue;
    const km = Number(a.distance_m ?? 0) / 1000;
    const hm = Number(a.total_elevation_gain_m ?? 0);
    const uren = Number(a.moving_time_seconds ?? 0) / 3600;

    if (date >= yearStart) {
      currentYear.km += km;
      currentYear.hm += hm;
      currentYear.uren += uren;
      currentYear.count += 1;
    } else if (date >= prevYearStart && date <= prevYearSamePeriodEnd) {
      previousYearSamePeriod.km += km;
      previousYearSamePeriod.hm += hm;
      previousYearSamePeriod.uren += uren;
      previousYearSamePeriod.count += 1;
    }

    if (date >= firstMonthStart) {
      const monthsDiff =
        (date.getFullYear() - firstMonthStart.getFullYear()) * 12 +
        (date.getMonth() - firstMonthStart.getMonth());
      if (monthsDiff >= 0 && monthsDiff < monthsBack) {
        monthsKm[monthsDiff] += km;
      }
      const disc = disciplineOf(a.sport_type);
      disciplineKm.set(disc, (disciplineKm.get(disc) ?? 0) + km);
    }

    if (!bestDistance || km > Number(bestDistance.distance_m ?? 0) / 1000) bestDistance = a;
    if (!bestElevation || hm > Number(bestElevation.total_elevation_gain_m ?? 0))
      bestElevation = a;
    if (!bestKudos || (a.kudos_count ?? 0) > (bestKudos.kudos_count ?? 0)) bestKudos = a;
  }

  const kmDelta =
    previousYearSamePeriod.km > 0
      ? ((currentYear.km - previousYearSamePeriod.km) / previousYearSamePeriod.km) * 100
      : null;
  const deltaInfo = formatDelta(kmDelta);

  const totalDisciplineKm = Array.from(disciplineKm.values()).reduce((a, b) => a + b, 0);
  const disciplines = Array.from(disciplineKm.entries())
    .map(([name, km]) => ({
      name,
      km,
      pct: totalDisciplineKm > 0 ? (km / totalDisciplineKm) * 100 : 0,
    }))
    .filter((d) => d.km > 0)
    .sort((a, b) => b.km - a.km);

  const yearLabel = now.getUTCFullYear();
  const firstLastName = displayName.split(" ")[0];

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <header>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Bike className="size-4 text-primary" />
          {firstLastName} op de fiets
        </h2>
        <p className="text-xs text-muted-foreground">
          Aggregaten uit Strava-activiteiten. Bijgewerkt bij elke sync.
        </p>
      </header>

      {/* Jaar-totalen */}
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Dit jaar ({yearLabel})
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Stat
            icon={<Bike className="size-4" />}
            label="Kilometers"
            value={Math.round(currentYear.km).toLocaleString("nl-NL")}
            sub={
              kmDelta !== null ? (
                <span className={deltaInfo.positive ? "text-emerald-600" : "text-destructive"}>
                  {deltaInfo.label} t.o.v. {yearLabel - 1}
                </span>
              ) : (
                "Geen vergelijking met vorig jaar"
              )
            }
          />
          <Stat
            icon={<Mountain className="size-4" />}
            label="Hoogtemeters"
            value={Math.round(currentYear.hm).toLocaleString("nl-NL")}
          />
          <Stat
            icon={<Clock className="size-4" />}
            label="Uren"
            value={Math.round(currentYear.uren).toLocaleString("nl-NL")}
            sub={`${currentYear.count} ritten`}
          />
        </div>
      </div>

      {/* Maand-heatmap */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Calendar className="size-3.5" />
          12-maand trend (km per maand)
        </h3>
        <MonthHeatmap values={monthsKm} />
      </div>

      {/* Discipline-breakdown */}
      {disciplines.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <PieChart className="size-3.5" />
            Verdeling laatste 12 maanden
          </h3>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {disciplines.map((d) => (
              <div
                key={d.name}
                className={DISCIPLINE_COLORS[d.name] ?? "bg-muted-foreground"}
                style={{ width: `${d.pct}%` }}
                title={`${d.name}: ${Math.round(d.km)} km (${Math.round(d.pct)}%)`}
                aria-label={`${d.name}: ${Math.round(d.km)} km`}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {disciplines.map((d) => (
              <li key={d.name} className="flex items-center gap-1.5">
                <span
                  className={`inline-block size-2 rounded-full ${DISCIPLINE_COLORS[d.name] ?? "bg-muted-foreground"}`}
                  aria-hidden
                />
                {d.name} {Math.round(d.pct)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Persoonlijke records */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Trophy className="size-3.5 text-primary" />
          Persoonlijke records (ooit)
        </h3>
        <ul className="space-y-1 text-sm">
          {bestDistance && (
            <BestRow
              label="Langste rit"
              value={`${Math.round(Number(bestDistance.distance_m ?? 0) / 100) / 10} km`}
              activity={bestDistance}
            />
          )}
          {bestElevation && (
            <BestRow
              label="Meeste hoogtemeters"
              value={`${Math.round(Number(bestElevation.total_elevation_gain_m ?? 0))} hm`}
              activity={bestElevation}
            />
          )}
          {bestKudos && (bestKudos.kudos_count ?? 0) > 0 && (
            <BestRow
              label="Meeste kudos"
              value={`${bestKudos.kudos_count} kudos`}
              activity={bestKudos}
            />
          )}
        </ul>
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function BestRow({
  label,
  value,
  activity,
}: {
  label: string;
  value: string;
  activity: ActivityRow;
}) {
  const date = new Date(activity.start_date).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="font-medium tabular-nums">{value}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {activity.name ? `${activity.name} · ` : ""}
          {date}
        </span>
      </span>
    </li>
  );
}
