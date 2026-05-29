import Link from "next/link";
import { redirect } from "next/navigation";
import { Bike, Clock, Mountain, Trophy, Users, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, HelpLink, PageHeader } from "@/components/app-ui";

export const dynamic = "force-dynamic";

// Cycling sport_types (gelijk aan de dashboard club-stats widget).
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

const DISCIPLINE_LABELS: Record<string, string> = {
  Ride: "Weg",
  VirtualRide: "Virtueel (Zwift)",
  GravelRide: "Gravel",
  MountainBikeRide: "MTB",
  EBikeRide: "E-bike",
  EMountainBikeRide: "E-MTB",
  Velomobile: "Velomobiel",
  Handcycle: "Handbike",
};

type ActivityRow = {
  profile_id: string;
  start_date: string;
  sport_type: string | null;
  distance_m: number | string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | string | null;
  profiles:
    | { display_name: string | null; region: string | null }
    | { display_name: string | null; region: string | null }[]
    | null;
};

type Totals = { km: number; hm: number; uren: number; count: number };
const empty = (): Totals => ({ km: 0, hm: 0, uren: 0, count: 0 });

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function profileOf(rel: ActivityRow["profiles"]) {
  if (!rel) return { display_name: null, region: null };
  return Array.isArray(rel) ? rel[0] ?? { display_name: null, region: null } : rel;
}

