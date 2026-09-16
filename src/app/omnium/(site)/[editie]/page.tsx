import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { detectYouTube } from "@/lib/embed";
import {
  loadEditionBySlug,
  loadEditionParts,
} from "@/lib/omnium/public-data";
import { Countdown } from "@/app/omnium/_components/countdown";
import { LocalTime } from "@/app/omnium/_components/local-time";

export const revalidate = 300;

type PageProps = { params: Promise<{ editie: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { editie } = await params;
  const found = await loadEditionBySlug(editie);
  if (!found) return { title: "Edition" };
  return {
    title: found.edition.title,
    description:
      found.edition.subtitle ??
      `Round ${found.edition.number} of the ZWB Omnium.`,
  };
}

export default async function OmniumEditionPage({ params }: PageProps) {
  const { editie } = await params;
  const found = await loadEditionBySlug(editie);
  if (!found) notFound();

  const { edition } = found;
  const parts = await loadEditionParts(edition.id);
  const stream = edition.youtubeUrl ? detectYouTube(edition.youtubeUrl) : null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Round {edition.number}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {edition.title}
        </h1>
        {edition.subtitle && (
          <p className="text-lg text-muted-foreground">{edition.subtitle}</p>
        )}
        <p className="text-sm">
          <LocalTime iso={edition.startsAt} />
        </p>
        {edition.preshowAt && (
          <p className="text-sm text-muted-foreground">
            Pre-race show from <LocalTime iso={edition.preshowAt} />
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          <Countdown targetIso={edition.startsAt} prefix="Starts in" />
        </p>
      </header>

      {stream && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Live broadcast
          </h2>
          <div className="aspect-video overflow-hidden rounded-lg border">
            <iframe
              src={stream.embedUrl}
              title={`${edition.title} livestream`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </section>
      )}

      {edition.introMd && (
        <section className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {edition.introMd}
          </ReactMarkdown>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          The four events
        </h2>
        <ol className="space-y-3">
          {parts.map((part) => (
            <li key={part.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">
                  {part.orderIndex}. {part.title}
                </h3>
                <span className="text-sm text-muted-foreground">
                  <LocalTime iso={part.startsAt} />
                </span>
              </div>
              {part.routeName && (
                <p className="text-sm text-muted-foreground">
                  {part.routeName}
                  {part.world && ` · ${part.world}`}
                  {part.distanceKm !== null && ` · ${part.distanceKm} km`}
                  {part.laps !== null && ` · ${part.laps} laps`}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {part.routeUrl && (
                  <a
                    href={part.routeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Route info
                  </a>
                )}
                {part.zwiftEventId && (
                  <a
                    href={`https://www.zwift.com/uk/events/view/${part.zwiftEventId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Sign up on Zwift
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href={`/omnium/${edition.slug}/live`} className="underline">
          Watch live
        </Link>
        <Link href={`/omnium/${edition.slug}/startlist`} className="underline">
          Start list
        </Link>
        <Link href={`/omnium/${edition.slug}/results`} className="underline">
          Results
        </Link>
        <Link href="/omnium/standings" className="underline">
          Season standings
        </Link>
      </nav>
    </div>
  );
}
