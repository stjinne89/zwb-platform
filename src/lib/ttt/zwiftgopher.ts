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

/**
 * De Zwift-ID's van het plan in planvolgorde, één per regel, om te plakken in
 * het vak "Zwift IDs" op zwiftgopher.com/TTT. `missing` noemt wie geen
 * (numeriek) Zwift-ID heeft.
 */
export function zwiftIdExport(riders: TttPlanRiderInput[]) {
  const ids: string[] = [];
  const missing: string[] = [];
  for (const rider of riders.slice().sort((a, b) => a.displayOrder - b.displayOrder)) {
    const zwiftId = numericZwiftId(rider.zwiftId);
    if (!zwiftId) missing.push(rider.name.trim() || "Naamloos");
    else if (!ids.includes(zwiftId)) ids.push(zwiftId);
  }
  return { text: ids.join("\n"), count: ids.length, missing };
}

// Zonder 300s-waarde rekent ZwiftGopher zelf met 130% van de FTP (gemeten
// 2026-10-12, `speed_index_source: "ftp_fallback"`). De FTP meesturen als
// 5-minutenvermogen maakte een renner zwakker dan hij is.
function riderPower300(rider: TttPlanRiderInput) {
  return positiveNumber(rider.power300Watts);
}

/**
 * Lengte voor een renner die ZwiftGopher niet kan opzoeken en van wie ZWB geen
 * lengte heeft (keuze van de eigenaar, 2026-10-12).
 */
export const FALLBACK_HEIGHT_CM = 175;

/** Genoeg eigen waarden om zonder opzoeking bij ZwiftGopher te rekenen? */
function hasOwnValues(rider: TttPlanRiderInput) {
  return Boolean(
    rider.name.trim() && positiveNumber(rider.ftpWatts) && positiveNumber(rider.weightKg),
  );
}

function validateCustomRider(rider: TttPlanRiderInput) {
  const missing: string[] = [];
  if (!rider.name.trim()) missing.push("naam");
  if (!positiveNumber(rider.ftpWatts)) missing.push("FTP");
  if (!positiveNumber(rider.weightKg)) missing.push("gewicht");
  if (!positiveNumber(rider.heightCm)) missing.push("lengte");
  return missing;
}

/**
 * `ownValues`: Zwift-ID's van renners die als aangepaste renner meegaan, met de
 * waarden uit het plan, in plaats van met hun ID.
 */
export function buildZwiftGopherPayload(
  plan: TttPlanInput,
  ownValues: ReadonlySet<string> = new Set(),
): OptimizePayload {
  const riders = plan.riders
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const idRiders: number[] = [];
  const riderOverrides: OptimizePayload["rider_overrides"] = {};
  const customRiders: NonNullable<OptimizePayload["custom_riders"]> = [];

  for (const rider of riders) {
    const zwiftId = numericZwiftId(rider.zwiftId);
    const power300 = riderPower300(rider);

    if (zwiftId && !rider.isManual && ownValues.has(zwiftId) && hasOwnValues(rider)) {
      customRiders.push({
        name: rider.name.trim(),
        ftp: rider.ftpWatts as number,
        weight: rider.weightKg as number,
        height: positiveNumber(rider.heightCm) ?? FALLBACK_HEIGHT_CM,
        ...(power300 ? { power_300_watts: power300 } : {}),
      });
      continue;
    }

    if (zwiftId && !rider.isManual) {
      idRiders.push(Number(zwiftId));
      const overrides: Record<string, string | number> = {};
      // Geen naam: met een naam in de override schaalt ZwiftGopher de renner
      // lager in (`training_level` recreational in plaats van pro, ruim een
      // minuut trager op 30 km; gemeten 2026-10-12).
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

/** Het Zwift-ID uit "Rider 1 (ID: 123) not found - check that the Zwift ID is correct". */
export function notFoundZwiftId(message: string) {
  return /\(ID:\s*(\d+)\)\s*not found/i.exec(message)?.[1] ?? null;
}

/** Eén verzoek per 60 seconden per sleutel (melding van de API, 2026-10-12). */
const RATE_LIMIT_MS = 60_000;

export type ZwiftGopherError = Error & {
  statusCode?: number;
  /** Vanaf wanneer een nieuw verzoek zin heeft, in ms sinds 1970. */
  retryAt?: number;
  /** De renner die ZwiftGopher niet vond. */
  notFound?: TttPlanRiderInput;
};

/** `X-RateLimit-Reset` is een Unix-tijd in seconden. */
function resetTime(header: string | null) {
  const value = Number(header ?? NaN);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value < 1e12 ? value * 1000 : value;
}

/**
 * ZwiftGopher zoekt een renner op bij ZwiftRacing.app; kent die hem niet, of
 * loopt de opzoeking daar tegen een limiet, dan weigert ZwiftGopher het hele
 * plan. Opnieuw proberen binnen dezelfde klik kan niet (één verzoek per
 * minuut), dus de fout noemt de renner en het moment waarop het weer mag. Met
 * `ownValues` gaat iedereen met eigen FTP en gewicht mee als aangepaste renner,
 * zonder opzoeking.
 */
export async function optimizeWithZwiftGopher(
  plan: TttPlanInput,
  options: { ownValues?: boolean } = {},
) {
  const candidates = plan.riders.filter(
    (rider) => numericZwiftId(rider.zwiftId) && !rider.isManual,
  );
  const ownValues = new Set(
    options.ownValues
      ? candidates.filter(hasOwnValues).map((rider) => rider.zwiftId.trim())
      : [],
  );
  try {
    const result = await requestZwiftGopher(buildZwiftGopherPayload(plan, ownValues));
    return { ...result, ownValueRiders: ownValues.size };
  } catch (err) {
    const error = err as ZwiftGopherError;
    const zwiftId = err instanceof Error ? notFoundZwiftId(err.message) : null;
    const rider = zwiftId
      ? candidates.find((row) => row.zwiftId.trim() === zwiftId)
      : undefined;
    if (rider) {
      error.notFound = rider;
      error.retryAt ??= Date.now() + RATE_LIMIT_MS;
    }
    throw error;
  }
}

async function requestZwiftGopher(payload: OptimizePayload) {
  const apiKey = process.env.ZWIFTGOPHER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ZWIFTGOPHER_API_KEY ontbreekt. Maak een key aan via ZwiftGopher en zet hem in de server-env.",
    );
  }

  const baseUrl =
    process.env.ZWIFTGOPHER_API_BASE_URL?.replace(/\/$/, "") ??
    "https://zwiftgopher.com";
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

  // Een geweigerd plan kan ook als 200 met `success: false` terugkomen.
  const refused =
    typeof body === "object" && body && "success" in body && body.success === false;
  if (!res.ok || refused) {
    const retryAt = resetTime(res.headers.get("X-RateLimit-Reset"));
    const fields = (typeof body === "object" && body ? body : {}) as Record<string, unknown>;
    const message =
      typeof fields.message === "string"
        ? fields.message
        : typeof fields.error === "string"
          ? fields.error
          : `ZwiftGopher API gaf HTTP ${res.status}.`;
    const error: ZwiftGopherError = new Error(
      res.status === 429 ? "ZwiftGopher staat één verzoek per minuut toe." : message,
    );
    error.statusCode = res.status;
    if (retryAt) error.retryAt = retryAt;
    else if (res.status === 429) error.retryAt = Date.now() + RATE_LIMIT_MS;
    throw error;
  }

  return { payload, body };
}
