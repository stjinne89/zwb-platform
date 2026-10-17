"use client";

import { useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  requestPasswordReset,
  sendMagicLink,
  signInWithPassword,
  signUp,
} from "./actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "login" | "register" | "reset";

type Status =
  | { kind: "idle" }
  | { kind: "magic-sent" }
  | { kind: "confirm-sent" }
  | { kind: "reset-sent" }
  | { kind: "error"; msg: string };

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

// De inlogkaart staat altijd in de lichte ZWB-palet — ook als de app in
// dark-mode staat — zodat het transparante logo (met de donkere "B") goed
// uitkomt en de hele kaart lichter oogt. We forceren de licht-tokens lokaal.
const LIGHT_CARD_VARS = {
  "--background": "oklch(0.965 0.011 103)",
  "--foreground": "oklch(0.22 0.034 215)",
  "--card": "oklch(0.992 0.006 103)",
  "--card-foreground": "oklch(0.22 0.034 215)",
  "--popover": "oklch(0.992 0.006 103)",
  "--popover-foreground": "oklch(0.22 0.034 215)",
  "--primary": "oklch(0.34 0.071 209)",
  "--primary-foreground": "oklch(0.99 0.006 103)",
  "--secondary": "oklch(0.9 0.026 178)",
  "--secondary-foreground": "oklch(0.28 0.058 204)",
  "--muted": "oklch(0.935 0.015 150)",
  "--muted-foreground": "oklch(0.43 0.036 205)",
  "--accent": "oklch(0.63 0.101 77)",
  "--accent-foreground": "oklch(0.19 0.031 210)",
  "--destructive": "oklch(0.577 0.245 27.325)",
  "--border": "oklch(0.86 0.022 157)",
  "--input": "oklch(0.86 0.022 157)",
  "--ring": "oklch(0.63 0.101 77)",
} as CSSProperties;

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

// Klassen per design. In "tegels" is de hoofdactie goud (jij, nu) en de
// tweede actie sage (de club); kleur betekent daar: hier kun je op tikken.
const TEGELS_FIELD = "w-full px-3 py-2.5 text-base";
const TEGELS_SUBMIT = "tg-link tg-vandaag min-h-11 w-full text-base";
const TEGELS_SECOND = "tg-link tg-club min-h-11 w-full text-base";
const TEGELS_NOTE = "tg-note px-3 py-3 text-sm";
const KLASSIEK_NOTE =
  "rounded-md bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950 dark:text-green-100";

/** Inloggen, registreren en een resetlink aanvragen. `tegels`: het nieuwe
 * design, gekozen in page.tsx op basis van het cookie. */
