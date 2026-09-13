"use client";
import { useState, useTransition } from "react";
import { runSegmentBatch } from "./actions";

export function SegmentSyncButton({ profileId }: { profileId: string }) {
  const [pending, start] = useTransition(), [message, setMessage] = useState("");
  return <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={pending} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50" onClick={() => start(async () => {
    const result = await runSegmentBatch(profileId);
    setMessage(result.error ?? (result.result ? result.result.fetched+" ritten; "+result.result.remaining+" resterend; "+result.result.geometry.fetched+" profielen"+(result.result.rateLimited ? " · API-pauze" : "") : ""));
  })}>{pending ? "Bijwerken…" : "Volgende batch"}</button><span role="status" className="text-xs text-muted-foreground">{message}</span></div>;
}
