// Het TTT-plan zoals de Discord-bot (bot/) het ophaalt via de deellink. Bewust
// smal: de bot vergelijkt het gereden vermogen met de kopbeurt-watts, dus FTP,
// gewicht en lengte gaan niet mee.

export const TTT_PLAN_EXPORT_VERSION = 1;

export type TttPlanExportRider = {
  order: number;
  name: string;
  zwiftId: string | null;
  pullWatts: number | null;
  pullSeconds: number;
};

export type TttPlanExport = {
  version: typeof TTT_PLAN_EXPORT_VERSION;
  name: string;
  eventTitle: string | null;
  /** ISO-tijd van de start, of null zonder event. */
  startAt: string | null;
  estimatedSeconds: number | null;
  estimatedSpeedKmh: number | null;
  riders: TttPlanExportRider[];
};

type PlanRow = { name: string; api_response: unknown };

type RiderRow = {
  name: string;
  zwift_id: string | null;
  pull_watts: number | null;
  pull_duration_seconds: number | null;
  display_order: number | null;
};

type EventRow = { title: string | null; start_at: string | null };

/** Het `data`-blok uit het antwoord van ZwiftGopher, of null. */
export function zwiftGopherData(apiResponse: unknown) {
  return typeof apiResponse === "object" &&
    apiResponse &&
    "data" in apiResponse &&
    typeof apiResponse.data === "object" &&
    apiResponse.data
    ? (apiResponse.data as Record<string, unknown>)
    : null;
}

export function routeLabel(value: unknown) {
  if (value === "next_wtrl" || value === "next_zrl") return "Next ZRL";
  if (value === "next") return "Next";
  return String(value ?? "-");
}

export function formatSeconds(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return [h, m, s]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .filter((part, index) => index > 0 || part !== "0")
    .join(":");
}

function positive(value: unknown) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function tttPlanExport(
  plan: PlanRow,
  riders: RiderRow[],
  event: EventRow | null,
): TttPlanExport {
  const data = zwiftGopherData(plan.api_response);
  return {
    version: TTT_PLAN_EXPORT_VERSION,
    name: plan.name,
    eventTitle: event?.title ?? null,
    startAt: event?.start_at ?? null,
    estimatedSeconds: positive(data?.estimated_time_seconds),
    estimatedSpeedKmh: positive(data?.estimated_avg_speed),
    riders: riders
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((rider, index) => ({
        order: index + 1,
        name: rider.name,
        zwiftId: /^\d+$/.test(rider.zwift_id?.trim() ?? "") ? rider.zwift_id!.trim() : null,
        pullWatts: positive(rider.pull_watts),
        pullSeconds: Math.max(0, Math.round(Number(rider.pull_duration_seconds ?? 0)) || 0),
      })),
  };
}

/** Vorm van een deeltoken: 32 tekens base64url. */
export function isTttShareToken(value: string) {
  return /^[A-Za-z0-9_-]{32}$/.test(value);
}
