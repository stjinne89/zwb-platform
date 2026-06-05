"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  requestPasswordReset,
  sendMagicLink,
  signInWithPassword,
  signUp,
} from "./actions";
import { Button } from "@/components/ui/button";
import { ZwbLogo } from "@/components/zwb-logo";

type Mode = "login" | "register" | "reset";

type Status =
  | { kind: "idle" }
  | { kind: "magic-sent" }
  | { kind: "confirm-sent" }
  | { kind: "reset-sent" }
  | { kind: "error"; msg: string };

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth-link-storage-missing":
    "Deze e-maillink kan niet worden afgerond in deze browser. Vraag een nieuwe magic link aan en open die in dezelfde browser, of log in met e-mail en wachtwoord.",
  "auth-link-invalid":
    "Deze e-maillink is verlopen of ongeldig. Vraag een nieuwe magic link aan.",
  "auth-link-missing":
    "Deze e-maillink bevat geen geldige login-code. Vraag een nieuwe magic link aan.",
  "no-token-found-in-link":
    "Deze e-maillink bevat geen geldige login-code. Vraag een nieuwe magic link aan.",
  "password-reset-session-missing":
    "Deze wachtwoordlink is verlopen of al gebruikt. Vraag een nieuwe resetlink aan.",
};

function messageFromAuthError(error: string | null) {
  if (!error) return null;
  if (error in AUTH_ERROR_MESSAGES) return AUTH_ERROR_MESSAGES[error];
  if (error.startsWith("code:") || error.startsWith("otp:")) {
    return "Deze e-maillink is verlopen of ongeldig. Vraag een nieuwe magic link aan.";
  }
  return "Inloggen is mislukt. Probeer het opnieuw.";
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthScreen />
    </Suspense>
  );
}

function AuthScreen() {
  const params = useSearchParams();
  const initialError = messageFromAuthError(params.get("error"));
  const rawMode = params.get("mode");
  const initialMode: Mode =
    rawMode === "register" ? "register" : rawMode === "reset" ? "reset" : "login";

  const [mode, setMode] = useState<Mode>(initialMode);
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

  function handleRegister(formData: FormData) {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await signUp(formData);
      // redirect() short-circuits on direct login (geen e-mail-bevestiging).
      if (!res) return;
      if (!res.ok) {
        setStatus({ kind: "error", msg: res.error ?? "Onbekende fout." });
      } else if (res.needsConfirmation) {
        setStatus({ kind: "confirm-sent" });
      }
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

  function handleReset(formData: FormData) {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await requestPasswordReset(formData);
      setStatus(
        res.ok
          ? { kind: "reset-sent" }
          : { kind: "error", msg: res.error ?? "Onbekende fout." },
      );
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-3">
          <ZwbLogo className="h-16 w-auto text-foreground" />
          <p className="text-sm text-muted-foreground">
            {mode === "login" && "Log in om verder te gaan."}
            {mode === "register" && "Maak een ZWB-account aan."}
            {mode === "reset" && "Vraag een link aan om je wachtwoord te herstellen."}
          </p>
        </div>

        {/* Mode toggle */}
        {mode !== "reset" && (
          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setStatus({ kind: "idle" });
              }}
              className={`rounded px-3 py-1.5 transition ${
                mode === "login"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inloggen
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setStatus({ kind: "idle" });
              }}
              className={`rounded px-3 py-1.5 transition ${
                mode === "register"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Registreren
            </button>
          </div>
        )}

        {/* Confirmation message */}
        {status.kind === "confirm-sent" ? (
          <div className="space-y-2 rounded-md bg-green-50 px-3 py-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
            <p className="font-medium">Bijna klaar.</p>
            <p>
              Check je inbox en klik op de bevestigingslink om je account te
              activeren. De mail kan vanuit Supabase komen; kijk ook in
              ongewenste mail of spam en markeer de afzender als vertrouwd.
            </p>
            <Link
              href="/welkom"
              className="inline-flex text-sm font-medium underline"
            >
              Open de starthelper
            </Link>
          </div>
        ) : mode === "login" ? (
          <LoginForm
            email={email}
            setEmail={setEmail}
            pending={pending}
            onSubmit={handlePassword}
            onResetMode={() => {
              setMode("reset");
              setStatus({ kind: "idle" });
            }}
          />
        ) : mode === "reset" ? (
          <ResetRequestForm
            email={email}
            setEmail={setEmail}
            pending={pending}
            onSubmit={handleReset}
            onBack={() => {
              setMode("login");
              setStatus({ kind: "idle" });
            }}
          />
        ) : (
          <RegisterForm
            email={email}
            setEmail={setEmail}
            pending={pending}
            onSubmit={handleRegister}
          />
        )}

        {/* Magic link — only on login mode */}
        {mode === "login" && status.kind !== "magic-sent" && status.kind !== "confirm-sent" && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">of</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={handleMagic}
              className="w-full"
            >
              Stuur magic link
            </Button>
          </>
        )}

        {status.kind === "magic-sent" && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
            Check je inbox — de magic link is verzonden.
          </p>
        )}

        {status.kind === "reset-sent" && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
            Als dit e-mailadres bekend is, ontvang je een link om je wachtwoord
            opnieuw in te stellen.
          </p>
        )}

        {status.kind === "error" && (
          <p className="text-sm text-destructive">{status.msg}</p>
        )}
      </div>
    </main>
  );
}

function LoginForm({
  email,
  setEmail,
  pending,
  onSubmit,
  onResetMode,
}: {
  email: string;
  setEmail: (v: string) => void;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onResetMode: () => void;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="E-mailadres"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={FIELD}
      />
      <input
        type="password"
        name="password"
        required
        autoComplete="current-password"
        placeholder="Wachtwoord"
        className={FIELD}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Bezig…" : "Inloggen"}
      </Button>
      <button
        type="button"
        onClick={onResetMode}
        className="w-full text-center text-sm font-medium text-primary underline"
      >
        Wachtwoord vergeten?
      </button>
    </form>
  );
}

function ResetRequestForm({
  email,
  setEmail,
  pending,
  onSubmit,
  onBack,
}: {
  email: string;
  setEmail: (v: string) => void;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onBack: () => void;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="E-mailadres"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={FIELD}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Bezig..." : "Stuur resetlink"}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm font-medium text-primary underline"
      >
        Terug naar inloggen
      </button>
    </form>
  );
}

function RegisterForm({
  email,
  setEmail,
  pending,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      <input
        type="text"
        name="display_name"
        required
        autoComplete="name"
        placeholder="Je naam (bv. Stijn Martens)"
        className={FIELD}
      />
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="E-mailadres"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={FIELD}
      />
      <input
        type="password"
        name="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Wachtwoord (min. 8 tekens)"
        className={FIELD}
      />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          name="privacy_accepted"
          required
          value="1"
          className="mt-0.5 size-4 shrink-0 rounded border-input"
        />
        <span>
          Ik ga akkoord met de{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline"
          >
            privacyverklaring
          </a>{" "}
          en met de verwerking van mijn gegevens. Je profiel is zichtbaar voor
          andere leden.
        </span>
      </label>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Bezig…" : "Account aanmaken"}
      </Button>
    </form>
  );
}
