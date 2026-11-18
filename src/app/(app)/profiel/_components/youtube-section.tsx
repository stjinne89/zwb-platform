"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import {
  disconnectYouTube,
  pairStreamHelper,
  revealStreamKey,
  unpairStreamHelper,
} from "@/app/(app)/_actions/livestream";
import { helperStateLabel, type HelperState } from "@/components/livestream/helper-controls";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className={cn("min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs", secret && "select-all")}>
          {value}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`${label} kopiëren`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // kopiëren mag stil falen: de tekst staat er
            }
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

/** Het eigen YouTube-kanaal koppelen om races te streamen (livestreams, 0338). */
/** De stream-hulp (fase 3, 0340): OBS starten vanaf de telefoon. */
function HelperBlock({ helper }: { helper: HelperState | null }) {
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pair() {
    setError(null);
    startTransition(async () => {
      const res = await pairStreamHelper();
      if (res.ok) setCode(res.code);
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-sm font-medium">Hulp-app</p>
      {helper && <p className="text-sm text-muted-foreground">{helperStateLabel(helper)}</p>}
      {code && <CopyField label="Koppelcode" value={code} secret />}
      <div className="flex flex-wrap gap-2">
        <a href="/downloads/ZWB-stream-hulp-installeren.bat" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Installeren op Windows
        </a>
        <Link href="/hulp/wedstrijden#livestreamen" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Installeren op Mac
        </Link>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={pair}>
          {helper ? "Nieuwe koppelcode" : "Hulp-app koppelen"}
        </Button>
        {helper && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await unpairStreamHelper();
                if (!res.ok) setError(res.error);
                else setCode(null);
              });
            }}
          >
            Hulp-app ontkoppelen
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function YouTubeSection({
  connection,
  notice,
  helper = null,
}: {
  connection: { channel_title: string | null; needs_reconnect: boolean } | null;
  /** Uit de callback: gekoppeld, of een foutmelding. */
  notice: { ok: boolean; text: string } | null;
  /** De stream-hulp; null als er geen gekoppeld is. */
  helper?: HelperState | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<{ serverUrl: string; streamKey: string } | null>(null);
  const connected = connection && !connection.needs_reconnect;

  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">YouTube</h2>
      {notice && (
        <p className={cn("mt-3 text-sm", notice.ok ? "text-muted-foreground" : "text-destructive")}>
          {notice.text}
        </p>
      )}
      {connected ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            Gekoppeld met <strong>{connection.channel_title || "je kanaal"}</strong>
          </p>
          {key ? (
            <div className="space-y-2">
              <CopyField label="Server" value={key.serverUrl} />
              <CopyField label="Streamsleutel" value={key.streamKey} secret />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {key ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setKey(null)}>
                Sleutel verbergen
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const res = await revealStreamKey();
                    if (res.ok) setKey({ serverUrl: res.serverUrl, streamKey: res.streamKey });
                    else setError(res.error);
                  });
                }}
              >
                Streamsleutel tonen
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const res = await disconnectYouTube();
                  if (!res.ok) setError(res.error);
                  else setKey(null);
                });
              }}
            >
              Ontkoppelen
            </Button>
          </div>
          <HelperBlock helper={helper} />
        </div>
      ) : (
        <div className="mt-3">
          <a href="/api/youtube/connect" className={cn(buttonVariants({ size: "sm" }))}>
            {connection?.needs_reconnect ? "YouTube opnieuw koppelen" : "YouTube koppelen"}
          </a>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}
