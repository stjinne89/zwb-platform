"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMyAccount } from "../_actions";

export function AccountData({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteMyAccount(typed);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Account weg → terug naar login.
      window.location.href = "/login";
    });
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Privacy & gegevens
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bekijk de{" "}
          <Link href="/privacy" className="text-primary underline">
            privacyverklaring
          </Link>
          , download je gegevens of verwijder je account.
        </p>
      </div>

      <a
        href="/api/account/export"
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        <Download className="size-4" />
        Download mijn gegevens (JSON)
      </a>

      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Account verwijderen
            </p>
            <p className="text-xs text-muted-foreground">
              Dit verwijdert je account en je persoonlijke gegevens definitief.
              Dit kan niet ongedaan worden gemaakt.
            </p>

            {!confirming ? (
              <Button
                type="button"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setConfirming(true)}
              >
                Account verwijderen…
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Typ je e-mailadres <strong>{email}</strong> ter bevestiging:
                </p>
                <input
                  type="email"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={email}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={pending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    {pending ? "Bezig…" : "Definitief verwijderen"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      setConfirming(false);
                      setTyped("");
                      setError(null);
                    }}
                  >
                    Annuleren
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
