"use client";

// De opzet van een Zwift-event: format en fiets. Opslaan rekent het plan
// meteen door; uitleg staat op /hulp#pacing-zwift.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FORMAT_LABELS,
  RACE_FORMATS,
  type BikeKind,
  type RaceFormat,
  type RideSetup,
} from "@/lib/pacing/zwift-setup";
import { savePacingSetup } from "../_actions";

export type FrameOption = { name: string; kind: BikeKind; stages: number[] };

const KIND_LABELS: Record<BikeKind, string> = {
  road: "Racefiets",
  tt: "Tijdritfiets",
  gravel: "Gravelbike",
  mtb: "Mountainbike",
};

const REFERENCE_FRAME = "Zwift Carbon";

const fieldClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function RideSetupForm({
  eventId,
  setup,
  frames,
  wheels,
  ttBikesAllowed,
  forcedWheels,
  upgradesDisabled,
}: {
  eventId: string;
  setup: RideSetup;
  frames: FrameOption[];
  /** Wielen per fietstype, zoals gemeten op het referentieframe van dat type. */
  wheels: Partial<Record<BikeKind, string[]>>;
  ttBikesAllowed: boolean;
  forcedWheels: boolean;
  upgradesDisabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<RaceFormat>(setup.format);
  const [frame, setFrame] = useState(setup.frame ?? REFERENCE_FRAME);
  const [stage, setStage] = useState(setup.stage);
  const [wheel, setWheel] = useState(setup.wheels ?? "");
  const [teamSize, setTeamSize] = useState(String(setup.teamSize ?? 4));

  const allowedFrames = useMemo(
    () => frames.filter((item) => ttBikesAllowed || item.kind !== "tt"),
    [frames, ttBikesAllowed],
  );
  const current = allowedFrames.find((item) => item.name === frame);
  const kind: BikeKind = current?.kind ?? "road";
  const wheelOptions = forcedWheels ? [] : (wheels[kind] ?? []);
  const stages = current?.stages ?? [0];

  const dirty =
    format !== setup.format ||
    frame !== (setup.frame ?? REFERENCE_FRAME) ||
    stage !== setup.stage ||
    wheel !== (setup.wheels ?? "") ||
    (format === "ttt" && teamSize !== String(setup.teamSize ?? 4));

  function save() {
    setError(null);
    start(async () => {
      const result = await savePacingSetup(eventId, {
        format,
        frame: frame === REFERENCE_FRAME ? null : frame,
        wheels: wheel || null,
        stage,
        teamSize: format === "ttt" ? Number(teamSize) : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const byKind = (["road", "tt", "gravel", "mtb"] as BikeKind[])
    .map((group) => ({ group, items: allowedFrames.filter((item) => item.kind === group) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Format</span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as RaceFormat)}
            className={fieldClass}
          >
            {RACE_FORMATS.map((value) => (
              <option key={value} value={value}>
                {FORMAT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Frame</span>
          <select
            value={frame}
            onChange={(event) => {
              setFrame(event.target.value);
              setWheel("");
              setStage(0);
            }}
            className={fieldClass}
          >
            {!allowedFrames.some((item) => item.name === REFERENCE_FRAME) && (
              <option value={REFERENCE_FRAME}>{REFERENCE_FRAME}</option>
            )}
            {byKind.map(({ group, items }) => (
              <optgroup key={group} label={KIND_LABELS[group]}>
                {items.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {!upgradesDisabled && stages.length > 1 && (
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Upgrade</span>
            <select
              value={stage}
              onChange={(event) => setStage(Number(event.target.value))}
              className={fieldClass}
            >
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  Stage {value}
                </option>
              ))}
            </select>
          </label>
        )}

        {wheelOptions.length > 0 && (
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Wielen</span>
            <select
              value={wheel}
              onChange={(event) => setWheel(event.target.value)}
              className={fieldClass}
            >
              <option value="">Standaard</option>
              {wheelOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}

        {format === "ttt" && (
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Ploeggrootte</span>
            <input
              type="number"
              min={2}
              max={8}
              value={teamSize}
              onChange={(event) => setTeamSize(event.target.value)}
              className={`${fieldClass} w-24`}
            />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" size="sm" onClick={save} disabled={pending || !dirty}>
        {pending ? "Doorrekenen..." : "Opzet opslaan"}
      </Button>
    </div>
  );
}
