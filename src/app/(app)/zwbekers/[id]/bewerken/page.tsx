import { notFound, redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { canEdit } from "@/lib/zwbekers/nomination";
import { loadBeker, loadFormOptions, requireBekerMember } from "@/lib/zwbekers/server";
import { NominationForm } from "../../_components/nomination-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Beker aanpassen" };

export default async function BewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let guard;
  try {
    guard = await requireBekerMember();
  } catch (error) {
    return <EmptyState>{error instanceof Error ? error.message : "Aanpassen kan nu niet."}</EmptyState>;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const beker = await loadBeker(guard.client, id);
  if (!beker) notFound();
  if (!canEdit({ status: beker.status, profileId: beker.nominator?.id ?? null }, guard.member.id, guard.canReview)) {
    redirect(`/zwbekers/${id}`);
  }

  const today = amsterdamDayKey();
  const options = await loadFormOptions(guard.client, today);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="ZWBekers" title={beker.status === "toegekend" ? "Beker aanpassen" : "Voordracht aanpassen"} />
      {beker.status === "afgewezen" && beker.reviewNote && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">Het bestuur schreef</p>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">{beker.reviewNote}</p>
        </div>
      )}
      <NominationForm
        options={options}
        today={today}
        initial={{
          id: beker.id,
          kind: beker.kind,
          title: beker.title,
          story: beker.story,
          achievedOn: beker.achievedOn,
          winners: beker.winners.map((winner) => winner.id),
          teamId: beker.teamId,
          eventId: beker.event?.id ?? null,
          zrlRound: beker.zrlRound,
          resultUrl: beker.resultUrl,
          design: beker.design,
          photoUrl: beker.photoUrl,
        }}
      />
    </div>
  );
}
