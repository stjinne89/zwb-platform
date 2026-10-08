"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FrrZwbStandingsList } from "@/components/frr-zwb-standings-list";
import type { ZwbStageView } from "@/lib/frr/zwb-stage-views";

type Source = "official" | "provisional";

const NO_NAMES = new Map<string, string | null>();

/**
 * ZWB in het klassement op de tourpagina (migr. 0218): per etappe, definitief
 * van de FRR-site of voorlopig uit de finishtijden van Zwift.
 */
export function FrrZwbStageSwitch({
  views,
  profileIds,
  myZwiftId,
}: {
  views: ZwbStageView[];
  profileIds: Record<string, string>;
  myZwiftId: string | null;
}) {
  // Een etappe die nog bezig is, staat er wel bij maar is niet de eerste keuze.
  const [stage, setStage] = useState(
    (views.findLast((row) => !row.open) ?? views[views.length - 1]).stage,
  );
  const [wanted, setWanted] = useState<Source>("official");
  const view = views.find((row) => row.stage === stage) ?? views[views.length - 1];
  // Heeft de etappe de gekozen bron niet, dan de andere.
  const source: Source = view[wanted] ? wanted : wanted === "official" ? "provisional" : "official";
  const rows = view[source] ?? [];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        ZWB in het klassement · na etappe {view.stage}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        {views.map((row) => (
          <Button
            key={row.stage}
            type="button"
            size="sm"
            variant={row.stage === view.stage ? "default" : "outline"}
            aria-pressed={row.stage === view.stage}
            onClick={() => setStage(row.stage)}
          >
            Etappe {row.stage}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["provisional", "Voorlopig"],
            ["official", "Definitief"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={source === key ? "secondary" : "ghost"}
            aria-pressed={source === key}
            disabled={!view[key]}
            onClick={() => setWanted(key)}
          >
            {label}
          </Button>
        ))}
        {source === "provisional" && (
          <span className="text-xs text-muted-foreground">Nog niet officieel.</span>
        )}
      </div>
      <FrrZwbStandingsList
        standings={rows.map((row) => ({
          zwift_id: row.zwiftId,
          name: row.name,
          club: null,
          gender_class: row.genderClass,
          class_code: row.classCode,
          position: row.position,
          egap_s: row.egapS,
          tour_time_s: row.tourTimeS,
          penalty_s: row.penaltyS,
          after_stage: view.stage,
        }))}
        zwbNames={NO_NAMES}
        profileIds={profileIds}
        myZwiftId={myZwiftId}
      />
    </section>
  );
}
