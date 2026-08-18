import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StravaAttribution } from "@/components/strava-brand";
import { EmptyState, HelpLink, PageHeader } from "@/components/app-ui";
import {
  countNewThisYear,
  fetchBlockCounts,
  fetchClubBlocks,
  fetchOwnBlocks,
} from "@/lib/zwblokken/query";
import { REGIONS } from "@/lib/zwblokken/regions";
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

  const [club, counts, own, newThisYear, profilesResult] = await Promise.all([
    fetchClubBlocks(supabase),
    fetchBlockCounts(supabase),
    fetchOwnBlocks(supabase, user.id),
    countNewThisYear(supabase, user.id),
    supabase.from("profiles").select("id, display_name").eq("is_approved", true),
  ]);

  const profiles = (profilesResult.data ?? []) as {
    id: string;
    display_name: string | null;
  }[];

  // Alleen leden die daadwerkelijk blokken hebben; de kiezer moet geen lege
  // namen bevatten. De eigen naam staat altijd bovenaan.
  const members: MemberOption[] = profiles
    .map((p) => ({
      id: p.id,
      name: p.display_name ?? "Naamloos lid",
      blocks: counts.get(p.id) ?? 0,
    }))
    .filter((m) => m.blocks > 0 || m.id === user.id)
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
            members={members}
            selectedId={user.id}
            initial={{
              blocks: own.packed,
              regions: Object.fromEntries(own.regions),
              total: own.total,
              newThisYear,
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
