import Link from "next/link";
import { EmptyState } from "@/components/app-ui";
import {
  loadCurrentSeason,
  loadEditionParts,
  loadFeaturedEdition,
  loadSeasonEditions,
} from "@/lib/omnium/public-data";
import { Countdown } from "@/app/omnium/_components/countdown";
import { LocalTime } from "@/app/omnium/_components/local-time";

export const revalidate = 300;

export default async function OmniumHomePage() {
  const season = await loadCurrentSeason();
  if (!season) {
    return <EmptyState>The next season has not been announced yet.</EmptyState>;
  }

  const [editions, highlight] = await Promise.all([
    loadSeasonEditions(season.id),
    loadFeaturedEdition(season.id),
  ]);
  const featured = highlight?.edition ?? null;
  const isUpcoming = highlight?.isUpcoming ?? false;
  const parts = featured ? await loadEditionParts(featured.id) : [];

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          {season.name}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Four events. One morning.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          A prologue against the clock, a scratch race, a sprint qualifier and a
          points race — back to back in ninety minutes, scored as one
          classification per league.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/omnium/register"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Register
          </Link>
          <Link
            href="/omnium/standings"
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Season standings
          </Link>
        </div>
      </section>

      {featured && (
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {isUpcoming ? "Next edition" : "Latest edition"} · Round{" "}
                {featured.number}
              </p>
              <h2 className="text-2xl font-semibold">{featured.title}</h2>
              {featured.subtitle && (
                <p className="text-muted-foreground">{featured.subtitle}</p>
              )}
            </div>
            <div className="space-y-0.5 text-sm sm:text-right">
              <LocalTime iso={featured.startsAt} />
              {isUpcoming && (
                <p className="text-muted-foreground">
                  <Countdown targetIso={featured.startsAt} prefix="in" />
                </p>
              )}
            </div>
          </div>

          {featured.preshowAt && isUpcoming && (
            <p className="text-sm text-muted-foreground">
              Pre-race show from <LocalTime iso={featured.preshowAt} />
              {featured.youtubeUrl && (
                <>
                  {" · "}
                  <a
                    href={featured.youtubeUrl}
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch on YouTube
                  </a>
                </>
              )}
            </p>
          )}

          {parts.length > 0 && (
            <ol className="grid gap-3 sm:grid-cols-2">
              {parts.map((part) => (
                <li key={part.id} className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Event {part.orderIndex}
                  </p>
                  <p className="font-medium">{part.title}</p>
                  {part.routeName && (
                    <p className="text-sm text-muted-foreground">
                      {part.routeName}
                      {part.world && ` · ${part.world}`}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    <LocalTime iso={part.startsAt} />
                  </p>
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={`/omnium/${featured.slug}/live`} className="underline">
              Watch live
            </Link>
            <Link href={`/omnium/${featured.slug}`} className="underline">
              Edition details
            </Link>
            <Link
              href={`/omnium/${featured.slug}/startlist`}
              className="underline"
            >
              Start list
            </Link>
            <Link href={`/omnium/${featured.slug}/results`} className="underline">
              Results
            </Link>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Season calendar
        </h2>
        {editions.length === 0 ? (
          <EmptyState>The calendar has not been published yet.</EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {editions.map((edition) => (
              <li
                key={edition.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/omnium/${edition.slug}`}
                    className="font-medium hover:underline"
                  >
                    Round {edition.number} — {edition.title}
                  </Link>
                  {edition.subtitle && (
                    <p className="text-muted-foreground">{edition.subtitle}</p>
                  )}
                </div>
                <LocalTime iso={edition.startsAt} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
