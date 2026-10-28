import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import { BekerIcon } from "@/components/zwbekers/beker-icon";
import { adminAreaPermission } from "@/lib/admin-areas";
import { getRequestAccess } from "@/lib/auth/request";
import { createClient } from "@/lib/supabase/server";
import { describeDesign } from "@/lib/zwbekers/design";
import { KIND_LABEL, STATUS_LABEL, dayLabel, namesLabel } from "@/lib/zwbekers/nomination";
import { loadReviewQueue } from "@/lib/zwbekers/server";
import { ReviewPanel } from "../../zwbekers/_components/beker-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZWBekers keuren" };

const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-muted-foreground";

/** Voordrachten voor ZWBekers keuren (0286): de open voordrachten, oudste eerst, en de laatste besluiten. */
export default async function ZwbekersBeheerPage() {
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has(adminAreaPermission("zwbekers"))) redirect("/dashboard");

  const { open, recent } = await loadReviewQueue(await createClient());

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">ZWBekers</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/zwbekers" className="underline underline-offset-2">
            Naar de prijzenkast
          </Link>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className={sectionTitle}>Te keuren ({open.length})</h2>
        {open.length === 0 ? (
          <EmptyState>Geen voordrachten die wachten.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {open.map((beker) => (
              <li key={beker.id} className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-[96px_minmax(0,1fr)]">
                <BekerIcon design={beker.design} className="mx-auto h-28 w-24" />
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {KIND_LABEL[beker.kind]} · {dayLabel(beker.achievedOn)} · door {beker.nominator?.name ?? "een oud-lid"}
                    </p>
                    <h3 className="text-lg font-semibold">
                      <Link href={`/zwbekers/${beker.id}`} className="hover:underline">
                        {beker.title}
                      </Link>
                    </h3>
                    <p className="text-sm">
                      {beker.kind === "team" && beker.teamName ? `${beker.teamName}: ` : ""}
                      {namesLabel(beker.winners.map((winner) => winner.name))}
                    </p>
                  </div>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{beker.story}</p>
                  <p className="text-xs text-muted-foreground">
                    {describeDesign(beker.design)}
                    {beker.design.gravure ? ` · gravure “${beker.design.gravure}”` : ""}
                    {beker.photoUrl ? " · met foto" : ""}
                  </p>
                  <ReviewPanel bekerId={beker.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section className="space-y-3">
          <h2 className={sectionTitle}>Laatst beoordeeld</h2>
          <ul className="divide-y rounded-lg border bg-card">
            {recent.map((beker) => (
              <li key={beker.id}>
                <Link href={`/zwbekers/${beker.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                  <BekerIcon design={beker.design} title="" className="h-10 w-8 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{beker.title}</span>
                  <span className="text-xs text-muted-foreground">{STATUS_LABEL[beker.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
