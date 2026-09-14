import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState, PageHeader } from "@/components/app-ui";
import type { Discipline } from "@/lib/omnium/scoring";
import { ResultsImport } from "./_components/results-import";
import { StandingsPanel, type StandingRow } from "./_components/standings-panel";

export const dynamic = "force-dynamic";

type PartRow = {
  id: string;
  discipline: Discipline;
  order_index: number;
  title: string;
  results_state: string;
};

export default async function OmniumUitslagenPage({
  params,
}: {
  params: Promise<{ editie: string }>;
}) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.has("omnium.manage")) redirect("/dashboard");

  const { editie } = await params;

  const { data: edition } = await supabase
    .from("omnium_editions")
    .select("id, number, title, starts_at")
    .eq("id", editie)
    .maybeSingle();
  if (!edition) notFound();

  const [{ data: partRows }, { data: standingRows }] = await Promise.all([
    supabase
      .from("omnium_edition_events")
      .select("id, discipline, order_index, title, results_state")
      .eq("edition_id", editie)
      .neq("discipline", "recon")
      .order("order_index"),
    supabase
      .from("omnium_edition_standings")
      .select(
        "rider_id, league, prologue_points, scratch_points, sprint_points, crit_points, total_points, rank, rank_shared, is_provisional, omnium_riders(display_name)",
      )
      .eq("edition_id", editie)
      .order("league")
      .order("rank"),
  ]);

  const parts = (partRows ?? []) as unknown as PartRow[];
  const standings = (standingRows ?? []) as unknown as StandingRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Editie ${edition.number as number}`}
        title={`Uitslagen — ${edition.title as string}`}
        description={new Date(edition.starts_at as string).toLocaleDateString(
          "nl-NL",
          { weekday: "long", day: "numeric", month: "long", year: "numeric" },
        )}
        actions={
          <Link href={`/beheer/omnium/${editie}`} className="text-sm underline">
            Terug naar editie
          </Link>
        }
      />

      {parts.length === 0 ? (
        <EmptyState>Deze editie heeft nog geen onderdelen.</EmptyState>
      ) : (
        parts.map((part) => (
          <ResultsImport
            key={part.id}
            editionEventId={part.id}
            discipline={part.discipline}
            title={`${part.order_index}. ${part.title}`}
            resultsState={part.results_state}
          />
        ))
      )}

      <StandingsPanel editionId={editie} standings={standings} />
    </div>
  );
}
