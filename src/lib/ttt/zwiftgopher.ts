import type {
  TttPlanInput,
  TttPlanRiderInput,
  TttSettings,
} from "@/lib/ttt/types";

type OptimizePayload = {
  request_id: string;
  team_name: string;
  route: TttSettings["route"];
  intensity: number;
  efficiency: number;
  allow_zero_pulls: boolean;
  min_pull_duration: number;
  max_pull_duration: number;
  duration_interval: 10 | 15;
  optimization_strategy: TttSettings["optimizationStrategy"];
  target_speed?: number;
  riders?: number[];
  rider_overrides?: Record<string, Record<string, string | number>>;
  custom_riders?: Array<Record<string, string | number>>;
};

function positiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function numericZwiftId(value: string) {
  const trimmed = value.trim();
  return /^[0-9]+$/.test(trimmed) ? trimmed : null;
}

function riderPower300(rider: TttPlanRiderInput) {
  return positiveNumber(rider.power300Watts) ?? positiveNumber(rider.ftpWatts);
}

function validateCustomRider(rider: TttPlanRiderInput) {
  const missing: string[] = [];
  if (!rider.name.trim()) missing.push("naam");
  if (!positiveNumber(rider.ftpWatts)) missing.push("FTP");
  if (!positiveNumber(rider.weightKg)) missing.push("gewicht");
  if (!positiveNumber(rider.heightCm)) missing.push("lengte");
  return missing;
}

export function buildZwiftGopherPayload(plan: TttPlanInput): OptimizePayload {
  const riders = plan.riders
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const idRiders: number[] = [];
  const riderOverrides: OptimizePayload["rider_overrides"] = {};
  const customRiders: NonNullable<OptimizePayload["custom_riders"]> = [];

  for (const rider of riders) {
    const zwiftId = numericZwiftId(rider.zwiftId);
    const power300 = riderPower300(rider);

    if (zwiftId && !rider.isManual) {
      idRiders.push(Number(zwiftId));
      const overrides: Record<string, string | number> = {};
      if (rider.name.trim()) overrides.name = rider.name.trim();
      if (positiveNumber(rider.ftpWatts)) overrides.ftp = rider.ftpWatts as number;
      if (positiveNumber(rider.weightKg)) overrides.weight = rider.weightKg as number;
      if (positiveNumber(rider.heightCm)) overrides.height = rider.heightCm as number;
      if (power300) overrides.power_300_watts = power300;
      if (Object.keys(overrides).length > 0) riderOverrides[zwiftId] = overrides;
      continue;
    }

    const missing = validateCustomRider(rider);
    if (missing.length > 0) {
      throw new Error(
        `${rider.name || "Handmatige rider"} mist ${missing.join(", ")} voor ZwiftGopher.`,
      );
    }

    customRiders.push({
      name: rider.name.trim(),
      ftp: rider.ftpWatts as number,
      weight: rider.weightKg as number,
      height: rider.heightCm as number,
      ...(power300 ? { power_300_watts: power300 } : {}),
    });
  }

  const payload: OptimizePayload = {
    request_id: plan.id ?? `zwb-${Date.now()}`,
    team_name: plan.name.trim() || "ZWB TTT",
    route: plan.settings.route,
    intensity: plan.settings.intensity,
    efficiency: plan.settings.efficiency,
    allow_zero_pulls: plan.settings.allowZeroPulls,
    min_pull_duration: plan.settings.minPullDuration,
    max_pull_duration: plan.settings.maxPullDuration,
    duration_interval: plan.settings.durationInterval,
    optimization_strategy: plan.settings.optimizationStrategy,
  };
  if (positiveNumber(plan.settings.targetSpeed)) {
    payload.target_speed = plan.settings.targetSpeed as number;
  }
  if (idRiders.length > 0) payload.riders = idRiders;
  if (Object.keys(riderOverrides).length > 0) {
    payload.rider_overrides = riderOverrides;
  }
  if (customRiders.length > 0) payload.custom_riders = customRiders;
  return payload;
}

type ApiRider = Record<string, unknown>;

