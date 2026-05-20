"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { sendMagicLink, signInWithPassword } from "./actions";
import { Button } from "@/components/ui/button";
import { ZwbLogo } from "@/components/zwb-logo";

type Status =
  | { kind: "idle" }
  | { kind: "magic-sent" }
  | { kind: "error"; msg: string };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const initialError = params.get("error");

  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(
    initialError ? { kind: "error", msg: initialError } : { kind: "idle" },
  );
  const [email, setEmail] = useState("");

  function handlePassword(formData: FormData) {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await signInWithPassword(formData);
      // redirect() short-circuits — only error path returns here.
      if (res && !res.ok)
        setStatus({ kind: "error", msg: res.error ?? "Onbekende fout." });
    });
  }

  function handleMagic() {
    if (!email) {
      setStatus({ kind: "error", msg: "Vul eerst je e-mailadres in." });
      return;
    }
    setStatus({ kind: "idle" });
    const fd = new FormData();
    fd.set("email", email);
    startTransition(async () => {
      const res = await sendMagicLink(fd);
      setStatus(
        res.ok
          ? { kind: "magic-sent" }
          : { kind: "error", msg: res.error ?? "Onbekende fout." },
      );
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-3">
          <ZwbLogo className="h-16 w-auto text-foreground" />
          <p className="text-sm text-muted-foreground">Log in om verder te gaan.</p>
        </div>

        <form action={handlePassword} className="space-y-3">
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="Wachtwoord"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Bezig…" : "Inloggen"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">of</span>
          </div>
        </div>

        {status.kind === "magic-sent" ? (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
            Check je inbox — de magic link is verzonden.
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleMagic}
            className="w-full"
          >
            Stuur magic link
          </Button>
        )}

        {status.kind === "error" && (
          <p className="text-sm text-destructive">{status.msg}</p>
        )}
      </div>
    </main>
  );
}
