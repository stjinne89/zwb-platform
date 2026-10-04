import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { createClient } from "@/lib/supabase/server";
import { FrrZwbStandingsList } from "@/components/frr-zwb-standings-list";
import { computeProvisionalGc, type ProvisionalResult } from "@/lib/frr/provisional";
import { computeWatchList, formatFrrDuration, type GcStanding } from "@/lib/frr/watch";
import {
  FRR_STANDING_COLUMNS,
  loadZwbFrrStandings,
  type FrrStandingRow,
} from "@/lib/frr/zwb-standings";
import { FrrExcludeToggle } from "./frr-exclude";
import { FrrFollowForm, FrrFollowToggle } from "./frr-follow";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

function toStanding(row: FrrStandingRow): GcStanding {
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

function places(diff: number | null) {
  if (diff === null) return null;
  if (diff === 0) return "gelijk";
  return diff < 0 ? `${-diff} voor je` : `${diff} achter je`;
}

type StageResultRow = {
  slot_event_id: string;
  zwift_id: string;
  stage: number;
  pen: string | null;
  time_s: number | string;
};

/** Finishtijden van de klasse (migr. 0215), per 1000 want PostgREST kapt af. */
async function loadClassResults(
  supabase: SupabaseServer,
  tourId: string,
  zwiftIds: string[],
): Promise<ProvisionalResult[]> {
  const results: ProvisionalResult[] = [];
  for (let from = 0; zwiftIds.length > 0 && from < 20000; from += 1000) {
    const { data } = await supabase
      .from("frr_stage_results")
      .select("slot_event_id, zwift_id, stage, pen, time_s")
      .eq("tour_id", tourId)
      .in("zwift_id", zwiftIds)
      .order("slot_event_id")
      .order("zwift_id")
      .range(from, from + 999);
    const rows = (data ?? []) as StageResultRow[];
    for (const row of rows) {
      results.push({
        stage: row.stage,
        slotId: row.slot_event_id,
        zwiftId: row.zwift_id,
        pen: row.pen,
        timeS: Number(row.time_s),
      });
    }
    if (rows.length < 1000) break;
  }
  return results;
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
  const [{ zwbNames, members, standings: zwbStandings }, { data: favouriteRows }] =
    await Promise.all([
      loadZwbFrrStandings(supabase, tourId),
      userId
        ? supabase.from("frr_watch_riders").select("zwift_id, name").eq("profile_id", userId)
        : Promise.resolve({ data: [] }),
    ]);
  const myZwiftId = members.find((row) => row.id === userId)?.zwiftId ?? null;
  const favourites = ((favouriteRows ?? []) as Array<{ zwift_id: string; name: string }>).map(
    (row) => ({ zwiftId: row.zwift_id, name: row.name }),
  );
  const mine = myZwiftId ? zwbStandings.find((row) => row.zwift_id === myZwiftId) : undefined;

  const [{ data: classRows }, { data: favouriteStandingRows }] = await Promise.all([
    mine
      ? supabase
          .from("frr_gc_standings")
          .select(FRR_STANDING_COLUMNS)
          .eq("tour_id", tourId)
          .eq("gender_class", mine.gender_class)
      : Promise.resolve({ data: [] }),
    favourites.length > 0
      ? supabase
          .from("frr_gc_standings")
          .select(FRR_STANDING_COLUMNS)
          .eq("tour_id", tourId)
          .in("zwift_id", favourites.map((row) => row.zwiftId))
      : Promise.resolve({ data: [] }),
  ]);
  // Het voorlopige klassement van de eigen klasse, zonder wie het lid eruit haalde.
  const classRiders = ((classRows ?? []) as FrrStandingRow[]).map((row) => ({
    zwiftId: row.zwift_id,
    name: row.name,
    club: row.club,
  }));
  const [classResults, { data: exclusionRows }] = await Promise.all([
    loadClassResults(supabase, tourId, classRiders.map((row) => row.zwiftId)),
    mine && userId
      ? supabase
          .from("frr_gc_exclusions")
          .select("zwift_id, name")
          .eq("profile_id", userId)
          .eq("tour_id", tourId)
          .order("name")
      : Promise.resolve({ data: [] }),
  ]);
  const exclusions = (exclusionRows ?? []) as Array<{ zwift_id: string; name: string }>;
  const provisional = computeProvisionalGc({
    riders: classRiders,
    results: classResults,
    excluded: new Set(exclusions.map((row) => row.zwift_id)),
  });
  const myProvisional = provisional.ranked.find((row) => row.zwiftId === myZwiftId) ?? null;

  const standings = new Map<string, GcStanding>();
  for (const row of [
    ...((classRows ?? []) as FrrStandingRow[]),
    ...((favouriteStandingRows ?? []) as FrrStandingRow[]),
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
          <FrrZwbStandingsList
            standings={zwbStandings}
            zwbNames={zwbNames}
            myZwiftId={myZwiftId}
            slotText={(zwiftId) => {
              const ids = entrantSlots.get(zwiftId) ?? [];
              return ids.length > 0 ? slotText(ids) : null;
            }}
          />
        </section>
      )}

      {mine && provisional.stages.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Voorlopig klassement {mine.gender_class} · na etappe{" "}
              {provisional.stages[provisional.stages.length - 1]}
            </h2>
            <p className="text-xs text-muted-foreground">Nog niet officieel.</p>
          </div>
          {[
            { title: null, riders: provisional.ranked },
            { title: "Mist een etappe", riders: provisional.pending },
          ].map(
            (group) =>
              group.riders.length > 0 && (
                <div key={group.title ?? "ranked"} className="space-y-2">
                  {group.title && (
                    <h3 className="text-xs font-medium text-muted-foreground">{group.title}</h3>
                  )}
                  <ul className="divide-y rounded-lg border bg-card text-sm">
                    {group.riders.map((rider) => {
                      const isMe = rider.zwiftId === myZwiftId;
                      const egap = `eGAP ${formatFrrDuration(rider.egapS)}`;
                      const versusMe = myProvisional !== null && !isMe && !group.title;
                      return (
                        <li
                          key={rider.zwiftId}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2",
                            isMe && "bg-primary/5",
                          )}
                        >
                          <span className="w-7 shrink-0 tabular-nums font-semibold sm:w-8">
                            {rider.position ?? "—"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <a
                              href={`https://zwiftpower.com/profile.php?z=${rider.zwiftId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate hover:underline"
                            >
                              {zwbNames.get(rider.zwiftId) ?? rider.name}
                            </a>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[
                                rider.club,
                                rider.otherPens.length > 0
                                  ? `startgroep ${rider.otherPens.join(", ")}`
                                  : null,
                                group.title
                                  ? `${rider.stagesRidden} van ${provisional.stages.length}`
                                  : null,
                                versusMe ? egap : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="shrink-0 text-right tabular-nums text-muted-foreground">
                            {versusMe
                              ? formatFrrDuration(rider.egapS - myProvisional.egapS, true)
                              : egap}
                          </span>
                          {isMe ? (
                            <span className="size-7 shrink-0" />
                          ) : (
                            <FrrExcludeToggle
                              tourId={tourId}
                              zwiftId={rider.zwiftId}
                              name={rider.name}
                              excluded={false}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
          )}
          {exclusions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Verwijderd</h3>
              <ul className="divide-y rounded-lg border bg-card text-sm">
                {exclusions.map((row) => (
                  <li key={row.zwift_id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {row.name}
                    </span>
                    <FrrExcludeToggle
                      tourId={tourId}
                      zwiftId={row.zwift_id}
                      name={row.name}
                      excluded
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                    {rider.gapS === null ? "" : formatFrrDuration(rider.gapS, true)}
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
