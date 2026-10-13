// Het TTT-plan zoals het platform het deelt via /api/ttt/plan/[token]
// (src/lib/ttt/plan-export.ts in de hoofdrepo). Versie 1.

export type PlanRider = {
  order: number;
  name: string;
  zwiftId: string | null;
  pullWatts: number | null;
  pullSeconds: number;
};

export type Plan = {
  name: string;
  eventTitle: string | null;
  estimatedSpeedKmh: number | null;
  riders: PlanRider[];
};

const PLAN_PATH = "/api/ttt/plan/";
const TOKEN = /^[A-Za-z0-9_-]{32}$/;

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function parsePlan(json: unknown): Plan {
  if (typeof json !== "object" || !json) throw new Error("Dit is geen TTT-plan.");
  const data = json as Record<string, unknown>;
  if (data.version !== 1) throw new Error("Onbekende versie van het TTT-plan.");
  if (!Array.isArray(data.riders)) throw new Error("Het plan heeft geen renners.");

  const riders = data.riders.map((row, index): PlanRider => {
    const rider = (typeof row === "object" && row ? row : {}) as Record<string, unknown>;
    const name = String(rider.name ?? "").trim();
    if (!name) throw new Error(`Renner ${index + 1} heeft geen naam.`);
    return {
      order: index + 1,
      name,
      zwiftId: typeof rider.zwiftId === "string" && rider.zwiftId ? rider.zwiftId : null,
      pullWatts: numberOrNull(rider.pullWatts),
      pullSeconds: Math.max(0, Math.round(Number(rider.pullSeconds) || 0)),
    };
  });
  if (!riders.some((rider) => rider.pullSeconds > 0)) {
    throw new Error("Geen enkele renner heeft een kopbeurt.");
  }

  return {
    name: String(data.name ?? "TTT-plan"),
    eventTitle: typeof data.eventTitle === "string" ? data.eventTitle : null,
    estimatedSpeedKmh: numberOrNull(data.estimatedSpeedKmh),
    riders,
  };
}

/**
 * Van botlink of los token naar het adres om op te halen. Alleen het platform
 * zelf: de bot haalt niet zomaar een adres op dat iemand in Discord typt.
 */
export function planUrl(input: string, origins: string[]): string {
  const text = input.trim();
  if (TOKEN.test(text)) return `${origins[0]}${PLAN_PATH}${text}`;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error("Plak de botlink uit de TTT Planner.");
  }
  const token = url.pathname.startsWith(PLAN_PATH) ? url.pathname.slice(PLAN_PATH.length) : "";
  if (!origins.includes(url.origin) || !TOKEN.test(token)) {
    throw new Error("Plak de botlink uit de TTT Planner.");
  }
  return `${url.origin}${PLAN_PATH}${token}`;
}

export async function fetchPlan(
  input: string,
  origins: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Plan> {
  const response = await fetchImpl(planUrl(input, origins), {
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) throw new Error("Plan niet gevonden. Is de link ingetrokken?");
  if (!response.ok) throw new Error(`Plan ophalen mislukte (${response.status}).`);
  return parsePlan(await response.json());
}
