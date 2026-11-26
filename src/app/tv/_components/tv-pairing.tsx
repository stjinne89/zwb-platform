"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkTvPairing, startTvPairing, type TvCode } from "../_actions";
import { formatCode } from "@/lib/tv/pairing";

// Een tv die nog niet gekoppeld is: een code en een QR-code, en elke paar
// seconden de vraag of een lid hem al heeft goedgekeurd. Verloopt de code, dan
// komt er vanzelf een nieuwe; lukt het niet, dan over een halve minuut opnieuw.

const POLL_MS = 3000;
const RETRY_MS = 30_000;

export function TvPairing() {
  const router = useRouter();
  const [code, setCode] = useState<Extract<TvCode, { ok: true }> | null>(null);
  const [failed, setFailed] = useState(false);
  // Elke ronde een nieuwe code.
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const nextRound = () => setRound((value) => value + 1);
    startTvPairing()
      .catch(() => ({ ok: false }) as const)
      .then((next) => {
        if (cancelled) return;
        if (!next.ok) {
          setCode(null);
          setFailed(true);
          timer = window.setTimeout(nextRound, RETRY_MS);
          return;
        }
        setFailed(false);
        setCode(next);
        timer = window.setTimeout(nextRound, next.expiresInMs);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [round]);

  useEffect(() => {
    if (!code) return;
    let busy = false;
    const timer = window.setInterval(async () => {
      if (busy) return;
      busy = true;
      const state = await checkTvPairing().catch(() => "wacht" as const);
      busy = false;
      if (state === "gekoppeld") {
        window.clearInterval(timer);
        router.refresh();
      } else if (state === "verlopen") {
        window.clearInterval(timer);
        setRound((value) => value + 1);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [code, router]);

  return <PairingCode code={code} failed={failed} />;
}

/** Het scherm zelf: code, QR-code en het adres; los, zodat het zonder koppeling te bekijken is. */
export function PairingCode({ code, failed }: { code: Extract<TvCode, { ok: true }> | null; failed: boolean }) {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-black p-8 text-white">
      {code ? (
        <div className="flex flex-wrap items-center justify-center gap-12">
          <div
            className="size-64 overflow-hidden rounded-lg bg-white lg:size-96 [&>svg]:size-full"
            role="img"
            aria-label="QR-code om deze tv te koppelen"
            dangerouslySetInnerHTML={{ __html: code.qr }}
          />
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-white/70 lg:text-4xl">Tv koppelen</h1>
            <p className="font-mono text-7xl font-bold tracking-widest lg:text-9xl">{formatCode(code.code)}</p>
            <p className="text-xl text-white/70 lg:text-3xl">{code.link.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      ) : (
        <p className="text-xl text-white/60">{failed ? "Even geen code. Zo opnieuw." : "Code ophalen…"}</p>
      )}
    </main>
  );
}
