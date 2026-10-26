"use client";

// De Zwift-garage invullen: frames met hun upgradeniveau, en wielen. Uitleg
// staat op /hulp/racen#pacing-zwift.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { BikeKind } from "@/lib/pacing/zwift-setup";
import { saveZwiftGarage } from "../_actions";

const KIND_LABELS: Record<BikeKind, string> = {
  road: "Racefiets",
  tt: "Tijdritfiets",
  gravel: "Gravelbike",
  mtb: "Mountainbike",
};

const fieldClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const matches = (name: string, query: string) => name.toLowerCase().includes(query.trim().toLowerCase());

export function ZwiftGarageForm({
  frames,
  wheels,
  initialFrames,
  initialWheels,
}: {
  frames: Array<{ name: string; kind: BikeKind }>;
  wheels: string[];
  initialFrames: Record<string, number>;
  initialWheels: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [owned, setOwned] = useState<Record<string, number>>(initialFrames);
  const [ownedWheels, setOwnedWheels] = useState<Set<string>>(new Set(initialWheels));
  const [frameQuery, setFrameQuery] = useState("");
  const [wheelQuery, setWheelQuery] = useState("");

  // Wat je hebt eerst, daarna de rest in de volgorde van de lijst.
  const shownFrames = useMemo(
    () =>
      frames
        .filter((frame) => matches(frame.name, frameQuery))
        .sort((a, b) => Number(b.name in initialFrames) - Number(a.name in initialFrames)),
    [frames, frameQuery, initialFrames],
  );
  const shownWheels = useMemo(() => {
    const initial = new Set(initialWheels);
    return wheels
      .filter((name) => matches(name, wheelQuery))
      .sort((a, b) => Number(initial.has(b)) - Number(initial.has(a)));
  }, [wheels, wheelQuery, initialWheels]);

  function toggleFrame(name: string) {
    setMessage(null);
    setOwned((current) => {
      const next = { ...current };
      if (name in next) delete next[name];
      else next[name] = 0;
      return next;
    });
  }

  function toggleWheel(name: string) {
    setMessage(null);
    setOwnedWheels((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function save() {
    setMessage(null);
    start(async () => {
      const result = await saveZwiftGarage({
        frames: Object.entries(owned).map(([name, stage]) => ({ name, stage })),
        wheels: [...ownedWheels],
      });
      setMessage(result.ok ? { ok: true, text: "Opgeslagen." } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });
  }

  const frameCount = Object.keys(owned).length;

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            Frames <span className="font-normal text-muted-foreground">· {frameCount}</span>
          </h2>
          <input
            type="search"
            value={frameQuery}
            onChange={(event) => setFrameQuery(event.target.value)}
            placeholder="Zoek een frame"
            aria-label="Zoek een frame"
            className={`${fieldClass} w-full sm:w-64`}
          />
        </div>
        <ul className="max-h-[28rem] divide-y overflow-y-auto rounded-md border text-sm">
          {shownFrames.map((frame) => {
            const checked = frame.name in owned;
            return (
              <li key={frame.name} className="flex items-center gap-3 px-3 py-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFrame(frame.name)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{frame.name}</span>
                    <span className="block text-xs text-muted-foreground">{KIND_LABELS[frame.kind]}</span>
                  </span>
                </label>
                {checked && (
                  <select
                    value={owned[frame.name]}
                    onChange={(event) => setOwned((current) => ({ ...current, [frame.name]: Number(event.target.value) }))}
                    aria-label={`Upgrade ${frame.name}`}
                    className={fieldClass}
                  >
                    {[0, 1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        Stage {value}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            Wielen <span className="font-normal text-muted-foreground">· {ownedWheels.size}</span>
          </h2>
          <input
            type="search"
            value={wheelQuery}
            onChange={(event) => setWheelQuery(event.target.value)}
            placeholder="Zoek wielen"
            aria-label="Zoek wielen"
            className={`${fieldClass} w-full sm:w-64`}
          />
        </div>
        <ul className="max-h-[28rem] divide-y overflow-y-auto rounded-md border text-sm">
          {shownWheels.map((name) => (
            <li key={name}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  checked={ownedWheels.has(name)}
                  onChange={() => toggleWheel(name)}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="truncate">{name}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Opslaan..." : "Opslaan"}
        </Button>
        {message && (
          <p className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{message.text}</p>
        )}
      </div>
    </div>
  );
}
