"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, RotateCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpLink } from "@/components/app-ui";
import {
  createLiveMailAddress,
  removeWahooLink,
  revokeLiveMailAddress,
  saveWahooLink,
  setHeartRateSharing,
} from "../_actions";
import type { OwnTracksTokenStatus } from "./owntracks-panel";

function formatMoment(iso: string | null | undefined, empty: string) {
  return iso
    ? new Date(iso).toLocaleString("nl-NL", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Amsterdam",
      })
    : empty;
}

function isActive(status: OwnTracksTokenStatus | null) {
  return Boolean(status?.enabled && !status.revoked_at);
}

function StatusTiles({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border bg-background p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className="mt-1 font-medium">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function GarminBlock({ status }: { status: OwnTracksTokenStatus | null }) {
  const [pending, startTransition] = useTransition();
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = isActive(status);

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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Garmin</h3>
      <StatusTiles
        items={[
          { label: "Koppeling", value: active ? "Actief" : "Niet actief" },
          { label: "Laatste mail", value: formatMoment(status?.last_seen_at, "Nog niets ontvangen") },
        ]}
      />
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
    </div>
  );
}

function WahooBlock({ status }: { status: OwnTracksTokenStatus | null }) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const active = isActive(status);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveWahooLink(url);
      if (!res.ok) {
        setError(res.error ?? "Koppelen mislukt.");
        return;
      }
      setUrl("");
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await removeWahooLink();
      if (!res.ok) setError(res.error ?? "Ontkoppelen mislukt.");
    });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Wahoo</h3>
      <StatusTiles
        items={[
          { label: "Koppeling", value: active ? "Actief" : "Niet actief" },
          { label: "Laatste rit gezien", value: formatMoment(status?.last_seen_at, "Nog geen rit") },
        ]}
      />
      <form
        action={save}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.wahooligan.com/users/live/…"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={pending || !url.trim()}>
          <Link2 className="size-4" />
          {active ? "Link vervangen" : "Koppelen"}
        </Button>
      </form>
      {active && (
        <Button type="button" variant="outline" onClick={remove} disabled={pending}>
          <ShieldOff className="size-4" />
          Ontkoppelen
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function HeartRateToggle({ sharing }: { sharing: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(on: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await setHeartRateSharing(on);
      if (!res.ok) setError(res.error ?? "Opslaan mislukt.");
    });
  }

  return (
    <div className="space-y-1 border-t pt-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={sharing}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          className="size-4"
        />
        Hartslag delen met leden
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function LiveTrackPanel({
  mailStatus,
  wahooStatus,
  mailEnabled,
  sharingHeartRate,
}: {
  mailStatus: OwnTracksTokenStatus | null;
  wahooStatus: OwnTracksTokenStatus | null;
  mailEnabled: boolean;
  sharingHeartRate: boolean;
}) {
  return (
    <section className="space-y-5 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">Garmin of Wahoo LiveTrack</h2>
        <HelpLink href="/hulp#livetrack" />
      </div>
      {mailEnabled && <GarminBlock status={mailStatus} />}
      <WahooBlock status={wahooStatus} />
      <HeartRateToggle sharing={sharingHeartRate} />
    </section>
  );
}
