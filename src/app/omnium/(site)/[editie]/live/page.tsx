import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from "@/components/ui/responsive-table";
import { detectYouTube } from "@/lib/embed";
import {
  loadEditionBySlug,
  loadEditionParts,
  loadEditionStandings,
  type PublicStanding,
} from "@/lib/omnium/public-data";
import { AutoRefresh } from "@/app/omnium/_components/auto-refresh";
import { Countdown } from "@/app/omnium/_components/countdown";
import { LocalTime } from "@/app/omnium/_components/local-time";

// Kort genoeg om tijdens de uitzending mee te lopen, lang genoeg om de
// database te beschermen als er veel mensen tegelijk kijken.
export const revalidate = 15;

type PageProps = { params: Promise<{ editie: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { editie } = await params;
  const found = await loadEditionBySlug(editie);
  return { title: found ? `Live — ${found.edition.title}` : "Live" };
}

export default async function OmniumLivePage({ params }: PageProps) {
  const { editie } = await params;
  const found = await loadEditionBySlug(editie);
  if (!found) notFound();

  const { edition } = found;
  const [parts, standings] = await Promise.all([
    loadEditionParts(edition.id),
    loadEditionStandings(edition.id),
  ]);

  const stream = edition.youtubeUrl ? detectYouTube(edition.youtubeUrl) : null;
  const scored = parts.filter((part) => part.resultsState === "final");
  const leagues = [...new Set(standings.map((row) => row.league))].sort();
  const provisional = standings.some((row) => row.isProvisional);

  const columns: Array<ResponsiveColumn<PublicStanding>> = [
    {
      key: "rank",
      header: "#",
      cell: (row) => `${row.rank}${row.rankShared ? "=" : ""}`,
      cellClassName: "tabular-nums text-muted-foreground",
      secondary: true,
    },
    { key: "rider", header: "Rider", cell: (row) => row.riderName, primary: true },
    {
      key: "prologue",
      header: "Prol",
      align: "right",
      cell: (row) => row.prologuePoints,
      cellClassName: "tabular-nums",
    },
    {
      key: "scratch",
      header: "Scratch",
      align: "right",
      cell: (row) => row.scratchPoints,
      cellClassName: "tabular-nums",
    },
    {
      key: "sprint",
      header: "Sprint",
      align: "right",
      cell: (row) => row.sprintPoints,
      cellClassName: "tabular-nums",
    },
    {
      key: "crit",
      header: "Crit",
      align: "right",
      cell: (row) => row.critPoints,
      cellClassName: "tabular-nums",
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (row) => row.totalPoints,
      cellClassName: "tabular-nums font-medium",
    },
  ];

  return (
    <div className="space-y-8">
      <AutoRefresh />

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Live · Round {edition.number}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{edition.title}</h1>
        <p className="text-sm">
          <LocalTime iso={edition.startsAt} />
        </p>
        {edition.preshowAt && (
          <p className="text-sm text-muted-foreground">
            <Countdown targetIso={edition.preshowAt} prefix="Pre-race show in" />
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          <Countdown targetIso={edition.startsAt} prefix="First event starts in" />
        </p>
      </header>

      {stream ? (
        <div className="aspect-video overflow-hidden rounded-lg border">
          <iframe
            src={stream.embedUrl}
            title={`${edition.title} livestream`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : (
        <EmptyState>The stream link will appear here before the start.</EmptyState>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Progress
        </h2>
        <ol className="grid gap-2 sm:grid-cols-4">
          {parts.map((part) => (
            <li
              key={part.id}
              className={
                part.resultsState === "final"
                  ? "rounded-md border border-primary/40 bg-primary/5 p-2 text-sm"
                  : "rounded-md border p-2 text-sm text-muted-foreground"
              }
            >
              <p className="font-medium">{part.title}</p>
              <p className="text-xs">
                {part.resultsState === "final" ? "Scored" : "To come"}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Standings
          </h2>
          {provisional && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              After {scored.length} of {parts.length} events
            </span>
          )}
        </div>

        {standings.length === 0 ? (
          <EmptyState>
            Standings appear as soon as the first event is scored.
          </EmptyState>
        ) : (
          leagues.map((league) => (
            <div key={league} className="space-y-1">
              <h3 className="text-xs font-medium uppercase text-muted-foreground">
                {league}
              </h3>
              <ResponsiveTable
                columns={columns}
                rows={standings.filter((row) => row.league === league)}
                rowKey={(row) => `${league}-${row.riderId}`}
              />
            </div>
          ))
        )}
      </section>

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href={`/omnium/${edition.slug}`} className="underline">
          Edition details
        </Link>
        <Link href={`/omnium/${edition.slug}/results`} className="underline">
          Full results
        </Link>
        <Link href="/omnium/standings" className="underline">
          Season standings
        </Link>
      </nav>
    </div>
  );
}
