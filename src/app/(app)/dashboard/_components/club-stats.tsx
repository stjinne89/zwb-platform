import { TrendingUp, Mountain, Clock, Bike } from "lucide-react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import { briljantMonthGrowth, MONTH_GROWTH_LOOKBACK_DAYS } from "@/lib/briljant/compare";
import { loadGrowthSnapshots } from "@/lib/briljant/server";
import { mondayKey, shiftDay } from "@/lib/briljant/snapshot";
import {
  clubmens,
  groeibriljant,
  metronoom,
  monthRankings,
  type ClubEventRsvp,
  type LiveRide,
  type Ranking,
} from "@/lib/rankings/rankings";
import { CYCLING_SPORTS } from "@/lib/strava/sports";
import { uniqueRides } from "@/lib/rides/unique-rides";
import {
  RiderOfTheMonthCarousel,
  type RiderMetricSlide,
} from "./rider-of-the-month-carousel";

// Club-stats widget op /dashboard. Aggregeert outdoor + indoor cycling-
// activities over alle leden voor:
//   - huidige maand totaal (km / hm / uren) + delta vs vorige maand
//   - Rider of the month: de ranglijsten van ZWB Rankings over de huidige maand
//   - sparkline van km-per-week over laatste 12 weken
//
// Query gaat over de laatste ~13 weken (zo zit zowel vorige maand als
// huidige maand er volledig in) en groepeert pas in TS — dat is voor de
// huidige clubgrootte ruim snel genoeg en vermijdt een Postgres-RPC.

const WEEKS_BACK = 13;

type ActivityRow = {
  id: number;
  profile_id: string;
  start_date: string;
  distance_m: number | string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | string | null;
  trainer: boolean | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

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

/**
 * De ritten van alle leden over het venster, tien minuten gedeeld tussen alle
 * leden. Elke vraag aan de database is een oversteek (functies in Ohio, database
 * in Ierland), en dit waren er twee achter elkaar per dashboardweergave. De
 * uitkomst is voor elk lid gelijk: strava_activities en profiles zijn voor alle
 * ingelogde leden leesbaar (RLS `using (true)`), dus de service-rol toont hier
 * niets wat een lid niet zelf mag zien. Een nieuwe rit telt hooguit tien minuten
 * later mee.
 */
const loadClubActivities = unstable_cache(
  async (): Promise<ActivityRow[]> => {
    const admin = createAdminClient();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - WEEKS_BACK * 7);
    since.setUTCHours(0, 0, 0, 0);

    // Gepagineerd: Supabase geeft standaard hooguit 1000 rijen. Op 2026-09-30 vielen
    // er al 1.090 ritten in het venster, dus de totalen misten stilletjes ritten.
    const PAGE = 1000;
    const activities: ActivityRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data: rows } = await admin
        .from("strava_activities")
        .select(
          "id, profile_id, start_date, distance_m, total_elevation_gain_m, moving_time_seconds, trainer, profiles(display_name)",
        )
        .gte("start_date", since.toISOString())
        .in("sport_type", CYCLING_SPORTS)
        .order("start_date")
        .order("id")
        .range(from, from + PAGE - 1);
      const page = (rows ?? []) as ActivityRow[];
      activities.push(...page);
      if (page.length < PAGE) break;
    }
    return activities;
  },
  ["club-stats-activities", "v3"],
  { revalidate: 600 },
);

/**
 * Voor Clubmens in Rider of the month: de ja's op events en de live-ritten van de
 * maand. Net als de ritten gedeeld tussen alle leden: aanmeldingen zijn voor
 * iedereen leesbaar, live-ritten alleen met zichtbaarheid "members" (zoals RLS).
 */
