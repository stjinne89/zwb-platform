"use client";

import { useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ShieldCheck } from "lucide-react";
import type { ProjectedLoadPoint } from "@/lib/training/load-projection";
import {
  MetricButton,
  TrainingLoadButtons,
  TrainingLoadPanel,
  type LoadRange,
  type TrainingLoadPoint,
} from "./training-load-chart";
import { MetricCard } from "./ui";

/** Wat er onder de tegels openstaat: Fitness en Form openen de grafiek, Trainingsruimte herstel. */
type OpenPanel = "grafiek" | "herstel" | null;

// Zachte afbreking: op de smalste telefoons past het woord niet op één regel.
const ROOM_LABEL = "Trainings­ruimte";

/** De tegels van "Hoe je ervoor staat" met één uitklapvlak eronder. */
export function TodayStand({
  points,
  ctl,
  tsb,
  today,
  projection,
  readiness,
  adviceTitle,
  recovery,
  recoveryNeedsAttention,
  eftp,
  week,
}: {
  points: TrainingLoadPoint[];
  ctl: number | null | undefined;
  tsb: number | null | undefined;
  today: string;
  projection?: ProjectedLoadPoint[] | null;
  readiness: number | null;
  adviceTitle: string;
  /** Zonder intervals-koppeling is er geen herstel en blijft de tegel dicht. */
  recovery: ReactNode;
  recoveryNeedsAttention: boolean;
  eftp: ReactNode;
  week: ReactNode;
}) {
  const [open, setOpen] = useState<OpenPanel>(recoveryNeedsAttention ? "herstel" : null);
  const [range, setRange] = useState<LoadRange>("90d");
  const hasRecovery = Boolean(recovery);
  const recoveryOpen = open === "herstel";
  const value = readiness != null ? `${readiness}` : "-";

  // `/zwbeter-worden#herstel` is de link naar de instelling; die moet het vlak
  // openen voordat er naartoe gescrold kan worden.
  useEffect(() => {
    if (!hasRecovery) return;
    const showRecovery = () => {
      if (window.location.hash !== "#herstel") return;
      flushSync(() => setOpen("herstel"));
      document.getElementById("herstel")?.scrollIntoView({ block: "start" });
    };
    const timer = window.setTimeout(showRecovery);
    window.addEventListener("hashchange", showRecovery);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", showRecovery);
    };
  }, [hasRecovery]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <TrainingLoadButtons
        points={points}
        ctl={ctl}
        tsb={tsb}
        today={today}
        projection={projection}
        opens
        // Op de telefoon alleen Fitness: Form opent dezelfde grafiek.
        formClassName="hidden lg:block"
        active={open === "grafiek"}
        onToggle={() => setOpen((current) => (current === "grafiek" ? null : "grafiek"))}
      />
      {hasRecovery ? (
        <MetricButton
          icon={ShieldCheck}
          label={ROOM_LABEL}
          value={value}
          hint={adviceTitle}
          opens
          active={recoveryOpen}
          onClick={() => setOpen((current) => (current === "herstel" ? null : "herstel"))}
        />
      ) : (
        <MetricCard
          icon={ShieldCheck}
          iconClassName="max-lg:hidden"
          label={ROOM_LABEL}
          value={value}
          hint={adviceTitle}
        />
      )}

      <div className="col-span-2 space-y-3 lg:order-last lg:col-span-5" hidden={open === null}>
        {/* Blijft staan als het dicht is, zodat de schakelaar zijn stand houdt. */}
        {hasRecovery && <div hidden={!recoveryOpen}>{recovery}</div>}
        {open === "grafiek" && (
          <TrainingLoadPanel
            points={points}
            today={today}
            projection={projection}
            className="rounded-lg border bg-card p-4"
            range={range}
            onRangeChange={setRange}
          />
        )}
      </div>

      {eftp}
      {week}
    </div>
  );
}
