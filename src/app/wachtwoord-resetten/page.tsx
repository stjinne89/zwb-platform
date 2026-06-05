import { redirect } from "next/navigation";
import { ZwbLogo } from "@/components/zwb-logo";
import { createClient } from "@/lib/supabase/server";
import { PasswordResetForm } from "./password-reset-form";

export default async function PasswordResetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?mode=reset&error=password-reset-session-missing");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="space-y-3">
          <ZwbLogo className="h-16 w-auto text-foreground" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Nieuw wachtwoord</h1>
            <p className="text-sm text-muted-foreground">
              Kies een nieuw wachtwoord voor je ZWB-account.
            </p>
          </div>
        </div>
        <PasswordResetForm />
      </div>
    </main>
  );
}
