import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app-ui";
import {
  loadCurrentSeason,
  loadEditionParts,
  loadUpcomingEdition,
} from "@/lib/omnium/public-data";
import { LocalTime } from "../_components/local-time";

export const revalidate = 300;

export const metadata: Metadata = { title: "Register" };

function zwiftEventUrl(id: string): string {
  return `https://www.zwift.com/uk/events/view/${id}`;
}

export default async function OmniumRegisterPage() {
  const season = await loadCurrentSeason();
  if (!season) {
    return <EmptyState>The next season has not been announced yet.</EmptyState>;
  }

  const upcoming = await loadUpcomingEdition(season.id);
  const parts = upcoming ? await loadEditionParts(upcoming.id) : [];
  const withSignup = parts.filter((part) => part.zwiftEventId);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Register</h1>
        {upcoming && (
          <p className="text-muted-foreground">
            Round {upcoming.number} — {upcoming.title} ·{" "}
            <LocalTime iso={upcoming.startsAt} />
          </p>
        )}
      </header>

      {!upcoming ? (
        <EmptyState>No upcoming edition is open for registration.</EmptyState>
      ) : withSignup.length === 0 ? (
        <EmptyState>
          Sign-up links for this edition are not live yet. Check back closer to
          race day.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Sign up for each event separately on Zwift.
          </p>
          <ul className="divide-y rounded-lg border bg-card">
            {withSignup.map((part) => (
              <li
                key={part.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {part.orderIndex}. {part.title}
                  </p>
                  {part.routeName && (
                    <p className="text-sm text-muted-foreground">
                      {part.routeName}
                      {part.world && ` · ${part.world}`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <LocalTime iso={part.startsAt} />
                  </p>
                </div>
                <a
                  href={zwiftEventUrl(part.zwiftEventId!)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                >
                  Sign up
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            <Link href={`/omnium/${upcoming.slug}`} className="underline">
              Edition details
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