export function AuthScreen({ tegels }: { tegels: boolean }) {
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

  function switchMode(next: Mode) {
    setMode(next);
    setStatus({ kind: "idle" });
  }

  const field = tegels ? TEGELS_FIELD : FIELD;
  const submitClassName = tegels ? TEGELS_SUBMIT : "w-full";
  const note = tegels ? TEGELS_NOTE : KLASSIEK_NOTE;

  const toggle =
    mode === "reset" ? null : tegels ? (
      // Zoals de pijlers van ZWBeter: kleur is klikbaar, waar je bent is het
      // paneel met de gouden lijn.
      <div className="grid grid-cols-2 gap-2">
        {(["login", "register"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => switchMode(value)}
            className="tg-pillar tg-pillar-tone tg-club text-left"
          >
            <span className="tg-tile-title">
              {value === "login" ? "Inloggen" : "Registreren"}
            </span>
          </button>
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
        <button
          type="button"
          onClick={() => switchMode("login")}
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
          onClick={() => switchMode("register")}
          className={`rounded px-3 py-1.5 transition ${
            mode === "register"
              ? "bg-background shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Registreren
        </button>
      </div>
    );

  const body = (
    <>
      {toggle}

      {/* Confirmation message */}
      {status.kind === "confirm-sent" ? (
        <div className={cn("space-y-2", note, !tegels && "py-3")}>
          <p className="font-medium">Bijna klaar.</p>
          <p>
            Check je inbox en klik op de bevestigingslink om je account te
            activeren. Kijk ook in ongewenste mail of spam.
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
          onResetMode={() => switchMode("reset")}
          field={field}
          submitClassName={submitClassName}
        />
      ) : mode === "reset" ? (
        <ResetRequestForm
          email={email}
          setEmail={setEmail}
          pending={pending}
          onSubmit={handleReset}
          onBack={() => switchMode("login")}
          field={field}
          submitClassName={submitClassName}
        />
      ) : (
        <RegisterForm
          email={email}
          setEmail={setEmail}
          pending={pending}
          onSubmit={handleRegister}
          field={field}
          submitClassName={submitClassName}
        />
      )}

      {/* Magic link — only on login mode */}
      {mode === "login" && status.kind !== "magic-sent" && status.kind !== "confirm-sent" && (
        <>
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            of
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleMagic}
            className={tegels ? TEGELS_SECOND : "w-full"}
          >
            Stuur magic link
          </Button>
        </>
      )}

      {status.kind === "magic-sent" && (
        <p className={note}>Check je inbox — de magic link is verzonden.</p>
      )}

      {status.kind === "reset-sent" && (
        <p className={note}>
          Als dit e-mailadres bekend is, ontvang je een link om je wachtwoord
          opnieuw in te stellen.
        </p>
      )}

      {status.kind === "error" && (
        <p className="text-sm text-destructive">{status.msg}</p>
      )}
    </>
  );

  if (tegels) {
    // Het kader (logo, tenuebanen) zet page.tsx. Geen zichtbare titel die de
    // pijlers herhaalt; bij een reset is er geen pijler, dan wel.
    return (
      <div className="space-y-5">
        <h1 className={mode === "reset" ? "tg-display" : "sr-only"}>
          {mode === "reset" ? "Wachtwoord" : mode === "login" ? "Inloggen" : "Registreren"}
        </h1>
        {body}
      </div>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div
        className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 text-card-foreground shadow-sm"
        style={LIGHT_CARD_VARS}
      >
        <div className="space-y-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/zwb-logo.png"
            alt="ZWB Cycling Community"
            className="mx-auto h-16 w-auto"
          />
          <p className="text-sm text-muted-foreground">
            {mode === "login" && "Log in om verder te gaan."}
            {mode === "register" && "Maak een ZWB-account aan."}
            {mode === "reset" && "Vraag een link aan om je wachtwoord te herstellen."}
          </p>
        </div>
        {body}
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
  field,
  submitClassName,
}: {
  email: string;
  setEmail: (v: string) => void;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onResetMode: () => void;
  field: string;
  submitClassName: string;
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
        className={field}
      />
      <input
        type="password"
        name="password"
        required
        autoComplete="current-password"
        placeholder="Wachtwoord"
        className={field}
      />
      <Button type="submit" disabled={pending} className={submitClassName}>
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
  field,
  submitClassName,
}: {
  email: string;
  setEmail: (v: string) => void;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onBack: () => void;
  field: string;
  submitClassName: string;
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
        className={field}
      />
      <Button type="submit" disabled={pending} className={submitClassName}>
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
  field,
  submitClassName,
}: {
  email: string;
  setEmail: (v: string) => void;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  field: string;
  submitClassName: string;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      <input
        type="text"
        name="display_name"
        required
        autoComplete="name"
        placeholder="Je naam (bv. Stijn Martens)"
        className={field}
      />
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="E-mailadres"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={field}
      />
      <input
        type="password"
        name="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Wachtwoord (min. 8 tekens)"
        className={field}
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
      <Button type="submit" disabled={pending} className={submitClassName}>
        {pending ? "Bezig…" : "Account aanmaken"}
      </Button>
    </form>
  );
}
