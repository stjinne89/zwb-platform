"use client";

import { useState, useTransition } from "react";
import { Check, Copy, RotateCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpLink } from "@/components/app-ui";
import { createLiveMailAddress, revokeLiveMailAddress } from "../_actions";
import type { OwnTracksTokenStatus } from "./owntracks-panel";

export function LiveTrackMailPanel({
  tokenStatus,
}: {
  tokenStatus: OwnTracksTokenStatus | null;
}) {
  const [pending, startTransition] = useTransition();
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function createAddress() {
    setError(null);
    startTransition(async () => {
      const res = await createLiveMailAddress();
      if (!res.ok) {
        setError(res.error ?? "Adres maken mislukt.");
        return;
      }
      setAddress(res.address);
    });
  }

  function revoke() {
    setError(null);
    startTransition(async () => {
      const res = await revokeLiveMailAddress();
      if (!res.ok) {
        setError(res.error ?? "Koppeling stoppen mislukt.");
        return;
      }
      setAddress(null);
    });
  }

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Kopiëren lukte niet. Selecteer het adres handmatig.");
    }
  }

  const active = Boolean(tokenStatus?.enabled && !tokenStatus.revoked_at);

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">Garmin of Wahoo LiveTrack</h2>
        <HelpLink href="/hulp#livetrack" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Koppeling
          </p>
          <p className="mt-1 font-medium">{active ? "Actief" : "Niet actief"}</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Laatste mail
          </p>
          <p className="mt-1 font-medium">
            {tokenStatus?.last_seen_at
              ? new Date(tokenStatus.last_seen_at).toLocaleString("nl-NL", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Amsterdam",
                })
              : "Nog niets ontvangen"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={createAddress} disabled={pending}>
          <RotateCw className="size-4" />
          {active ? "Nieuw adres maken" : "Adres maken"}
        </Button>
        {active && (
          <Button type="button" variant="outline" onClick={revoke} disabled={pending}>
            <ShieldOff className="size-4" />
            Koppeling stoppen
          </Button>
        )}
      </div>

      {address && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm font-medium">Zet dit adres bij je LiveTrack-contacten</p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={address}
              className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 font-mono text-xs"
            />
            <Button type="button" variant="outline" onClick={copyAddress}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Gekopieerd" : "Kopieer"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
