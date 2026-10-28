import { EmptyState } from "@/components/app-ui";
import { KastView, type KastItem } from "@/components/zwbekers/kast-view";
import { dayLabel, namesLabel } from "@/lib/zwbekers/nomination";
import { loadKast, loadOwnNominations, requireBekerMember } from "@/lib/zwbekers/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZWBekers" };

/**
 * De prijzenkast van de club (wens eigenaar, 2026-10-28): toegekende ZWBekers
 * in een kast per jaar, in de loods van ZWBriljant. `?bij=<id>` begint bij die
 * beker, bijvoorbeeld vanaf zijn eigen pagina.
 */
export default async function ZwbekersPage({ searchParams }: { searchParams: Promise<{ bij?: string | string[] }> }) {
  let guard;
  try {
    guard = await requireBekerMember();
  } catch (error) {
    return <EmptyState>{error instanceof Error ? error.message : "De prijzenkast is even niet te openen."}</EmptyState>;
  }
  const { client, member, canReview } = guard;
  const params = await searchParams;

  const [bekers, own, waiting, sponsors] = await Promise.all([
    loadKast(client).catch(() => null),
    loadOwnNominations(client, member.id),
    canReview
      ? client
          .from("zwbekers")
          .select("id", { count: "exact", head: true })
          .eq("status", "voorgedragen")
          .then(({ count }) => count ?? 0)
      : Promise.resolve(null),
    // De sponsors met een logo hangen aan de wand, zoals in ZWBriljant.
    client
      .from("sponsors")
      .select("id, name")
      .eq("active", true)
      .not("logo_url", "is", null)
      .order("display_order")
      .then(({ data }) => (data ?? []) as Array<{ id: string; name: string }>),
  ]);

  if (!bekers) return <EmptyState>De prijzenkast is even niet te openen. Probeer het straks opnieuw.</EmptyState>;

  const items: KastItem[] = bekers.map((beker) => {
    const names = beker.winners.map((winner) => winner.name);
    return {
      id: beker.id,
      title: beker.title,
      who: beker.kind === "team" ? (beker.teamName ?? "Team") : (names[0] ?? "Oud-lid"),
      // Op het bordje past een handvol namen; de rest staat op de pagina van de beker.
      riders: beker.kind === "team" && names.length ? namesLabel(names, 4) : null,
      date: dayLabel(beker.achievedOn),
      year: Number(beker.achievedOn.slice(0, 4)),
      design: beker.design,
    };
  });
  const start = typeof params.bij === "string" && items.some((item) => item.id === params.bij) ? params.bij : undefined;

  return (
    <KastView
      bekers={items}
      startId={start}
      sponsors={sponsors}
      ownOpen={own.length}
      waiting={waiting}
    />
  );
}
