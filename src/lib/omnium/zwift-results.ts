import { z } from "zod";
import { fetchZwiftEvent, fetchZwiftRaceResults } from "@/lib/events/zwift-club";
import type { ParsedResultRow } from "./parse-results";
import { mapSubgroups, type LeagueMap } from "./zwift-mapping";

const id = z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]);
const entriesSchema = z.array(z.object({
  profileId: id, eventSubgroupId: id, rank: z.number().int().nonnegative(),
  profileData: z.object({ firstName: z.string(), lastName: z.string() }),
  activityData: z.object({ durationInMilliseconds: z.number().nonnegative().nullish() }).nullish(),
  flaggedCheating: z.boolean().optional(), flaggedSandbagging: z.boolean().optional(),
  qualified: z.boolean().optional(), lateJoin: z.boolean().optional(),
}));

function formatRaceTime(seconds: number): string {
  const wholeSeconds = Math.floor(seconds);
  const milliseconds = Math.round((seconds - wholeSeconds) * 1000);
  const minutes = Math.floor(wholeSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const secondsPart = wholeSeconds % 60;
  const minutesPart = minutes % 60;
  const fraction = milliseconds > 0
    ? `.${String(milliseconds).padStart(3, "0")}`
    : "";
  if (hours > 0) {
    return `${hours}:${String(minutesPart).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}${fraction}`;
  }
  return `${minutes}:${String(secondsPart).padStart(2, "0")}${fraction}`;
}

export function mapZwiftResults(payload: unknown, event: unknown, leagueMap: LeagueMap) {
  const groups = new Map(mapSubgroups(event, leagueMap).map((g) => [g.id, g]));
  const warnings: string[] = [];
  const rows: ParsedResultRow[] = entriesSchema.parse(payload).map((e, i) => {
    const league = groups.get(String(e.eventSubgroupId))?.league;
    if (!league) throw new Error(`Geen league voor Zwift-subgroep ${e.eventSubgroupId}.`);
    const name = `${e.profileData.firstName} ${e.profileData.lastName}`.trim();
    if (!name) throw new Error("Renner zonder naam in Zwift-uitslag.");
    const flags = [e.flaggedCheating && "cheating", e.flaggedSandbagging && "sandbagging", e.qualified === false && "niet gekwalificeerd", e.lateJoin && "late start"].filter(Boolean);
    if (flags.length) warnings.push(`${name}: ${flags.join(", ")}`);
    const timeSeconds = e.activityData?.durationInMilliseconds == null ? null : e.activityData.durationInMilliseconds / 1000;
    return { lineNumber: i + 1, raw: "Zwift", name, teamName: null, league, zwiftId: String(e.profileId), position: e.rank || null, timeSeconds, timeText: timeSeconds == null ? null : formatRaceTime(timeSeconds), segmentSeconds: null, points: null, deltaSeconds: null, status: e.rank > 0 && timeSeconds != null ? "finished" : "dnf", block: null };
  });
  if (new Set(rows.map((r) => r.zwiftId)).size !== rows.length) throw new Error("Dubbele renners in Zwift-uitslag.");
  return { rows, warnings };
}

const cache = new Map<string, { expires: number; value: Promise<{ event: unknown; entries: unknown }> }>();
export async function fetchOmniumResults(eventId: string, leagueMap: LeagueMap) {
  let cached = cache.get(eventId);
  if (!cached || cached.expires <= Date.now()) {
    if (cache.size > 30) cache.clear();
    const value = Promise.all([fetchZwiftEvent(eventId), fetchZwiftRaceResults(eventId)]).then(([event, entries]) => ({ event, entries }));
    cached = { expires: Date.now() + 20_000, value };
    cache.set(eventId, cached);
    value.catch(() => { if (cache.get(eventId)?.value === value) cache.delete(eventId); });
  }
  const { event, entries } = await cached.value;
  return mapZwiftResults(entries, event, leagueMap);
}
