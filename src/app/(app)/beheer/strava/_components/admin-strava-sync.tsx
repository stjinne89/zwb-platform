"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Award, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminRecomputeBadgesAndCols,
  adminSyncStravaForProfile,
  revalidateAfterRecompute,
} from "../_actions";

export type SyncMember = {
  profileId: string;
  name: string;
  activityCount: number;
  lastActivity: string | null;
  connectedAt: string | null;
  missingActivityScope: boolean;
};

// Zelfde veiligheidsplafond als de ledenknop: 40 chunks × 5 pages × 100 =
// ruim 5 jaar zeer actieve rider.
const MAX_CHUNKS = 40;

type RowState =
  | { kind: "idle" }
  | { kind: "running"; message: string }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminStravaSync({ members }: { members: SyncMember[] }) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [recomputeStates, setRecomputeStates] = useState<
    Record<string, RowState>
  >({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkRecomputeRunning, setBulkRecomputeRunning] = useState(false);

  function setRow(profileId: string, state: RowState) {
    setStates((prev) => ({ ...prev, [profileId]: state }));
  }

  function setRecomputeRow(profileId: string, state: RowState) {
    setRecomputeStates((prev) => ({ ...prev, [profileId]: state }));
  }

  // Badges + cols herberekenen voor één lid (DB-only, geen Strava-calls).
  async function recomputeMember(profileId: string): Promise<boolean> {
    setRecomputeRow(profileId, { kind: "running", message: "Herberekenen…" });
    const res = await adminRecomputeBadgesAndCols(profileId);
    if (!res.ok) {
      setRecomputeRow(profileId, { kind: "error", message: res.error });
      return false;
    }
    const parts = [`${res.awarded} badge${res.awarded === 1 ? "" : "s"}`];
    if (res.newCols > 0) parts.push(`${res.newCols} nieuwe cols`);
    if (res.segmentTimesUpdated > 0) {
      parts.push(
        `${res.segmentTimesUpdated} segmenttijd${
          res.segmentTimesUpdated === 1 ? "" : "en"
        }`,
      );
    } else if (res.segmentTimesFetched > 0) {
      parts.push(`${res.segmentTimesFetched} ritten op segmenten gecheckt`);
    }
    if (res.segmentTimesSkipped) parts.push("segmenttijden overgeslagen");
    if (res.segmentTimesRateLimited) parts.push("Strava rate-limit");
    if (res.errors.length > 0) parts.push(`waarschuwing: ${res.errors[0]}`);
    setRecomputeRow(profileId, { kind: "done", message: parts.join(" · ") });
    return true;
  }

  async function recomputeAll() {
    if (
      !confirm(
        `Badges en cols herberekenen voor alle ${members.length} gekoppelde leden? Dit draait op de al-gesynchroniseerde ritten en kan even duren.`,
      )
    ) {
      return;
    }
    setBulkRecomputeRunning(true);
    for (const member of members) {
      await recomputeMember(member.profileId);
      await new Promise((r) => setTimeout(r, 150));
    }
    setBulkRecomputeRunning(false);
    await revalidateAfterRecompute();
    router.refresh();
  }

  // Eén lid volledig syncen door de chunks aan elkaar te rijgen, exact zoals
  // de interactieve ledenknop. fullBackfill zodat een leeg profiel de hele
  // 5-jaar historie ophaalt.
  async function syncMember(profileId: string): Promise<boolean> {
    setRow(profileId, { kind: "running", message: "Starten…" });

    let totalUpserted = 0;
    let startPage: number | undefined = undefined;
    let afterTs: number | undefined = undefined;

    for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
      const res = await adminSyncStravaForProfile({
        profileId,
        fullBackfill: true,
        startPage,
        afterTs,
        chunkPages: 5,
      });

      if (!res.ok) {
        setRow(profileId, { kind: "error", message: res.error });
        return false;
      }

      totalUpserted += res.upserted;

      if (res.done) {
        setRow(profileId, {
          kind: "done",
          message: `${totalUpserted} ritten gesynchroniseerd.`,
        });
        return true;
      }

      setRow(profileId, {
        kind: "running",
        message: `Bezig… ${totalUpserted} ritten (pagina ${res.nextPage}).`,
      });
      startPage = res.nextPage ?? undefined;
      afterTs = res.afterTs;

      if (res.stravaRateLimited) {
        setRow(profileId, {
          kind: "error",
          message: `Strava rate-limit na ${totalUpserted} ritten. Probeer later opnieuw.`,
        });
        return false;
      }
      if (!startPage) break;

      await new Promise((r) => setTimeout(r, 250));
    }

    setRow(profileId, {
      kind: "done",
      message: `${totalUpserted} ritten gesynchroniseerd.`,
    });
    return true;
  }

  async function syncAllMissing() {
    // Leden zonder activiteiten-recht slaan we over: hun token geeft een 401,
    // alleen het lid zelf kan dat oplossen door opnieuw te koppelen.
    const missing = members.filter(
      (m) => m.activityCount === 0 && !m.missingActivityScope,
    );
    if (missing.length === 0) return;
    if (
      !confirm(
        `Sync de volledige historie van ${missing.length} lid${
          missing.length === 1 ? "" : "eden"
        } zonder ritten in de statistieken? Dit kan enkele minuten duren.`,
      )
    ) {
      return;
    }

    setBulkRunning(true);
    for (const member of missing) {
      await syncMember(member.profileId);
      await new Promise((r) => setTimeout(r, 300));
    }
    setBulkRunning(false);
    router.refresh();
  }

  if (members.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Nog geen leden met een Strava-koppeling.
      </p>
    );
  }

  const missingCount = members.filter(
    (m) => m.activityCount === 0 && !m.missingActivityScope,
  ).length;

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <h2 className="font-semibold">Gekoppelde leden</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={bulkRecomputeRunning || bulkRunning}
            onClick={recomputeAll}
          >
            <Award
              data-icon="inline-start"
              className={bulkRecomputeRunning ? "animate-pulse" : undefined}
            />
            Badges + cols voor iedereen
          </Button>
          {missingCount > 0 && (
            <Button
              type="button"
              size="sm"
              disabled={bulkRunning || bulkRecomputeRunning}
              onClick={syncAllMissing}
            >
              <RefreshCw
                data-icon="inline-start"
                className={bulkRunning ? "animate-spin" : undefined}
              />
              Sync alle ontbrekende ({missingCount})
            </Button>
          )}
        </div>
      </div>

      <ul className="divide-y">
        {members.map((member) => {
          const state = states[member.profileId] ?? { kind: "idle" };
          const recomputeState = recomputeStates[member.profileId] ?? {
            kind: "idle",
          };
          const running = state.kind === "running";
          const recomputing = recomputeState.kind === "running";
          const missing = member.activityCount === 0;
          return (
            <li
              key={member.profileId}
              className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{member.name}</span>
                  {member.missingActivityScope ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="size-3" />
                      Geen activiteiten-recht
                    </span>
                  ) : missing ? (
                    <span className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-0.5 text-xs font-medium text-destructive">
                      Niet in stats
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                      <Check className="size-3" />
                      {member.activityCount} ritten
                    </span>
                  )}
                </div>
                {member.missingActivityScope && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Lid moet opnieuw koppelen en het vinkje &ldquo;activiteiten&rdquo;
                    aanzetten.
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Laatste rit: {formatDate(member.lastActivity)} · gekoppeld{" "}
                  {formatDate(member.connectedAt)}
                </p>
                {state.kind !== "idle" && (
                  <p
                    className={`mt-1 text-xs ${
                      state.kind === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {state.message}
                  </p>
                )}
                {recomputeState.kind !== "idle" && (
                  <p
                    className={`mt-1 text-xs ${
                      recomputeState.kind === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    Badges/cols: {recomputeState.message}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    running ||
                    bulkRunning ||
                    bulkRecomputeRunning ||
                    member.missingActivityScope
                  }
                  title={
                    member.missingActivityScope
                      ? "Token mist het activiteiten-recht — lid moet opnieuw koppelen."
                      : undefined
                  }
                  onClick={async () => {
                    await syncMember(member.profileId);
                    router.refresh();
                  }}
                >
                  <RefreshCw
                    data-icon="inline-start"
                    className={running ? "animate-spin" : undefined}
                  />
                  {running ? "Bezig…" : "Sync nu"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={recomputing || bulkRunning || bulkRecomputeRunning}
                  onClick={async () => {
                    await recomputeMember(member.profileId);
                    await revalidateAfterRecompute();
                    router.refresh();
                  }}
                >
                  <Award
                    data-icon="inline-start"
                    className={recomputing ? "animate-pulse" : undefined}
                  />
                  Badges + cols
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