// Velden per renner in het antwoord (gemeten op 2026-10-09; de documentatie
// noemt ze niet): `order` vanaf 1, `pull_power` in watt, `pull_duration` in
// seconden.
function numberField(row: ApiRider, key: string) {
  const raw = row[key];
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function zwiftGopherRiders(apiResponse: unknown): ApiRider[] {
  if (
    typeof apiResponse === "object" &&
    apiResponse &&
    "data" in apiResponse &&
    typeof apiResponse.data === "object" &&
    apiResponse.data &&
    "riders" in apiResponse.data &&
    Array.isArray(apiResponse.data.riders)
  ) {
    return apiResponse.data.riders.filter(
      (row): row is ApiRider => typeof row === "object" && row !== null,
    );
  }
  return [];
}

function matchApiRider(
  rider: TttPlanRiderInput,
  apiRiders: ApiRider[],
  taken: Set<number>,
) {
  const zwiftId = rider.zwiftId.trim();
  const name = rider.name.trim().toLowerCase();
  const free = (index: number) => !taken.has(index);
  let index = zwiftId
    ? apiRiders.findIndex((row, i) => free(i) && String(row.zwift_id ?? "") === zwiftId)
    : -1;
  if (index < 0 && name) {
    index = apiRiders.findIndex(
      (row, i) => free(i) && String(row.name ?? "").trim().toLowerCase() === name,
    );
  }
  return index;
}

// Neemt kopbeurt-watts, kopbeurtduur en volgorde over uit het antwoord. Renners
// die ZwiftGopher niet teruggeeft houden hun eigen waarden en sluiten achteraan.
// Zonder herkende kopbeurten blijft het plan zoals het was.
export function applyZwiftGopherResult(
  riders: TttPlanRiderInput[],
  apiResponse: unknown,
): { riders: TttPlanRiderInput[]; applied: number } {
  const apiRiders = zwiftGopherRiders(apiResponse);
  const taken = new Set<number>();
  let applied = 0;

  const matched = riders
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((rider, inputIndex) => {
      const apiIndex = matchApiRider(rider, apiRiders, taken);
      if (apiIndex < 0) {
        return { rider, inputIndex, rank: Number.POSITIVE_INFINITY };
      }
      taken.add(apiIndex);
      const row = apiRiders[apiIndex];
      const watts = numberField(row, "pull_power");
      const duration = numberField(row, "pull_duration");
      const hasWatts = watts != null && watts > 0;
      const hasDuration = duration != null && duration >= 0;
      if (hasWatts || hasDuration) applied += 1;
      return {
        rider: {
          ...rider,
          ...(hasWatts ? { pullWatts: Math.round(watts) } : {}),
          ...(hasDuration ? { pullDurationSeconds: Math.round(duration) } : {}),
        },
        inputIndex,
        rank: numberField(row, "order") ?? apiIndex,
      };
    });

  if (applied === 0) return { riders, applied };

  return {
    riders: matched
      .sort((a, b) => a.rank - b.rank || a.inputIndex - b.inputIndex)
      .map(({ rider }, index) => ({ ...rider, displayOrder: index })),
    applied,
  };
}

export async function optimizeWithZwiftGopher(plan: TttPlanInput) {
  const apiKey = process.env.ZWIFTGOPHER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ZWIFTGOPHER_API_KEY ontbreekt. Maak een key aan via ZwiftGopher en zet hem in de server-env.",
    );
  }

  const baseUrl =
    process.env.ZWIFTGOPHER_API_BASE_URL?.replace(/\/$/, "") ??
    "https://zwiftgopher.com";
  const payload = buildZwiftGopherPayload(plan);
  const res = await fetch(`${baseUrl}/api/optimize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const reset = res.headers.get("X-RateLimit-Reset");
    const rateText =
      res.status === 429
        ? ` Rate limit bereikt${reset ? `; probeer opnieuw na ${reset}.` : "."}`
        : "";
    const message =
      typeof body === "object" &&
      body &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `ZwiftGopher API gaf HTTP ${res.status}.`;
    const error = new Error(`${message}${rateText}`);
    (error as Error & { statusCode?: number }).statusCode = res.status;
    throw error;
  }

  return { payload, body };
}
