"use client";

import { useState } from "react";
import { History, RefreshCw, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  diagnoseWatopia,
  recomputeMyMilestoneBadges,
  syncMyStravaActivities,
} from "../_actions";

type State =
  | { kind: "idle" }
  | { kind: "running"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

// Veiligheidsplafond op het aantal chunks dat we durven aan elkaar te
// rijgen. 40 chunks × 5 pages × 100 = 20.000 ritten is ruim voor 5 jaar
// extreem actieve rider.
const MAX_CHUNKS = 40;

export function StravaSyncButton() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const isRunning = state.kind === "running";

  async function runSync(fullBackfill: boolean) {
    setState({
      kind: "running",
      message: fullBackfill
        ? "Volledige historie ophalen…"
        : "Synchroniseren…",
    });

    let totalUpserted = 0;
    let totalSeen = 0;
    let totalNonCycling = 0;
    let milestoneAwards = 0;
    let milestoneErrors: string[] = [];
    let isFirstSync = false;
    let startPage: number | undefined = undefined;
    let afterTs: number | undefined = undefined;

    try {
      for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
        const res = await syncMyStravaActivities({
          fullBackfill,
          startPage,
          afterTs,
          // Bij chunked-mode geven we expliciet 5 pages per server-call,
          // ruim binnen de 10s Netlify-timeout.
          chunkPages: 5,
        });

        if (!res.ok) {
          setState({ kind: "error", message: res.error });
          return;
        }

        totalUpserted += res.upserted;
        totalSeen += res.totalSeen;
        totalNonCycling += res.nonCyclingSkipped;
        isFirstSync = res.isFirstSync;
        // Bij done-chunk komt milestoneAwards binnen.
        if (res.done) {
          milestoneAwards = res.milestoneAwards;
          milestoneErrors = res.milestoneErrors ?? [];
        }

        // Live progress in de UI.
        if (!res.done) {
          setState({
            kind: "running",
            message: `Bezig… ${totalUpserted} ritten verwerkt (pagina ${res.nextPage}). Niet wegklikken.`,
          });
          startPage = res.nextPage ?? undefined;
          afterTs = res.afterTs;
        } else {
          break;
        }

        // Korte pauze tussen chunks zodat we niet meteen weer een nieuwe
        // serverless-invocation triggeren (en Strava niet boos wordt).
        await new Promise((r) => setTimeout(r, 250));
      }

      const parts: string[] = [];
      parts.push(`${totalUpserted} ritten gesynchroniseerd`);
      if (milestoneAwards > 0) {
        parts.push(
          `${milestoneAwards} nieuwe badge${milestoneAwards === 1 ? "" : "s"}`,
        );
      }
      if (milestoneErrors.length > 0) {
        parts.push(`badgecheck: ${milestoneErrors[0]}`);
      }
      if (totalNonCycling > 0) {
        parts.push(`${totalNonCycling} niet-fiets overgeslagen`);
      }
      if (totalSeen > totalUpserted + totalNonCycling) {
        parts.push(`${totalSeen} Strava-activiteiten bekeken`);
      }
      if (fullBackfill) {
        parts.push("(volledige 5-jaar historie)");
      } else if (isFirstSync) {
        parts.push("(eerste sync)");
      }
      setState({ kind: "success", message: parts.join(" · ") + "." });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Sync faalde onverwacht.",
      });
    }
  }

  async function runBadgeRecompute() {
    setState({
      kind: "running",
      message: "Bestaande ritten opnieuw op badges beoordelen...",
    });

    try {
      const res = await recomputeMyMilestoneBadges();
      if (!res.ok) {
        setState({ kind: "error", message: res.error });
        return;
      }

      const parts = [
        `${res.awarded} nieuwe badge${res.awarded === 1 ? "" : "s"}`,
      ];
      if (res.errors.length > 0) parts.push(`waarschuwing: ${res.errors[0]}`);
      setState({ kind: "success", message: parts.join(" · ") + "." });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Badgecheck faalde onverwacht.",
      });
    }
  }

  async function runWatopiaDiagnose() {
    setState({ kind: "running", message: "Watopia-diagnose draaien…" });
    try {
      const res = await diagnoseWatopia();
      if (!res.ok) {
        setState({ kind: "error", message: res.error });
        return;
      }
      // Toon het volledige rapport in een alert + korte samenvatting inline.
      alert(res.report);
      setState({
        kind: "success",
        message: "Watopia-diagnose klaar — zie pop-up.",
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Diagnose faalde.",
      });
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isRunning}
          onClick={() => runSync(false)}
        >
          <RefreshCw
            data-icon="inline-start"
            className={isRunning ? "animate-spin" : undefined}
          />
          Strava syncen
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isRunning}
          onClick={() => {
            if (
              !confirm(
                "Volledige 5-jaar historie ophalen? Kan ~30-90 seconden duren bij actieve riders. We doen het nu in kleine stukjes zodat de browser-pagina niet onderuit gaat. Bestaande ritten worden netjes upsert (geen duplicaten).",
              )
            )
              return;
            runSync(true);
          }}
        >
          <History data-icon="inline-start" />
          Sync hele historie
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isRunning}
          onClick={runBadgeRecompute}
        >
          <RefreshCw data-icon="inline-start" />
          Badges herberekenen
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isRunning}
          onClick={runWatopiaDiagnose}
        >
          <Stethoscope data-icon="inline-start" />
          Watopia diagnose
        </Button>
      </div>
      {state.kind !== "idle" && (
        <p
          className={
            state.kind === "error"
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
