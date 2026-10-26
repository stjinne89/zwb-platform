import "server-only";

// ZwiftRacing.app: vELO en het vermogensprofiel per renner, voor de racebriefing.
//
// Alleen via de officiële API met een sleutel (ZWIFTRACING_API_KEY), aan te
// vragen bij de maker. De website zelf zit achter een beveiligingscontrole van
// Vercel; die lezen we niet uit (besluit 2026-10-20). Zonder sleutel doet deze
// module niets en toont de briefing ZRS in plaats van vELO.
//
// NIET GETEST tegen de echte API: er was nog geen sleutel. Gemeten op 2026-10-20:
// `GET https://api.zwiftracing.app/api/public/riders/{id}` geeft zonder sleutel
// 401 {"message":"Unauthorized"}. De vorm van een renner is overgenomen van de
// data op de eventpagina van ZwiftRacing (power.wkg5 … wkg1200, race.rating) en
// leest ook de oudere vorm race.current.rating. Controleer dit zodra de sleutel er is.

const BASE = "https://api.zwiftracing.app/api/public";
/** De batch-route neemt een lijst Zwift-ID's; meer dan dit per verzoek sturen we niet. */
const BATCH_MAX = 500;
const TIMEOUT_MS = 15_000;

export function zwiftRacingConfigured(): boolean {
  return Boolean(process.env.ZWIFTRACING_API_KEY?.trim());
}

export type ZwiftRacingRider = {
  zwiftId: number;
  velo: number | null;
  category: string | null;
  phenotype: string | null;
  powerWkg: { s15: number | null; m1: number | null; m2: number | null; m5: number | null; m20: number | null };
};

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function parseZwiftRacingRider(row: unknown): ZwiftRacingRider | null {
  const r = (row ?? {}) as Record<string, unknown>;
  const zwiftId = Number(r.riderId ?? r.id);
  if (!Number.isSafeInteger(zwiftId) || zwiftId <= 0) return null;
  const race = (r.race ?? {}) as Record<string, unknown>;
  const current = (race.current ?? {}) as Record<string, unknown>;
  const mixed = (current.mixed ?? {}) as Record<string, unknown>;
  const power = (r.power ?? {}) as Record<string, unknown>;
  const phenotype = (r.phenotype ?? {}) as Record<string, unknown>;
  const velo = num(race.rating ?? current.rating);
  return {
    zwiftId,
    velo: velo === null ? null : Math.round(velo * 10) / 10,
    category: typeof mixed.category === "string" ? mixed.category : null,
    phenotype: typeof phenotype.label === "string" ? phenotype.label : typeof phenotype.value === "string" ? phenotype.value : null,
    powerWkg: { s15: num(power.wkg15), m1: num(power.wkg60), m2: num(power.wkg120), m5: num(power.wkg300), m20: num(power.wkg1200) },
  };
}

/** Een batch renners; lege lijst zonder sleutel of bij een fout van de API. */
export async function fetchZwiftRacingRiders(zwiftIds: number[]): Promise<ZwiftRacingRider[]> {
  const key = process.env.ZWIFTRACING_API_KEY?.trim();
  if (!key || zwiftIds.length === 0) return [];
  const response = await fetch(`${BASE}/riders`, {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(zwiftIds.slice(0, BATCH_MAX)),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`ZwiftRacing gaf status ${response.status}.`);
  const payload = (await response.json()) as unknown;
  const rows = Array.isArray(payload) ? payload : ((payload as { riders?: unknown[] })?.riders ?? []);
  return rows.map(parseZwiftRacingRider).filter((r): r is ZwiftRacingRider => r !== null);
}
