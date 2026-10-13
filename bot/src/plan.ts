// Een TTT-plan komt uit een van twee bronnen: het platform, via
// /api/ttt/plan/[token] (src/lib/ttt/plan-export.ts in de hoofdrepo, versie 1),
// of rechtstreeks van zwiftgopher.com/TTT, via Export JSON of Export Link.

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

/** Teamtags zoals "[ZWB]" en "(ZWB)" horen niet in een naam die wordt uitgesproken. */
function cleanName(name: string) {
  return name.replace(/\[[^\]]*\]|\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Export JSON van zwiftgopher.com/TTT (gemeten 2026-10-13, versie 1.14.0):
 * `riders` is een object per Zwift-ID met `name`, `alt_name`, `order` (vanaf 0),
 * `pull_power` en `pull_duration`. `target_speed` is de snelheid op het vlakke,
 * geen verwacht gemiddelde, en gaat daarom niet mee als tempo.
 */
function parseGopherPlan(data: Record<string, unknown>): Plan {
  const rows = Object.entries(data.riders as Record<string, Record<string, unknown>>)
    .filter(([, rider]) => typeof rider === "object" && rider)
    .sort(([, a], [, b]) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const full = rows.map(([, rider]) => cleanName(String(rider.alt_name || rider.name || "")));
  const first = full.map((name) => name.split(" ")[0]);

  const riders = rows.map(([key, rider], index): PlanRider => {
    if (!full[index]) throw new Error(`Renner ${index + 1} heeft geen naam.`);
    // De voornaam, tenzij twee renners dezelfde hebben.
    const unique = first.filter((name) => name === first[index]).length === 1;
    return {
      order: index + 1,
      name: unique ? first[index] : full[index],
      zwiftId: /^\d+$/.test(key) && rider.zr !== false ? key : null,
      pullWatts: numberOrNull(Math.round(Number(rider.pull_power))),
      pullSeconds: Math.max(0, Math.round(Number(rider.pull_duration) || 0)),
    };
  });
  if (!riders.some((rider) => rider.pullSeconds > 0)) {
    throw new Error("Geen enkele renner heeft een kopbeurt.");
  }

  const team = data.team as { name?: unknown } | undefined;
  return {
    name: typeof team?.name === "string" && team.name ? team.name : "TTT-plan",
    eventTitle: null,
    estimatedSpeedKmh: null,
    riders,
  };
}

export function parsePlan(json: unknown): Plan {
  if (typeof json !== "object" || !json) throw new Error("Dit is geen TTT-plan.");
  const data = json as Record<string, unknown>;
  const keyed = typeof data.riders === "object" && data.riders && !Array.isArray(data.riders);
  if (data.version === undefined && keyed) return parseGopherPlan(data);
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

const GOPHER_HOSTS = ["zwiftgopher.com", "www.zwiftgopher.com"];
const NO_LINK =
  "Plak de link van Export JSON of Export Link uit ZwiftGopher, of de botlink uit de TTT Planner.";

/**
 * Van link of los token naar het adres om op te halen. Alleen het platform en
 * ZwiftGopher: de bot haalt niet zomaar een adres op dat iemand in Discord typt.
 */
export function planUrl(input: string, origins: string[]): string {
  const text = input.trim();
  if (TOKEN.test(text)) return `${origins[0]}${PLAN_PATH}${text}`;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(NO_LINK);
  }
  const save = url.searchParams.get("save");
  if (GOPHER_HOSTS.includes(url.hostname) && /^\/TTT\/?$/.test(url.pathname) && save) {
    return `https://www.zwiftgopher.com/TTT/?save=${encodeURIComponent(save)}&json=true`;
  }
  const token = url.pathname.startsWith(PLAN_PATH) ? url.pathname.slice(PLAN_PATH.length) : "";
  if (!origins.includes(url.origin) || !TOKEN.test(token)) throw new Error(NO_LINK);
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
  return parsePlan(await response.json().catch(() => null));
}
