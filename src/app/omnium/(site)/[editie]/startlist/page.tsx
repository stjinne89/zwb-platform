import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import {
  loadEditionBySlug,
  loadEditionEntrants,
} from "@/lib/omnium/public-data";

export const revalidate = 300;

type PageProps = { params: Promise<{ editie: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { editie } = await params;
  const found = await loadEditionBySlug(editie);
  return { title: found ? `Start list — ${found.edition.title}` : "Start list" };
}

const UNASSIGNED = "Not yet placed";

export default async function OmniumStartlistPage({ params }: PageProps) {
  const { editie } = await params;
  const found = await loadEditionBySlug(editie);
  if (!found) notFound();

  const { edition } = found;
  const entrants = await loadEditionEntrants(edition.id);

  // Eén renner kan zich voor meerdere onderdelen inschrijven; de startlijst
  // toont de persoon één keer per league.
  const byLeague = new Map<string, Map<string, string>>();
  for (const entrant of entrants) {
    const league = entrant.league ?? UNASSIGNED;
    const riders = byLeague.get(league) ?? new Map<string, string>();
    riders.set(entrant.riderId, entrant.riderName);
    byLeague.set(league, riders);
  }

  const leagues = [...byLeague.keys()].sort((a, b) => {
    if (a === UNASSIGNED) return 1;
    if (b === UNASSIGNED) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Round {edition.number}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Start list — {edition.title}
        </h1>
      </header>

      {entrants.length === 0 ? (
        <EmptyState>
          The start list appears once sign-ups are synced from Zwift.
        </EmptyState>
      ) : (
        leagues.map((league) => {
          const riders = [...(byLeague.get(league)?.values() ?? [])].sort((a, b) =>
            a.localeCompare(b),
          );
          return (
            <section key={league} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {league} ({riders.length})
              </h2>
              <ul className="grid gap-1 rounded-lg border bg-card p-3 text-sm sm:grid-cols-2">
                {riders.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href={`/omnium/${edition.slug}`} className="underline">
          Edition details
        </Link>
        <Link href={`/omnium/${edition.slug}/results`} className="underline">
          Results
        </Link>
      </nav>
    </div>
  );
}
