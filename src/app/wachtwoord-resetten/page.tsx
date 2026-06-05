import { ZwbLogo } from "@/components/zwb-logo";
import { PasswordResetForm } from "./password-reset-form";

export default async function PasswordResetPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-3">
          <ZwbLogo className="h-16 w-auto text-foreground" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Nieuw wachtwoord</h1>
            <p className="text-sm text-muted-foreground">
              Kies eerst een nieuw wachtwoord. Daarna kun je verder naar de app.
            </p>
          </div>
        </div>
        <PasswordResetForm />
      </div>
    </main>
  );
}
