import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StravaAttribution } from "@/components/strava-brand";
import { EmptyState, HelpLink, PageHeader } from "@/components/app-ui";
import {
  countNewThisYear,
  fetchClubBlocks,
  fetchClubStandings,
  fetchOwnBlocks,
} from "@/lib/zwblokken/query";
import { REGIONS, regionByCode } from "@/lib/zwblokken/regions";
import { pickRulers, rulerTitle, sexForTitle } from "@/lib/zwblokken/titles";
import { ZWIFT_BLOCK_ZOOM, ZWIFT_WORLDS } from "@/lib/zwblokken/zwift";
import {
  fetchClubZwiftBlocks,
  fetchOwnZwiftBlocks,
  fetchRoadBlocks,
  fetchZwiftDistances,
  fetchZwiftStandings,
  knownRoadCounts,
} from "@/lib/zwblokken/zwift-query";
import type { RulerMap } from "./_components/coverage";
import type { ZwiftLeader, ZwiftWorldMeta } from "./_components/zwift-view";
import {
  ZwblokkenView,
  type MemberOption,
} from "./_components/zwblokken-view";

export const dynamic = "force-dynamic";

const nl = (n: number) => n.toLocaleString("nl-NL");

export default async function ZwblokkenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    club,
    { counts, standings },
    own,
    newThisYear,
    profilesResult,
    zwiftClub,
    zwiftOwn,
    zwiftStandings,
    roadBlocks,
    zwiftDistances,
  ] = await Promise.all([
    fetchClubBlocks(supabase),
    fetchClubStandings(supabase),
    fetchOwnBlocks(supabase, user.id),
    countNewThisYear(supabase, user.id),
    supabase
      .from("profiles")
      .select("id, display_name, sex, privacy_accepted_version")
      .eq("is_approved", true),
    fetchClubZwiftBlocks(supabase),
    fetchOwnZwiftBlocks(supabase, user.id),
    fetchZwiftStandings(supabase),
    fetchRoadBlocks(supabase),
    fetchZwiftDistances(supabase),
  ]);

  const profiles = (profilesResult.data ?? []) as {
    id: string;
    display_name: string | null;
    sex: string | null;
    privacy_accepted_version: string | null;
  }[];
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const rulers: RulerMap = {};
  for (const [code, ruler] of pickRulers(standings, new Set(byId.keys()))) {
    const region = regionByCode(code);
    const profile = byId.get(ruler.profileId);
    if (!region || !profile) continue;
    rulers[code] = {
      profileId: ruler.profileId,
      name: profile.display_name ?? "Naamloos lid",
      title: rulerTitle(
        region.level,
        sexForTitle(profile.sex, profile.privacy_accepted_version),
      ),
    };
  }

  // Zwift: alleen werelden waar de club reed, de meest gereden eerst.
  const knownRoads = knownRoadCounts(roadBlocks, zwiftClub.blocks);
  const zwiftWorlds: ZwiftWorldMeta[] = ZWIFT_WORLDS.filter(
    (w) => (zwiftClub.counts[w.slug] ?? 0) > 0,
  )
    .map((w) => ({
      slug: w.slug,
      name: w.name,
      bounds: [
        [w.bbox[0], w.bbox[1]],
        [w.bbox[2], w.bbox[3]],
      ] as [[number, number], [number, number]],
      imageUrl: w.imageUrl,
      known: knownRoads[w.slug] ?? zwiftClub.counts[w.slug],
      club: zwiftClub.counts[w.slug],
    }))
    .sort((a, b) => b.club - a.club);

  const eligible = new Set(byId.keys());
  // Meters in een wereld; beslist bij een gelijk aantal blokken.
  const metersIn = (world: string, profileId: string) =>
    zwiftDistances.get(world)?.get(profileId) ?? 0;
  const zwiftRulers: RulerMap = {};
  for (const [code, ruler] of pickRulers(zwiftStandings.standings, eligible, {
    tieBreak: (code, profileId) => metersIn(code.replace(/^zwift:/, ""), profileId),
  })) {
    const profile = byId.get(ruler.profileId);
    if (!profile) continue;
    zwiftRulers[code] = {
      profileId: ruler.profileId,
      name: profile.display_name ?? "Naamloos lid",
      title: rulerTitle(
        "country",
        sexForTitle(profile.sex, profile.privacy_accepted_version),
      ),
    };
  }

  const zwiftLeaderboards: Record<string, ZwiftLeader[]> = {};
  const zwiftTotals = new Map<string, number>();
  for (const [world, perMember] of zwiftStandings.counts) {
    // Zelfde volgorde als de titel: blokken, dan kilometers in deze wereld.
    zwiftLeaderboards[world] = [...perMember]
      .filter(([id]) => eligible.has(id))
      .map(([id, blocks]) => ({
        id,
        name: byId.get(id)?.display_name ?? "Naamloos lid",
        blocks,
        km: Math.round(metersIn(world, id) / 1000),
      }))
      .sort((a, b) => b.blocks - a.blocks || b.km - a.km)
      .slice(0, 10);
    for (const [id, blocks] of perMember) zwiftTotals.set(id, (zwiftTotals.get(id) ?? 0) + blocks);
  }

  // Alleen leden die daadwerkelijk blokken hebben (buiten of in Zwift); de
  // kiezer moet geen lege namen bevatten. De eigen naam staat altijd bovenaan.
  const members: MemberOption[] = profiles
    .map((p) => ({
      id: p.id,
      name: p.display_name ?? "Naamloos lid",
      blocks: counts.get(p.id) ?? 0,
    }))
    .filter((m) => m.blocks > 0 || (zwiftTotals.get(m.id) ?? 0) > 0 || m.id === user.id)
    .sort((a, b) => {
      if (a.id === user.id) return -1;
      if (b.id === user.id) return 1;
      return b.blocks - a.blocks;
    });

  // Eigen sortering: de kiezer zet jou bovenaan, maar in een ranglijst hoort
  // iedereen gewoon op zijn eigen plek te staan.
  const leaderboard = [...members]
    .filter((m) => m.blocks > 0)
    .sort((a, b) => b.blocks - a.blocks)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Club"
        title="ZWBlokken"
        description="Elk blok dat je ooit doorkruist hebt, kleurt in."
        actions={<HelpLink href="/hulp#zwblokken" />}
      />

      {club.total === 0 ? (
        <EmptyState>
          Er zijn nog geen ZWBlokken berekend. Zodra de Strava-sync gedraaid
          heeft, verschijnen ze hier.
        </EmptyState>
      ) : (
        <>
          <ZwblokkenView
            club={club.packed}
            clubRegions={Object.fromEntries(club.regions)}
            clubTotal={club.total}
            maxRiders={club.maxRiders}
            // Alleen de metadata; de omtrekken uit regions.json blijven op de
            // server, die zijn ruim anderhalve megabyte.
            regions={REGIONS}
            rulers={rulers}
            members={members}
            selectedId={user.id}
            initial={{
              blocks: own.packed,
              regions: Object.fromEntries(own.regions),
              total: own.total,
              newThisYear,
              zwift: zwiftOwn,
            }}
            zwift={{
              worlds: zwiftWorlds,
              blockZoom: ZWIFT_BLOCK_ZOOM,
              club: zwiftClub.blocks,
              maxRiders: zwiftClub.maxRiders,
              rulers: zwiftRulers,
              leaderboards: zwiftLeaderboards,
            }}
          />

          {leaderboard.length > 0 && (
            <section className="rounded-lg border bg-card/90 p-4">
              <h2 className="text-sm font-semibold">Meeste blokken</h2>
              <ol className="mt-3 space-y-1.5">
                {leaderboard.map((m, i) => (
                  <li key={m.id} className="flex items-baseline gap-3 text-sm">
                    <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <span
                      className={m.id === user.id ? "font-semibold" : undefined}
                    >
                      {m.name}
                    </span>
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {nl(m.blocks)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      <StravaAttribution />
    </div>
  );
}
