"use client";

import { useMemo, useState, useTransition } from "react";
import { Apple, Check, Copy, RotateCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
              className="inline-flex h-[42px] w-[142px] items-center gap-2 rounded-[7px] bg-black px-3 text-white shadow-sm ring-1 ring-white/20 transition hover:bg-zinc-900"
              aria-label="Download OwnTracks in de App Store"
            >
              <Apple className="size-[21px] shrink-0" aria-hidden />
              <span className="min-w-0 leading-none">
                <span className="block text-[0.52rem] font-medium tracking-wide">
                  Download in de
                </span>
                <span className="block text-[1.05rem] font-semibold tracking-tight">
                  App Store
                </span>
              </span>
            </a>
            <a
              href={OWNTRACKS_PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[42px] w-[142px] items-center gap-2 rounded-[7px] bg-black px-3 text-white shadow-sm ring-1 ring-white/20 transition hover:bg-zinc-900"
              aria-label="Download OwnTracks in de Play Store"
            >
              <svg
                viewBox="0 0 28 31"
                className="size-[22px] shrink-0"
                aria-hidden
              >
                <path d="M2.1 1.4 16 15.4 2.1 29.6A2.2 2.2 0 0 1 1 27.7V3.3c0-.8.4-1.5 1.1-1.9Z" fill="#00A0FF" />
                <path d="m16 15.4 3.9 3.9L4.6 30.2a2.2 2.2 0 0 1-2.5-.6L16 15.4Z" fill="#00D56A" />
                <path d="m16 15.4-14-14c.7-.5 1.7-.5 2.5 0l15.4 10.1-3.9 3.9Z" fill="#FFCE00" />
                <path d="m19.9 11.5 5.2 3.4c1.2.8 1.2 2.5 0 3.3l-5.2 3.4-3.9-4 3.9-4.1Z" fill="#FF3D3D" />
              </svg>
              <span className="min-w-0 leading-none">
                <span className="block text-[0.52rem] font-medium uppercase tracking-wide">
                  Ontdek het op
                </span>
                <span className="block text-[1.02rem] font-semibold tracking-tight">
                  Google Play
                </span>
              </span>
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
