import { ArrowUpRight } from "lucide-react";
import type { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

type RaceRow = {
  category_starts: Record<string, string> | null;
  registration_closes_at: string | null;
  pre_weight_categories: number[] | null;
  pre_weight_opens_at: string | null;
  pre_weight_closes_at: string | null;
  course_url: string | null;
};

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

function moment(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

/**
 * Een SRC-race (migr. 0200): inschrijven op MyWhoosh tot de deadline, de
 * starttijd per categorie en het weigh-in-venster.
 */
export async function SrcPanel({
  supabase,
  eventId,
  signupUrl,
}: {
  supabase: SupabaseServer;
  eventId: string;
  signupUrl: string | null;
}) {
  const { data } = await supabase
    .from("src_races")
    .select(
      "category_starts, registration_closes_at, pre_weight_categories, pre_weight_opens_at, pre_weight_closes_at, course_url",
    )
    .eq("event_id", eventId)
    .maybeSingle();
  const race = data as RaceRow | null;
  if (!race) return null;

  const closes = race.registration_closes_at;
  const open = !closes || new Date(closes) > new Date();
  const starts = Object.entries(race.category_starts ?? {}).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  const weighIn = race.pre_weight_categories ?? [];

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Sunday Race Club
      </h2>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {open && signupUrl && (
          <a
            href={signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Inschrijven op MyWhoosh
            <ArrowUpRight className="size-3.5" />
          </a>
        )}
        {closes && (
          <span className={open ? "" : "text-muted-foreground"}>
            {open ? "Inschrijven tot" : "Inschrijving gesloten"} {moment(closes)}
          </span>
        )}
        {race.course_url && (
          <a
            href={race.course_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
          >
            Parcours
            <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>
      {starts.length > 0 && (
        <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm tabular-nums sm:grid-cols-6">
          {starts.map(([category, start]) => (
            <div key={category}>
              <dt className="text-xs text-muted-foreground">Cat {category}</dt>
              <dd>{clock(start)}</dd>
            </div>
          ))}
        </dl>
      )}
      {weighIn.length > 0 && race.pre_weight_opens_at && race.pre_weight_closes_at && (
        <p className="text-sm">
          Weigh-in cat {weighIn.join(" en ")}: {clock(race.pre_weight_opens_at)}–
          {clock(race.pre_weight_closes_at)}
        </p>
      )}
    </section>
  );
}
