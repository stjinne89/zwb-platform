"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startSession } from "../_actions";
import { HelpLink } from "@/components/app-ui";
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
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">Start live-sessie</h3>
        <HelpLink href="/hulp#owntracks" />
      </div>

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
      </div>

      <div>
        <label className={LABEL}>Externe LiveTrack-URL (optioneel)</label>
        <input
          type="url"
          name="external_track_url"
          placeholder="https://livetrack.garmin.com/... of Wahoo LiveTrack"
          className={FIELD}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Starten..." : "Start live"}
      </Button>
    </form>
  );
}