const loadClubMoments = unstable_cache(
  async (monthStart: string): Promise<{ rsvps: ClubEventRsvp[]; live: LiveRide[] }> => {
    const admin = createAdminClient();
    const from = `${monthStart}T00:00:00.000Z`;
    const [{ data: events }, { data: live }] = await Promise.all([
      admin.from("events").select("id, start_at").gte("start_at", from),
      admin
        .from("live_sessions")
        .select("profile_id, started_at, last_seen_at, ended_at")
        .eq("visibility", "members")
        .gte("started_at", from),
    ]);
    const startById = new Map(
      ((events ?? []) as Array<{ id: string; start_at: string }>).map((event) => [event.id, event.start_at]),
    );
    const { data: rsvps } = startById.size
      ? await admin
          .from("event_rsvps")
          .select("event_id, profile_id")
          .eq("status", "yes")
          .in("event_id", [...startById.keys()])
      : { data: [] };
    return {
      rsvps: ((rsvps ?? []) as Array<{ event_id: string; profile_id: string }>).flatMap((rsvp) => {
        const start = startById.get(rsvp.event_id);
        return start ? [{ ...rsvp, start_at: start }] : [];
      }),
      live: (live ?? []) as LiveRide[],
    };
  },
  ["club-stats-moments", "v1"],
  { revalidate: 600 },
);

/**
 * Groeibriljant over de maand, met de sessie van het lid: RLS beslist wie je ziet,
 * dus niet in de gedeelde cache.
 */
async function loadMonthGrowth(monthStart: string, today: string) {
  const user = await getRequestUser();
  if (!user) return groeibriljant([]);
  const supabase = await createClient();
  const rows = await loadGrowthSnapshots(
    supabase,
    user.id,
    shiftDay(monthStart, -MONTH_GROWTH_LOOKBACK_DAYS),
    mondayKey(today),
  );
  return groeibriljant(briljantMonthGrowth(rows, monthStart));
}

export async function ClubStats() {
  // Faalt de cache of de service-rol, dan geen blok in plaats van een kapot dashboard.
  // Een rit die een lid twee keer opnam, telt één keer (lib/rides/unique-rides.ts).
  const activities = uniqueRides(await loadClubActivities().catch(() => [] as ActivityRow[]));

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
  const monthRows: Parameters<typeof monthRankings>[0] = [];
  const names = new Map<string, string>();
  const kmByWeek = new Map<string, number>();

  for (const a of activities) {
    const date = new Date(a.start_date);
    if (Number.isNaN(date.getTime())) continue;
    const km = Number(a.distance_m ?? 0) / 1000;
    const hm = Number(a.total_elevation_gain_m ?? 0);
    const uren = Number(a.moving_time_seconds ?? 0) / 3600;

    const mKey = monthKey(date);
    const t = totalsByMonth.get(mKey) ?? emptyTotals();
    t.km += km;
    t.hm += hm;
    t.uren += uren;
    t.count += 1;
    totalsByMonth.set(mKey, t);

    if (mKey === currentMonth) {
      monthRows.push({ ...a, moving_time_seconds: Number(a.moving_time_seconds ?? 0) });
      names.set(a.profile_id, displayName(a.profiles));
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

  // Rider of the month: de ranglijsten van ZWB Rankings over de maand, top 3 per
  // lijst. Geen kudos: die heeft alleen wie via Strava rijdt (2026-10-26).
  const monthStart = `${currentMonth}-01`;
  const [moments, growth] = await Promise.all([
    loadClubMoments(monthStart).catch(() => ({ rsvps: [], live: [] })),
    loadMonthGrowth(monthStart, now.toISOString().slice(0, 10)).catch(() => groeibriljant([])),
  ]);
  const rankings: Ranking[] = [
    ...monthRankings(monthRows),
    metronoom(monthRows),
    clubmens(moments.rsvps, moments.live, now),
    growth,
  ];
  const top = rankings.map((ranking) => ({ ranking, entries: ranking.entries.slice(0, 3) }));
  const missing = [
    ...new Set(top.flatMap(({ entries }) => entries.map((entry) => entry.profileId)).filter((id) => !names.has(id))),
  ];
  if (missing.length > 0) {
    const { data: profiles } = await createAdminClient().from("profiles").select("id, display_name").in("id", missing);
    for (const row of (profiles ?? []) as Array<{ id: string; display_name: string | null }>) {
      names.set(row.id, row.display_name ?? "Onbekend");
    }
  }
  const slides: RiderMetricSlide[] = top
    .filter(({ entries }) => entries.length > 0)
    .map(({ ranking, entries }) => ({
      key: ranking.id,
      label: ranking.title,
      icon: ranking.icon,
      riders: entries.map((entry) => ({
        id: entry.profileId,
        name: names.get(entry.profileId) ?? "Onbekend",
        value: entry.label,
        rank: entry.rank,
      })),
    }));

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

      {slides.length > 0 && <RiderOfTheMonthCarousel slides={slides} />}
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
