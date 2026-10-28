import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Copy, ExternalLink, Trophy } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { TrophyPreview } from "@/components/zwbekers/trophy-preview";
import { KIND_LABEL, STATUS_LABEL, canEdit, dayLabel, zrlRoundLabel } from "@/lib/zwbekers/nomination";
import { REVIEW_PERMISSION, loadBeker, requireBekerMember } from "@/lib/zwbekers/server";
import { BekerActions, Congrats, ReviewPanel } from "../_components/beker-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZWBeker" };

const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-muted-foreground";

/**
 * Eén ZWBeker: de beker zelf in de galerij, wie hem won en waarom, de foto, het
 * event of de uitslag, en de felicitaties. Een voordracht ziet alleen wie hem
 * deed en wie keurt (RLS, 0286); die laatste keurt hem hier.
 */
export default async function BekerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let guard;
  try {
    guard = await requireBekerMember();
  } catch (error) {
    return <EmptyState>{error instanceof Error ? error.message : "Deze beker is nu niet te zien."}</EmptyState>;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const beker = await loadBeker(guard.client, id);
  if (!beker) notFound();

  const { member, canReview, access } = guard;
  const editable = canEdit({ status: beker.status, profileId: beker.nominator?.id ?? null }, member.id, canReview);
  const ownOpen = canEdit({ status: beker.status, profileId: beker.nominator?.id ?? null }, member.id);
  const awarded = beker.status === "toegekend";

  return (
    <article className="space-y-6">
      {!awarded && (
        <div
          className={
            beker.status === "afgewezen"
              ? "rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
              : "rounded-lg border bg-muted/50 p-4 text-sm"
          }
        >
          <p className="font-medium">{STATUS_LABEL[beker.status]}</p>
          {beker.status === "afgewezen" && beker.reviewNote && (
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{beker.reviewNote}</p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-20">
          <TrophyPreview design={beker.design} />
        </div>

        <div className="space-y-6">
          <header className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Trophy className="size-3.5" aria-hidden />
              ZWBeker · {KIND_LABEL[beker.kind]} · {dayLabel(beker.achievedOn)}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{beker.title}</h1>
            {beker.kind === "team" && beker.teamName && (
              <p className="text-lg">
                {beker.teamId ? (
                  <Link href={`/teams/${beker.teamId}`} className="font-medium hover:underline">
                    {beker.teamName}
                  </Link>
                ) : (
                  <span className="font-medium">{beker.teamName}</span>
                )}
              </p>
            )}
            <ul className="flex flex-wrap gap-1.5" aria-label={beker.kind === "team" ? "Reden mee" : "Winnaar"}>
              {beker.winners.map((winner) => (
                <li key={winner.id}>
                  <Link
                    href={`/leden/${winner.id}`}
                    className="inline-flex min-h-8 items-center rounded-full border bg-card px-3 text-sm font-medium hover:bg-muted"
                  >
                    {winner.name}
                  </Link>
                </li>
              ))}
            </ul>
          </header>

          <p className="whitespace-pre-line text-base leading-relaxed">{beker.story}</p>

          {beker.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ondertekende url uit een besloten bucket
            <img src={beker.photoUrl} alt={`Foto bij ${beker.title}`} className="max-h-[28rem] w-full rounded-lg border object-cover" />
          )}

          {(beker.event || beker.zrlRound || beker.resultUrl) && (
            <ul className="flex flex-wrap gap-2 text-sm">
              {beker.zrlRound && (
                <li className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3">
                  <CalendarDays className="size-4" aria-hidden />
                  {zrlRoundLabel(beker.zrlRound)}
                </li>
              )}
              {beker.event && (
                <li>
                  <Link href={`/events/${beker.event.id}`} className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3 hover:bg-muted">
                    <CalendarDays className="size-4" aria-hidden />
                    {beker.event.title}
                  </Link>
                </li>
              )}
              {beker.resultUrl && (
                <li>
                  <a
                    href={beker.resultUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3 hover:bg-muted"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Uitslag
                  </a>
                </li>
              )}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
            <span>
              Voorgedragen door{" "}
              {beker.nominator ? (
                <Link href={`/leden/${beker.nominator.id}`} className="font-medium text-foreground hover:underline">
                  {beker.nominator.name}
                </Link>
              ) : (
                "een oud-lid"
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {awarded && (
                <Link href={`/zwbekers?bij=${beker.id}`} className="font-medium text-foreground hover:underline">
                  In de kast
                </Link>
              )}
              <Link href={`/zwbekers/voordragen?van=${beker.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Copy className="size-4" aria-hidden />
                Kopiëren
              </Link>
              <BekerActions
                bekerId={beker.id}
                canEdit={editable}
                remove={canReview ? "verwijderen" : ownOpen ? "intrekken" : null}
              />
            </div>
          </div>

          {canReview && beker.status === "voorgedragen" && (
            <section className="space-y-3 rounded-lg border bg-card p-4">
              <h2 className={sectionTitle}>Keuren</h2>
              <ReviewPanel bekerId={beker.id} />
            </section>
          )}

          {awarded && (
            <section id="felicitaties" className="scroll-mt-20 space-y-3">
              <h2 className={sectionTitle}>Felicitaties{beker.congrats.length > 0 ? ` (${beker.congrats.length})` : ""}</h2>
              <Congrats
                bekerId={beker.id}
                items={beker.congrats}
                viewerId={member.id}
                canModerate={access.has("content.moderate_posts") || access.has(REVIEW_PERMISSION)}
              />
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
