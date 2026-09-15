import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AchievementBadge } from "@/components/achievement-badge";
import { StravaAttribution } from "@/components/strava-brand";
import { formatSegmentTime } from "@/lib/segments/explorer";
import { KOM_BADGE, segmentStravaUrl, type SegmentKom } from "@/lib/segments/koms";

export function formatKomDistance(meters: number | null) {
  if (meters == null) return null;
  return `${(meters / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 2 })} km`;
}

/** ZWB KOM- en QOM-titels van één lid, voor het eigen profiel en de ledenpagina. */
export function SegmentKomsSection({ koms }: { koms: SegmentKom[] }) {
  if (koms.length === 0) return null;
  const counts = (["kom", "qom"] as const)
    .map((title) => ({ title, count: koms.filter((k) => k.title === title).length }))
    .filter((c) => c.count > 0);
  return (
    <section className="rounded-lg border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {counts.map(({ title, count }) => (
            <span key={title} className="inline-flex items-center gap-2">
              <AchievementBadge title={KOM_BADGE[title].label} icon="crown" color={KOM_BADGE[title].color} size="md" count={count} />
              {KOM_BADGE[title].label}
            </span>
          ))}
        </h2>
        <Link href="/profiel/segments" className="text-sm text-muted-foreground hover:text-primary hover:underline">
          ZWB Segments
        </Link>
      </div>
      <ul className="mt-4 max-h-96 divide-y overflow-y-auto rounded-md border bg-background">
        {koms.map((kom) => (
          <li key={`${kom.segment_id}-${kom.title}`}>
            <a
              href={segmentStravaUrl(kom.segment_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="grid gap-1 p-3 transition hover:bg-muted/50 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <span className="flex min-w-0 items-center gap-1 font-medium">
                <span className="truncate">{kom.segment_name}</span>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
              </span>
              <span className="flex flex-wrap gap-3 text-sm tabular-nums text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">{KOM_BADGE[kom.title].label}</span>
                {formatKomDistance(kom.distance_m) && <span>{formatKomDistance(kom.distance_m)}</span>}
                <span>{kom.riders} ZWB’ers</span>
                <span className="font-semibold text-foreground">{formatSegmentTime(kom.seconds)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <StravaAttribution />
    </section>
  );
}
