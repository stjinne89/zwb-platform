"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updatePassword } from "./actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function PasswordResetForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updatePassword(formData);
      if (res && !res.ok) setError(res.error ?? "Onbekende fout.");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <input
        type="password"
        name="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Nieuw wachtwoord"
        className={FIELD}
      />
      <input
        type="password"
        name="confirm_password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Herhaal nieuw wachtwoord"
        className={FIELD}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Bezig..." : "Wachtwoord opslaan"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
