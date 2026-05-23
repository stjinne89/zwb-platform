"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Clock, Gauge, MapPin, Route } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseGpx, type GpxPoint } from "@/lib/gpx";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((m) => m.Tooltip),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

export type EventLiveSession = {
  id: string;
  profileId: string;
  profileName: string;
  startedAt: string;
  lastSeenAt: string;
};

export type EventLivePosition = {
  session_id: string;
  profile_id: string;
  lat: number | string;
  lng: number | string;
  altitude: number | string | null;
  speed_kmh: number | string | null;
  recorded_at: string;
};

type Marker = {
  sessionId: string;
  profileId: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number | null;
  speedKmh: number | null;
  recordedAt: string;
  startedAt: string;
};

type RouteStats = {
  points: GpxPoint[];
  cumulativeKm: number[];
  totalKm: number;
  minEle: number;
  maxEle: number;
  gain: number;
};

type RiderProgress = Marker & {
  distanceKm: number | null;
  remainingKm: number | null;
  progressPct: number | null;
  elapsedMs: number;
  avgKmh: number | null;
  eta: Date | null;
  offRouteM: number | null;
  ele: number | null;
};

const STALE_AFTER_MS = 15 * 60 * 1000;
const OFF_ROUTE_M = 500;
const DEFAULT_CENTER: [number, number] = [51.55, 5.05];

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function buildRouteStats(points: GpxPoint[]): RouteStats | null {
  if (points.length < 2) return null;

  const cumulativeKm: number[] = [0];
  let totalKm = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;
  let gain = 0;

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      totalKm += haversineKm(points[i - 1], points[i]);
      cumulativeKm.push(totalKm);
      const prevEle = points[i - 1].ele;
      const ele = points[i].ele;
      if (prevEle !== undefined && ele !== undefined && ele > prevEle) {
        gain += ele - prevEle;
      }
    }
    const ele = points[i].ele;
    if (ele !== undefined) {
      minEle = Math.min(minEle, ele);
      maxEle = Math.max(maxEle, ele);
    }
  }

  if (!Number.isFinite(minEle) || !Number.isFinite(maxEle)) {
    minEle = 0;
    maxEle = 1;
  }

  return { points, cumulativeKm, totalKm, minEle, maxEle, gain };
}

function projectOnRoute(marker: Marker, stats: RouteStats, now: number): RiderProgress {
  let bestIndex = 0;
  let bestDistanceKm = Infinity;
  const rider = { lat: marker.lat, lon: marker.lng };

  for (let i = 0; i < stats.points.length; i++) {
    const distance = haversineKm(rider, stats.points[i]);
    if (distance < bestDistanceKm) {
      bestDistanceKm = distance;
      bestIndex = i;
    }
  }

  const offRouteM = bestDistanceKm * 1000;
  const onRoute = offRouteM <= OFF_ROUTE_M;
  const distanceKm = onRoute ? stats.cumulativeKm[bestIndex] : null;
  const remainingKm = distanceKm === null ? null : Math.max(0, stats.totalKm - distanceKm);
  const elapsedMs = Math.max(0, now - new Date(marker.startedAt).getTime());
  const elapsedHours = elapsedMs / 3_600_000;
  const avgKmh =
    distanceKm !== null && distanceKm >= 0.2 && elapsedHours >= 2 / 60
      ? distanceKm / elapsedHours
      : null;
  const eta =
    avgKmh !== null &&
    remainingKm !== null &&
    avgKmh >= 5 &&
    avgKmh <= 60 &&
    remainingKm > 0.1
      ? new Date(now + (remainingKm / avgKmh) * 3_600_000)
      : null;

  return {
    ...marker,
    distanceKm,
    remainingKm,
    progressPct: distanceKm === null ? null : Math.min(100, (distanceKm / stats.totalKm) * 100),
    elapsedMs,
    avgKmh,
    eta,
    offRouteM,
    ele: onRoute ? stats.points[bestIndex].ele ?? null : null,
  };
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}u ${minutes.toString().padStart(2, "0")}m`;
}

function formatKm(value: number | null) {
  if (value === null) return "-";
  return `${value.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;
}

function formatKmh(value: number | null) {
  if (value === null) return "-";
  return `${value.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km/u`;
}

function latestMarkers(
  sessions: EventLiveSession[],
  positions: EventLivePosition[],
) {
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const bySession = new Map<string, Marker>();

  for (const p of positions) {
    if (bySession.has(p.session_id)) continue;
    const session = sessionById.get(p.session_id);
    if (!session) continue;
    bySession.set(p.session_id, {
      sessionId: p.session_id,
      profileId: p.profile_id,
      name: session.profileName,
      lat: Number(p.lat),
      lng: Number(p.lng),
      altitude: toNumber(p.altitude),
      speedKmh: toNumber(p.speed_kmh),
      recordedAt: p.recorded_at,
      startedAt: session.startedAt,
    });
  }

  return bySession;
}

