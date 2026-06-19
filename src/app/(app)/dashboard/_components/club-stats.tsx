import { TrendingUp, Mountain, Clock, Bike } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  RiderOfTheMonthCarousel,
  type RiderMetricSlide,
} from "./rider-of-the-month-carousel";

// Club-stats widget op /dashboard. Aggregeert outdoor + indoor cycling-
// activities over alle leden voor:
//   - huidige maand totaal (km / hm / uren) + delta vs vorige maand
//   - top 3 rider van de huidige maand (op km)
//   - sparkline van km-per-week over laatste 12 weken
//
// Query gaat over de laatste ~13 weken (zo zit zowel vorige maand als
// huidige maand er volledig in) en groepeert pas in TS — dat is voor de
// huidige clubgrootte ruim snel genoeg en vermijdt een Postgres-RPC.

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

const WEEKS_BACK = 13;

type ActivityRow = {
  profile_id: string;
  start_date: string;
  distance_m: number | string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | string | null;
  kudos_count: number | string | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

// Per-lid maandtotalen waarop we de "rider of the month"-top-3 baseren.
type RiderTotals = { name: string; km: number; uren: number; hm: number; kudos: number };

type Totals = { km: number; hm: number; uren: number; count: number };

function emptyTotals(): Totals {
  return { km: 0, hm: 0, uren: 0, count: 0 };
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isoWeekStart(d: Date): string {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() - day + 1);
  return x.toISOString().slice(0, 10);
}

function displayName(rel: ActivityRow["profiles"]): string {
  if (!rel) return "Onbekend";
  const single = Array.isArray(rel) ? rel[0] : rel;
  return single?.display_name ?? "Onbekend";
}

function formatDelta(delta: number): string {
  if (!isFinite(delta)) return "-";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${Math.round(delta)}%`;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const W = 120;
  const H = 32;
  const stepX = W / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = H - (v / max) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label="Trend van weekkilometers"
      className="text-primary"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function ClubStats() {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WEEKS_BACK * 7);
  since.setUTCHours(0, 0, 0, 0);

  const { data: rows } = await supabase
    .from("strava_activities")
    .select(
      "profile_id, start_date, distance_m, total_elevation_gain_m, moving_time_seconds, kudos_count, profiles(display_name)",
    )
    .gte("start_date", since.toISOString())
    .in("sport_type", CYCLING_SPORTS);

  const activities = (rows ?? []) as ActivityRow[];
  if (activities.length === 0) {
    return null;
  }

  const now = new Date();
  const currentMonth = monthKey(now);
  const previousMonth = (() => {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - 1);
    return monthKey(d);
  })();

  const totalsByMonth = new Map<string, Totals>();
  const ridersCurrentMonth = new Map<string, RiderTotals>();
  const kmByWeek = new Map<string, number>();

  for (const a of activities) {
    const date = new Date(a.start_date);
    if (Number.isNaN(date.getTime())) continue;
    const km = Number(a.distance_m ?? 0) / 1000;
    const hm = Number(a.total_elevation_gain_m ?? 0);
    const uren = Number(a.moving_time_seconds ?? 0) / 3600;
    const kudos = Number(a.kudos_count ?? 0);

    const mKey = monthKey(date);
    const t = totalsByMonth.get(mKey) ?? emptyTotals();
    t.km += km;
    t.hm += hm;
    t.uren += uren;
    t.count += 1;
    totalsByMonth.set(mKey, t);

    if (mKey === currentMonth) {
      const cur =
        ridersCurrentMonth.get(a.profile_id) ??
        ({ name: displayName(a.profiles), km: 0, uren: 0, hm: 0, kudos: 0 } satisfies RiderTotals);
      cur.km += km;
      cur.uren += uren;
      cur.hm += hm;
      cur.kudos += kudos;
      ridersCurrentMonth.set(a.profile_id, cur);
    }

    const wKey = isoWeekStart(date);
    kmByWeek.set(wKey, (kmByWeek.get(wKey) ?? 0) + km);
  }

  const cur = totalsByMonth.get(currentMonth) ?? emptyTotals();
  const prev = totalsByMonth.get(previousMonth) ?? emptyTotals();
  const delta = prev.km > 0 ? ((cur.km - prev.km) / prev.km) * 100 : 0;

  // Sparkline: laatste 12 weeks
  const weekKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i * 7);
    weekKeys.push(isoWeekStart(d));
  }
  const sparkValues = weekKeys.map((k) => Math.round(kmByWeek.get(k) ?? 0));

  // Rider of the month: top 3 per maatstaf voor de carousel.
  const riders = Array.from(ridersCurrentMonth.values());
  const topBy = (
    metric: "km" | "uren" | "hm" | "kudos",
    format: (value: number) => string,
  ) =>
    [...riders]
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 3)
      .map((r) => ({ name: r.name, value: format(r[metric]) }));

  const intFmt = (v: number) => Math.round(v).toLocaleString("nl-NL");
  const slides: RiderMetricSlide[] = [
    { key: "km", label: "Kilometers", unit: "km", riders: topBy("km", intFmt) },
    {
      key: "uren",
      label: "Uren in 't zadel",
      unit: "u",
      riders: topBy("uren", (v) => v.toLocaleString("nl-NL", { maximumFractionDigits: 1 })),
    },
    { key: "kudos", label: "Kudo's", unit: "", riders: topBy("kudos", intFmt) },
    { key: "hm", label: "Hoogtemeters", unit: "hm", riders: topBy("hm", intFmt) },
  ];

  const monthLabel = new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    timeZone: "Europe/Amsterdam",
  }).format(now);

  return (
    <section>
      <header className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <TrendingUp className="size-5 text-primary" />
            Club deze maand ({monthLabel})
          </h2>
        </div>
        <div className="text-right">
          <Sparkline values={sparkValues} />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={<Bike className="size-4" />}
          label="Kilometers"
          value={Math.round(cur.km).toLocaleString("nl-NL")}
          sub={`${formatDelta(delta)} t.o.v. vorige maand`}
        />
        <Stat
          icon={<Mountain className="size-4" />}
          label="Hoogtemeters"
          value={Math.round(cur.hm).toLocaleString("nl-NL")}
        />
        <Stat
          icon={<Clock className="size-4" />}
          label="Uren in 't zadel"
          value={Math.round(cur.uren).toLocaleString("nl-NL")}
          sub={`${cur.count} ritten`}
        />
      </div>

      {riders.length > 0 && <RiderOfTheMonthCarousel slides={slides} />}
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
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
