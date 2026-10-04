import { Star } from "lucide-react";
import type { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { compareFrrClass, computeWatchList, type GcStanding } from "@/lib/frr/watch";
import { FrrFollowForm, FrrFollowToggle } from "./frr-follow";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

type StandingRow = {
  zwift_id: string;
  name: string;
  club: string | null;
  gender_class: string;
  class_code: string;
  position: number;
  egap_s: number | string | null;
  tour_time_s: number | string | null;
  after_stage: number;
};

const STANDING_COLUMNS =
  "zwift_id, name, club, gender_class, class_code, position, egap_s, tour_time_s, after_stage";

function toStanding(row: StandingRow): GcStanding {
  return {
    zwiftId: row.zwift_id,
    name: row.name,
    club: row.club,
    genderClass: row.gender_class,
    classCode: row.class_code,
    position: row.position,
    egapS: row.egap_s === null ? null : Number(row.egap_s),
  };
}

/** 3725.4 → "1:02:05"; met teken voor een verschil. */
function duration(seconds: number | null, signed = false) {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  const sign = signed ? (seconds > 0 ? "+" : seconds < 0 ? "−" : "±") : "";
  const total = Math.round(Math.abs(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${sign}${h}:${String(m).padStart(2, "0")}:${s}` : `${sign}${m}:${s}`;
}

function places(diff: number | null) {
  if (diff === null) return null;
  if (diff === 0) return "gelijk";
  return diff < 0 ? `${-diff} voor je` : `${diff} achter je`;
}

/**
 * Klassement en rivalen bij een FRR-etappe (migr. 0195): de ZWB'ers in het
 * klassement, en voor het ingelogde lid de renners om in de gaten te houden,
 * met het tijdslot waarin ze deze etappe rijden.
 */
export async function FrrStagePanel({
  supabase,
  tourId,
  userId,
  slots,
}: {
  supabase: SupabaseServer;
  tourId: string;
  userId: string | null;
  /** De tijdsloten van deze etappe met hun korte label. */
  slots: Array<{ id: string; label: string }>;
}) {
  const [{ data: memberRows }, { data: rosterRows }, { data: favouriteRows }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, zwift_id").not("zwift_id", "is", null),
    supabase.from("roster_entries").select("name, zwift_id").not("zwift_id", "is", null),
    userId
      ? supabase.from("frr_watch_riders").select("zwift_id, name").eq("profile_id", userId)
      : Promise.resolve({ data: [] }),
  ]);
  const members = ((memberRows ?? []) as Array<{
    id: string;
    display_name: string | null;
    zwift_id: string | null;
  }>).filter((row) => /^\d+$/.test(row.zwift_id?.trim() ?? ""));
  // Ook wie nog geen profiel heeft maar wel op het roster staat.
  const zwbNames = new Map<string, string | null>();
  for (const row of (rosterRows ?? []) as Array<{ name: string; zwift_id: string | null }>) {
    const id = row.zwift_id?.trim() ?? "";
    if (/^\d+$/.test(id)) zwbNames.set(id, row.name);
  }
  for (const row of members) zwbNames.set(row.zwift_id!.trim(), row.display_name);
  const myZwiftId = members.find((row) => row.id === userId)?.zwift_id?.trim() ?? null;
  const favourites = ((favouriteRows ?? []) as Array<{ zwift_id: string; name: string }>).map(
    (row) => ({ zwiftId: row.zwift_id, name: row.name }),
  );

  const { data: zwbRows } =
    zwbNames.size > 0
      ? await supabase
          .from("frr_gc_standings")
          .select(STANDING_COLUMNS)
          .eq("tour_id", tourId)
          .in("zwift_id", [...zwbNames.keys()])
      : { data: [] };
  const zwbStandings = ((zwbRows ?? []) as StandingRow[]).sort(
    (a, b) =>
      compareFrrClass(a.class_code, b.class_code) ||
      a.gender_class.localeCompare(b.gender_class) ||
      a.position - b.position,
  );
  const mine = myZwiftId ? zwbStandings.find((row) => row.zwift_id === myZwiftId) : undefined;

  const [{ data: classRows }, { data: favouriteStandingRows }] = await Promise.all([
    mine
      ? supabase
          .from("frr_gc_standings")
          .select(STANDING_COLUMNS)
          .eq("tour_id", tourId)
          .eq("gender_class", mine.gender_class)
      : Promise.resolve({ data: [] }),
    favourites.length > 0
      ? supabase
          .from("frr_gc_standings")
          .select(STANDING_COLUMNS)
          .eq("tour_id", tourId)
          .in("zwift_id", favourites.map((row) => row.zwiftId))
      : Promise.resolve({ data: [] }),
  ]);
  const standings = new Map<string, GcStanding>();
  for (const row of [
    ...((classRows ?? []) as StandingRow[]),
    ...((favouriteStandingRows ?? []) as StandingRow[]),
  ]) {
    standings.set(`${row.gender_class}|${row.zwift_id}`, toStanding(row));
  }

  // In welk slot rijden ze deze etappe?
  const watchedIds = new Set<string>([
    ...[...standings.values()].map((row) => row.zwiftId),
    ...favourites.map((row) => row.zwiftId),
    ...zwbNames.keys(),
  ]);
  const slotLabel = new Map(slots.map((slot) => [slot.id, slot.label]));
  const { data: entrantRows } =
    slots.length > 0 && watchedIds.size > 0
      ? await supabase
          .from("frr_slot_entrants")
          .select("event_id, zwift_id")
          .in("event_id", slots.map((slot) => slot.id))
          .in("zwift_id", [...watchedIds])
      : { data: [] };
  const entrantSlots = new Map<string, string[]>();
  for (const row of (entrantRows ?? []) as Array<{ event_id: string; zwift_id: string }>) {
    entrantSlots.set(row.zwift_id, [...(entrantSlots.get(row.zwift_id) ?? []), row.event_id]);
  }
  const slotText = (ids: string[]) =>
    ids.length === 0
      ? "—"
      : ids
          .map((id) => slotLabel.get(id))
          .filter(Boolean)
          .join(", ");

  const watch = computeWatchList({
    myZwiftId,
    standings: [...standings.values()],
    favourites,
    entrantSlots,
  });
  const following = new Set(favourites.map((row) => row.zwiftId));
  const afterStage = zwbStandings[0]?.after_stage ?? null;

  if (zwbStandings.length === 0 && !userId) return null;

  return (
    <>
      {zwbStandings.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            ZWB in het klassement{afterStage ? ` · na etappe ${afterStage}` : ""}
          </h2>
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {zwbStandings.map((row) => {
              const egap = `eGAP ${duration(row.egap_s === null ? null : Number(row.egap_s))}`;
              const slotIds = entrantSlots.get(row.zwift_id) ?? [];
              return (
                <li
                  key={`${row.gender_class}-${row.zwift_id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2",
                    row.zwift_id === myZwiftId && "bg-primary/5",
                  )}
                >
                  <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground sm:w-16">
                    {row.gender_class}
                  </span>
                  <span className="w-7 shrink-0 tabular-nums font-semibold sm:w-8">
                    {row.position}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{zwbNames.get(row.zwift_id) ?? row.name}</span>
                    <span className="block truncate text-xs text-muted-foreground sm:hidden">
                      {[egap, slotIds.length > 0 ? slotText(slotIds) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {duration(row.tour_time_s === null ? null : Number(row.tour_time_s))}
                  </span>
                  <span className="hidden w-20 shrink-0 text-right tabular-nums text-muted-foreground sm:block">
                    {egap}
                  </span>
                  <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
                    {slotText(slotIds)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {userId && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Renners om in de gaten te houden
          </h2>
          {watch.riders.length > 0 && (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {watch.riders.map((rider) => (
                <li key={rider.zwiftId} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-7 shrink-0 tabular-nums font-semibold sm:w-8">
                    {rider.position ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {rider.favourite && (
                        <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                      <a
                        href={`https://zwiftpower.com/profile.php?z=${rider.zwiftId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:underline"
                      >
                        {rider.name}
                      </a>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[rider.classCode, rider.club, places(rider.placesDiff)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {rider.slotIds.length > 0 && (
                      <span className="block truncate text-xs sm:hidden">
                        {slotText(rider.slotIds)}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right tabular-nums text-muted-foreground sm:w-20">
                    {rider.gapS === null ? "" : duration(rider.gapS, true)}
                  </span>
                  <span className="hidden w-24 shrink-0 text-right text-xs sm:block">
                    {slotText(rider.slotIds)}
                  </span>
                  <FrrFollowToggle
                    zwiftId={rider.zwiftId}
                    name={rider.name}
                    following={following.has(rider.zwiftId)}
                  />
                </li>
              ))}
            </ul>
          )}
          <FrrFollowForm />
        </section>
      )}
    </>
  );
}