export function EventLiveTicker({
  gpxUrl,
  sessions,
  initialPositions,
}: {
  gpxUrl: string;
  sessions: EventLiveSession[];
  initialPositions: EventLivePosition[];
}) {
  const [points, setPoints] = useState<GpxPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [markers, setMarkers] = useState(() =>
    latestMarkers(sessions, initialPositions),
  );

  const sessionById = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);
  const activeIds = useMemo(() => new Set(sessions.map((s) => s.id)), [sessions]);
  const routeStats = useMemo(() => buildRouteStats(points), [points]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(gpxUrl);
        if (!res.ok) throw new Error(`Kon GPX niet ophalen (${res.status})`);
        const text = await res.text();
        const summary = parseGpx(text);
        if (!cancelled) setPoints(summary.points);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Onbekende fout");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gpxUrl]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("event-live-ticker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_positions" },
        (payload) => {
          const row = payload.new as EventLivePosition;
          const session = sessionById.get(row.session_id);
          if (!session) return;
          setMarkers((prev) => {
            const next = new Map(prev);
            next.set(row.session_id, {
              sessionId: row.session_id,
              profileId: row.profile_id,
              name: session.profileName,
              lat: Number(row.lat),
              lng: Number(row.lng),
              altitude: toNumber(row.altitude),
              speedKmh: toNumber(row.speed_kmh),
              recordedAt: row.recorded_at,
              startedAt: session.startedAt,
            });
            return next;
          });
          setNow(Date.now());
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_sessions" },
        (payload) => {
          const row = payload.new as { id: string; ended_at: string | null };
          if (!activeIds.has(row.id)) return;
          if (row.ended_at) {
            setMarkers((prev) => {
              const next = new Map(prev);
              next.delete(row.id);
              return next;
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeIds, sessionById]);

  if (error) {
    return (
      <section className="rounded-lg border bg-card p-4 text-sm text-destructive">
        {error}
      </section>
    );
  }

  if (!routeStats) {
    return (
      <section className="flex h-80 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        Live route laden...
      </section>
    );
  }

  const visibleMarkers = Array.from(markers.values()).filter((m) => {
    if (!activeIds.has(m.sessionId)) return false;
    return now - new Date(m.recordedAt).getTime() <= STALE_AFTER_MS;
  });
  const riders = visibleMarkers.map((marker) => projectOnRoute(marker, routeStats, now));
  const positions = routeStats.points.map((p) => [p.lat, p.lon] as [number, number]);
  const lats = routeStats.points.map((p) => p.lat);
  const lons = routeStats.points.map((p) => p.lon);
  const bounds: [[number, number], [number, number]] =
    routeStats.points.length > 0
      ? [
          [Math.min(...lats), Math.min(...lons)],
          [Math.max(...lats), Math.max(...lons)],
        ]
      : [DEFAULT_CENTER, DEFAULT_CENTER];

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="inline-block size-2.5 animate-pulse rounded-full bg-destructive" />
            Live tijdens dit event
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Actieve RSVP-deelnemers worden op de route en het hoogteprofiel
            gevolgd.
          </p>
        </div>
        <div className="rounded-md border bg-background px-3 py-2 text-sm tabular-nums">
          <strong>{riders.length}</strong>{" "}
          <span className="text-muted-foreground">live</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="h-[28rem] overflow-hidden rounded-lg border bg-background">
          <MapContainer bounds={bounds} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline
              positions={positions}
              pathOptions={{ color: "#1f3a47", weight: 4, opacity: 0.8 }}
            />
            {riders.map((rider) => (
              <CircleMarker
                key={rider.sessionId}
                center={[rider.lat, rider.lng]}
                radius={10}
                pathOptions={{
                  color: "#d4a84e",
                  weight: 3,
                  fillColor: "#0f2a32",
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} className="!bg-card !text-foreground">
                  <strong>{rider.name}</strong>
                </Tooltip>
                <Popup>
                  <RiderPopup rider={rider} totalKm={routeStats.totalKm} />
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="space-y-4">
          <LiveElevationProfile stats={routeStats} riders={riders} />
          <RiderList riders={riders} totalKm={routeStats.totalKm} />
        </div>
      </div>

      {riders.length === 0 && (
        <div className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">
          Nog geen live deelnemers. Zodra een RSVP-deelnemer vandaag een
          outdoor live-sessie heeft, verschijnt die hier.
        </div>
      )}
    </section>
  );
}

function RiderPopup({
  rider,
  totalKm,
}: {
  rider: RiderProgress;
  totalKm: number;
}) {
  return (
    <div className="min-w-44 space-y-2 text-sm">
      <p className="font-semibold">{rider.name}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Afstand</dt>
        <dd>
          {formatKm(rider.distanceKm)} /{" "}
          {totalKm.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km
        </dd>
        <dt className="text-muted-foreground">Bezig</dt>
        <dd>{formatDuration(rider.elapsedMs)}</dd>
        <dt className="text-muted-foreground">Gemiddeld</dt>
        <dd>{formatKmh(rider.avgKmh)}</dd>
        <dt className="text-muted-foreground">ETA</dt>
        <dd>
          {rider.eta
            ? rider.eta.toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-"}
        </dd>
      </dl>
      {rider.offRouteM !== null && rider.offRouteM > OFF_ROUTE_M && (
        <p className="text-xs text-amber-700">Buiten route of GPS wijkt af.</p>
      )}
    </div>
  );
}

function RiderList({
  riders,
  totalKm,
}: {
  riders: RiderProgress[];
  totalKm: number;
}) {
  if (riders.length === 0) return null;

  return (
    <ul className="divide-y rounded-lg border bg-background">
      {riders
        .sort((a, b) => (b.distanceKm ?? -1) - (a.distanceKm ?? -1))
        .map((rider) => (
          <li key={rider.sessionId} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{rider.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Laatste update{" "}
                  {new Date(rider.recordedAt).toLocaleTimeString("nl-NL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {rider.progressPct === null ? "buiten route" : `${Math.round(rider.progressPct)}%`}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <MiniStat icon={Route} label="Afstand" value={`${formatKm(rider.distanceKm)} / ${Math.round(totalKm)} km`} />
              <MiniStat icon={Clock} label="Bezig" value={formatDuration(rider.elapsedMs)} />
              <MiniStat icon={Gauge} label="Gem." value={formatKmh(rider.avgKmh)} />
              <MiniStat
                icon={MapPin}
                label="ETA"
                value={
                  rider.eta
                    ? rider.eta.toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"
                }
              />
            </div>
          </li>
        ))}
    </ul>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-2">
      <p className="flex items-center gap-1 text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  );
}

function LiveElevationProfile({
  stats,
  riders,
}: {
  stats: RouteStats;
  riders: RiderProgress[];
}) {
  const samples = stats.points
    .map((point, i) => ({
      km: stats.cumulativeKm[i],
      ele: point.ele,
    }))
    .filter((sample): sample is { km: number; ele: number } => sample.ele !== undefined);

  if (samples.length < 2) {
    return (
      <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        Geen hoogtedata in deze GPX.
      </div>
    );
  }

  const step = Math.max(1, Math.floor(samples.length / 250));
  const decimated = samples.filter((_, i) => i % step === 0 || i === samples.length - 1);
  const width = 1000;
  const height = 120;
  const padding = 6;
  const eleRange = Math.max(1, stats.maxEle - stats.minEle);
  const xFor = (km: number) => padding + (km / stats.totalKm) * (width - 2 * padding);
  const yFor = (ele: number) =>
    height - padding - ((ele - stats.minEle) / eleRange) * (height - 2 * padding);

  let linePath = `M ${xFor(decimated[0].km)},${yFor(decimated[0].ele)}`;
  for (let i = 1; i < decimated.length; i++) {
    linePath += ` L ${xFor(decimated[i].km)},${yFor(decimated[i].ele)}`;
  }
  const areaPath =
    `M ${xFor(decimated[0].km)},${height - padding} ` +
    linePath.replace(/^M /, "L ") +
    ` L ${xFor(decimated[decimated.length - 1].km)},${height - padding} Z`;

  return (
    <div className="space-y-2 rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <h3 className="font-semibold">Live hoogteprofiel</h3>
        <span className="text-muted-foreground">
          {stats.totalKm.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km -{" "}
          {Math.round(stats.gain)} hm
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block h-28 w-full"
        aria-label="Live hoogteprofiel"
      >
        <defs>
          <linearGradient id="event-live-elev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-zwb-petrol)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--color-zwb-petrol)" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#event-live-elev-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-zwb-petrol)"
          strokeWidth="1.8"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {riders
          .filter((rider) => rider.distanceKm !== null && rider.ele !== null)
          .map((rider) => (
            <g key={rider.sessionId}>
              <circle
                cx={xFor(rider.distanceKm ?? 0)}
                cy={yFor(rider.ele ?? stats.minEle)}
                r="7"
                fill="#d4a84e"
                stroke="#0f2a32"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <title>{`${rider.name}: ${formatKm(rider.distanceKm)}`}</title>
            </g>
          ))}
      </svg>
    </div>
  );
}
