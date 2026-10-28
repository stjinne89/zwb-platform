import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { BekerIcon } from "@/components/zwbekers/beker-icon";
import { STATUS_LABEL, dayLabel } from "@/lib/zwbekers/nomination";
import { loadOwnNominations, requireBekerMember } from "@/lib/zwbekers/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Je voordrachten" };

/** Je eigen voordrachten die (nog) niet in de kast staan: open of teruggestuurd. */
export default async function VoordrachtenPage() {
  let guard;
  try {
    guard = await requireBekerMember();
  } catch (error) {
    return <EmptyState>{error instanceof Error ? error.message : "Je voordrachten zijn nu niet te zien."}</EmptyState>;
  }
  const own = await loadOwnNominations(guard.client, guard.member.id);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="ZWBekers" title="Je voordrachten" />
      {own.length === 0 ? (
        <EmptyState action={<Link href="/zwbekers" className="text-sm font-medium underline underline-offset-2">Naar de prijzenkast</Link>}>
          Geen open voordrachten.
        </EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {own.map((beker) => (
            <li key={beker.id}>
              <Link href={`/zwbekers/${beker.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                <BekerIcon design={beker.design} title="" className="h-14 w-11 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{beker.title}</span>
                  <span className="block text-sm text-muted-foreground">{dayLabel(beker.achievedOn)}</span>
                </span>
                <span
                  className={
                    beker.status === "afgewezen"
                      ? "rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                      : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {STATUS_LABEL[beker.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
