import { z } from "zod";
import { normalizeLeague } from "./parse-results";

export const leagueMapSchema = z.record(z.string().regex(/^\d+$/), z.string().refine((v) => normalizeLeague(v) === v));
export type LeagueMap = z.infer<typeof leagueMapSchema>;
const eventSchema = z.object({ eventSubgroups: z.array(z.object({
  id: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]),
  subgroupLabel: z.string().nullish(), name: z.string().nullish(),
})).min(1) });

export function mapSubgroups(payload: unknown, overrides: LeagueMap = {}) {
  return eventSchema.parse(payload).eventSubgroups.map((s) => {
    const id = String(s.id);
    // A–E en racingscoregrenzen zijn geen vELO-leagues. Alleen expliciet bevestigde mappings gebruiken.
    const league = overrides[id] ?? normalizeLeague(s.subgroupLabel) ?? normalizeLeague(s.name);
    return { id, label: s.subgroupLabel ?? s.name ?? id, name: s.name ?? "", league };
  });
}
