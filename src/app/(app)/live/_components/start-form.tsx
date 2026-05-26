"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startSession } from "../_actions";
import { Button } from "@/components/ui/button";

const MODES = [
  { value: "outdoor", label: "Outdoor met externe LiveTrack-link" },
  { value: "zwift", label: "Zwift" },
  { value: "mywhoosh", label: "MyWhoosh" },
  { value: "wahoo_indoor", label: "Wahoo Systm / RGT" },
  { value: "other_indoor", label: "Andere indoor" },
];

export function StartLiveForm({ onStarted }: { onStarted?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState("outdoor");

  function submit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await startSession({
        mode: String(fd.get("mode") ?? "outdoor"),
        status_text: String(fd.get("status_text") ?? "") || null,
        external_track_url: String(fd.get("external_track_url") ?? "") || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onStarted?.();
      router.refresh();
    });
  }

  const FIELD =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const LABEL = "mb-1 block text-sm font-medium";

  const isOutdoor = mode === "outdoor";

  return (
    <form action={submit} className="space-y-3 rounded-2xl border bg-card p-4">
      <h3 className="text-sm font-semibold">Start live-sessie</h3>
      <p className="text-xs text-muted-foreground">
        Echte outdoor GPS-posities lopen via OwnTracks. Dit formulier is voor
        indoor status of een Garmin/Wahoo LiveTrack-doorlink.
      </p>

      <div>
        <label className={LABEL}>Mode</label>
        <select
          name="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className={FIELD}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL}>Status (optioneel)</label>
        <input
          name="status_text"
          placeholder={
            isOutdoor
              ? "Brabant - 80km koffierondje"
              : "Watopia - Three Sisters"
          }
          maxLength={120}
          className={FIELD}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {isOutdoor
            ? "Korte beschrijving van je rit; verschijnt naast je LiveTrack-link."
            : "Welke wereld/route rijd je? Zo kunnen anderen joinen."}
        </p>
      </div>

      <div>
        <label className={LABEL}>Externe LiveTrack-URL (optioneel)</label>
        <input
          type="url"
          name="external_track_url"
          placeholder="https://livetrack.garmin.com/... of Wahoo LiveTrack"
          className={FIELD}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Garmin/Wahoo share-link. Voor outdoor is deze link verplicht als je
          geen OwnTracks gebruikt.
        </p>
      </div>

      {isOutdoor && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200">
          <strong>Tip:</strong> wil je echt als bolletje op de ZWB-kaart
          verschijnen, koppel dan OwnTracks hierboven. Een externe LiveTrack-link
          opent Garmin of Wahoo, maar levert geen GPS-punten aan ZWB.
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Starten..." : "Start live"}
      </Button>
    </form>
  );
}
