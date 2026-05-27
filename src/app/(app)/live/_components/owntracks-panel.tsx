"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, RotateCw, ShieldOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createOwnTracksToken,
  revokeOwnTracksTokens,
} from "../_actions";

export type OwnTracksTokenStatus = {
  id: string;
  enabled: boolean;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

const OWNTRACKS_APP_STORE_URL =
  "https://apps.apple.com/us/app/owntracks/id692424691";
const OWNTRACKS_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=org.owntracks.android";

export function OwnTracksPanel({
  tokenStatus,
}: {
  tokenStatus: OwnTracksTokenStatus | null;
}) {
  const [pending, startTransition] = useTransition();
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpointUrl = useMemo(() => {
    if (!rawToken || typeof window === "undefined") return null;
    return `${window.location.origin}/api/live/owntracks?token=${encodeURIComponent(rawToken)}`;
  }, [rawToken]);

  function createToken() {
    setError(null);
    startTransition(async () => {
      const res = await createOwnTracksToken();
      if (!res.ok) {
        setError(res.error ?? "Token maken mislukt.");
        return;
      }
      setRawToken(res.token);
    });
  }

  function revokeToken() {
    setError(null);
    startTransition(async () => {
      const res = await revokeOwnTracksTokens();
      if (!res.ok) {
        setError(res.error ?? "Koppeling stoppen mislukt.");
        return;
      }
      setRawToken(null);
    });
  }

  async function copyEndpoint() {
    if (!endpointUrl) return;
    try {
      await navigator.clipboard.writeText(endpointUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Kopiëren lukte niet. Selecteer de URL handmatig.");
    }
  }

  const active = Boolean(tokenStatus?.enabled && !tokenStatus.revoked_at);

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Background tracking via OwnTracks
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gebruik de native OwnTracks-app voor echte livepositie terwijl je
          telefoon vergrendeld is. De ZWB-app gebruikt geen browser-GPS meer.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Koppeling
          </p>
          <p className="mt-1 font-medium">{active ? "Actief" : "Niet actief"}</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Laatste positie
          </p>
          <p className="mt-1 font-medium">
            {tokenStatus?.last_seen_at
              ? new Date(tokenStatus.last_seen_at).toLocaleString("nl-NL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "Nog niets ontvangen"}
          </p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Aangemaakt
          </p>
          <p className="mt-1 font-medium">
            {tokenStatus
              ? new Date(tokenStatus.created_at).toLocaleDateString("nl-NL", {
                  dateStyle: "medium",
                })
              : "-"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={createToken} disabled={pending}>
          <RotateCw className="size-4" />
          {active ? "Nieuwe koppellink maken" : "OwnTracks koppelen"}
        </Button>
        {active && (
          <Button
            type="button"
            variant="outline"
            onClick={revokeToken}
            disabled={pending}
          >
            <ShieldOff className="size-4" />
            Koppeling stoppen
          </Button>
        )}
      </div>

      {endpointUrl && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm font-medium">Kopieer deze URL nu naar OwnTracks</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Deze persoonlijke koppellink wordt maar een keer getoond. Maak een
            nieuwe koppellink als je hem kwijtraakt.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={endpointUrl}
              className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 font-mono text-xs"
            />
            <Button type="button" variant="outline" onClick={copyEndpoint}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Gekopieerd" : "Kopieer"}
            </Button>
          </div>
        </div>
      )}

      <ol className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <li className="rounded-md border bg-background p-3">
          <strong className="text-foreground">1.</strong> Installeer OwnTracks.
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={OWNTRACKS_APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              App Store
            </a>
            <a
              href={OWNTRACKS_PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Play Store
            </a>
          </div>
        </li>
        <li className="rounded-md border bg-background p-3">
          <strong className="text-foreground">2.</strong> Kies HTTP mode en plak
          de ZWB endpoint-URL.
        </li>
        <li className="rounded-md border bg-background p-3">
          <strong className="text-foreground">3.</strong> Zet monitoring op Move
          of een vergelijkbare continue modus.
        </li>
        <li className="rounded-md border bg-background p-3">
          <strong className="text-foreground">4.</strong> Geef locatiepermissie
          Altijd en schakel batterijoptimalisatie uit.
        </li>
        <li className="rounded-md border bg-background p-3 sm:col-span-2">
          <strong className="text-foreground">5.</strong> Start je rit. Als je
          RSVP Ja of Misschien hebt, verschijnt je echte livepositie automatisch
          op de event-liveticker.
        </li>
      </ol>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
