import "server-only";

// ZWBlokken op het profiel (wens eigenaar, 2026-11-25): de titels van een lid
// (Koning, Koningin, Vorst, Gouverneur) en de bekende wegen per Zwift-wereld voor
// de Zwiftpuzzel. De titels vragen een scan over alle blokken van de club, dus
// één keer per tien minuten voor alle profielen samen, via de service-rol.
// De blokken zijn voor elk goedgekeurd lid leesbaar (RLS); testaccounts vallen
// hier met de hand weg, zoals de RLS op profiles dat voor leden doet.

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchClubStandings } from "./query";
import { regionByCode } from "./regions";
import { pickRulers, rulerTitle, sexForTitle, type RegionStandings } from "./titles";
import type { PuzzleWorld } from "./puzzle";
import { ZWIFT_WORLDS, zwiftWorldBySlug } from "./zwift";
import {
  fetchClubZwiftBlocks,
  fetchRoadBlocks,
  fetchZwiftDistances,
  fetchZwiftStandings,
  knownRoadKeys,
} from "./zwift-query";

export type HonourTitle = { title: string; region: string; kind: "country" | "province" | "zwift" };

export type ZwblokkenHonours = {
  /** Lid → titels: landen, dan provincies, dan Zwift-werelden. */
  titles: Record<string, HonourTitle[]>;
  /** De Zwift-werelden in de volgorde waarin Zwift ze uitbracht. */
  worlds: PuzzleWorld[];
};

type ProfileRow = { id: string; sex: string | null; privacy_accepted_version: string | null };

const KIND_ORDER = { country: 0, province: 1, zwift: 2 } as const;

/** Wie welke titel draagt, per lid. Puur, voor de test. */
export function titlesByMember(
  profiles: ProfileRow[],
  standings: RegionStandings,
  zwiftStandings: RegionStandings,
  zwiftMeters: Map<string, Map<string, number>>,
): Record<string, HonourTitle[]> {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const eligible = new Set(byId.keys());
  const out: Record<string, HonourTitle[]> = {};
  const give = (profileId: string, title: HonourTitle) => (out[profileId] ??= []).push(title);
  const sexOf = (p: ProfileRow) => sexForTitle(p.sex, p.privacy_accepted_version);

  for (const [code, ruler] of pickRulers(standings, eligible)) {
    const region = regionByCode(code);
    const profile = byId.get(ruler.profileId);
    if (!region || !profile) continue;
    give(ruler.profileId, { title: rulerTitle(region.level, sexOf(profile)), region: region.name, kind: region.level });
  }
  // Zelfde beslisser als op ZWBlokken: bij gelijke blokken de meeste kilometers.
  const tieBreak = (code: string, profileId: string) =>
    zwiftMeters.get(code.replace(/^zwift:/, ""))?.get(profileId) ?? 0;
  for (const [code, ruler] of pickRulers(zwiftStandings, eligible, { tieBreak })) {
    const world = zwiftWorldBySlug(code.replace(/^zwift:/, ""));
    const profile = byId.get(ruler.profileId);
    if (!world || !profile) continue;
    give(ruler.profileId, { title: rulerTitle("country", sexOf(profile)), region: world.name, kind: "zwift" });
  }
  for (const list of Object.values(out)) {
    list.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.region.localeCompare(b.region, "nl"));
  }
  return out;
}

async function fetchHonours(): Promise<ZwblokkenHonours> {
  const admin = createAdminClient();
  const [profilesResult, { standings }, zwift, distances, club, roads] = await Promise.all([
    admin.from("profiles").select("id, sex, privacy_accepted_version").eq("is_approved", true).eq("is_test", false),
    fetchClubStandings(admin),
    fetchZwiftStandings(admin),
    fetchZwiftDistances(admin),
    fetchClubZwiftBlocks(admin),
    fetchRoadBlocks(admin),
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  const known = knownRoadKeys(roads, club.blocks);
  return {
    titles: titlesByMember((profilesResult.data ?? []) as ProfileRow[], standings, zwift.standings, distances),
    worlds: ZWIFT_WORLDS.map((w) => ({ slug: w.slug, name: w.name, known: [...(known.get(w.slug) ?? [])] })).filter(
      (w) => w.known.length > 0,
    ),
  };
}

export const loadZwblokkenHonours = unstable_cache(fetchHonours, ["zwblokken-honours", "v1"], {
  revalidate: 10 * 60,
});