const nl = (n: number) => Math.round(n).toLocaleString("nl-NL");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllActivities(supabase: any, sinceIso: string) {
  const PAGE = 1000;
  const all: ActivityRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activities")
      .select(
        "profile_id, start_date, sport_type, distance_m, total_elevation_gain_m, moving_time_seconds, profiles(display_name, region)",
      )
      .gte("start_date", sinceIso)
      .in("sport_type", CYCLING_SPORTS)
      .order("start_date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as ActivityRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Venster: laatste 12 maanden (incl. huidige).
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(monthStart);
    d.setUTCMonth(d.getUTCMonth() - i);
    months.push(monthKey(d));
  }
  const windowStart = new Date(monthStart);
  windowStart.setUTCMonth(windowStart.getUTCMonth() - 11);

  const activities = await fetchAllActivities(supabase, windowStart.toISOString());

  const selectedMonth =
    monthParam && months.includes(monthParam) ? monthParam : null;

  // Per-maand totalen (voor de selector + trendgrafiek), over het hele venster.
  const byMonth = new Map<string, Totals>();
  for (const a of activities) {
    const date = new Date(a.start_date);
    if (Number.isNaN(date.getTime())) continue;
    const key = monthKey(date);
    if (!months.includes(key)) continue;
    const t = byMonth.get(key) ?? empty();
    t.km += Number(a.distance_m ?? 0) / 1000;
    t.hm += Number(a.total_elevation_gain_m ?? 0);
    t.uren += Number(a.moving_time_seconds ?? 0) / 3600;
    t.count += 1;
    byMonth.set(key, t);
  }

  // Scope: één maand of het hele venster.
  const inScope = activities.filter((a) => {
    if (!selectedMonth) return true;
    const date = new Date(a.start_date);
    return !Number.isNaN(date.getTime()) && monthKey(date) === selectedMonth;
  });

  const scopeTotals = empty();
  const byDiscipline = new Map<string, Totals>();
  const byRegion = new Map<string, number>();
  const byRider = new Map<string, { km: number; name: string }>();

  for (const a of inScope) {
    const km = Number(a.distance_m ?? 0) / 1000;
    const hm = Number(a.total_elevation_gain_m ?? 0);
    const uren = Number(a.moving_time_seconds ?? 0) / 3600;
    scopeTotals.km += km;
    scopeTotals.hm += hm;
    scopeTotals.uren += uren;
    scopeTotals.count += 1;

    const disc = a.sport_type ?? "Ride";
    const dt = byDiscipline.get(disc) ?? empty();
    dt.km += km;
    dt.hm += hm;
    dt.uren += uren;
    dt.count += 1;
    byDiscipline.set(disc, dt);

    const prof = profileOf(a.profiles);
    const region = (prof.region ?? "").trim() || "Onbekend";
    byRegion.set(region, (byRegion.get(region) ?? 0) + km);

    const rider = byRider.get(a.profile_id) ?? {
      km: 0,
      name: prof.display_name ?? "Onbekend",
    };
    rider.km += km;
    byRider.set(a.profile_id, rider);
  }

  const disciplines = Array.from(byDiscipline.entries()).sort(
    (a, b) => b[1].km - a[1].km,
  );
  const regions = Array.from(byRegion.entries()).sort((a, b) => b[1] - a[1]);
  const topRiders = Array.from(byRider.values())
    .sort((a, b) => b.km - a.km)
    .slice(0, 10);

  const maxMonthKm = Math.max(
    1,
    ...months.map((m) => byMonth.get(m)?.km ?? 0),
  );
  const maxDiscKm = Math.max(1, ...disciplines.map(([, t]) => t.km));
  const maxRegionKm = Math.max(1, ...regions.map(([, km]) => km));

  const scopeLabel = selectedMonth
    ? monthLabel(selectedMonth)
    : "Laatste 12 maanden";

  const hasData = activities.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ZWB Stats"
        title="Clubstatistieken"
        description="Kilometers, hoogtemeters en uren van alle leden — per maand, discipline en regio."
        actions={<HelpLink href="/hulp" />}
      />

      {!hasData ? (
        <EmptyState>
          Nog geen Strava-data. Zodra leden hun ritten syncen verschijnen hier
          de clubstatistieken.
        </EmptyState>
      ) : (
        <>
          {/* Maand-selector */}
          <div className="flex flex-wrap gap-1.5">
            <Chip href="/stats" active={!selectedMonth}>
              12 mnd
            </Chip>
            {months.map((m) => (
              <Chip
                key={m}
                href={`/stats?month=${m}`}
                active={selectedMonth === m}
              >
                {monthLabel(m)}
              </Chip>
            ))}
          </div>

          {/* KPI's voor de scope */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              icon={<Bike className="size-4" />}
              label="Kilometers"
              value={nl(scopeTotals.km)}
              sub={scopeLabel}
            />
            <Kpi
              icon={<Mountain className="size-4" />}
              label="Hoogtemeters"
              value={nl(scopeTotals.hm)}
            />
            <Kpi
              icon={<Clock className="size-4" />}
              label="Uren"
              value={nl(scopeTotals.uren)}
              sub={`${nl(scopeTotals.count)} ritten`}
            />
            <Kpi
              icon={<Users className="size-4" />}
              label="Actieve riders"
              value={nl(byRider.size)}
            />
          </section>

          {/* Maandtrend (km) */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Kilometers per maand
            </h2>
            <div className="flex items-end gap-1.5" style={{ height: 140 }}>
              {months.map((m) => {
                const km = byMonth.get(m)?.km ?? 0;
                const pct = (km / maxMonthKm) * 100;
                const active = selectedMonth === m;
                return (
                  <Link
                    key={m}
                    href={active ? "/stats" : `/stats?month=${m}`}
                    className="group flex flex-1 flex-col items-center justify-end gap-1"
                    title={`${monthLabel(m)}: ${nl(km)} km`}
                  >
                    <span className="text-[0.6rem] tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100">
                      {nl(km)}
                    </span>
                    <span
                      className={`w-full rounded-t transition-colors ${
                        active
                          ? "bg-primary"
                          : "bg-primary/40 group-hover:bg-primary/70"
                      }`}
                      style={{ height: `${Math.max(2, pct)}%` }}
                    />
                    <span className="text-[0.6rem] text-muted-foreground">
                      {monthLabel(m).split(" ")[0]}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Per discipline */}
            <section className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Per discipline · {scopeLabel}
              </h2>
              {disciplines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen ritten.</p>
              ) : (
                <ul className="space-y-2">
                  {disciplines.map(([disc, t]) => (
                    <BarRow
                      key={disc}
                      label={DISCIPLINE_LABELS[disc] ?? disc}
                      value={`${nl(t.km)} km`}
                      pct={(t.km / maxDiscKm) * 100}
                      sub={`${nl(t.uren)} u · ${nl(t.count)} ritten`}
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* Per regio */}
            <section className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="size-4" />
                Per regio · {scopeLabel}
              </h2>
              {regions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen ritten.</p>
              ) : (
                <ul className="space-y-2">
                  {regions.slice(0, 12).map(([region, km]) => (
                    <BarRow
                      key={region}
                      label={region}
                      value={`${nl(km)} km`}
                      pct={(km / maxRegionKm) * 100}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Top riders */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Trophy className="size-4 text-primary" />
              Top riders · {scopeLabel}
            </h2>
            {topRiders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen ritten.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {topRiders.map((rider, i) => (
                  <li
                    key={rider.name + i}
                    className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-5 text-right tabular-nums text-muted-foreground">
                        {i + 1}.
                      </span>
                      {rider.name}
                    </span>
                    <span className="font-medium tabular-nums">
                      {nl(rider.km)} km
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function Kpi({
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

function BarRow({
  label,
  value,
  pct,
  sub,
}: {
  label: string;
  value: string;
  pct: number;
  sub?: string;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </li>
  );
}
