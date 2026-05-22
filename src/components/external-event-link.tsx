import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = {
  match: RegExp;
  label: string;
  icon: string;
};

const PLATFORMS: Platform[] = [
  { match: /strava\.com/i, label: "Strava", icon: "🚴" },
  { match: /komoot\.(com|nl|de)/i, label: "Komoot", icon: "🗺️" },
  { match: /ridewithgps\.com/i, label: "Ride with GPS", icon: "🚲" },
  { match: /garmin\.com|connect\.garmin/i, label: "Garmin Connect", icon: "⌚" },
  { match: /zwift\.com|zwiftinsider\.com/i, label: "Zwift", icon: "💻" },
  { match: /mywindsock\./i, label: "MyWindsock", icon: "🌬️" },
  { match: /intervals\.icu/i, label: "intervals.icu", icon: "📊" },
  { match: /facebook\./i, label: "Facebook", icon: "📘" },
  { match: /instagram\./i, label: "Instagram", icon: "📷" },
];

function detect(url: string): Platform | null {
  for (const p of PLATFORMS) if (p.match.test(url)) return p;
  return null;
}

export function ExternalEventLink({ url, className }: { url: string; className?: string }) {
  const platform = detect(url);
  let host = "Open link";
  try {
    host = new URL(url).host.replace(/^www\./, "");
  } catch {
    /* fallback aangehouden */
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium transition hover:border-primary/40 hover:bg-secondary",
        className,
      )}
    >
      <span aria-hidden className="text-base">
        {platform?.icon ?? "🔗"}
      </span>
      <span className="truncate">
        Open op {platform?.label ?? host}
      </span>
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}
